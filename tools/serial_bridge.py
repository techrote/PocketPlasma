#!/usr/bin/env python3
"""Opt-in loopback serial-to-WebSocket bridge when embedded CEF lacks WebSerial.

Usage: pip install "pyserial>=3.5,<4" "websockets>=14,<17"
       python tools/serial_bridge.py --port COM5
No remote bind, no arbitrary command execution, no auto port selection.
"""
import argparse
import asyncio
import contextlib
import json

FRAME_SIZE=202
ORIGINS=('http://localhost:8000','http://127.0.0.1:8000')

def crc16(data):
    crc=0xffff
    for value in data:
        crc^=value<<8
        for _ in range(8):
            crc=((crc<<1)^0x1021)&0xffff if crc&0x8000 else (crc<<1)&0xffff
    return crc

def valid_led_frame(frame):
    return (isinstance(frame,bytes) and len(frame)==FRAME_SIZE
            and frame[:4]==bytes((0xa5,0x5a,1,0x4c))
            and frame[6:8]==bytes((192,0))
            and frame[-2:]==crc16(frame[2:-2]).to_bytes(2,'little'))

async def session(ws,port):
    async def from_device():
        pending=bytearray()
        while True:
            chunk=await asyncio.to_thread(port.read,128)
            if not chunk:
                await asyncio.sleep(.01);continue
            pending.extend(chunk)
            if len(pending)>2048:pending.clear();continue
            while b'\n' in pending:
                line,_,rest=pending.partition(b'\n')
                pending=bytearray(rest)
                if not 0<len(line)<=512:continue
                try:
                    payload=json.loads(line)
                    if payload.get('v')!=1 or payload.get('type') not in ('hello','imu'):continue
                except (UnicodeDecodeError,ValueError,AttributeError):continue
                await ws.send(line+b'\n')
    async def to_device():
        async for frame in ws:
            if not valid_led_frame(frame):
                await ws.close(code=1008,reason='invalid LED packet');return
            sent=await asyncio.to_thread(port.write,frame)
            if sent!=len(frame):raise OSError('short serial write')
    reads=asyncio.create_task(from_device())
    writes=asyncio.create_task(to_device())
    try:
        done,_=await asyncio.wait((reads,writes),return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            error=task.exception()
            if error:raise error
    finally:
        for task in (reads,writes):task.cancel()
        await asyncio.gather(reads,writes,return_exceptions=True)

async def serve(device_port):
    try:
        import serial
        from websockets.asyncio.server import serve as websocket_server
    except ImportError as error:
        raise SystemExit('Install pyserial and websockets as listed in docs/QUICKSTART.md') from error
    occupied=asyncio.Lock()
    async def handle(ws):
        if occupied.locked():
            await ws.close(code=1013,reason='device busy');return
        async with occupied:
            with serial.Serial(device_port,baudrate=115200,timeout=.05,write_timeout=.3) as port:
                await session(ws,port)
    async with websocket_server(handle,'127.0.0.1',8765,
                                origins=ORIGINS,max_size=FRAME_SIZE,max_queue=2,ping_interval=10):
        print('PocketPlasma:',device_port,'-> ws://127.0.0.1:8765 (localhost:8000 origin only)')
        await asyncio.Future()

if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--port',required=True,help='Explicit CDC port, e.g. COM5 or /dev/ttyACM0')
    opts=cli.parse_args()
    try:asyncio.run(serve(opts.port))
    except KeyboardInterrupt:pass

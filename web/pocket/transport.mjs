import {TelemetryDecoder,encodeLedFrame} from './protocol.mjs';
// The chooser call occurs directly in an explicit click handler. CEF Alloy support is unverified.
export class WebSerialTransport{
  constructor(onFrame,onStatus){this.onFrame=onFrame;this.onStatus=onStatus;this.decoder=new TelemetryDecoder();this.closed=false;this.busy=false;this.latest=null;}
  static supported(){return typeof navigator!=='undefined'&&!!navigator.serial?.requestPort;}
  async connect(){
    if(!WebSerialTransport.supported())throw new Error('WebSerial not available');
    const port=await navigator.serial.requestPort();
    try{
      await port.open({baudRate:115200,bufferSize:4096});
      this.port=port;this.reader=port.readable.getReader();this.writer=port.writable.getWriter();
      this.decoder.reset();this.closed=false;this.onStatus('USB CDC connected');void this.readLoop();
    }catch(err){try{await port.close();}catch{}throw err;}
  }
  async readLoop(){
    try{
      while(!this.closed){const {done,value}=await this.reader.read();if(done)break;
        for(const item of this.decoder.push(value))this.onFrame(item);}
    }catch(e){if(!this.closed)this.onStatus('Serial read lost: '+e.message);}
    finally{if(!this.closed)void this.disconnect();}
  }
  sendLed(rgb,seq){if(this.closed||!this.writer)return;this.latest=encodeLedFrame(rgb,seq);if(!this.busy)void this.flush();}
  async flush(){
    this.busy=true;
    try{while(!this.closed&&this.latest){const next=this.latest;this.latest=null;await this.writer.write(next);}}
    catch(e){if(!this.closed)this.onStatus('Serial write lost: '+e.message);void this.disconnect();}
    finally{this.busy=false;}
  }
  async disconnect(){
    if(this.closed)return;this.closed=true;this.latest=null;
    try{await this.reader?.cancel();}catch{}
    try{this.reader?.releaseLock();}catch{}
    try{this.writer?.releaseLock();}catch{}
    try{await this.port?.close();}catch{}
    this.port=null;this.reader=null;this.writer=null;this.onStatus('USB CDC disconnected');
  }
}
export class LocalBridgeTransport{
  constructor(onFrame,onStatus){this.onFrame=onFrame;this.onStatus=onStatus;this.decoder=new TelemetryDecoder();}
  connect(){
    this.ws=new WebSocket('ws://127.0.0.1:8765');this.ws.binaryType='arraybuffer';
    this.ws.onopen=()=>{this.decoder.reset();this.onStatus('Local bridge connected');};
    this.ws.onclose=()=>this.onStatus('Local bridge disconnected');
    this.ws.onerror=()=>this.onStatus('Local bridge unavailable');
    this.ws.onmessage=evt=>{const bytes=typeof evt.data==='string'?new TextEncoder().encode(evt.data):new Uint8Array(evt.data);
      for(const item of this.decoder.push(bytes))this.onFrame(item);};
  }
  sendLed(rgb,seq){if(this.ws?.readyState===WebSocket.OPEN&&this.ws.bufferedAmount<=404)this.ws.send(encodeLedFrame(rgb,seq));}
  async disconnect(){this.ws?.close();this.ws=null;}
}
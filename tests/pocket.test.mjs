import assert from 'node:assert/strict';
import test from 'node:test';
import {crc16,encodeLedFrame,decodeLedFrame,TelemetryDecoder,newerSequence} from '../web/pocket/protocol.mjs';
import {MotionMapper} from '../web/pocket/motion.mjs';
import {dimRgb,previewFallback} from '../web/pocket/led.mjs';
const imu=(seq,extra={})=>JSON.stringify({v:1,type:'imu',seq,ms:seq,roll:10,pitch:-20,yawRate:50,shake:false,touch:0,boot:false,...extra})+'\n';
test('CRC reference and LED frame roundtrip',()=>{
  assert.equal(crc16(new TextEncoder().encode('123456789')),0x29b1);
  const rgb=Uint8Array.from({length:192},(_,i)=>i),frame=encodeLedFrame(rgb,65535);
  assert.equal(frame.length,202);assert.deepEqual(decodeLedFrame(frame).rgb,rgb);
  assert.equal(decodeLedFrame(frame).seq,65535);frame[20]^=1;assert.equal(decodeLedFrame(frame),null);
});
test('fragmentation, stale packets, rollover, malformed input',()=>{
  const d=new TelemetryDecoder(),enc=new TextEncoder(),b=enc.encode(imu(65535));
  assert.deepEqual(d.push(b.slice(0,6)),[]);assert.equal(d.push(b.slice(6)).length,1);
  assert.deepEqual(d.push(enc.encode(imu(0)+imu(0)+imu(1))).map(x=>x.seq),[0,1]);
  assert.equal(d.stale,1);assert.equal(newerSequence(65535,1),false);
  assert.deepEqual(d.push(enc.encode('{invalid}\n')) ,[]);
  assert.deepEqual(d.push(enc.encode(imu(2,{roll:999}))),[]);
  d.push(enc.encode('a'.repeat(600)));assert.ok(d.pending.length<=512);
});
test('motion smoothing, recenter and gesture edges',()=>{
  const m=new MotionMapper(),raw=(extra={})=>({roll:35,pitch:35,yawRate:400,shake:false,touch:0,boot:false,...extra});
  assert.ok(m.update(raw(),100).motion.x>0);
  assert.equal(m.update(raw({boot:true}),150).recenter,true);
  const shot=m.update(raw({boot:false,shake:true,touch:3}),200);
  assert.equal(shot.shake,true);assert.equal(shot.next,true);assert.equal(shot.previous,true);
  assert.equal(m.update(raw({shake:true,touch:3}),220).shake,false);
  assert.equal(m.idle().magnitude,0);
});
test('LED brightness bounded with procedural fallback',()=>{
  const rgb=previewFallback({x:0,y:0,twist:0},4);assert.equal(rgb.length,192);
  assert.ok(Math.max(...dimRgb(Uint8Array.from({length:192},()=>255)))<=46);
  assert.throws(()=>dimRgb(rgb,1));
});

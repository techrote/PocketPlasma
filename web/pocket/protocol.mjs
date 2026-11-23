// PocketPlasma serial protocol v1. Pure, host-testable.
export const VERSION=1, LED_BYTES=192, LED_FRAME_BYTES=202;
export function crc16(buf,start=0,end=buf.length){
  let crc=0xffff;
  for(let i=start;i<end;i++){
    crc^=buf[i]<<8;
    for(let b=0;b<8;b++) crc=(crc&0x8000)?((crc<<1)^0x1021)&65535:(crc<<1)&65535;
  }
  return crc;
}
export function encodeLedFrame(rgb,seq){
  if(!(rgb instanceof Uint8Array)||rgb.length!==LED_BYTES||!Number.isInteger(seq)||seq<0||seq>65535) throw new RangeError('LED frame');
  const out=new Uint8Array(LED_FRAME_BYTES);
  out.set([0xa5,0x5a,1,0x4c,seq&255,seq>>>8,192,0]);out.set(rgb,8);
  const crc=crc16(out,2,200);out[200]=crc&255;out[201]=crc>>>8;return out;
}
export function decodeLedFrame(buf){
  if(!(buf instanceof Uint8Array)||buf.length!==LED_FRAME_BYTES||buf[0]!==0xa5||buf[1]!==0x5a||
     buf[2]!==1||buf[3]!==0x4c||buf[6]!==192||buf[7]!==0)return null;
  const crc=crc16(buf,2,200);
  if(buf[200]!== (crc&255)||buf[201]!==crc>>>8)return null;
  return {seq:buf[4]|buf[5]<<8,rgb:buf.slice(8,200)};
}
export function newerSequence(seq,prev){
  const dist=(seq-prev+65536)&65535;
  return prev===null||(dist>0&&dist<32768);
}
export function validateTelemetry(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||value.v!==VERSION)return null;
  if(value.type==='hello') return value.device==='PocketPlasma-S3'&&value.leds===64?value:null;
  if(value.type!=='imu'||!Number.isInteger(value.seq)||value.seq<0||value.seq>65535||
     !Number.isInteger(value.ms)||value.ms<0||value.ms>0xffffffff||
     !Number.isInteger(value.touch)||value.touch<0||value.touch>3||
     typeof value.boot!=='boolean'||typeof value.shake!=='boolean')return null;
  for(const [k,limit] of [['pitch',180],['roll',180],['yawRate',4000]]){
    if(typeof value[k]!=='number'||!Number.isFinite(value[k])||Math.abs(value[k])>limit)return null;
  }
  return value;
}
export class TelemetryDecoder{
  constructor(){this.decoder=new TextDecoder();this.pending='';this.seq=null;this.invalid=0;this.stale=0;}
  reset(){this.decoder=new TextDecoder();this.pending='';this.seq=null;}
  push(bytes){
    if(!(bytes instanceof Uint8Array))throw new TypeError('Uint8Array required');
    if(bytes.length>8192){this.pending='';this.invalid++;return [];}
    this.pending+=this.decoder.decode(bytes,{stream:true});
    const lines=this.pending.split('\n');this.pending=lines.pop();
    if(this.pending.length>512){this.pending='';this.invalid++;}
    const out=[];
    for(const line of lines.slice(-64)){
      if(!line||line.length>512){this.invalid++;continue;}
      let value;try{value=validateTelemetry(JSON.parse(line.trim()));}catch{}
      if(!value){this.invalid++;continue;}
      if(value.type==='hello'){this.seq=null;out.push(value);continue;}
      if(!newerSequence(value.seq,this.seq)){this.stale++;continue;}
      this.seq=value.seq;out.push(value);
    }
    return out;
  }
}
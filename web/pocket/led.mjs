import {LED_BYTES} from './protocol.mjs';
export function dimRgb(rgb,brightness=0.18){
  if(!(rgb instanceof Uint8Array)||rgb.length!==LED_BYTES||!Number.isFinite(brightness)||brightness<0||brightness>0.25)throw new RangeError('unsafe LED frame');
  return Uint8Array.from(rgb,v=>Math.round(v*brightness));
}
export function previewFallback(motion,t){
  const rgb=new Uint8Array(LED_BYTES);
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){
    const u=x/8,v=y/8,a=Math.sin(u*(9+6*motion.x)+t)+Math.sin(v*(11+5*motion.y)-t*.71);
    const b=Math.sin((u+v)*13+t*.5+a),i=(y*8+x)*3;
    rgb[i]=Math.round(128+110*Math.sin(a+t*.1));
    rgb[i+1]=Math.round(128+110*Math.sin(b+2.1));
    rgb[i+2]=Math.round(128+110*Math.sin(a+b+4.2));
  }
  return rgb;
}
export function paintPreview(canvas,rgb){
  const ctx=canvas.getContext('2d');if(!ctx)return;
  canvas.width=8;canvas.height=8;
  const image=ctx.createImageData(8,8);
  for(let i=0;i<64;i++){image.data[i*4]=rgb[i*3];image.data[i*4+1]=rgb[i*3+1];image.data[i*4+2]=rgb[i*3+2];image.data[i*4+3]=255;}
  ctx.putImageData(image,0,0);
}
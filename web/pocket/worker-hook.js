/* Appended to a staged copy of PlasmaTerm's web/plasma-worker.js. */
let pocketRelease=null;
self.addEventListener('message',({data})=>{
  if(!runtime||!data)return;
  if(data.type==='pocketMotion'){
    const m=data.motion;
    if(!m||!['x','y','twist','magnitude'].every(k=>typeof m[k]==='number'&&Number.isFinite(m[k])&&Math.abs(m[k])<=1))return;
    try{runtime.pocket_set_motion(m.x,m.y,m.twist,m.magnitude);}catch{}
  }else if(data.type==='pocketCommand'&&['I','K','P'].includes(data.key)){
    if(pocketRelease!==null)clearTimeout(pocketRelease);
    for(const key of ['I','K','P'])runtime.handle_key_event('up',key);
    runtime.handle_key_event('down',data.key);
    const key=data.key;
    pocketRelease=setTimeout(()=>{runtime?.handle_key_event('up',key);pocketRelease=null;},120);
  }
});
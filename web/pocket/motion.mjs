// Calibrated 6-axis gesture mapping; never integrates yaw into a fake heading.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function axis(deg){const mag=clamp((Math.abs(deg)-3)/32,0,1);return Math.sign(deg)*mag;}
export class MotionMapper{
  constructor(){this.neutral={pitch:0,roll:0};this.filtered={x:0,y:0,twist:0,magnitude:0};this.last=null;this.lastShake=-Infinity;this.shakeHeld=false;this.touch=0;this.bootHeld=false;}
  center(p){this.neutral={pitch:p.pitch,roll:p.roll};this.filtered={x:0,y:0,twist:0,magnitude:0};this.last=null;}
  update(p,now){
    if(![p.pitch,p.roll,p.yawRate,now].every(Number.isFinite))throw new RangeError('IMU not finite');
    const recenter=!!p.boot&&!this.bootHeld;this.bootHeld=!!p.boot;
    if(recenter)this.center(p);
    const x=axis(p.roll-this.neutral.roll),y=axis(p.pitch-this.neutral.pitch),twist=clamp(p.yawRate/200,-1,1);
    const desired={x,y,twist,magnitude:clamp(Math.hypot(x,y),0,1)};
    const dt=this.last===null?40:clamp(now-this.last,0,250),a=1-Math.exp(-dt/90);
    this.last=now;
    for(const k of Object.keys(desired))this.filtered[k]+=(desired[k]-this.filtered[k])*a;
    const touch=p.touch&3,previous=!!(touch&1)&&!(this.touch&1),next=!!(touch&2)&&!(this.touch&2);
    this.touch=touch;
    const rising=!!p.shake&&!this.shakeHeld;this.shakeHeld=!!p.shake;
    const shake=rising&&now-this.lastShake>=1800;if(shake)this.lastShake=now;
    return {motion:{...this.filtered},recenter,previous,next,shake};
  }
  idle(){this.filtered={x:0,y:0,twist:0,magnitude:0};this.last=null;this.touch=0;this.shakeHeld=false;this.bootHeld=false;return {...this.filtered};}
}
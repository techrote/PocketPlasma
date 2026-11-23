/* PocketPlasma controls — independent WebSerial, local bridge, simulator and LED mirror. */
import {MotionMapper} from './motion.mjs';
import {dimRgb,previewFallback,paintPreview} from './led.mjs';
import {WebSerialTransport,LocalBridgeTransport} from './transport.mjs';

const root=document.createElement('section');
root.id='pocket-controller';root.setAttribute('aria-label','PocketPlasma controller');
root.innerHTML=[
 '<header><strong>POCKET // PLASMA</strong><span id="pp-mode">SIM</span><button id="pp-collapse">−</button></header>',
 '<div id="pp-body"><div class="pp-row"><button id="pp-usb">Connect USB</button><button id="pp-bridge">Local bridge</button><button id="pp-sim">Simulate</button></div>',
 '<label>ROLL <output id="pp-roll-o">0°</output><input id="pp-roll" type="range" min="-45" max="45" value="0"></label>',
 '<label>PITCH <output id="pp-pitch-o">0°</output><input id="pp-pitch" type="range" min="-45" max="45" value="0"></label>',
 '<label>TWIST RATE <output id="pp-twist-o">0°/s</output><input id="pp-twist" type="range" min="-250" max="250" value="0"></label>',
 '<div class="pp-row"><button id="pp-center">Re-centre</button><button id="pp-prev">Prev LUT</button><button id="pp-next">Next LUT</button><button id="pp-shake">Shake!</button></div>',
 '<div class="pp-preview"><canvas id="pp-led" width="8" height="8" aria-label="LED mirror preview"></canvas><div id="pp-status" role="status">Simulator ready<small id="pp-info" style="display:block">No hardware required</small><button id="pp-stage">Stage view</button></div></div></div>'
].join('');
document.body.append(root);
const $=id=>root.querySelector('#'+id);
const roll=$('pp-roll'),pitch=$('pp-pitch'),twist=$('pp-twist');
let mode='sim',device=null,mapper=new MotionMapper(),raw={roll:0,pitch:0,yawRate:0,boot:false,touch:0,shake:false};
let stale=false,lastSample=0,lastSim=0,lastLed=0,seq=0,lastMotion={x:0,y:0,twist:0,magnitude:0},count=0,ledSource='fallback';
const status=message=>{$('pp-status').firstChild.textContent=String(message).slice(0,140);};
const plasma=()=>window.__pocketPlasmaBridge;
function move(motion){lastMotion=motion;plasma()?.motion(motion);}
function command(name){if(!plasma()?.command(name))status('PlasmaTerm worker not ready');}
function onSample(frame,now){
  raw=frame;lastSample=now;stale=false;
  const result=mapper.update(frame,now);move(result.motion);
  if(result.shake)command('randomize');if(result.previous)command('previous');if(result.next)command('next');
  if(result.recenter)status('Neutral orientation captured');
  if(mode!=='sim'){$('pp-info').textContent='IMU '+(++count)+' · R'+Math.round(frame.roll)+'° P'+Math.round(frame.pitch)+'° Z'+Math.round(frame.yawRate)+'°/s';}
}
function onFrame(frame){if(frame.type==='hello'){status('Connected: '+frame.device+' / 64 RGB');return;}if(frame.type==='imu')onSample(frame,performance.now());}
function onStatus(s){status(s);}
function updateMode(){
  $('pp-mode').textContent=mode==='sim'?'SIM':mode==='usb'?'USB':'BRIDGE';
  for(const slider of [roll,pitch,twist])slider.disabled=mode!=='sim';
}
async function disconnect(){
  const old=device;device=null;
  if(old)await old.disconnect();
  move(mapper.idle());
}
function simulate(){
  mode='sim';updateMode();void disconnect();mapper=new MotionMapper();
  status('Simulator ready · move sliders');$('pp-info').textContent='No hardware required';
}
async function connectUsb(){
  if(!WebSerialTransport.supported()){status('WebSerial unavailable in this CEF/browser. Try Local bridge.');return;}
  if(device)void disconnect();
  const candidate=new WebSerialTransport(onFrame,onStatus);
  try{
    // First await is inside connect, after requestPort has run on this click gesture.
    await candidate.connect();device=candidate;mode='usb';mapper=new MotionMapper();
    lastSample=performance.now();updateMode();
  }catch(error){status('USB: '+error.message);mode='sim';updateMode();}
}
function connectBridge(){
  if(device)void disconnect();
  const candidate=new LocalBridgeTransport(onFrame,onStatus);
  try{candidate.connect();device=candidate;mode='bridge';mapper=new MotionMapper();lastSample=performance.now();updateMode();}
  catch(error){status('Bridge: '+error.message);mode='sim';updateMode();}
}
$('pp-usb').addEventListener('click',()=>{void connectUsb();});
$('pp-bridge').addEventListener('click',connectBridge);
$('pp-sim').addEventListener('click',simulate);
$('pp-center').addEventListener('click',()=>{mapper.center(raw);move(mapper.idle());status('Neutral captured');});
$('pp-prev').addEventListener('click',()=>command('previous'));
$('pp-next').addEventListener('click',()=>command('next'));
$('pp-shake').addEventListener('click',()=>command('randomize'));
$('pp-stage').addEventListener('click',()=>document.querySelector('#visual-mode')?.click());
$('pp-collapse').addEventListener('click',()=>{
 const collapsed=root.classList.toggle('collapsed');$('pp-collapse').textContent=collapsed?'+':'−';
});
for(const [id,slider] of [['pp-roll',roll],['pp-pitch',pitch],['pp-twist',twist]]){
 slider.addEventListener('input',()=>{$(id+'-o').textContent=slider.value+'°'+(slider===twist?'/s':'');});
}
function frame(now){
  if(mode==='sim'&&now-lastSim>=33){
    lastSim=now;raw={roll:Number(roll.value),pitch:Number(pitch.value),yawRate:Number(twist.value),
      boot:false,touch:0,shake:false};
    onSample(raw,now);$('pp-info').textContent='X '+lastMotion.x.toFixed(2)+' · Y '+lastMotion.y.toFixed(2)+' · Twist '+lastMotion.twist.toFixed(2);
  }
  if(mode!=='sim'&&now-lastSample>750&&!stale){
    stale=true;move(mapper.idle());status('IMU stale: plasma neutral; LED watchdog engaged');
  }
  if(now-lastLed>=100){
    lastLed=now;
    let rgb=plasma()?.sampleLed?.();
    ledSource=rgb?'live-xterm':'fallback';
    if(!rgb)rgb=previewFallback(lastMotion,now/700);
    paintPreview($('pp-led'),rgb);
    if(device&&!stale)device.sendLed(dimRgb(rgb),seq++&65535);
  }
  requestAnimationFrame(frame);
}
updateMode();window.__pocketDiagnostics=()=>({mode,stale,count,ledSource,plasmaReady:Boolean(plasma()?.ready)});
window.addEventListener('beforeunload',()=>{void disconnect();});
requestAnimationFrame(frame);

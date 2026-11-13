// AMPEX Studio 1956 — core transport state, physics and sound.
// Other modules (desk.js, photo.js, edit.js, studio.js) read and wrap these globals.
const $=s=>document.querySelector(s);

// ---- shared state -----------------------------------------------------------
let power=true, mode='stop', position=0, sound=true, tracking=0, source='studio';
let loaded='studio', tilt=.22, zoom=1, pressed='', pressedUntil=0;
const TAPE_SECONDS=1800;                 // programme length on the reel (30 min)
// A real reel: clear leader at both ends of the programme. "position" is the tape
// coordinate (programme seconds) at the take-up end of the threaded path, so the
// tape can run completely off the supply reel, or be rewound completely off the
// take-up reel, leaving the path empty.
const LEADER=12, PATH_SECONDS=1.837;          // leader length; tape held by the path (490 px at 15 in/s)
const TAPE_FIRST=-LEADER, TAPE_LAST=TAPE_SECONDS+LEADER;
const POS_MIN=TAPE_FIRST-PATH_SECONDS, POS_MAX=TAPE_LAST;
const SPOOL=220;                              // whole reel wound end to end in ≈ 9 s
// Linear tape speed actually being transported, in programme-seconds per second.
// Reels and capstan have inertia, so this follows the selected mode smoothly.
let tapeSpeed=0;
const reelAngle=[0,0];                   // radians, per reel
let angle=0;                             // legacy mirror of reel 0, in degrees

// ---- toast ------------------------------------------------------------------
let toastTimer;
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300)}

// ---- sound ------------------------------------------------------------------
// Everything is synthesised locally once the visitor first interacts.
let audio=null, sfx=null;
function noiseBuffer(ctx,seconds,color){
 const len=Math.floor(ctx.sampleRate*seconds), buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
 let b0=0,b1=0,b2=0;
 for(let i=0;i<len;i++){const w=Math.random()*2-1;
  if(color==='pink'){b0=.99765*b0+w*.099046;b1=.963*b1+w*.2965164;b2=.57*b2+w*1.0526913;d[i]=(b0+b1+b2+w*.1848)*.16}
  else d[i]=w}
 return buf;
}
function initAudio(){
 if(audio)return;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 audio=new AC();
 const master=audio.createGain();master.gain.value=sound?1:0;
 const comp=audio.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;
 master.connect(comp).connect(audio.destination);
 const pink=noiseBuffer(audio,3,'pink'), white=noiseBuffer(audio,1,'white');
 const loop=(buf)=>{const s=audio.createBufferSource();s.buffer=buf;s.loop=true;s.start();return s};
 // Mains transformer hum (US 60 Hz) — faint whenever the machine is powered.
 const hum=audio.createGain();hum.gain.value=0;hum.connect(master);
 for(const [f,a] of [[60,.5],[120,.35],[180,.12]]){const o=audio.createOscillator();o.frequency.value=f;const g=audio.createGain();g.gain.value=a;o.connect(g).connect(hum);o.start()}
 // Quadruplex head drum: four heads on a wheel at 240 rev/s (14 400 rpm).
 const drum=audio.createGain();drum.gain.value=0;
 const drumTone=audio.createBiquadFilter();drumTone.type='lowpass';drumTone.frequency.value=2400;
 drumTone.connect(drum);drum.connect(master);
 const drumOsc=[];
 for(const [m,a,type] of [[1,.30,'sine'],[2,.18,'sine'],[4,.09,'triangle'],[8,.035,'sine']]){const o=audio.createOscillator();o.type=type;o.frequency.value=0;const g=audio.createGain();g.gain.value=a;o.connect(g).connect(drumTone);o.start();drumOsc.push([o,m])}
 const air=loop(pink);const airBand=audio.createBiquadFilter();airBand.type='bandpass';airBand.frequency.value=3200;airBand.Q.value=.8;const airGain=audio.createGain();airGain.gain.value=.25;air.connect(airBand).connect(airGain).connect(drumTone);
 // Capstan & reel motors plus the rush of tape over the guides.
 const wind=audio.createGain();wind.gain.value=0;wind.connect(master);
 const windNoise=loop(pink);const windBand=audio.createBiquadFilter();windBand.type='bandpass';windBand.frequency.value=400;windBand.Q.value=.7;
 windNoise.connect(windBand).connect(wind);
 const motor=audio.createOscillator();motor.type='sawtooth';motor.frequency.value=30;const motorTone=audio.createBiquadFilter();motorTone.type='lowpass';motorTone.frequency.value=260;const motorGain=audio.createGain();motorGain.gain.value=.0;motor.connect(motorTone).connect(motorGain).connect(master);motor.start();
 // Tape hiss heard through the monitor speaker during playback.
 const hiss=audio.createGain();hiss.gain.value=0;const hissSrc=loop(white);const hissHp=audio.createBiquadFilter();hissHp.type='highpass';hissHp.frequency.value=4500;hissSrc.connect(hissHp).connect(hiss).connect(master);
 sfx={master,hum,drum,drumOsc,wind,windBand,motor,motorGain,motorTone,hiss,white,pink,drumHz:0};
}
// Heavy transport solenoid / relay: a dull thump with a short metallic snap.
function relaySound(strength=1){
 if(!sound)return;initAudio();if(!audio)return;audio.resume();
 const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
 o.type='sine';o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(42,t+.09);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.32*strength,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.16);
 o.connect(g).connect(sfx.master);o.start(t);o.stop(t+.18);
 const n=audio.createBufferSource();n.buffer=sfx.white;const bp=audio.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2600;bp.Q.value=1.4;
 const ng=audio.createGain();ng.gain.setValueAtTime(.22*strength,t);ng.gain.exponentialRampToValueAtTime(.0001,t+.035);
 n.connect(bp).connect(ng).connect(sfx.master);n.start(t,Math.random()*.5,.05);
 // a second, softer contact closing a few milliseconds later
 const n2=audio.createBufferSource();n2.buffer=sfx.white;const g2=audio.createGain();g2.gain.setValueAtTime(.09*strength,t+.028);g2.gain.exponentialRampToValueAtTime(.0001,t+.05);
 n2.connect(bp);bp.connect(g2).connect(sfx.master);n2.start(t+.028,Math.random()*.5,.03);
}
// The free end of the tape flicking against the reel and deck.
function slapSound(strength){
 if(!sound||!sfx||audio.state!=='running')return;
 const t=audio.currentTime,n=audio.createBufferSource(),bp=audio.createBiquadFilter(),g=audio.createGain();
 n.buffer=sfx.white;bp.type='bandpass';bp.frequency.value=1400+Math.random()*500;bp.Q.value=1.1;
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.09*strength+.01,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.05);
 n.connect(bp).connect(g).connect(sfx.master);n.start(t,Math.random()*.5,.06);
}
// Light switch / panel button click for interface controls.
function clickSound(){
 if(!sound)return;initAudio();if(!audio)return;audio.resume();
 const t=audio.currentTime,n=audio.createBufferSource();n.buffer=sfx.white;
 const hp=audio.createBiquadFilter();hp.type='highpass';hp.frequency.value=1800;
 const g=audio.createGain();g.gain.setValueAtTime(.16,t);g.gain.exponentialRampToValueAtTime(.0001,t+.025);
 n.connect(hp).connect(g).connect(sfx.master);n.start(t,Math.random()*.5,.03);
}
function audioUpdate(){
 if(!sfx)return;const t=audio.currentTime,on=power&&sound;
 sfx.master.gain.setTargetAtTime(sound?1:0,t,.05);
 sfx.hum.gain.setTargetAtTime(on?.0045:0,t,.3);
}
// Called every animation frame: drum spin-up/down and wind noise follow the mechanics.
function audioFrame(dt){
 if(!sfx||audio.state!=='running')return;
 const t=audio.currentTime;
 const drumOn=power&&loaded&&(mode==='play'||mode==='record'||mode==='pause');
 // The head wheel takes a couple of seconds to reach speed and longer to coast down.
 sfx.drumHz+=((drumOn?240:0)-sfx.drumHz)*(1-Math.exp(-dt*(drumOn?1.3:.55)));
 for(const [o,m] of sfx.drumOsc)o.frequency.setTargetAtTime(sfx.drumHz*m,t,.03);
 sfx.drum.gain.setTargetAtTime(power?Math.min(1,sfx.drumHz/240)**2*.05:0,t,.08);
 const s=Math.abs(tapeSpeed),fast=Math.min(1,Math.sqrt(s/SPOOL));
 sfx.wind.gain.setTargetAtTime(power?(s>0.02?.012+fast*.11:0):0,t,.06);
 sfx.windBand.frequency.setTargetAtTime(260+fast*1900,t,.08);
 sfx.motor.frequency.setTargetAtTime(28+fast*95,t,.08);
 sfx.motorTone.frequency.setTargetAtTime(180+fast*600,t,.1);
 sfx.motorGain.gain.setTargetAtTime(power&&s>.02?.006+fast*.02:0,t,.08);
 sfx.hiss.gain.setTargetAtTime(power&&(mode==='play'||mode==='record')&&s>.9?.0035:0,t,.12);
}

// ---- transport ----------------------------------------------------------------
const STATE_TEXT={stop:'READY',pause:'PAUSE',play:'PLAYBACK',record:'● RECORDING',rewind:'REWINDING',forward:'FAST FORWARD'};
const SPEED_TEXT={stop:'15 IPS · STANDBY',pause:'TAPE HELD',play:'15 IPS · RUNNING',record:'15 IPS · RUNNING',rewind:'SPOOLING',forward:'SPOOLING'};
function setMode(m){
 if(m!=='stop'&&document.body.classList.contains('changing-reel'))return;
 if(!power){if(m!=='stop')toast('Ανοίξτε πρώτα την τροφοδοσία.');return}
 if(!loaded&&m!=='stop'){toast('Επιλέξτε μια μπομπίνα από το ράφι.');return}
 if(m==='rewind'&&position<=POS_MIN+.01){toast('Όλη η ταινία είναι ήδη στην αριστερή μπομπίνα.');return}
 if((m==='forward'||m==='play'||m==='record')&&position>=POS_MAX-.01){toast('Η ταινία τελείωσε. Πατήστε REW για να τη γυρίσετε πίσω.');return}
 if(m!=='stop'&&m!=='pause')reelCoast[0]=reelCoast[1]=0;
 pressed=m;pressedUntil=performance.now()+180;
 if(m===mode)return;
 if(m==='record')toast('REC · προσομοίωση εγγραφής');
 mode=m;relaySound(m==='stop'?1.1:.9);
 $('#state').textContent=STATE_TEXT[m];$('#speed').textContent=SPEED_TEXT[m];
 audioUpdate();
}
function targetSpeed(){
 if(!power||!loaded)return 0;
 return mode==='play'||mode==='record'?1:mode==='forward'?SPOOL:mode==='rewind'?-SPOOL:0;
}
// Capstan drive engages almost instantly; reel motors spool up and brake gradually.
// At either end the tape simply runs out: the tail whips off the reel, the
// tape-out switch drops the transport to STOP and the freed reels coast down.
const reelCoast=[0,0];
function stepTransport(dt){
 const goal=targetSpeed();let s=tapeSpeed;
 const spooling=Math.abs(goal)>1||Math.abs(s)>1.2;
 const accel=spooling?(Math.abs(goal)>Math.abs(s)?165:260):6;
 const step=accel*dt;
 s=Math.abs(goal-s)<=step?goal:s+Math.sign(goal-s)*step;
 tapeSpeed=s;
 position+=s*dt;
 if((position<=POS_MIN&&s<0)||(position>=POS_MAX&&s>0)){
  const atEnd=position>=POS_MAX;
  for(let i=0;i<2;i++)reelCoast[i]=-s*RADII_PER_SECOND/packRadius(i)*(atEnd===!!i?1:.35);
  position=atEnd?POS_MAX:POS_MIN;tapeSpeed=0;tailSlap=0;
  setMode('stop');
  toast(atEnd?'Τέλος ταινίας: όλη η ταινία πέρασε στη δεξιά μπομπίνα.':'Η ταινία τυλίχτηκε ολόκληρη στην αριστερή μπομπίνα.');
 }
}
// how much tape each reel holds (0…1) and the tape coordinate at each end of the path
function tapeAtSupply(){return position+PATH_SECONDS}
function heldFraction(i){
 const total=TAPE_LAST-TAPE_FIRST;
 return i?Math.max(0,Math.min(1,(Math.min(position,TAPE_LAST)-TAPE_FIRST)/total))
         :Math.max(0,Math.min(1,(TAPE_LAST-Math.max(tapeAtSupply(),TAPE_FIRST))/total));
}

// ---- controls -----------------------------------------------------------------
function updateTime(){let s=Math.floor(Math.max(0,Math.min(TAPE_SECONDS,position)));$('#time').textContent=[Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':');$('#seek').value=Math.max(0,Math.min(TAPE_SECONDS,position))}
function focusMonitor(){$('#monitor').classList.toggle('focused')}
$('#power').onclick=()=>{
 if(power)setMode('stop');power=!power;
 document.body.classList.toggle('powered',power);document.body.classList.toggle('off',!power);
 $('#power').setAttribute('aria-pressed',power);$('#power').textContent=power?'I':'O';$('#powerText').textContent=power?'ON':'OFF';
 $('#state').textContent=power?'READY':'POWER OFF';relaySound(1.2);audioUpdate();
 if(typeof syncTransportKeys==='function')syncTransportKeys()};
$('#sound').onclick=()=>{sound=!sound;if(sound){initAudio();audio&&audio.resume()}$('#sound').textContent=sound?'Ήχος · Ναι':'Ήχος · Όχι';$('#sound').setAttribute('aria-pressed',sound);clickSound();audioUpdate()};
$('#seek').oninput=e=>{if(Math.abs(tapeSpeed)>1.2)return;position=+e.target.value;updateTime()};
$('#tracking').oninput=e=>{tracking=+e.target.value;$('#trackVal').textContent=(tracking>0?'+':'')+String(tracking).padStart(2,'0');$('#signal').textContent=Math.abs(tracking)<8?'● Σταθερό σήμα':Math.abs(tracking)<26?'◌ Ρυθμίστε το tracking':'◌ Ασταθές σήμα'};
$('#monitor').onclick=focusMonitor;
$('#monitor').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();focusMonitor()}};
let pointerFocus=null;
addEventListener('pointerdown',e=>{pointerFocus=e.target.closest&&e.target.closest('button')},true);
addEventListener('keydown',e=>{if(e.key==='Tab')pointerFocus=null},true);
document.addEventListener('keydown',e=>{
 if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
 if(document.querySelector('dialog[open]'))return;
 if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 // A button clicked with the mouse keeps focus, and Space would press it again.
 // Only a button reached with the keyboard keeps Space/Enter for itself.
 if(e.target.tagName==='BUTTON'){if(e.target!==pointerFocus)return;e.target.blur();pointerFocus=null}
 if(e.code==='Space'){e.preventDefault();setMode(mode==='play'?'stop':'play')}
 else if(e.key==='ArrowLeft'){e.preventDefault();setMode('rewind')}
 else if(e.key==='ArrowRight'){e.preventDefault();setMode('forward')}
 else if(e.key==='p'||e.key==='P')setMode(mode==='pause'?'play':'pause')
 else if(e.key==='s'||e.key==='S')setMode('stop')
 else if(e.key==='r'||e.key==='R')setMode('record')});
// Browsers keep audio suspended until a gesture; start it on the first one.
['pointerdown','keydown'].forEach(t=>addEventListener(t,()=>{if(sound){initAudio();audio&&audio.resume().then(audioUpdate)}},{once:true,capture:true}));

// ---- monitor canvas (replaced with the programme player in studio.js) -----------
const c=$('#screen'),ctx=c.getContext('2d');
function draw(){ctx.fillStyle='#050b08';ctx.fillRect(0,0,c.width,c.height)}

// ---- main clock -------------------------------------------------------------------
// Speed of the oxide surface expressed in reel-flange radii per programme-second:
// 15 in/s on a 12½-inch reel (6.25 in radius) → 2.4 radii per second.
const RADII_PER_SECOND=15/6.25, CORE=.27, FULL=.98;
function packRadius(i){return Math.sqrt(CORE*CORE+heldFraction(i)*(FULL*FULL-CORE*CORE))}
let tailSlap=0;
let last=performance.now(),tick=0;
function frame(now){
 const dt=Math.min((now-last)/1000,.1);last=now;
 const was=position;
 stepTransport(dt);
 // Each reel turns at tape speed divided by its own wound radius: the nearly
 // empty reel spins much faster than the full one.
 for(let i=0;i<2;i++){
  reelAngle[i]+=(-tapeSpeed*RADII_PER_SECOND/packRadius(i)+reelCoast[i])*dt;
  reelCoast[i]*=Math.exp(-dt*(i===(position>=POS_MAX?1:0)?1.5:3.5));
  if(Math.abs(reelCoast[i])<.05)reelCoast[i]=0;
 }
 // the loose tail slaps the deck once per turn of the coasting full reel
 const full=position>=POS_MAX?1:position<=POS_MIN?0:-1;
 if(full>=0&&Math.abs(reelCoast[full])>3){tailSlap+=Math.abs(reelCoast[full])*dt/(2*Math.PI);if(tailSlap>=1){tailSlap-=1;slapSound(Math.min(1,Math.abs(reelCoast[full])/60))}}
 angle=reelAngle[0]*180/Math.PI;
 if(position!==was)updateTime();
 if(window.runEditDesk)window.runEditDesk();
 audioFrame(dt);
 if(now-tick>40){tick=now;draw(position+now/1000*.1)}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

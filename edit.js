// Quiet late-night lounge jazz, synthesised locally once the music switch is on.
// Electric-piano voicings, brushed snare, walking bass and a little musicRoom reverb,
// kept well underneath the machine so every relay, whine and click stays audible.
let musicOn=false,musicBus=null,musicTimer=null,nextBeat=0,beatNumber=0,musicRoom=null,brushBuf=null;
const TEMPO=78;
// ii–V–I turns in F with a few colour chords (MIDI notes, rootless voicings + root)
const chords=[
 [43,53,57,60,64],[36,52,55,58,62],[41,52,57,60,64],[38,53,57,60,64],
 [43,53,57,60,64],[36,52,55,58,61],[41,52,57,60,62],[41,51,55,58,62],
 [46,50,53,57,62],[46,49,53,56,60],[45,52,55,60,64],[38,53,57,60,64],
 [43,53,57,60,64],[36,52,55,58,62],[41,52,57,60,64],[36,52,55,58,62]
];
function midiHz(n){return 440*Math.pow(2,(n-69)/12)}
function ensureRoom(){
 if(musicRoom)return;
 // a short, dark plate-like reverb made from decaying noise
 const len=Math.floor(audio.sampleRate*2.2),ir=audio.createBuffer(2,len,audio.sampleRate);
 for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)*.6}
 musicRoom=audio.createConvolver();musicRoom.buffer=ir;
 const wet=audio.createGain();wet.gain.value=.28;musicRoom.connect(wet).connect(musicBus);
 brushBuf=audio.createBuffer(1,Math.floor(audio.sampleRate*.6),audio.sampleRate);
 const bd=brushBuf.getChannelData(0);for(let i=0;i<bd.length;i++)bd[i]=Math.random()*2-1;
}
function send(node,dry=1,wet=.6){const d=audio.createGain();d.gain.value=dry;node.connect(d).connect(musicBus);const w=audio.createGain();w.gain.value=wet;node.connect(w).connect(musicRoom)}
// Rhodes-like tine: sine fundamental, soft bell partial, slow amplitude tremolo
function keys(at,pitch,dur,level){
 const f=midiHz(pitch),o1=audio.createOscillator(),o2=audio.createOscillator(),env=audio.createGain(),bell=audio.createGain(),trem=audio.createOscillator(),tg=audio.createGain();
 o1.type='sine';o1.frequency.value=f;o2.type='sine';o2.frequency.value=f*3.01;
 bell.gain.setValueAtTime(level*.35,at);bell.gain.exponentialRampToValueAtTime(.0001,at+.35);
 env.gain.setValueAtTime(.0001,at);env.gain.exponentialRampToValueAtTime(level,at+.02);env.gain.exponentialRampToValueAtTime(level*.45,at+.4);env.gain.exponentialRampToValueAtTime(.0001,at+dur);
 trem.frequency.value=4.6;tg.gain.value=level*.18;trem.connect(tg).connect(env.gain);
 o1.connect(env);o2.connect(bell).connect(env);send(env,.9,.5);
 for(const o of [o1,o2,trem]){o.start(at);o.stop(at+dur+.05)}
 o1.onended=()=>{env.disconnect();bell.disconnect();tg.disconnect()};
}
function bass(at,pitch,dur){
 const o=audio.createOscillator(),lp=audio.createBiquadFilter(),env=audio.createGain();
 o.type='triangle';o.frequency.value=midiHz(pitch);lp.type='lowpass';lp.frequency.value=520;
 env.gain.setValueAtTime(.0001,at);env.gain.exponentialRampToValueAtTime(.55,at+.012);env.gain.exponentialRampToValueAtTime(.18,at+.18);env.gain.exponentialRampToValueAtTime(.0001,at+dur);
 o.connect(lp).connect(env);send(env,1,.15);o.start(at);o.stop(at+dur+.05);o.onended=()=>env.disconnect();
}
function brush(at,len,level){
 const n=audio.createBufferSource(),bp=audio.createBiquadFilter(),env=audio.createGain();
 n.buffer=brushBuf;bp.type='bandpass';bp.frequency.value=5200;bp.Q.value=.6;
 env.gain.setValueAtTime(.0001,at);env.gain.linearRampToValueAtTime(level,at+len*.35);env.gain.exponentialRampToValueAtTime(.0001,at+len);
 n.connect(bp).connect(env);send(env,1,.35);n.start(at,Math.random()*.2,len+.05);
}
function scheduleBand(){
 if(!musicOn)return;
 const beat=60/TEMPO,swing=beat*.62;
 if(nextBeat<audio.currentTime)nextBeat=audio.currentTime+.05;
 while(nextBeat<audio.currentTime+.4){
  const bar=Math.floor(beatNumber/4)%chords.length,b=beatNumber%4,ch=chords[bar],nxt=chords[(bar+1)%chords.length];
  const at=nextBeat;
  // walking bass: root, chord tone, passing tone, approach to the next root
  const walk=[ch[0],ch[0]+(b%2?7:4),ch[0]+(bar%2?9:7),nxt[0]+(nxt[0]>ch[0]?-1:1)];
  bass(at,walk[b]-12+12*(ch[0]<40),beat*.95);
  // brushes: a long sweep on every beat, a light tap on the swung "and" of 2 and 4
  brush(at,beat*.9,.05);
  if(b===1||b===3)brush(at+swing,.09,.07);
  // piano comping: a soft voicing on beat 1 and an anticipation before beat 3
  if(b===0)ch.slice(1).forEach((p,i)=>keys(at+i*.018,p,beat*2.6,.055));
  if(b===1&&bar%2)ch.slice(1,4).forEach((p,i)=>keys(at+swing+i*.015,p+12,beat*1.2,.03));
  // a few unhurried melody notes on top
  const phrase=[[0,2],[3],[1],[],[0,3],[2],[1,3],[]][bar%8];
  if(phrase.includes(b)){const top=ch[1+(bar+b)%4]+12;keys(at+(b%2?swing-beat*.5:0),top,beat*1.6,.04)}
  beatNumber++;nextBeat+=beat;
 }
}
const musicButton=document.createElement('button');musicButton.className='music-switch';musicButton.textContent='Μουσική · Όχι';musicButton.setAttribute('aria-pressed','false');bar.append(musicButton);
musicButton.onclick=()=>{
 initAudio();if(!audio)return;audio.resume();
 musicOn=!musicOn;
 // routed through the studio's master gain, so "Ήχος · Όχι" silences it too
 if(!musicBus){musicBus=audio.createGain();musicBus.gain.value=.00001;musicBus.connect(sfx.master);ensureRoom()}
 musicBus.gain.setTargetAtTime(musicOn?.05:.00001,audio.currentTime,.6);
 clearInterval(musicTimer);if(musicOn){nextBeat=audio.currentTime+.08;scheduleBand();musicTimer=setInterval(scheduleBand,120)}
 musicButton.textContent='Μουσική · '+(musicOn?'Ναι':'Όχι');musicButton.setAttribute('aria-pressed',musicOn)
};
const edit=document.createElement('section');edit.className='edit-desk';edit.innerHTML='<h2>Editing bench</h2><p>Mark the start and end of a passage, then loop it or save it as a take on this device.</p><div class="edit-line"><button id="markIn">Αρχή</button><button id="markOut">Τέλος</button><output class="cut-times"></output><button id="loopTake" aria-pressed="false">Επανάληψη</button><button id="saveTake">Αποθήκευση</button></div><div class="take-list"></div>';
document.querySelector('footer').before(edit);
let inPoint=null,outPoint=null,looping=false,takes=[];
try{takes=JSON.parse(localStorage.getItem('ampex-cuts-v1')||'[]').filter(t=>['studio','city','test'].includes(t.reel)&&Number.isFinite(t.end)&&Number.isFinite(t.start)&&t.end>t.start&&t.start>=0&&t.end<=1800).slice(-12)}catch{}
function stamp(value){return value===null?'––:––':String(Math.floor(value/60)).padStart(2,'0')+':'+String(Math.floor(value%60)).padStart(2,'0')}
function updateCuts(){
 edit.querySelector('output').textContent=stamp(inPoint)+' → '+stamp(outPoint);
 const valid=!!loaded&&inPoint!==null&&outPoint!==null&&outPoint>inPoint;
 $('#loopTake').disabled=!valid;$('#saveTake').disabled=!valid;$('#loopTake').setAttribute('aria-pressed',looping);$('#markIn').disabled=$('#markOut').disabled=!loaded
}
function drawTakes(){
 const list=edit.querySelector('.take-list');list.replaceChildren();
 takes.forEach((t,i)=>{const b=document.createElement('button');b.textContent='▶ Απόσπασμα '+(i+1)+' · '+stamp(t.start)+'–'+stamp(t.end);b.onclick=async()=>{if(!power)$('#deskPower').click();await loadReel(t.reel);inPoint=t.start;outPoint=t.end;position=inPoint;looping=true;setMode('play');updateCuts()};list.append(b)})
}
$('#markIn').onclick=()=>{inPoint=Math.floor(position);if(outPoint<=inPoint)outPoint=null;looping=false;updateCuts()};
$('#markOut').onclick=()=>{if(inPoint===null)inPoint=0;if(position<inPoint+1){toast('Προχωρήστε την ταινία πέρα από την αρχή του αποσπάσματος.');return}outPoint=Math.floor(position);updateCuts()};
$('#loopTake').onclick=()=>{if(!power){toast('Ανοίξτε πρώτα την τροφοδοσία.');return}looping=!looping;if(looping){position=inPoint;setMode('play')}updateCuts()};
$('#saveTake').onclick=()=>{takes.push({reel:loaded,start:inPoint,end:outPoint});takes=takes.slice(-12);try{localStorage.setItem('ampex-cuts-v1',JSON.stringify(takes));toast('Το απόσπασμα αποθηκεύτηκε στη συσκευή.')}catch{toast('Το απόσπασμα αποθηκεύτηκε για αυτή τη συνεδρία.')}drawTakes()};
window.runEditDesk=()=>{if(looping&&mode==='play'&&position>=outPoint){position=inPoint;updateTime()}};
const photographicLoad=loadReel;loadReel=function(id){photographicLoad(id);inPoint=outPoint=null;looping=false;updateCuts()};
drawTakes();updateCuts();
function objectControl(label,rect,handler){const b=document.createElement('button');b.className='physical-dial';b.title=label;b.setAttribute('aria-label',label);b.onclick=handler;place(b,...rect);return b}
objectControl('Τροφοδοσία',[225,286,22,41],()=>$('#deskPower').click());
objectControl('Tracking',[618,312,39,38],()=>{const input=$('#tracking');input.value=+input.value>=40?-40:+input.value+10;input.dispatchEvent(new Event('input'));clickSound();toast('Tracking '+input.value)});
objectControl('Οθόνη',[668,312,40,38],()=>screenButton.click());
objectControl('Μουσική',[724,312,38,38],()=>musicButton.click());
for(const [rect,id] of [[[117,27,107,36],'studio'],[[72,125,112,52],'test'],[[36,220,100,54],'city']])objectControl('Load '+id+' reel from shelf',rect,()=>loadReel(id));

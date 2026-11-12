// Original four-bar lounge arrangement, synthesized locally after the music switch is pressed.
let musicOn=false,musicBus=null,musicTimer=null,nextBeat=0,beatNumber=0;
const chords=[[50,57,60,64,67],[43,53,57,59,64],[48,55,59,62,64],[45,55,58,61,64]];
function note(at,pitch,seconds,level,type='sine'){
 const oscillator=audio.createOscillator(),envelope=audio.createGain();
 oscillator.type=type;oscillator.frequency.value=440*Math.pow(2,(pitch-69)/12);
 envelope.gain.setValueAtTime(.00001,at);envelope.gain.exponentialRampToValueAtTime(level,at+.015);envelope.gain.exponentialRampToValueAtTime(.00001,at+seconds);
 oscillator.connect(envelope).connect(musicBus);oscillator.start(at);oscillator.stop(at+seconds+.03);oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect()}
}
function scheduleBand(){
 if(!musicOn)return;
 const eighth=60/82/2;
 if(nextBeat<audio.currentTime)nextBeat=audio.currentTime+.03;
 while(nextBeat<audio.currentTime+.25){
  const bar=Math.floor(beatNumber/8)%4,step=beatNumber%8,chord=chords[bar];
  if(step===0||step===4)note(nextBeat,chord[0]-(step===0?12:5),.48,.2);
  if([1,4,7].includes(step))chord.slice(1).forEach((n,i)=>note(nextBeat+i*.009,n,.46,.043,'triangle'));
  if([2,5].includes(step))note(nextBeat,chord[2+(bar+step)%3]+12,.72,.05);
  note(nextBeat,100,.023,step%2?.016:.009,'triangle');
  beatNumber++;nextBeat+=eighth
 }
}
const musicButton=document.createElement('button');musicButton.className='music-switch';musicButton.textContent='Μουσική · Όχι';musicButton.setAttribute('aria-pressed','false');bar.append(musicButton);
musicButton.onclick=()=>{
 musicOn=!musicOn;initAudio();audio.resume();
 if(!musicBus){musicBus=audio.createGain();musicBus.gain.value=.00001;musicBus.connect(audio.destination)}
 musicBus.gain.setTargetAtTime(musicOn?.16:.00001,audio.currentTime,.15);
 clearInterval(musicTimer);if(musicOn){nextBeat=audio.currentTime+.04;scheduleBand();musicTimer=setInterval(scheduleBand,100)}
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

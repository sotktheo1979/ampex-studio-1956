const programs={
 studio:{title:'Επίκαιρα της αεροπορίας',file:'news.mp4',year:1964},
 test:{title:'Ολυμπιακοί του Τόκιο',file:'sports.mp4',year:1964},
 city:{title:'Apollo 11',file:'moon.mp4',year:1969}
};
const player=document.createElement('video');player.muted=true;player.loop=true;player.playsInline=true;player.preload='auto';
let programId='',swapTimer,card=0;
function selectProgram(){const p=programs[loaded];if(!p){player.pause();programId='';return}if(programId!==loaded){programId=loaded;player.src=p.file;player.load()}}
selectProgram();

draw=function(t){
 selectProgram();
 ctx.fillStyle='#101511';ctx.fillRect(0,0,c.width,c.height);
 if(!power||!loaded||mode==='stop'){player.pause();return}
 if(player.readyState<2)return;
 const target=position%player.duration;
 if(Number.isFinite(target)&&Math.abs(target-player.currentTime)>(mode==='play'||mode==='record'?.85:.25))player.currentTime=target;
 if(mode==='play'||mode==='record'){if(player.paused)player.play().catch(()=>{})}else player.pause();
 ctx.save();ctx.translate(Math.sin(t*7)*Math.abs(tracking)*.25,0);ctx.drawImage(player,0,0,400,300);ctx.restore();
 ctx.fillStyle='rgba(15,30,21,.16)';for(let y=0;y<300;y+=4)ctx.fillRect(0,y,400,1);
 if(Math.abs(tracking)>10||mode==='forward'||mode==='rewind'){ctx.fillStyle='rgba(235,240,223,.28)';ctx.fillRect(0,(t*48)%300,400,4)}
};
const preMode=setMode;setMode=function(m){preMode(m);if(mode==='pause'||mode==='stop')player.pause()};
const swap=document.createElement('img');swap.className='swap';swap.src='hands.webp';swap.alt='Ο τεχνικός κρατά τη μπομπίνα με τα δύο χέρια';room.append(swap);
const mountReel=loadReel;
const shelfOffsets={studio:[-17,-7],test:[-22,13],city:[-26,32]};
let transfer=0;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function lockTransport(locked){
 document.body.classList.toggle('changing-reel',locked);
 for(const button of document.querySelectorAll('[data-mode],[data-reel],#eject,#source,.take-list button'))button.disabled=locked;
}
async function carry(id,returning,token){
 const [x,y]=shelfOffsets[id];
 const deck={transform:'translate(0%,0%) scale(1)',opacity:1};
 const shelf={transform:'translate('+x+'%,'+y+'%) scale(.77)',opacity:1};
 const outside={transform:'translate(-45%,'+y+'%) scale(.72)',opacity:0};
 const retreat={transform:'translate(-14%,-2%) scale(.96)',opacity:0};
 const frames=returning?[retreat,deck,shelf,outside]:[outside,shelf,deck,retreat];
 const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?80:1150;
 const motion=swap.animate(frames,{duration,easing:'ease-in-out'});
 await delay(duration*(returning?.32:.66));
 if(token!==transfer)return;
 mountReel(returning?'':id);selectProgram();
 await motion.finished;motion.cancel();
}
loadReel=async function(id){
 if(loaded===id){toast(id?'Η μπομπίνα βρίσκεται ήδη στη βάση.':'Η βάση είναι κενή.');return}
 const token=++transfer,previous=loaded;
 lockTransport(true);if(power)setMode('stop');
 try{if(previous)await carry(previous,true,token);if(id&&token===transfer)await carry(id,false,token)}
 finally{if(token===transfer)lockTransport(false)}
};
for(const [id,p] of Object.entries(programs)){const b=document.querySelector('[data-reel="'+id+'"]');b.textContent=p.title+' · '+p.year;document.querySelector('#source option[value="'+id+'"]').textContent=b.textContent}
const shelfKeys=[...stage.querySelectorAll('.physical-dial')].slice(-3);Object.values(programs).forEach((p,i)=>{shelfKeys[i].title='Load '+p.title;shelfKeys[i].setAttribute('aria-label',shelfKeys[i].title)});
const facts=[
 ['Η πρώτη επίδειξη','Το 1956 η Ampex παρουσίασε το VRX-1000 σε συνέδριο στο Σικάγο. Οι περιστρεφόμενες κεφαλές του κατέγραφαν τηλεοπτική εικόνα σε μαγνητική ταινία.','Computer History Museum','https://www.computerhistory.org/storageengine/rotary-head-delivers-high-quality-video/'],
 ['Τέσσερις κεφαλές, μία εικόνα','Το σύστημα Quadruplex διαθέτει τέσσερις κεφαλές εικόνας. Καθεμία σαρώνει εγκάρσια την κινούμενη ταινία και καταγράφει ένα μέρος της εικόνας.','Library of Congress','https://www.loc.gov/marc/bibliographic/bd007v.html'],
 ['Τηλεόραση σε διαφορετικές ζώνες ώρας','Το NBC κατέγραφε το The Tonight Show σε ταινία δύο ιντσών για να το μεταδώσει τρεις ώρες αργότερα στη Δυτική Ακτή. Πριν από το 1959 χρησιμοποιούσε κινηματογραφικό φιλμ.','Library of Congress','https://blogs.loc.gov/now-see-hear/2014/07/heeeeeeeeeeeeres-johnny/'],
 ['Η δεύτερη ζωή της ταινίας','Η μαγνητική ταινία μπορούσε να σβηστεί και να ξαναχρησιμοποιηθεί. Σε σωζόμενη θήκη του Public Broadcast Laboratory από το 1967 αναγράφονται οι προηγούμενες εγγραφές της ταινίας.','Library of Congress','https://blogs.loc.gov/now-see-hear/2015/01/the-cabinet-of-curiosities-video-recording-logs/'],
 ['Οι ταινίες της συλλογής','Το στούντιο προβάλλει βωβά ασπρόμαυρα αποσπάσματα από δύο επίκαιρα του 1964 και από τη σεληνιακή αποστολή Apollo 11 του 1969. Η κονσόλα και τα χέρια του τεχνικού είναι φωτογραφικές αναπαραστάσεις.','NASA film library','https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/video11.html']
];
const info=$('#info');info.innerHTML='<button id="factClose" type="button">Κλείσιμο ×</button><p class="eyebrow">Ταινία και ιστορία</p><h2 id="factTitle"></h2><p id="factText"></p><div id="factLinks"></div><nav><button id="prevFact">Πίσω</button><output id="factPage"></output><button id="nextFact">Επόμενο</button></nav>';
function showFact(n){card=(n+facts.length)%facts.length;const [title,body,label,url]=facts[card];$('#factTitle').textContent=title;$('#factText').textContent=body;const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent=label+' ↗';$('#factLinks').replaceChildren(a);if(card===4){for(const [label,id] of [['News','1964-03-02_2000-MPH_Jet'],['Sports','1964-10-26_Olympics_End']]){const l=a.cloneNode();l.href='https://archive.org/details/'+id;l.textContent=label+' ↗';$('#factLinks').append(' · ',l)}}$('#factPage').textContent=(card+1)+' / '+facts.length;if(!info.open)info.showModal()}
$('#about').onclick=()=>showFact(0);$('#factClose').onclick=()=>info.close();$('#prevFact').onclick=()=>showFact(card-1);$('#nextFact').onclick=()=>showFact(card+1);
objectControl('Κεφαλές',[443,147,94,52],()=>showFact(1));objectControl('Ιστορία',[411,383,137,41],()=>showFact(0));objectControl('Τροφοδοσία ταινίας',[305,57,63,34],()=>showFact(3));objectControl('Περιέλιξη',[596,57,62,36],()=>showFact(2));
const screenBox=document.createElement('div');screenBox.className='screenbox';room.before(screenBox);screenBox.append(room);
const trays=[bar,document.querySelector('.shelf'),document.querySelector('.console'),edit];
const tray=document.createElement('div');tray.className='tray';document.querySelector('main').append(tray);trays.forEach(t=>tray.append(t));
const dock=document.createElement('nav');dock.className='dock';dock.setAttribute('aria-label','Πίνακες στούντιο');document.body.append(dock);
let panel=0;function switchPanel(i){panel=i;trays.forEach((t,j)=>t.hidden=j!==i);[...dock.querySelectorAll('[data-panel]')].forEach((b,j)=>b.setAttribute('aria-pressed',i===j))}
for(const [i,name] of ['Χειριστήρια','Ταινιοθήκη','Ρυθμίσεις','Μοντάζ'].entries()){const b=document.createElement('button');b.dataset.panel=i;b.textContent=name;b.onclick=()=>switchPanel(i);dock.append(b)}
const tags=document.createElement('button');tags.textContent='Λεζάντες';tags.setAttribute('aria-pressed','false');tags.onclick=()=>tags.setAttribute('aria-pressed',stage.classList.toggle('labelled'));dock.append(tags);
const full=document.createElement('button');full.textContent='Πλήρης οθόνη';full.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('Η προβολή καταλαμβάνει ήδη το παράθυρο.')}};if(document.fullscreenEnabled)dock.append(full);document.addEventListener('fullscreenchange',()=>full.textContent=document.fullscreenElement?'Έξοδος από πλήρη οθόνη':'Πλήρης οθόνη');
objectControl('Μεγέθυνση',[646,281,23,32],()=>{zoomSlider.value=zoom>1?100:130;zoomSlider.dispatchEvent(new Event('input'))});
objectControl('Λεζάντες',[691,281,20,31],()=>tags.click());
objectControl('Ταινιοθήκη',[746,282,18,29],()=>switchPanel(1));
for(const b of stage.querySelectorAll('button')){b.dataset.tag=(b.title||b.getAttribute('aria-label')||'').replace(' on console','').replace(' the studio monitor',' CRT');b.title=b.dataset.tag}
for(const b of document.querySelectorAll('button'))if(!b.title)b.title=b.getAttribute('aria-label')||b.textContent.trim();
switchPanel(0);tags.click();
const zoomSlider=$('#zoom');zoomSlider.min=100;
const statusLine=document.createElement('output');statusLine.className='studio-state';document.querySelector('header').append(statusLine);setInterval(()=>{statusLine.textContent=[power?(loaded?({play:'PLAY',pause:'PAUSE',forward:'FF',rewind:'REW',record:'REC',stop:'STOP'})[mode]:'Κενό'):'OFF',stamp(position)].join(' · ')},200);
// Page saved takes so even a full collection fits a short landscape window.
const listTakes=edit.querySelector('.take-list');let takePage=0;
function pageTakes(){
 const all=[...listTakes.querySelectorAll('button:not(.page-takes)')];listTakes.querySelector('.page-takes')?.remove();
 takePage=Math.max(0,Math.min(takePage,all.length-1));all.forEach((b,i)=>b.hidden=i!==takePage);
 if(all.length>1){const b=document.createElement('button');b.className='page-takes';b.textContent='Αποσπάσματα '+(takePage+1)+'/'+all.length;b.title='Επόμενο απόσπασμα';b.onclick=()=>{takePage=(takePage+1)%all.length;pageTakes()};listTakes.append(b)}
}
const oldDrawTakes=drawTakes;drawTakes=function(){oldDrawTakes();takePage=Math.max(0,takes.length-1);pageTakes()};pageTakes();

const technical={rewind:'REW',stop:'STOP',play:'PLAY',forward:'FF',pause:'PAUSE',record:'REC'};
for(const key of document.querySelectorAll('[data-mode]')){
 const name=technical[key.dataset.mode];key.title=name;key.setAttribute('aria-label',name);
 if(key.closest('.stage-photo'))key.dataset.tag=name;
 if(key.closest('#deskControls'))key.textContent=name;
}
for(const [i,key] of shelfKeys.entries())key.dataset.tag=['Επίκαιρα','Τόκιο','Apollo 11'][i];
const shortLabels=['Τροφοδοσία','Tracking','Οθόνη','Μουσική','Επίκαιρα','Τόκιο','Apollo 11','Κεφαλές','Ιστορία','Τροφοδότρια','Περιέλιξη','Ζουμ','Σήμανση','Ράφι'];
stage.querySelectorAll('.physical-dial').forEach((key,i)=>{key.dataset.tag=shortLabels[i];key.setAttribute('aria-label',shortLabels[i]);key.title=shortLabels[i]});
document.addEventListener('click',event=>{
 const key=event.target.closest('.stage-photo button');
 if(key)key.animate([{boxShadow:'inset 0 2px 6px #291b0b99,0 0 6px #ffd89a'},{boxShadow:'none'}],{duration:340});
});

const consoleRec = document.createElement('button');
consoleRec.type='button';
consoleRec.dataset.mode='record';
consoleRec.setAttribute('aria-label','REC');
consoleRec.setAttribute('aria-pressed','false');
consoleRec.title='REC';
consoleRec.textContent='REC';
consoleRec.style.cssText='position:absolute;z-index:5;padding:0;border:2px solid #34251e;border-radius:3px;background:linear-gradient(#a44533,#762820 65%,#4c1812);color:#f3d5ac;font:bold clamp(7px,.85vw,14px) Arial;box-shadow:inset 0 1px 1px #d48869,0 2px 2px #17150f;cursor:pointer';
place(consoleRec,593,318,25,30);
consoleRec.onclick=()=>setMode('record');

let recordingStart=null;
const transportBeforeRecording=setMode;
setMode=function(next){
 const previous=mode, end=position;
 transportBeforeRecording(next);
 if(mode===previous)return;
 if(previous==='record' && recordingStart && end>recordingStart.start){
  takes.push({...recordingStart,end});takes=takes.slice(-12);
  try{localStorage.setItem('ampex-cuts-v1',JSON.stringify(takes))}catch{}
  drawTakes();toast('Το απόσπασμα προστέθηκε στο Μοντάζ.');
 }
 recordingStart=mode==='record'?{reel:loaded,start:position}:null;
 consoleRec.style.background=mode==='record'?'linear-gradient(#ed7965,#a92d22)':'linear-gradient(#a44533,#762820 65%,#4c1812)';
};
const meterNeedles=[{x:313,y:313,phase:0},{x:380,y:313,phase:1.8}].map(({x,y,phase})=>{
 const needle=document.createElement('span');
 needle.setAttribute('aria-hidden','true');
 needle.style.cssText='position:absolute;pointer-events:none;background:#37291c;width:.12%;height:2.5%;transform-origin:center bottom;z-index:2';
 place(needle,x,y-14,.95,14);
 return {needle,phase,angle:-48};
});
let meterTime=performance.now();
function animateMeters(now){
 const dt=Math.min(.1,(now-meterTime)/1000);meterTime=now;
 const active=power && (mode==='play'||mode==='record');
 for(const m of meterNeedles){
  const t=position;
  const target=active?-8+22*Math.sin(t*5+m.phase)+12*Math.sin(t*11+m.phase): -48;
  m.angle+=(target-m.angle)*(1-Math.exp(-dt*(target>m.angle?16:7)));
  m.needle.style.transform='rotate('+m.angle+'deg)';
 }
 requestAnimationFrame(animateMeters);
}
requestAnimationFrame(animateMeters);

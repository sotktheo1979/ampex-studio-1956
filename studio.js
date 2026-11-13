const programs={
 studio:{title:'Επίκαιρα της αεροπορίας',file:'news.mp4',year:1964},
 test:{title:'Ολυμπιακοί του Τόκιο',file:'sports.mp4',year:1964},
 city:{title:'Apollo 11',file:'moon.mp4',year:1969}
};
const player=document.createElement('video');player.muted=true;player.loop=true;player.playsInline=true;player.preload='auto';
let programId='',swapTimer,card=0;
function selectProgram(){const p=programs[loaded];if(!p){player.pause();programId='';return}if(programId!==loaded){programId=loaded;player.src=p.file;player.load()}}
selectProgram();

// Quadruplex behaviour: the rotating heads only produce a picture with the tape
// moving at exactly 15 in/s. In PAUSE or while spooling the monitor loses the
// picture, and on PLAY the servos need a moment to lock before it settles.
let lockFrom=0,lastPictureMode='stop',pictureRunning=false;
function noPicture(t,spooling){
 ctx.fillStyle='#0b100d';ctx.fillRect(0,0,c.width,c.height);
 for(let i=0;i<220;i++){const g=40+Math.random()*90;ctx.fillStyle=`rgba(${g},${g+8},${g},.35)`;ctx.fillRect(Math.random()*400,Math.random()*300,1+Math.random()*3,1)}
 if(spooling){for(let i=0;i<6;i++){ctx.fillStyle=`rgba(190,205,185,${.05+Math.random()*.12})`;ctx.fillRect(0,(t*260+i*53)%300,400,2+Math.random()*7)}}
}
draw=function(t){
 selectProgram();
 if(!power||!loaded||mode==='stop'){player.pause();ctx.fillStyle='#101511';ctx.fillRect(0,0,c.width,c.height);pictureRunning=false;return}
 const running=(mode==='play'||mode==='record')&&tapeSpeed>.95;
 if(!running){player.pause();noPicture(t,Math.abs(tapeSpeed)>1.5);pictureRunning=false;return}
 if(!pictureRunning){pictureRunning=true;lockFrom=performance.now()}
 if(player.readyState<2||player.seeking){noPicture(t,false);return}
 const target=position%player.duration;
 if(Number.isFinite(target)&&Math.abs(target-player.currentTime)>.85)player.currentTime=target;
 if(player.paused)player.play().catch(()=>{});
 if(player.seeking)return;
 // servo lock-up: the frame rolls and tears, then pulls in
 const locking=Math.max(0,1-(performance.now()-lockFrom)/1100);
 const roll=locking>0?((1-locking)*300*1.7)%300*locking:0;
 ctx.save();ctx.translate(Math.sin(t*7)*Math.abs(tracking)*.25+(locking?Math.sin(t*40)*6*locking:0),0);
 ctx.drawImage(player,0,roll,400,300);if(roll)ctx.drawImage(player,0,roll-300,400,300);
 if(roll){ctx.fillStyle='#050806';ctx.fillRect(0,roll-6,400,10)}
 ctx.restore();
 ctx.fillStyle='rgba(15,30,21,.16)';for(let y=0;y<300;y+=4)ctx.fillRect(0,y,400,1);
 if(Math.abs(tracking)>10){const n=Math.abs(tracking)/10;for(let i=0;i<n;i++){ctx.fillStyle='rgba(235,240,223,.22)';ctx.fillRect(0,(t*48+i*97)%300,400,2+Math.random()*3)}}
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
 mountReel(returning?'':id);selectProgram();if(typeof syncTransportKeys==='function')syncTransportKeys();
 await motion.finished;motion.cancel();
}
loadReel=async function(id){
 if(loaded===id){toast(id?'Η μπομπίνα βρίσκεται ήδη στη βάση.':'Η βάση είναι κενή.');return}
 const token=++transfer,previous=loaded;
 lockTransport(true);if(power)setMode('stop');
 // a reel is never lifted while it is still turning: wait for the brakes
 for(let n=0;n<60&&Math.abs(tapeSpeed)>.02;n++)await delay(50);
 try{if(previous)await carry(previous,true,token);if(id&&token===transfer)await carry(id,false,token)}
 finally{if(token===transfer)lockTransport(false)}
};
for(const [id,p] of Object.entries(programs)){const b=document.querySelector('[data-reel="'+id+'"]');b.textContent=p.title+' · '+p.year;document.querySelector('#source option[value="'+id+'"]').textContent=b.textContent}
const shelfKeys=[...stage.querySelectorAll('.physical-dial')].slice(-3);Object.values(programs).forEach((p,i)=>{shelfKeys[i].title='Load '+p.title;shelfKeys[i].setAttribute('aria-label',shelfKeys[i].title)});
const facts=[
 [
  "AMPEX: το όνομα",
  "Η AMPEX πήρε το όνομά της από τα αρχικά του ιδρυτή Alexander M. Poniatoff (AMP) και το EX από τη λέξη Excellence. Η εταιρεία ιδρύθηκε το 1944 στην Καλιφόρνια.",
  "Stanford",
  "https://redwoodcity.stanford.edu/ampex-years"
 ],
 [
  "Η μεγάλη επίδειξη του 1956",
  "Η Ampex παρουσίασε δημόσια το πειραματικό VRX-1000 στο Σικάγο το 1956. Ήταν ορόσημο για την πρακτική μαγνητική καταγραφή τηλεοπτικής εικόνας.",
  "Computer History Museum",
  "https://www.computerhistory.org/storageengine/rotary-head-delivers-high-quality-video/"
 ],
 [
  "Γιατί λέγεται Quadruplex",
  "Ο όρος Quadruplex αναφέρεται στις τέσσερις περιστρεφόμενες κεφαλές εικόνας. Αυτές σαρώνουν διαδοχικά την ταινία εγκάρσια προς την κίνησή της.",
  "Computer History Museum",
  "https://www.computerhistory.org/storageengine/rotary-head-delivers-high-quality-video/"
 ],
 [
  "Ταινία πλάτους δύο ιντσών",
  "Το πρωτοποριακό τηλεοπτικό φορμά χρησιμοποιούσε ανοιχτές μπομπίνες με μαγνητική ταινία πλάτους 2 ιντσών, περίπου 50,8 χιλιοστών.",
  "IEEE History",
  "https://ethw.org/w/images/3/3c/Ampex-Dedication-Slides.pdf"
 ],
 [
  "15 ίντσες και 240 στροφές",
  "Στο αμερικανικό σύστημα η ταινία κινούνταν μόλις 15 ίντσες ανά δευτερόλεπτο (38,1 cm/s). Ο τροχός με τις τέσσερις κεφαλές όμως έκανε 240 περιστροφές το δευτερόλεπτο, δηλαδή 14.400 στροφές το λεπτό, και έτσι οι κεφαλές περνούσαν πάνω από την ταινία αρκετά γρήγορα για να γράψουν εικόνα.",
  "IEEE Milestones",
  "https://ieeemilestones.ethw.org/Milestones:Ampex_Videotape_Recorder_-_1956"
 ],
 [
  "Οι κεφαλές και ο οδηγός κενού",
  "Οι τέσσερις κεφαλές ήταν τοποθετημένες ανά 90 μοίρες στην περιφέρεια ενός μικρού τροχού. Ένας κοίλος οδηγός με αναρρόφηση κενού κύρτωνε την ταινία γύρω από τον τροχό, ώστε κάθε κεφαλή να γράφει μια σχεδόν κάθετη τροχιά από άκρη σε άκρη.",
  "Computer History Museum",
  "https://www.computerhistory.org/storageengine/rotary-head-delivers-high-quality-video/"
 ],
 [
  "Πώς καταγραφόταν η εικόνα",
  "Το τηλεοπτικό σήμα εγγραφόταν με διαμόρφωση συχνότητας (FM), πάνω σε στενές εγκάρσιες μαγνητικές τροχιές. Δεν ήταν φωτογραφικό φιλμ με ορατά καρέ.",
  "Computer History Museum",
  "https://www.computerhistory.org/storageengine/rotary-head-delivers-high-quality-video/"
 ],
 [
  "Τι κάνουν οι δύο μπομπίνες",
  "Η αριστερή μπομπίνα τροφοδοτεί και η δεξιά μαζεύει την ταινία· στο REW η ταινία επιστρέφει προς τα αριστερά. Επειδή η ταινία κινείται με σταθερή ταχύτητα, η μπομπίνα με λίγη ταινία γυρίζει πολύ πιο γρήγορα από τη γεμάτη. Παρατηρήστε το στο μηχάνημα.",
  "IASA",
  "https://www.iasa-web.org/sites/default/files/publications/IASA-TC_06-C_20180603.pdf"
 ],
 [
  "Ο ήχος είχε άλλη τροχιά",
  "Στο σύστημα Quadruplex ο ήχος και τα σήματα ελέγχου εγγράφονταν κατά μήκος της ταινίας, σε αντίθεση με την εικόνα που γραφόταν εγκάρσια.",
  "Television Engineering",
  "https://americanradiohistory.com/BOOKSHELF-ARH/Technology/Technology-Radio/Television-Engineering-Part-2-Applications-Roberts-1985-II.pdf"
 ],
 [
  "Ρύθμιση και σταθερή εικόνα",
  "Η εικόνα ήταν σταθερή μόνο όταν οι περιστρεφόμενες κεφαλές ακολουθούσαν ακριβώς τις εγκάρσιες τροχιές. Ένα σύστημα servo συγχρόνιζε τον τροχό των κεφαλών με την τροχιά ελέγχου, ενώ το ύψος και η πίεση του οδηγού κενού ρυθμίζονταν με το χέρι. Μικρές αποκλίσεις έδιναν οριζόντιες ζώνες στην εικόνα.",
  "AV Artifact Atlas",
  "https://www.avartifactatlas.com/artifacts/vacuum_guide_adjustment_error.html"
 ],
 [
  "Πριν από τη μαγνητική βιντεοταινία",
  "Για επανάληψη ή διατήρηση ζωντανών τηλεοπτικών εκπομπών χρησιμοποιούνταν κινηματογραφική καταγραφή της οθόνης. Η βιντεοταινία περιόρισε την ανάγκη για εμφάνιση φιλμ.",
  "IASA",
  "https://www.iasa-web.org/sites/default/files/publications/IASA-TC_06-C_20180603.pdf"
 ],
 [
  "Μια εκπομπή, άλλη ζώνη ώρας",
  "Η δυνατότητα προεγγραφής έκανε πρακτικό να μεταδίδεται το ίδιο πρόγραμμα σε διαφορετικές ώρες ανά περιοχή, χωρίς να απαιτείται δεύτερη ζωντανή παρουσίαση.",
  "IASA",
  "https://www.iasa-web.org/sites/default/files/publications/IASA-TC_06-C_20180603.pdf"
 ],
 [
  "Η ταινία χρησιμοποιούνταν ξανά",
  "Η μαγνητική βιντεοταινία μπορούσε να σβηστεί και να επανεγγραφεί, και ήταν ακριβή. Γι' αυτό πολλοί σταθμοί έσβηναν παλιές εκπομπές για να ξαναχρησιμοποιήσουν τις μπομπίνες, και μεγάλο μέρος της πρώιμης τηλεόρασης χάθηκε για πάντα.",
  "Library of Congress",
  "https://blogs.loc.gov/now-see-hear/2015/01/the-cabinet-of-curiosities-video-recording-logs/"
 ],
 [
  "Η διάσωση των ταινιών σήμερα",
  "Οι ταινίες Quadruplex που σώθηκαν διαβάζονται μόνο σε λίγα συντηρημένα μηχανήματα. Σε ορισμένες ταινίες το συνδετικό υλικό απορροφά υγρασία και η ταινία κολλά στις κεφαλές. Τα αρχεία τις φυλάσσουν σε δροσερό και ξηρό περιβάλλον και τις μεταφέρουν σε ψηφιακή μορφή όσο ακόμη είναι δυνατό.",
  "IASA",
  "https://www.iasa-web.org/node/3841"
 ],
 [
  "Από το VRX-1000 στο VR-2000",
  "Μετά την πειραματική παρουσίαση του 1956 ακολούθησε η παραγωγή VR-1000. Το VR-2000 παρουσιάστηκε το 1964, καθώς η τεχνολογία Quad εξελισσόταν.",
  "Computer History Museum",
  "https://www.computerhistory.org/storageengine/rotary-head-delivers-high-quality-video/"
 ]
];
const info=$('#info');info.innerHTML='<button id="factClose" type="button">Κλείσιμο ×</button><p class="eyebrow">15 σελίδες τεχνικής ιστορίας</p><h2 id="factTitle"></h2><p id="factText"></p><div id="factLinks"></div><nav><button id="prevFact">Πίσω</button><output id="factPage"></output><button id="nextFact">Επόμενο</button></nav>';
function showFact(n){
 card=(n+facts.length)%facts.length;
 const [title,body,label,url]=facts[card];
 $('#factTitle').textContent=title;
 $('#factText').textContent=body;
 const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=label+' ↗';
 $('#factLinks').replaceChildren(link);
 $('#factPage').textContent=(card+1)+' / '+facts.length;
 if(!info.open)info.showModal();
}
$('#about').onclick=()=>showFact(0);$('#factClose').onclick=()=>info.close();$('#prevFact').onclick=()=>showFact(card-1);$('#nextFact').onclick=()=>showFact(card+1);
objectControl('Κεφαλές',[443,147,94,52],()=>showFact(2));objectControl('Ιστορία',[411,383,137,41],()=>showFact(1));objectControl('Τροφοδοσία ταινίας',[305,57,63,34],()=>showFact(8));objectControl('Περιέλιξη',[596,57,62,36],()=>showFact(8));
const screenBox=document.createElement('div');screenBox.className='screenbox';room.before(screenBox);screenBox.append(room);
const trays=[bar,document.querySelector('.shelf'),document.querySelector('.console'),edit];
const tray=document.createElement('div');tray.className='tray';document.querySelector('main').append(tray);trays.forEach(t=>tray.append(t));
const dock=document.createElement('nav');dock.className='dock';dock.setAttribute('aria-label','Πίνακες στούντιο');document.body.append(dock);
let panel=0;function switchPanel(i){panel=i;stage.classList.toggle('shelf-lit',i===1);trays.forEach((t,j)=>t.hidden=j!==i);[...dock.querySelectorAll('[data-panel]')].forEach((b,j)=>b.setAttribute('aria-pressed',i===j))}
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
consoleRec.className='hit-key';
consoleRec.dataset.tag='REC';
stage.append(consoleRec);

// Use adjacent slices of the original console photograph so the key caps,
// front bevels and shadows retain the same lighting as the rest of the deck.
const keyStarts=[419,453,487,521,555,589];
const keyModes=['rewind','stop','play','forward','pause','record'];
function buildTransportKeys(){
 if(!photo.naturalWidth)return;
 const scaleX=photo.naturalWidth/960, scaleY=photo.naturalHeight/540;
 keyModes.forEach((id,i)=>{
  const key=stage.querySelector('[data-mode="'+id+'"]');
  const sx=id==='record'?453:keyStarts[i];
  place(key,keyStarts[i]-34,315,34,38);
  Object.assign(key.style,{padding:'0',border:'0',borderRadius:'0',overflow:'visible',background:'transparent'});
  const cap=document.createElement('canvas');
  cap.width=136;cap.height=152;
  cap.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
  const g=cap.getContext('2d');
  g.drawImage(photo,sx*scaleX,315*scaleY,34*scaleX,38*scaleY,0,0,136,152);
  if(id==='record'){
   g.drawImage(cap,22,25,14,31,48,24,43,32);
   g.fillStyle='#f3d8ac';g.beginPath();g.arc(68,42,9,0,2*Math.PI);g.fill();
  }
  key.prepend(cap);
 });
}
if(photo.complete)buildTransportKeys();else photo.addEventListener('load',buildTransportKeys,{once:true});
const mechanicalStyle=document.createElement('style');
mechanicalStyle.textContent=[
 // the key cap sinks into a dark well rather than revealing the photographed cap behind it
 '.stage-photo .hit-key canvas{transition:transform 80ms,filter 80ms;transform-origin:center bottom}',
 '.stage-photo .hit-key:active,.stage-photo .hit-key[aria-pressed="true"]{background:linear-gradient(rgba(9,12,11,.9),rgba(14,18,16,.82) 11%,transparent 22%) center top/90% 100% no-repeat!important;border-radius:3px!important}',
 '.stage-photo .hit-key:active canvas,.stage-photo .hit-key[aria-pressed="true"] canvas{transform:translateY(3%) scaleY(.90);filter:brightness(.83)}',
 // STOP is a momentary button: its lamp stays on in standby but the cap springs back
 '.stage-photo .hit-key[data-mode="stop"][aria-pressed="true"]:not(:active){background:transparent!important}',
 '.stage-photo .hit-key[data-mode="stop"][aria-pressed="true"]:not(:active) canvas{transform:none;filter:none}'
].join('');
document.head.append(mechanicalStyle);
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

};
// All measurements use the plate's native 960-by-540 coordinate system.
const hardwareDials=[...stage.querySelectorAll('.physical-dial')];
function hardwareSurface(x,y,w,h){
 const surface=document.createElement('canvas');
 surface.width=w*4;surface.height=h*4;
 surface.style.cssText='position:absolute;pointer-events:none;z-index:1';
 place(surface,x,y,w,h);
 const paint=surface.getContext('2d');paint.scale(4,4);
 return {surface,paint,x,y,w,h};
}
function samplePlate(p,x,y,w,h,dx,dy,dw=w,dh=h){
 const sx=photo.naturalWidth/960, sy=photo.naturalHeight/540;
 p.drawImage(photo,x*sx,y*sy,w*sx,h*sy,dx,dy,dw,dh);
}
const knobs=[
 [635,332,()=>tracking*2.5],
 [688,333,()=>monitorElement.classList.contains('focused')?62:0],
 [745,333,()=>musicOn?65:0]
].map(([x,y,read])=>({...hardwareSurface(x-13,y-13,26,26),read,angle:0}));
// Toggle switches. The photographed levers point up; for every other position
// the lever above the nut is removed (the panel is rebuilt row by row from its
// own pixels) and a chrome bat handle is drawn swinging through its pivot.
const levers=[
 [658.2,291.6,302.1,()=>zoom>1],
 [700.6,291.3,302.0,()=>!stage.classList.contains('labelled')]
].map(([x,ball,pivot,read])=>({...hardwareSurface(x-9,284,18,34),cx:x,ball,pivot,read,value:0,clean:null}));
function cleanLeverPanel(l){
 const c=document.createElement('canvas'),k=8;c.width=18*k;c.height=34*k;const g=c.getContext('2d',{willReadFrequently:true});
 const sx=photo.naturalWidth/960,sy=photo.naturalHeight/540;
 g.drawImage(photo,l.x*sx,284*sy,18*sx,34*sy,0,0,c.width,c.height);
 const img=g.getImageData(0,0,c.width,c.height),d=img.data,W=c.width;
 // up-lever and its shadow occupy x ∈ [cx-7, cx+4], from the top down to the nut
 const x0=Math.round((l.cx-7.4-l.x)*k),x1=Math.round((l.cx+4.2-l.x)*k),yEnd=Math.round((l.pivot-5.4-284)*k);
 for(let y=0;y<yEnd;y++){const L=(y*W+x0-1)*4,R=(y*W+x1+1)*4;
  for(let x=x0;x<=x1;x++){const f=(x-x0)/(x1-x0),o=(y*W+x)*4,n=(Math.random()-.5)*5;for(let ch=0;ch<3;ch++)d[o+ch]=d[L+ch]*(1-f)+d[R+ch]*f+n}}
 g.putImageData(img,0,0);
 // keep only the rebuilt rectangle, feathered
 const out=document.createElement('canvas');out.width=W;out.height=c.height;const og=out.getContext('2d');
 og.drawImage(c,0,0);og.globalCompositeOperation='destination-in';
 const m=og.createLinearGradient(0,0,0,yEnd+k*2);m.addColorStop(0,'#000');m.addColorStop(yEnd/(yEnd+k*2),'#000');m.addColorStop(1,'transparent');
 og.fillStyle=m;og.fillRect(x0-k,0,x1-x0+2*k,yEnd+k*2);
 return out;
}
function drawLever(l){
 const g=l.paint;g.clearRect(0,0,18,34);
 if(l.value<.01)return;                       // photograph already shows it up
 if(!l.clean)l.clean=cleanLeverPanel(l);
 g.drawImage(l.clean,0,0,18,34);
 const px=l.cx-l.x,py=l.pivot-284,len=l.pivot-l.ball;
 const reach=len*Math.cos(Math.PI*l.value);    // + up … − down, short when pointing at us
 const near=Math.sin(Math.PI*l.value);          // closer to the camera mid-swing
 const tx=px+.4*l.value,ty=py-reach,ballR=2.35+near*.45;
 // the bushing's dark opening, where the photographed lever used to rise
 const hole=g.createRadialGradient(px,py-1,.2,px,py-1.1,2.4);hole.addColorStop(0,'#120c07');hole.addColorStop(.75,'rgba(26,18,10,.92)');hole.addColorStop(1,'rgba(26,18,10,0)');
 g.fillStyle=hole;g.beginPath();g.ellipse(px,py-1.1,2.1,2.7,0,0,Math.PI*2);g.fill();
 // soft shadow cast to the left on the panel
 g.save();g.globalAlpha=.35;g.strokeStyle='#061412';g.lineWidth=2.6;g.lineCap='round';
 g.beginPath();g.moveTo(px-1.2,py+.6);g.lineTo(tx-2.6,ty+1.2);g.stroke();g.restore();
 // tapered chrome bat
 const nx=1.15,tx2=.7;
 const shaft=g.createLinearGradient(px-nx,0,px+nx,0);
 shaft.addColorStop(0,'#3a2c1c');shaft.addColorStop(.35,'#f2dcae');shaft.addColorStop(.6,'#a07c4c');shaft.addColorStop(1,'#2e2216');
 g.fillStyle=shaft;g.beginPath();g.moveTo(px-nx,py);g.lineTo(tx-tx2,ty);g.lineTo(tx+tx2,ty);g.lineTo(px+nx,py);g.closePath();g.fill();
 // ball tip
 const ball=g.createRadialGradient(tx-ballR*.4,ty-ballR*.45,.2,tx,ty,ballR);
 ball.addColorStop(0,'#fff6dc');ball.addColorStop(.35,'#d6b27a');ball.addColorStop(.8,'#6e4f2c');ball.addColorStop(1,'#2a1d10');
 g.fillStyle=ball;g.beginPath();g.arc(tx,ty,ballR,0,Math.PI*2);g.fill();
 // pivot collar glint over the nut's opening
 g.fillStyle='rgba(30,22,14,.8)';g.beginPath();g.ellipse(px,py,1.6,1.3,0,0,Math.PI*2);g.fill();
}
hardwareDials[hardwareDials.length-1].onclick=()=>switchPanel(panel===1?0:1);
const meters=[287,354].map((x,i)=>({...hardwareSurface(x-24,303,48,25),phase:i*1.8,angle:-25}));
let hardwareTime=performance.now();
function moveHardware(now){
 requestAnimationFrame(moveHardware);
 if(!photo.naturalWidth||now-hardwareTime<22)return;
 const dt=Math.min(.1,(now-hardwareTime)/1000);hardwareTime=now;
 for(const k of knobs){
  k.angle+=(k.read()-k.angle)*(1-Math.exp(-dt*18));
  const g=k.paint;g.clearRect(0,0,26,26);g.save();g.translate(13,13);
  g.beginPath();g.arc(0,0,12.4,0,Math.PI*2);g.clip();g.rotate(k.angle*Math.PI/180);
  samplePlate(g,k.x,k.y,26,26,-13,-13);g.restore();
 }
 for(const l of levers){
  const was=l.value;
  l.value+=((l.read()?1:0)-l.value)*(1-Math.exp(-dt*30));
  if(Math.abs(l.value-(l.read()?1:0))<.003)l.value=l.read()?1:0;
  if(l.value!==was||!l.drawn){drawLever(l);l.drawn=true}
 }
 for(const m of meters){
  const g=m.paint;g.clearRect(0,0,48,25);
  // Restore the narrow diagonal occupied by the photographed pointer from adjacent paper.
  g.save();g.beginPath();g.moveTo(12,4);g.lineTo(16,4);g.lineTo(25,23);g.lineTo(21,23);g.closePath();g.clip();
  samplePlate(g,m.x+4,m.y,48,25,0,0);g.restore();
  const active=power&&(mode==='record'||mode==='play');
  const target=active?-4+21*Math.sin(position*4+m.phase)+12*Math.sin(position*9+m.phase):-25;
  m.angle+=(target-m.angle)*(1-Math.exp(-dt*(target>m.angle?17:6)));
  g.save();g.translate(24,23);g.rotate(m.angle*Math.PI/180);g.strokeStyle='#46352b';g.lineWidth=.8;
  g.beginPath();g.moveTo(0,0);g.lineTo(0,-20);g.stroke();g.restore();
  if(!power){g.save();g.globalCompositeOperation='source-atop';g.fillStyle='rgba(18,12,6,.62)';g.fillRect(0,0,48,25);g.restore()}
 }
}
requestAnimationFrame(moveHardware);

// Illuminated, interlocked transport buttons: the lamp shows the engaged function.
function syncTransportKeys(){
 for(const key of document.querySelectorAll('button[data-mode]')){
  const down=!!power&&!!loaded&&mode===key.dataset.mode;
  key.classList.toggle('active',down);
  key.setAttribute('aria-pressed',String(down));
 }
}
const setLatchedTransport=setMode;
setMode=function(next){setLatchedTransport(next);syncTransportKeys()};
syncTransportKeys();

const shelfShade=document.createElement('div');
shelfShade.className='shelf-shade';
shelfShade.setAttribute('aria-hidden','true');
place(shelfShade,0,0,246,310);

// The three parts of the machine explain themselves briefly; the full history
// (15 pages with sources) lives behind the AMPEX nameplate.
const componentPages={
 'Τροφοδότρια':['Τροφοδότρια μπομπίνα',
  'Η αριστερή μπομπίνα δίνει την ταινία στο μηχάνημα. Ο κινητήρας της δεν τη σπρώχνει: την κρατά ελαφρά προς τα πίσω, ώστε η ταινία να μένει τεντωμένη καθώς περνά από τις κεφαλές. Όσο αδειάζει, γυρίζει όλο και πιο γρήγορα.',
  'Στα 15 ίντσες ανά δευτερόλεπτο, μία ώρα προγράμματος χρειαζόταν περίπου 1.370 μέτρα ταινίας πλάτους δύο ιντσών.'],
 'Περιέλιξη':['Μπομπίνα περιέλιξης',
  'Η δεξιά μπομπίνα μαζεύει την ταινία μετά τις κεφαλές. Τραβά απαλά και σταθερά, ώστε η ταινία να τυλίγεται σφιχτά και ομοιόμορφα. Στο REW οι ρόλοι αντιστρέφονται και η ταινία γυρίζει πίσω στην αριστερή.',
  'Ένα μόνο λεπτό εκπομπής καταλάμβανε περίπου 23 μέτρα ταινίας. Επειδή οι μπομπίνες ήταν ακριβές, οι σταθμοί συχνά έσβηναν παλιές εκπομπές για να τις ξαναχρησιμοποιήσουν.'],
 'Κεφαλές':['Κεφαλές εικόνας',
  'Εδώ γράφεται και διαβάζεται η εικόνα. Τέσσερις μικροσκοπικές κεφαλές πάνω σε έναν τροχό γυρίζουν 240 φορές το δευτερόλεπτο και σαρώνουν την ταινία εγκάρσια, ενώ ένας οδηγός με αναρρόφηση την κυρτώνει γύρω τους. Ο ήχος γράφεται χωριστά, κατά μήκος της ταινίας.',
  'Από αυτές τις τέσσερις κεφαλές βγαίνει το όνομα Quadruplex. Ο τροχός τους φτάνει τις 14.400 στροφές το λεπτό, και γι’ αυτό το μηχάνημα ακούγεται με ένα χαρακτηριστικό ψηλό σφύριγμα όταν παίζει.']
};
function showComponent(tag){
 showFact(0);
 const [title,body,trivia]=componentPages[tag];
 $('#factTitle').textContent=title;
 const text=$('#factText');text.textContent=body;
 const note=document.createElement('span');note.className='trivia';note.textContent=trivia;
 const label=document.createElement('strong');label.textContent='Γνωρίζατε; ';note.prepend(label);
 text.append(document.createElement('br'),document.createElement('br'),note);
 $('#factLinks').replaceChildren();
 info.querySelector('.eyebrow').textContent='Μέρος του μηχανήματος';
 info.querySelector('nav').hidden=true;
}
info.addEventListener('close',()=>{info.querySelector('nav').hidden=false;info.querySelector('.eyebrow').textContent='15 σελίδες τεχνικής ιστορίας'});
for(const tag of Object.keys(componentPages))stage.querySelector('[data-tag="'+tag+'"]').onclick=()=>showComponent(tag);
stage.querySelector('[data-tag="Ιστορία"]').onclick=()=>showFact(0);




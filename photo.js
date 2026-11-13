// Locations are measured against the finished 960 × 540 photographic composition.
const room=document.querySelector('.room');
const stage=document.createElement('div');
stage.className='stage-photo';
stage.innerHTML='<img alt="Βιντεομαγνητόφωνο Ampex σε τηλεοπτικό στούντιο της δεκαετίας του 1960" class="plate" src="master.webp"><canvas class="live-layer" aria-hidden="true"></canvas>';
room.append(stage);
const photo=stage.querySelector('img'), liveCanvas=stage.querySelector('canvas'), livePaint=liveCanvas.getContext('2d');
const monitorElement=document.querySelector('#monitor');
function place(element,x,y,w,h){
 Object.assign(element.style,{left:(x/960*100)+'%',top:(y/540*100)+'%',width:(w/960*100)+'%',height:(h/540*100)+'%'});
 stage.append(element)
}
const screenButton=document.createElement('button');
screenButton.className='crt-hit';
screenButton.setAttribute('aria-label','Μεγέθυνση CRT');
screenButton.onclick=()=>{focusMonitor();clickSound()};
place(screenButton,...geometry.screen);
for(const [id,x,y,w,h] of geometry.keys){
 const key=document.createElement('button');key.className='hit-key';key.dataset.mode=id;
 key.setAttribute('aria-label',({play:'Play',stop:'Stop',forward:'Fast forward',rewind:'Rewind',record:'Record',pause:'Pause'})[id]+' on console');
 key.title=key.getAttribute('aria-label');key.innerHTML='<span class="key-lamp"></span>';
 key.onclick=()=>{setMode(id);key.classList.add('struck');setTimeout(()=>key.classList.remove('struck'),150)};
 place(key,x,y,w,h)
}
const surfaces=[];
function prepareReels(){
 surfaces.length=0;
 for(const [x,y,rx,ry,slant] of geometry.reels){
  const tile=document.createElement('canvas');tile.width=tile.height=768;
  const g=tile.getContext('2d');g.translate(384,384);g.scale(384/rx,384/ry);g.rotate(-slant);g.drawImage(photo,-x,-y,960,540);surfaces.push(tile)
 }
}
photo.addEventListener('load',prepareReels);if(photo.complete&&photo.naturalWidth)prepareReels();
function resizeLive(){
 const density=Math.min(4,Math.max(1,stage.getBoundingClientRect().width*devicePixelRatio/960));
 liveCanvas.width=Math.round(960*density);liveCanvas.height=Math.round(540*density)
}
new ResizeObserver(resizeLive).observe(room);resizeLive();
// Keep a representative exposure available even when the transport is stopped.
const tapeStills = new Map();
function tapeStill(id) {
 if (!tapeStills.has(id)) {
  tapeStills.set(id, null);
  const source = document.createElement('video');
  source.muted = true;
  source.preload = 'auto';
  source.onloadedmetadata = () => { source.currentTime = Math.min(3, source.duration / 3); };
  source.onseeked = () => {
   const still = document.createElement('canvas');
   still.width = 80; still.height = 60;
   still.getContext('2d').drawImage(source, 0, 0, 80, 60);
   tapeStills.set(id, still);
   source.onseeked = source.onloadedmetadata = null;
   source.removeAttribute('src'); source.load();
  };
  source.src = programs[id].file;
 }
 return programId === id && player.readyState >= 2 && mode !== 'stop' ? player : tapeStills.get(id);
}
const tapeExposure = document.createElement('canvas');
tapeExposure.width = 64;
tapeExposure.height = 48;
const exposurePaint = tapeExposure.getContext('2d');
function tintExposure(image) {
 if (!image) return null;
 exposurePaint.globalAlpha = 1;
 exposurePaint.globalCompositeOperation = 'source-over';
 const base = exposurePaint.createLinearGradient(0,0,0,48);
 base.addColorStop(0,'#654831');
 base.addColorStop(.18,'#795438');
 base.addColorStop(.8,'#69482f');
 base.addColorStop(1,'#533923');
 exposurePaint.fillStyle = base;
 exposurePaint.fillRect(0,0,64,48);
 exposurePaint.globalCompositeOperation = 'multiply';
 exposurePaint.globalAlpha = .46;
 exposurePaint.drawImage(image,0,0,64,48);
 return tapeExposure;
}
function exposeTape(g, points, height, image, offset) {
 const pitch = height * 1.45;
 let travelled = offset;
 for (let i = 1; i < points.length; i++) {
  const [x,y] = points[i-1], dx = points[i][0]-x, dy = points[i][1]-y;
  const length = Math.hypot(dx,dy);
  g.save(); g.translate(x,y); g.rotate(Math.atan2(dy,dx));
  g.beginPath(); g.rect(0,-height/2,length+.35,height); g.clip();
  g.fillStyle = '#69482f'; g.fillRect(0,-height/2,length+1,height);
  if (image) {
   for (let u = -((travelled % pitch + pitch) % pitch); u < length; u += pitch)
    g.drawImage(image,u,-height/2,pitch+.12,height);
  }
  g.restore(); travelled += length;
 }
}
let lastDraw=0;
function animateStudio(now){
 requestAnimationFrame(animateStudio);
 if(now-lastDraw<32||document.hidden)return;lastDraw=now;
 const g=livePaint;g.setTransform(liveCanvas.width/960,0,0,liveCanvas.height/540,0,0);g.clearRect(0,0,960,540);
 geometry.reels.forEach(([x,y,rx,ry,slant],i)=>{
  if(!loaded||!surfaces[i]||angle===0)return;
  g.save();g.translate(x,y);g.rotate(slant);g.scale(rx,ry);g.beginPath();g.arc(0,0,1,0,2*Math.PI);g.clip();
  g.rotate(angle*Math.PI/180*(i?1.08:1));g.drawImage(surfaces[i],-1,-1,2,2);g.restore()
 });
 if (loaded && typeof programs !== 'undefined' && programs[loaded]) {
  const still = tintExposure(tapeStill(loaded));
  for (const [x,y,rx,ry,slant] of geometry.reels) {
   g.save(); g.translate(x,y); g.rotate(slant);
   const edge = [];
   for (let j=0;j<=32;j++) {
    const a = Math.PI*(.94-.88*j/32);
    edge.push([rx*.96*Math.cos(a),ry*.96*Math.sin(a)+3]);
   }
   exposeTape(g,edge,6,still,angle*.12);
   g.restore();
  }
  exposeTape(g,geometry.ribbon,8,still,angle*.12);
 }
 const [sx,sy,sw,sh]=geometry.screen;
 g.save();g.beginPath();g.roundRect(sx,sy,sw,sh,[sw*.15]);g.clip();g.fillStyle='#131815';g.fillRect(sx,sy,sw,sh);
 if(power&&loaded&&mode!=='stop'){g.drawImage(c,sx,sy,sw,sh);g.globalAlpha=.13;g.fillStyle='#06100c';for(let j=sy;j<sy+sh;j+=1.8)g.fillRect(sx,j,sw,.55)}
 g.restore();

}
requestAnimationFrame(animateStudio);
function viewStudio(){stage.style.transform='perspective(1600px) scale('+Math.max(1,zoom)+') rotateY('+((tilt-.22)*4)+'deg)';room.classList.toggle('empty-deck',!loaded);}
const initialLoad=loadReel;
loadReel=function(id){initialLoad(id);viewStudio()};
document.querySelector('#view').addEventListener('input',viewStudio);document.querySelector('#zoom').addEventListener('input',viewStudio);
viewStudio();

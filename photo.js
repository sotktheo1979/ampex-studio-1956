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
const emptyWindows=[];
function makeBareWindows(tile){
 const bare=document.createElement('canvas');bare.width=bare.height=768;
 const ctx=bare.getContext('2d'),data=tile.getContext('2d').getImageData(0,0,768,768);
 for(let y=0;y<768;y++)for(let x=0;x<768;x++){
  const j=(y*768+x)*4,r=Math.hypot(x-384,y-384)/384;
  const level=(data.data[j]*.3+data.data[j+1]*.59+data.data[j+2]*.11);
  const opacity=Math.min(1,Math.max(0,(85-level)/32));
  data.data[j+3]=r>.27&&r<.92?Math.round(opacity*255):0;
  const metal=99+24*(1-r)+level*.48+4*Math.sin(y*.73);
  data.data[j]=metal;data.data[j+1]=metal*.91;data.data[j+2]=metal*.79;
 }
 ctx.putImageData(data,0,0);return bare;
}
function prepareReels(){
 surfaces.length=0; emptyWindows.length=0;
 for(const [x,y,rx,ry,slant] of geometry.reels){
  const tile=document.createElement('canvas');tile.width=tile.height=768;
  const g=tile.getContext('2d');g.translate(384,384);g.scale(384/rx,384/ry);g.rotate(-slant);g.drawImage(photo,-x,-y,960,540);surfaces.push(tile);emptyWindows.push(makeBareWindows(tile))
 }
}
photo.addEventListener('load',prepareReels);if(photo.complete&&photo.naturalWidth)prepareReels();
function resizeLive(){
 const density=Math.min(4,Math.max(1,stage.getBoundingClientRect().width*devicePixelRatio/960));
 const w=Math.round(960*density),h=Math.round(540*density);
 if(liveCanvas.width===w&&liveCanvas.height===h)return;
 const previous=document.createElement('canvas');previous.width=liveCanvas.width;previous.height=liveCanvas.height;
 previous.getContext('2d').drawImage(liveCanvas,0,0);
 liveCanvas.width=w;liveCanvas.height=h;livePaint.drawImage(previous,0,0,w,h)
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
// The stock, grain and photographic density travel as one material.
const stock = document.createElement('canvas');
stock.width = 64; stock.height = 48;
const stockPaint = stock.getContext('2d');
const pixels = stockPaint.createImageData(64,48);
for (let y=0; y<48; y++) {
 for (let x=0; x<64; x++) {
  const i=(y*64+x)*4;
  const density=.89+.09*Math.sin(x*Math.PI/32)+.08*Math.random()+.07*Math.sin(y*Math.PI/47);
  pixels.data.set([117*density,72*density,38*density,255],i);
 }
}
stockPaint.putImageData(pixels,0,0);
function tintExposure(image) {
 exposurePaint.globalCompositeOperation='source-over';
 exposurePaint.globalAlpha=1;
 exposurePaint.drawImage(stock,0,0);
 if(image) {
  exposurePaint.globalCompositeOperation='multiply';
  exposurePaint.globalAlpha=.43;
  exposurePaint.drawImage(image,0,0,64,48);
 }
 return tapeExposure;
}
// Measured on the 960 x 540 deck plate. Each span ends behind a guide or housing.
const filmSpans=[
 [[262,194],[312,189]],
 [[323,189],[362,190]],
 [[384,190],[398,191]],
 [[418,191],[443,192]],
 [[540,192],[573,191],[628,186]],
 [[645,186],[681,191],[714,197]]
];
function drawThreadedFilm(g,image,phase) {
 const height=13, pitch=height*4/3;
 for(const span of filmSpans) {
  let distance=span[0][0]-262;
  for(let i=1;i<span.length;i++) {
   const [x,y]=span[i-1], dx=span[i][0]-x, dy=span[i][1]-y;
   const length=Math.hypot(dx,dy);
   g.save(); g.translate(x,y); g.rotate(Math.atan2(dy,dx));
   g.beginPath(); g.rect(0,-height/2,length,height); g.clip();
   g.globalAlpha=.76;
   const offset=((distance+phase)%pitch+pitch)%pitch;
   for(let u=-offset;u<length;u+=pitch) g.drawImage(image,u,-height/2,pitch+.04,height);
   g.restore(); distance+=length;
  }
 }
}
let lastDraw=0;
function animateStudio(now){
 requestAnimationFrame(animateStudio);
 if(now-lastDraw<32||document.hidden)return;lastDraw=now;
 const g=livePaint;g.setTransform(liveCanvas.width/960,0,0,liveCanvas.height/540,0,0);g.clearRect(0,0,960,540);
 geometry.reels.forEach(([x,y,rx,ry,slant],i)=>{
  if(!loaded||!surfaces[i])return;
  const fraction=Math.max(0,Math.min(1,position/1800));
  const held=i?fraction:1-fraction;
  const core=.27, outer=.98;
  const radius=Math.sqrt(core*core+held*(outer*outer-core*core));
  g.save();g.translate(x,y);g.rotate(slant);
  // Reveal the lower flange outside the wound pack. The upper flange
  // occludes the rear half and the front of the pack slopes into view.
  g.save();g.beginPath();g.ellipse(0,0,rx,ry,0,0,Math.PI);
  g.ellipse(0,13,rx*.99,ry,0,Math.PI,0,true);g.closePath();g.clip();
  const flange=g.createLinearGradient(-rx,0,rx,0);
  for(const [stop,color] of [[0,'#443d35'],[.20,'#908373'],[.49,'#b4a692'],[.72,'#897b6c'],[1,'#493f34']])flange.addColorStop(stop,color);
  g.fillStyle=flange;g.fillRect(-rx,0,2*rx,ry+14);
  if(held>0){
   g.beginPath();g.ellipse(0,12,rx*radius,ry*radius,0,0,2*Math.PI);g.clip();
   // Retain the original light and texture of the full wound tape.
   const sx=photo.naturalWidth/960,sy=photo.naturalHeight/540;
   g.drawImage(photo,(x-rx)*sx,y*sy,rx*2*sx,(ry+16)*sy,-rx,0,rx*2,ry+16);
  }
  g.restore();
  g.scale(rx,ry);g.beginPath();g.arc(0,0,1,0,2*Math.PI);g.clip();
  g.rotate(angle*Math.PI/180*(i?1.08:1));g.drawImage(surfaces[i],-1,-1,2,2);
  g.beginPath();g.arc(0,0,1,0,2*Math.PI);g.arc(0,0,radius,0,2*Math.PI,true);g.clip('evenodd');
  g.drawImage(emptyWindows[i],-1,-1,2,2);g.restore()
 });
 if (loaded && typeof programs !== 'undefined' && programs[loaded]) {
  const still = tintExposure(tapeStill(loaded));
  drawThreadedFilm(g,still,angle*.24);
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

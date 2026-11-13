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
// Repair the photographed openings once, keeping the stationary metal lighting
// and spindle. The moving apertures are projected from a true circular plane.
function solidReelFace(tile){
 const ctx=tile.getContext('2d'),pixels=ctx.getImageData(0,0,768,768);
 const src=new Uint8ClampedArray(pixels.data);
 for(let y=0;y<768;y++)for(let x=0;x<768;x++){
  const dx=x-384,dy=y-384,r=Math.hypot(dx,dy),j=(y*768+x)*4;
  if(r<112||r>370)continue;
  const luminance=k=>src[k]*.3+src[k+1]*.59+src[k+2]*.11;
  if(luminance(j)>117)continue;
  const t=Math.atan2(dy,dx);
  const sample=sign=>{
   for(let n=1;n<=75;n++){
    const k=4*(768*Math.round(384+r*Math.sin(t+sign*n*.016))+Math.round(384+r*Math.cos(t+sign*n*.016)));
    if(luminance(k)>120)return [k,n];
   }
   return [j,1];
  };
  const [l,dl]=sample(-1),[h,dh]=sample(1);
  for(let c=0;c<3;c++)pixels.data[j+c]=(src[l+c]*dh+src[h+c]*dl)/(dl+dh);
 }
 ctx.putImageData(pixels,0,0);return tile;
}
const reelOpening=new Path2D();
reelOpening.moveTo(.48,-.105);reelOpening.quadraticCurveTo(.48,-.14,.52,-.15);
reelOpening.lineTo(.73,-.21);reelOpening.quadraticCurveTo(.77,-.22,.78,-.18);
reelOpening.arc(0,0,.80,-.22,.22);
reelOpening.quadraticCurveTo(.77,.22,.73,.21);reelOpening.lineTo(.52,.15);
reelOpening.quadraticCurveTo(.48,.14,.48,.105);reelOpening.closePath();
function prepareReels(){
 surfaces.length=0;
 for(const [x,y,rx,ry,slant] of geometry.reels){
  const tile=document.createElement('canvas');tile.width=tile.height=768;
  const g=tile.getContext('2d');g.translate(384,384);g.scale(384/rx,384/ry);g.rotate(-slant);g.drawImage(photo,-x,-y,960,540);
  solidReelFace(tile);
  // Punch actual alpha holes into the photographed upper metal flange.
  // The metal and its three apertures become ONE rigid, rotating image.
  g.setTransform(384,0,0,384,384,384);
  g.globalCompositeOperation='destination-out';
  for(let k=0;k<3;k++){
   g.save();g.rotate(k*2*Math.PI/3);g.fill(reelOpening);g.restore();
  }
  g.globalCompositeOperation='source-over';
  surfaces.push(tile)
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
  g.scale(rx,ry);
  g.beginPath();g.arc(0,0,1,0,2*Math.PI);g.clip();
  // Opaque lower plate conceals the old photographed hole shapes.
  const under=g.createRadialGradient(-.25,-.28,.05,.1,.13,1);
  under.addColorStop(0,'#998c78');under.addColorStop(.64,'#62594b');under.addColorStop(1,'#292821');
  g.fillStyle=under;g.fillRect(-1,-1,2,2);
  // The magnetic tape is the same warm, smoke-brown material as the
  // threaded ribbon below: light passes softly through its thin edges,
  // while overlapping turns darken into a dense wound pack.
  const pack=g.createRadialGradient(-.21,-.25,.08,.05,.12,Math.max(.31,radius));
  pack.addColorStop(0,'rgba(118,78,52,.92)');
  pack.addColorStop(.50,'rgba(102,65,42,.95)');
  pack.addColorStop(.83,'rgba(77,48,32,.97)');
  pack.addColorStop(1,'rgba(47,33,25,.96)');
  g.beginPath();g.arc(0,0,radius,0,Math.PI*2);
  g.fillStyle=pack;g.fill();
  g.save();g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.clip();
  // Hundreds of fine, slightly uneven concentric turns instead of
  // a flat brown disc or oversized painted rings.
  for(let r=.275;r<radius;r+=.0065){
   g.beginPath();g.arc(0,0,r,0,Math.PI*2);
   g.lineWidth=.0023;
   g.strokeStyle=(Math.round(r*1000)%5===0)?
     'rgba(205,151,103,.29)':'rgba(28,21,17,.33)';
   g.stroke();
  }
  const tapeLight=g.createLinearGradient(-.9,-.7,.8,.9);
  tapeLight.addColorStop(0,'rgba(219,171,118,.14)');
  tapeLight.addColorStop(.42,'rgba(154,100,62,.035)');
  tapeLight.addColorStop(1,'rgba(10,9,7,.23)');
  g.fillStyle=tapeLight;g.fillRect(-1,-1,2,2);
  g.restore();
  // The transparent apertures and the steel itself rotate together;
  // no separate moving or painted gap shapes can overlap the flange.
  const rotation=angle*Math.PI/180*(i?1.08:1);
  g.save();g.rotate(rotation);
  // Restrict the rotating steel to an annulus. The spindle hub
  // remains fixed and perfectly centred, and cannot be crossed by gaps.
  g.beginPath();g.arc(0,0,.97,0,Math.PI*2);
  g.arc(0,0,.355,0,Math.PI*2,true);g.clip('evenodd');
  g.drawImage(surfaces[i],-1,-1,2,2);
  g.restore();
  // Reuse the authentic photographic spindle without rotating it.
  g.save();g.beginPath();g.arc(0,0,.345,0,Math.PI*2);g.clip();
  g.drawImage(surfaces[i],-1,-1,2,2);
  g.restore();
  // Subtle stationary environment reflection, with metal edge fully intact.
  const reflected=g.createLinearGradient(-.7,-1,.8,1);
  reflected.addColorStop(0,'rgba(255,244,213,.045)');
  reflected.addColorStop(.55,'rgba(255,255,255,0)');
  reflected.addColorStop(1,'rgba(12,13,12,.08)');
  g.fillStyle=reflected;g.beginPath();g.arc(0,0,1,0,Math.PI*2);g.fill();
  g.beginPath();g.arc(0,0,.995,0,Math.PI*2);
  g.strokeStyle='rgba(231,220,189,.35)';g.lineWidth=.006;g.stroke();
  g.restore()
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

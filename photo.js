// Photographic scene: the master plate plus a live canvas for everything that moves.
// All locations are measured against the finished 960 × 540 composition.
const room=document.querySelector('.room');
const stage=document.createElement('div');
stage.className='stage-photo';
stage.innerHTML='<img alt="Βιντεομαγνητόφωνο Ampex σε τηλεοπτικό στούντιο της δεκαετίας του 1960" class="plate" src="master.webp" decoding="async" fetchpriority="high" width="3840" height="2160"><canvas class="live-layer" aria-hidden="true"></canvas>';
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
screenButton.onclick=()=>{focusMonitor()};
place(screenButton,...geometry.screen);
for(const [id,x,y,w,h] of geometry.keys){
 const key=document.createElement('button');key.className='hit-key';key.dataset.mode=id;
 key.setAttribute('aria-label',({play:'Play',stop:'Stop',forward:'Fast forward',rewind:'Rewind',record:'Record',pause:'Pause'})[id]+' on console');
 key.title=key.getAttribute('aria-label');key.innerHTML='<span class="key-lamp"></span>';
 key.onclick=()=>{setMode(id);key.classList.add('struck');setTimeout(()=>key.classList.remove('struck'),150)};
 place(key,x,y,w,h)
}

// ---------------------------------------------------------------------------
// REELS
// Each reel is rebuilt in layers, back to front, from clean photographic
// material: lower flange → hub core → wound tape pack → tape leaving the pack
// → top flange. The top flange is a lathe-brushed aluminium disc: its
// highlights are fixed to the room, only the three openings travel with the
// rotation. reels.webp holds both flanges rebuilt from the plate with no trace
// of the photographed openings (see tools/build_reel_faces.py).
// ---------------------------------------------------------------------------
const reelFaces=new Image();reelFaces.decoding='async';reelFaces.src='reels.webp';
// The same studio photographed with no reels or tape: where the tape has run out of
// the path, this plate shows the bare guides and deck underneath.
const bareDeck=new Image();bareDeck.decoding='async';bareDeck.src='empty.webp';
const REELS=[
 // centre, radii, slant from geometry.js; d = depth of the lower flange below the
 // upper one on the plate (2-inch tape seen from the camera height); guide = where
 // the tape disappears behind the first guide cap; side = which way it leaves.
 {d:11,  exit:[253,167,14], side:-1, patch:[243,140,22,28]},
 {d:19,  exit:[714,159,14], side: 1, patch:[704,138,21,24]}
].map((r,i)=>{const [x,y,rx,ry,slant]=geometry.reels[i];return {...r,x,y,rx,ry,slant,i}});
// Openings: three rounded trapezoids measured from the plate, in flange-radius
// units. The outline is a squircle in (radius, angle) space, so the inner and
// outer edges stay concentric with the reel and the corners are softly rounded.
const OPEN_IN=.425, OPEN_OUT=.815, HALF_IN=.36, HALF_OUT=.43, OPEN_ROUND=5.5;
const openingShape=(()=>{const pts=[],rc=(OPEN_IN+OPEN_OUT)/2,hr=(OPEN_OUT-OPEN_IN)/2,e=2/OPEN_ROUND;
 for(let k=0;k<112;k++){const f=k/112*Math.PI*2,cs=Math.cos(f),sn=Math.sin(f);
  const s=Math.sign(cs)*Math.abs(cs)**e,t=Math.sign(sn)*Math.abs(sn)**e,r=rc+s*hr;
  const half=HALF_IN+(HALF_OUT-HALF_IN)*(r-OPEN_IN)/(OPEN_OUT-OPEN_IN);
  pts.push([r,t*half])}
 return pts})();
// Share of each circle of radius r that lies inside an opening, used when the
// reels spin too fast for the eye to follow the openings at all.
const openingFraction=(()=>{const c=document.createElement('canvas').getContext('2d'),p=new Path2D();
 openingShape.forEach(([r,a],k)=>{const x=r*Math.cos(a),y=r*Math.sin(a);k?p.lineTo(x,y):p.moveTo(x,y)});p.closePath();
 const out=[];for(let i=0;i<=40;i++){const r=i/40;let n=0;for(let j=0;j<240;j++){const a=(j+.5)/240*2*Math.PI/3-Math.PI/3;if(c.isPointInPath(p,r*Math.cos(a),r*Math.sin(a)))n++}out.push([r,n/240])}
 return out})();
function blurRing(g){const grad=g.createRadialGradient(0,0,0,0,0,1);for(const [r,f] of openingFraction)grad.addColorStop(r,'rgba(255,255,255,'+f.toFixed(3)+')');return grad}
function openingPath(p,rot){
 openingShape.forEach(([r,a],k)=>{const x=r*Math.cos(a+rot),y=r*Math.sin(a+rot);k?p.lineTo(x,y):p.moveTo(x,y)});
 p.closePath();
}
let density=1;
function makeCanvas(){const c=document.createElement('canvas');return [c,c.getContext('2d')]}
for(const r of REELS){
 [r.mask,r.maskCtx]=makeCanvas();[r.top,r.topCtx]=makeCanvas();[r.low,r.lowCtx]=makeCanvas();
 r.prevAngle=0;
}
// Box (in plate units) that holds a flange drawn at the reel's top plane.
function reelBox(r){return {x:r.x-r.rx-3,y:r.y-r.ry-3,w:2*r.rx+6,h:2*r.ry+6}}
function sizeReelCanvases(){
 for(const r of REELS){const b=reelBox(r);
  for(const c of [r.mask,r.top,r.low]){const w=Math.ceil(b.w*density),h=Math.ceil(b.h*density);if(c.width!==w||c.height!==h){c.width=w;c.height=h}}
  r.cacheDensity=0}
}
// Stationary material, projected once per display size: flange faces, the pack
// top and the soft shadow the upper flange throws into the reel.
function buildReelCache(r){
 const box=reelBox(r),W=r.top.width,H=r.top.height;
 const make=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c};
 r.faceTop=make();r.faceLow=make();r.packProj=make();r.shade=make();
 let g=r.faceTop.getContext('2d');discTransform(g,r,box);g.drawImage(reelFaces,r.i*1024,0,1024,1024,-1,-1,2,2);
 g=r.faceLow.getContext('2d');g.drawImage(r.faceTop,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(28,22,17,.42)';g.fillRect(0,0,W,H);
 g=r.packProj.getContext('2d');discTransform(g,r,box);g.drawImage(packTop,-1,-1,2,2);
 // shadowBlur is applied once here (works in every browser), never per frame:
 // the disc is drawn off-canvas and only its blurred shadow lands in view.
 g=r.shade.getContext('2d');const off=W*3;
 g.shadowColor='rgba(10,7,4,.55)';g.shadowBlur=6*density;g.shadowOffsetX=-off;g.shadowOffsetY=2.6*density;
 g.setTransform(density,0,0,density,(r.x-box.x)*density+off,(r.y-box.y)*density);g.rotate(r.slant);g.scale(r.rx,r.ry);
 g.beginPath();g.arc(0,0,.985,0,Math.PI*2);g.fillStyle='#000';g.fill();
 r.cacheDensity=density;
}
// disc space → local offscreen (device pixels)
function discTransform(g,r,box){
 g.setTransform(density,0,0,density,(r.x-box.x)*density,(r.y-box.y)*density);
 g.rotate(r.slant);g.scale(r.rx,r.ry);
}
// disc space → plate, at depth h below the top flange plane
function plateDisc(g,r,h=0){g.translate(r.x,r.y+h);g.rotate(r.slant);g.scale(r.rx,r.ry)}
function onDisc(r,u,v,h=0){const c=Math.cos(r.slant),s=Math.sin(r.slant),X=u*r.rx,Y=v*r.ry;return [r.x+c*X-s*Y,r.y+s*X+c*Y+h]}

// Tape pack: concentric edges of several hundred turns, a little uneven, with the
// same anisotropic sheen as the flanges. Built once, clipped to the pack radius.
const packTop=document.createElement('canvas');packTop.width=packTop.height=768;
(function buildPackTop(){
 const g=packTop.getContext('2d');g.translate(384,384);g.scale(384,384);
 g.fillStyle='#0d0d0c';g.beginPath();g.arc(0,0,1,0,7);g.fill();
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let rr=.26;rr<1;rr+=.0042){
  const v=rnd();g.beginPath();g.arc(0,0,rr,0,7);
  g.lineWidth=.0021+v*.0016;
  g.strokeStyle=v>.93?'rgba(120,118,114,.34)':v>.7?'rgba(62,61,58,.30)':v<.18?'rgba(0,0,0,.5)':'rgba(30,30,28,.35)';
  g.stroke();
 }
 if(g.createConicGradient){
  const sheen=g.createConicGradient(-.7,0,0);
  for(const [s,a] of [[0,.05],[.12,.30],[.2,.06],[.5,.04],[.62,.26],[.7,.05],[1,.05]])sheen.addColorStop(s,'rgba(190,188,182,'+(a*.5)+')');
  g.globalCompositeOperation='screen';g.fillStyle=sheen;g.beginPath();g.arc(0,0,1,0,7);g.fill();g.globalCompositeOperation='source-over';
 }
})();

// Outer wall of the full pack, lifted from the photograph between the flanges,
// and a clean patch of deck where the photographed tape tail used to descend.
function buildPhotoSamples(){
 const sx=photo.naturalWidth/960,sy=photo.naturalHeight/540;
 const src=document.createElement('canvas');
 for(const r of REELS){
  // wall: columns over phi ∈ [0, π] (front half), rows over depth 0..d
  const W=360,H=24;const wall=document.createElement('canvas');wall.width=W;wall.height=H;
  const wg=wall.getContext('2d');
  const bx=Math.floor((r.x-r.rx-4)*sx),by=Math.floor((r.y-4)*sy),bw=Math.ceil((2*r.rx+8)*sx),bh=Math.ceil((r.ry+r.d+8)*sy);
  src.width=bw;src.height=bh;const sg=src.getContext('2d',{willReadFrequently:true});sg.drawImage(photo,-bx,-by);
  const pix=sg.getImageData(0,0,bw,bh).data,out=wg.createImageData(W,H);
  for(let j=0;j<H;j++)for(let i=0;i<W;i++){
   const phi=(i+.5)/W*Math.PI,h=3.2+(j+.5)/H*(r.d-4.2);   // below the flange rim
   const [px,py]=onDisc(r,.985*Math.cos(phi),.985*Math.sin(phi),h);
   const X=Math.min(bw-1,Math.max(0,Math.round(px*sx-bx))),Y=Math.min(bh-1,Math.max(0,Math.round(py*sy-by)));
   const k=(Y*bw+X)*4,o=(j*W+i)*4;out.data[o]=pix[k];out.data[o+1]=pix[k+1];out.data[o+2]=pix[k+2];out.data[o+3]=255;
  }
  // remove the photographed tape tail where it crossed the wall
  const cut=r.side<0?[.70,.86]:[.12,.27];
  for(let j=0;j<H;j++){const a=Math.floor(cut[0]*W),b=Math.ceil(cut[1]*W);
   for(let i=a;i<b;i++){const f=(i-a)/(b-a),o=(j*W+i)*4,oa=(j*W+a-1)*4,ob=(j*W+b)*4;for(let ch=0;ch<3;ch++)out.data[o+ch]=out.data[oa+ch]*(1-f)+out.data[ob+ch]*f}}
  wg.putImageData(out,0,0);r.wall=wall;
  // deck patch: row-wise reconstruction across the old tail
  const [px,py,pw,ph]=r.patch;const PX=Math.round(px*sx),PY=Math.round(py*sy),PW=Math.round(pw*sx),PH=Math.round(ph*sy);
  src.width=PW+8;src.height=PH;sg.drawImage(photo,-(PX-4),-PY);
  const d=sg.getImageData(0,0,PW+8,PH),dd=d.data,w=PW+8;
  for(let y=0;y<PH;y++){const L=(y*w+2)*4,R=(y*w+w-3)*4;
   for(let x=3;x<w-3;x++){const f=(x-2)/(w-5),o=(y*w+x)*4,n=(Math.random()-.5)*6;
    for(let ch=0;ch<3;ch++)dd[o+ch]=dd[L+ch]*(1-f)+dd[R+ch]*f+n}}
  // feather the patch edges back into the photograph
  for(let y=0;y<PH;y++)for(let x=0;x<w;x++){const e=Math.min(x,w-1-x,y*2,(PH-1-y)*2);dd[(y*w+x)*4+3]=Math.min(255,e*60)}
  sg.putImageData(d,0,0);
  const patch=document.createElement('canvas');patch.width=w;patch.height=PH;patch.getContext('2d').drawImage(src,0,0);
  r.deckPatch={canvas:patch,x:(PX-4)/sx,y:PY/sy,w:w/sx,h:PH/sy};
 }
}

// Foreground objects photographed in front of the reels: they are redrawn from
// the plate after the reels, so nothing rendered can ever cover them.
const OCCLUDERS=[
 ['ellipse',259,169.5,15.5,7.5],      // left outer guide cap
 ['ellipse',720,158.5,15.5,7.5],      // right outer guide cap
 ['ellipse',637.5,155.6,12.5,6.2],    // right inner guide cap
 ['ellipse',567,160,27,9.5],          // idler disc
 ['path',[[310,153],[312,146],[318,142.6],[408,142.6],[414,146],[416,153]]] // tension arm
];
function occluderPath(){
 const p=new Path2D();
 for(const o of OCCLUDERS){
  if(o[0]==='ellipse'){p.moveTo(o[1]+o[3],o[2]);p.ellipse(o[1],o[2],o[3],o[4],0,0,Math.PI*2)}
  else{o[1].forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath()}
 }
 return p;
}
const occluders=occluderPath();

// Tangent from an external point to the pack circle, in disc coordinates.
function tangentPoint(r,R,h){
 const c=Math.cos(r.slant),s=Math.sin(r.slant);
 const ex=r.exit[0]-r.x,ey=r.exit[1]-h-r.y;           // undo depth, then rotation
 const u=(c*ex+s*ey)/r.rx,v=(-s*ex+c*ey)/r.ry;
 const D=Math.hypot(u,v),base=Math.atan2(v,u),off=Math.acos(Math.min(1,R/D));
 const t=r.side<0?base+off:base-off;
 return [R*Math.cos(t),R*Math.sin(t)];
}

function drawReel(g,r,R,rot,spinStep){
 const box=reelBox(r),d=r.d;
 // ---- 1. openings, motion-blurred like a 180° film shutter --------------------
 // The openings are accumulated on their own; sample counts are divisors of 255
 // so the 8-bit sum is exact and solid metal never turns translucent.
 const m=r.maskCtx;m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,r.mask.width,r.mask.height);
 discTransform(m,r,box);
 const spread=Math.min(Math.abs(spinStep)*.5,2*Math.PI);
 if(spread>1.4){
  m.fillStyle=blurRing(m);m.beginPath();m.arc(0,0,1,0,Math.PI*2);m.fill();
 }else{
  const K=spread<.012?1:[3,5,15,17,51].find(k=>spread/k<.028)||51;
  m.globalCompositeOperation='lighter';m.fillStyle='#fff';m.globalAlpha=1/K;
  for(let k=0;k<K;k++){
   const a=rot+(K>1?Math.sign(spinStep)*spread*(k/(K-1)-.5):0),p=new Path2D();
   for(let n=0;n<3;n++)openingPath(p,a+n*2*Math.PI/3);
   m.fill(p);
  }
  m.globalAlpha=1;m.globalCompositeOperation='source-over';
 }
 const samples=spread<.012?1:9;
 // ---- 2. top and lower flange layers ------------------------------------------
 if(r.cacheDensity!==density)buildReelCache(r);
 for(const [ctx2,canvas,face] of [[r.topCtx,r.top,r.faceTop],[r.lowCtx,r.low,r.faceLow]]){
  ctx2.setTransform(1,0,0,1,0,0);ctx2.globalCompositeOperation='copy';ctx2.drawImage(face,0,0);
  ctx2.globalCompositeOperation='destination-out';ctx2.drawImage(r.mask,0,0);
  ctx2.globalCompositeOperation='source-over';
 }
 // cut faces of the openings catch the light along their far edges
 if(samples===1){
  const t=r.topCtx;discTransform(t,r,box);
  for(let n=0;n<3;n++){
   const p=new Path2D();openingPath(p,rot+n*2*Math.PI/3);
   t.save();t.clip(p);t.translate(0,1.25/r.ry);
   t.lineWidth=.016;t.strokeStyle='rgba(226,214,190,.72)';t.stroke(p);
   t.translate(0,.9/r.ry);t.lineWidth=.012;t.strokeStyle='rgba(20,16,12,.55)';t.stroke(p);t.restore();
   t.lineWidth=.004;t.strokeStyle='rgba(34,28,22,.55)';t.stroke(p);
  }
 }
 const toPlate=(c)=>g.drawImage(c,box.x,box.y,box.w,box.h);
 // ---- 3. compose on the plate -------------------------------------------------
 g.save();
 // the whole silhouette first, so no photographed reel survives at its edges
 g.save();g.beginPath();
 g.save();plateDisc(g,r,0);g.arc(0,0,1.005,0,-Math.PI,true);g.restore();
 g.save();plateDisc(g,r,d+1.7);g.arc(0,0,1.005,Math.PI,0,true);g.restore();g.closePath();
 g.fillStyle='#1d1611';g.fill();g.restore();
 // deep shadow under the lower flange openings
 g.save();plateDisc(g,r,d+1.5);g.beginPath();g.arc(0,0,.99,0,Math.PI*2);g.fillStyle='#17120d';g.fill();g.restore();
 // lower flange: rim edge then the plate
 g.save();g.beginPath();g.save();plateDisc(g,r,d+1.6);g.arc(0,0,1,0,Math.PI*2);g.restore();
 g.save();plateDisc(g,r,d);g.moveTo(1,0);g.arc(0,0,1,0,Math.PI*2);g.restore();g.translate(r.x,0);
 const rimLow=g.createLinearGradient(-r.rx,0,r.rx,0);for(const [s,col] of [[0,'#5b5248'],[.3,'#c7bba9'],[.55,'#eee4d2'],[.8,'#9e9283'],[1,'#4c443b']])rimLow.addColorStop(s,col);
 g.fillStyle=rimLow;g.fill('evenodd');g.restore();
 g.save();g.translate(0,d);toPlate(r.low);g.restore();
 // gloom between the flanges deepens toward the back
 g.save();plateDisc(g,r,d);g.beginPath();g.arc(0,0,1,0,Math.PI*2);g.clip();
 const gloom=g.createRadialGradient(0,-.25,.2,0,0,1.05);gloom.addColorStop(0,'rgba(8,6,4,.82)');gloom.addColorStop(.6,'rgba(8,6,4,.6)');gloom.addColorStop(.86,'rgba(8,6,4,.25)');gloom.addColorStop(1,'rgba(8,6,4,.05)');
 g.fillStyle=gloom;g.fillRect(-1,-1,2,2);g.restore();
 // ---- 4. hub core -----------------------------------------------------------------
 cylinder(g,r,CORE,d,null,'#6a665e','#b9b3a6');
 // ---- 5. wound tape pack ----------------------------------------------------------
 if(heldFraction(r.i)>0)cylinder(g,r,R,d,r.wall);
 // ---- 6. tape leaving the pack toward the guides -----------------------------------
 // the tape between this reel and its guide, if any tape is still on this reel;
 // clear leader at the ends of the reel looks clear
 // (none once the tape's end has left the path)
 const t=r.i?position:tapeAtSupply();
 if(heldFraction(r.i)>0&&t>TAPE_FIRST+.05&&t<TAPE_LAST-.05)drawTail(g,r,R,r.i?(t<=0||t>TAPE_SECONDS):(t<0||t>=TAPE_SECONDS))
 // ---- 7. top flange ------------------------------------------------------------------
 g.save();g.beginPath();g.save();plateDisc(g,r,1.7);g.arc(0,0,1,0,Math.PI*2);g.restore();
 g.save();plateDisc(g,r,0);g.moveTo(1,0);g.arc(0,0,1,0,Math.PI*2);g.restore();g.translate(r.x,0);
 const rimTop=g.createLinearGradient(-r.rx,0,r.rx,0);for(const [s,col] of [[0,'#6a6054'],[.25,'#d9cdb9'],[.5,'#fff6e6'],[.75,'#b4a796'],[1,'#5a5046']])rimTop.addColorStop(s,col);
 g.fillStyle=rimTop;g.fill('evenodd');g.restore();
 toPlate(r.shade);
 toPlate(r.top);
 g.restore();
}
// Upright cylinder from depth d (bottom) to the top plane, seen from above.
// texture: photographed wall strip; otherwise a plain metal gradient.
function cylinder(g,r,R,d,texture,c0,c1){
 const slices=texture?48:1;
 if(!texture){
  g.save();g.beginPath();
  g.save();plateDisc(g,r,0);g.arc(0,0,R,0,Math.PI,false);g.restore();
  g.save();plateDisc(g,r,d);g.arc(0,0,R,Math.PI,0,true);g.restore();g.closePath();
  const [lx]=onDisc(r,-R,0),[qx]=onDisc(r,R,0);
  const grad=g.createLinearGradient(lx,0,qx,0);grad.addColorStop(0,c0);grad.addColorStop(.38,c1);grad.addColorStop(1,c0);
  g.fillStyle=grad;g.fill();
  g.save();plateDisc(g,r,0);g.beginPath();g.arc(0,0,R,0,Math.PI*2);g.fillStyle=c1;g.fill();g.restore();
  g.restore();return;
 }
 // textured wall, slice by slice so the photograph wraps the cylinder
 const W=texture.width,H=texture.height;
 for(let k=0;k<slices;k++){
  const a0=k/slices*Math.PI,a1=(k+1)/slices*Math.PI;
  const [x0,y0]=onDisc(r,R*Math.cos(a0),R*Math.sin(a0)),[x1,y1]=onDisc(r,R*Math.cos(a1),R*Math.sin(a1));
  g.save();g.transform(x1-x0,y1-y0,0,d,x0,y0);
  g.drawImage(texture,k/slices*W,0,W/slices,H,0,0,1.02,1);g.restore();
 }
 // pack top: turns of tape seen edge-on
 g.save();g.save();plateDisc(g,r,.6);g.beginPath();g.arc(0,0,R,0,Math.PI*2);g.restore();g.clip();
 const bx=reelBox(r);g.drawImage(r.packProj,bx.x,bx.y+.6,bx.w,bx.h);
 plateDisc(g,r,.6);
 g.lineWidth=.007;g.strokeStyle='rgba(170,168,162,.3)';g.beginPath();g.arc(0,0,R-.004,Math.PI*1.05,Math.PI*1.95);g.stroke();
 g.restore();
 // contact shadow where the pack meets the lower flange
 g.save();plateDisc(g,r,d);g.beginPath();g.arc(0,0,R+.02,0,Math.PI);g.lineWidth=.02;g.strokeStyle='rgba(10,7,4,.35)';g.stroke();g.restore();
}
// The 2-inch tape stands on edge: from the tangent point on the pack it runs to the
// first guide, its upper and lower edges converging with perspective.
function drawTail(g,r,R,clear){
 const [u,v]=tangentPoint(r,R,r.d/2),[tx,ty]=onDisc(r,u,v);
 // Seen almost edge-on the tape would be a hairline; the slight twist it takes
 // toward the guide shows a few pixels of its face, as on the photograph.
 const [ex,ey,eh]=r.exit,w=2.3*r.side;
 const top=[tx-w,ty+.3],bot=[tx+w,ty+r.d-.3],etop=[ex-w,ey-eh/2],ebot=[ex+w,ey+eh/2];
 g.save();
 g.beginPath();g.moveTo(...top);g.lineTo(...etop);g.lineTo(...ebot);g.lineTo(...bot);g.closePath();
 // across the tape: bright upper edge, amber body, darker lower edge
 const nx=-(etop[1]-top[1]),ny=etop[0]-top[0],n=Math.hypot(nx,ny)||1,span=6;
 const mx=(top[0]+etop[0])/2,my=(top[1]+etop[1])/2;
 const across=g.createLinearGradient(mx,my,mx-nx/n*span*r.side,my-ny/n*span*r.side);
 across.addColorStop(0,'rgba(64,63,60,.98)');across.addColorStop(.3,'rgba(24,24,23,.98)');across.addColorStop(1,'rgba(8,8,8,.98)');
 if(clear){g.fillStyle='rgba(236,226,200,.16)';g.fill();g.lineWidth=.5;g.strokeStyle='rgba(255,248,226,.55)';g.stroke()}
 else{g.fillStyle=across;g.fill()}
 g.lineWidth=.55;g.strokeStyle='rgba(175,173,168,.5)';g.beginPath();g.moveTo(...top);g.lineTo(...etop);g.stroke();
 g.lineWidth=.5;g.strokeStyle='rgba(30,14,5,.55)';g.beginPath();g.moveTo(...bot);g.lineTo(...ebot);g.stroke();
 g.restore();
}

// ---------------------------------------------------------------------------
// PANEL LAMPS — the photograph shows every lamp lit. Each one gets an "unlit"
// version made from its own pixels: the glow is pulled back to the panel colour
// and the lens darkens to its coloured glass, so switching is believable.
// ---------------------------------------------------------------------------
const LAMPS=[
 // x, y, radius, unlit glass colour, when lit
 [210.7,305.6,5.2,[70,46,14], ()=>power],                                       // POWER
 [459.3,301.7,4.6,[66,14,12], ()=>power&&mode==='record'],                      // RECORD
 [503.3,301.3,4.8,[78,76,70], ()=>power&&!!loaded],                             // TAPE THREADED
 [546.7,301.3,4.8,[72,50,14], ()=>power&&Math.abs(tapeSpeed)>.05],              // TAPE IN MOTION
 [730.0,298.2,4.8,[16,52,42], ()=>power&&(mode==='play'||mode==='record')&&tapeSpeed>.95&&performance.now()-lockFrom>1100] // SERVO LOCK
];
const VU_WINDOWS=[[258,294,60,36],[323,294,61,36]];
function buildLampSprites(){
 const sx=photo.naturalWidth/960,sy=photo.naturalHeight/540,c=document.createElement('canvas'),g=c.getContext('2d',{willReadFrequently:true});
 for(const lamp of LAMPS){
  const [x,y,r,glass]=lamp,R=r*3.2,X=Math.round((x-R)*sx),Y=Math.round((y-R)*sy),S=Math.round(2*R*sx);
  c.width=c.height=S;g.clearRect(0,0,S,S);g.drawImage(photo,-X,-Y);
  const img=g.getImageData(0,0,S,S),d=img.data;
  // panel colour: median of the ring just outside the halo
  const ring=[];for(let k=0;k<64;k++){const a=k/64*Math.PI*2,px=Math.round(S/2+Math.cos(a)*S*.48),py=Math.round(S/2+Math.sin(a)*S*.48),o=(py*S+px)*4;ring.push([d[o],d[o+1],d[o+2]])}
  const med=i=>ring.map(v=>v[i]).sort((a,b)=>a-b)[32],panel=[med(0),med(1),med(2)];
  const pr=r*sx;
  for(let py=0;py<S;py++)for(let px=0;px<S;px++){
   const o=(py*S+px)*4,dist=Math.hypot(px-S/2,py-S/2)/pr;
   if(dist<1){
    // unlit lens: coloured glass, darker at the rim, one small window reflection
    const shade=.55+.45*(1-dist*dist),spec=Math.exp(-((px-S/2+pr*.35)**2+(py-S/2+pr*.38)**2)/(pr*pr*.05));
    for(let ch=0;ch<3;ch++)d[o+ch]=Math.min(255,glass[ch]*shade+spec*150);
    d[o+3]=255;
   }else{
    // pull the halo back to the panel's own colour, keep darker detail (bezel)
    const f=Math.min(1,Math.max(0,(dist-1)/2.1));
    for(let ch=0;ch<3;ch++){const v=d[o+ch];d[o+ch]=v>panel[ch]?panel[ch]+(v-panel[ch])*f*f:v}
    d[o+3]=dist<3.1?255:Math.max(0,255-(dist-3.1)*600);
   }
  }
  g.putImageData(img,0,0);
  const sprite=document.createElement('canvas');sprite.width=sprite.height=S;sprite.getContext('2d').drawImage(c,0,0);
  lamp.off={canvas:sprite,x:X/sx,y:Y/sy,s:S/sx};
 }
}
function drawLamps(g){
 for(const lamp of LAMPS){if(!lamp[4]()&&lamp.off)g.drawImage(lamp.off.canvas,lamp.off.x,lamp.off.y,lamp.off.s,lamp.off.s)}
 if(!power){g.save();g.fillStyle='rgba(18,12,6,.62)';for(const [x,y,w,h] of VU_WINDOWS){g.beginPath();g.roundRect(x+4,y+3,w-8,h-6,2);g.fill()}g.restore()}
}

let reelsReady=false,facesOK=false,facesSettled=false;
function prepareReels(){
 if(!photo.naturalWidth||!facesSettled||reelsReady)return;
 if(facesOK)buildPhotoSamples();buildLampSprites();reelsReady=true;
}
function onPlate(){prepareReels()}
photo.addEventListener('load',onPlate);
reelFaces.addEventListener('load',()=>{facesOK=facesSettled=true;onPlate()});reelFaces.addEventListener('error',()=>{facesSettled=true;onPlate()});
if(photo.complete)queueMicrotask(onPlate);

function resizeLive(){
 const next=Math.min(4,Math.max(1,stage.getBoundingClientRect().width*devicePixelRatio/960));
 const w=Math.round(960*next),h=Math.round(540*next);
 density=next;
 if(liveCanvas.width!==w||liveCanvas.height!==h){liveCanvas.width=w;liveCanvas.height=h}
 sizeReelCanvases();
}
new ResizeObserver(resizeLive).observe(room);resizeLive();

// ---------------------------------------------------------------------------
// THREADED TAPE — two-inch quadruplex videotape: an opaque, black oxide
// ribbon. The pictures are recorded as invisible magnetic tracks, so nothing is
// printed on it; what shows that it moves is the faint, uneven texture of the
// coating (slight density changes, the odd speck) travelling with it.
// ---------------------------------------------------------------------------
const OXIDE_LEN=256;   // plate px covered by one texture tile
const oxideTile=document.createElement('canvas');oxideTile.width=OXIDE_LEN*2;oxideTile.height=26;
(function buildOxide(){
 const g=oxideTile.getContext('2d'),W=oxideTile.width,H=oxideTile.height,img=g.createImageData(W,H),d=img.data;
 let seed=1956;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 // low-frequency density along the length (wraps seamlessly)
 const wave=x=>.55*Math.sin(x*Math.PI*2*3/W+.7)+.3*Math.sin(x*Math.PI*2*7/W+2.1)+.15*Math.sin(x*Math.PI*2*13/W+4.4);
 const rows=[];for(let y=0;y<H;y++)rows.push((rnd()-.5)*.9);           // lengthwise coating streaks
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const v=wave(x)*.6+rows[y]*.5+(rnd()-.5)*.35,o=(y*W+x)*4;
  if(v>0){d[o]=190;d[o+1]=188;d[o+2]=182;d[o+3]=Math.min(255,v*24)}   // lighter, satin
  else{d[o]=0;d[o+1]=0;d[o+2]=0;d[o+3]=Math.min(255,-v*70)}           // denser oxide
 }
 g.putImageData(img,0,0);
 // a few specks and one splice-like mark, so the motion reads clearly
 for(let k=0;k<9;k++){g.fillStyle='rgba(210,208,200,'+(.18+rnd()*.2)+')';g.fillRect(rnd()*W,2+rnd()*(H-4),1.2+rnd()*2,1)}
 g.fillStyle='rgba(200,190,175,.22)';g.fillRect(W*.62,0,3,H);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(W*.62+3,0,1,H);
})();
// Measured on the 960 × 540 plate. Each span ends behind a guide or housing.
const filmSpans=[
 [[262,194],[312,189]],[[323,189],[362,190]],[[384,190],[398,191]],[[418,191],[443,192]],
 [[540,192],[573,191],[628,186]],[[645,186],[681,191],[714,197]]
];
// 15 in/s on the plate: flange of 12½ in ≈ 2 × 111 px → ≈ 17.8 px per inch.
const PLATE_PX_PER_SECOND=15*17.8;
// Solid black tape with a satin oxide finish. Across its 2-inch width: a thin,
// slightly brighter cut edge top and bottom and a broad, low sheen. Along its
// length the sheen follows the studio key light (above the head block), so it
// brightens where a stretch faces the light and falls away where it turns aside.
let tapeAcross=null;
function acrossFor(g,height){
 if(tapeAcross)return tapeAcross;
 tapeAcross=g.createLinearGradient(0,-height/2,0,height/2);
 for(const [s,c] of [[0,'#4b4a47'],[.045,'#1a1a19'],[.16,'#1d1d1c'],[.34,'#232322'],[.55,'#141414'],[.85,'#0b0b0b'],[.955,'#0d0d0d'],[1,'#33322f']])tapeAcross.addColorStop(s,c);
 return tapeAcross;
}
const KEY_LIGHT_X=470;
function sheenAt(px,angle){
 // broad reflection of the overhead key light, stronger on stretches that tilt toward it
 const lobe=Math.exp(-(((px-KEY_LIGHT_X)/190)**2)),tilt=.75+.25*Math.cos(angle*6);
 return .03+.085*lobe*tilt;
}
function drawThreadedFilm(g,phase,blur){
 const height=13.6;
 for(const span of filmSpans){
  for(let i=1;i<span.length;i++){
   const [x,y]=span[i-1],dx=span[i][0]-x,dy=span[i][1]-y,length=Math.hypot(dx,dy),ang=Math.atan2(dy,dx);
   g.save();g.translate(x,y);g.rotate(ang);
   g.fillStyle=acrossFor(g,height);g.fillRect(0,-height/2,length,height);
   // satin sheen along the length, concentrated in the upper half of the width
   const along=g.createLinearGradient(0,0,length,0);
   for(let k=0;k<=4;k++){const u=k/4;along.addColorStop(u,'rgba(214,212,206,'+sheenAt(x+dx*u,ang).toFixed(3)+')')}
   g.fillStyle=along;g.fillRect(0,-height/2+1.1,length,height*.42);
   g.globalAlpha=.5;g.fillRect(0,-height/2+1.1+height*.42,length,height*.18);
   g.restore();
  }
 }
 if(blur>.98)return;             // at spooling speed the texture is an even blur
 for(const span of filmSpans){
  let distance=span[0][0]-262;
  for(let i=1;i<span.length;i++){
   const [x,y]=span[i-1],dx=span[i][0]-x,dy=span[i][1]-y,length=Math.hypot(dx,dy);
   g.save();g.translate(x,y);g.rotate(Math.atan2(dy,dx));
   g.beginPath();g.rect(0,-height/2,length,height);g.clip();
   // texture fixed to the tape: it moves downstream, left to right, on PLAY
   const offset=((phase-distance)%OXIDE_LEN+OXIDE_LEN)%OXIDE_LEN;
   g.globalAlpha=1-blur;
   for(let u=offset-OXIDE_LEN;u<length;u+=OXIDE_LEN)g.drawImage(oxideTile,u,-height/2,OXIDE_LEN+.05,height);
   g.restore();distance+=length;
  }
 }
}

// ---------------------------------------------------------------------------
// TAPE PATH STATE — which stretches of the threaded path hold programme tape,
// clear leader, or nothing at all (after the tape has run out).
// ---------------------------------------------------------------------------
const PATH=geometry.path,PATH_LEN=[0];
for(let i=1;i<PATH.length;i++)PATH_LEN.push(PATH_LEN[i-1]+Math.hypot(PATH[i][0]-PATH[i-1][0],PATH[i][1]-PATH[i-1][1]));
const PATH_TOTAL=PATH_LEN[PATH_LEN.length-1],PATH_PXS=PATH_TOTAL/PATH_SECONDS;
function pathPoint(d){
 d=Math.max(0,Math.min(PATH_TOTAL,d));let i=1;while(i<PATH.length-1&&PATH_LEN[i]<d)i++;
 const f=(d-PATH_LEN[i-1])/(PATH_LEN[i]-PATH_LEN[i-1]||1),[x0,y0]=PATH[i-1],[x1,y1]=PATH[i];
 const L=Math.hypot(x1-x0,y1-y0)||1;return [x0+(x1-x0)*f,y0+(y1-y0)*f,-(y1-y0)/L,(x1-x0)/L];
}
// band of the given half-height along the path between distances d0 and d1
function pathBand(d0,d1,half){
 const p=new Path2D(),top=[],bot=[],n=Math.max(2,Math.ceil((d1-d0)/4));
 for(let k=0;k<=n;k++){const [x,y,nx,ny]=pathPoint(d0+(d1-d0)*k/n);top.push([x+nx*half,y+ny*half]);bot.push([x-nx*half,y-ny*half])}
 top.forEach(([x,y],k)=>k?p.lineTo(x,y):p.moveTo(x,y));bot.reverse().forEach(([x,y])=>p.lineTo(x,y));p.closePath();return p;
}
// distance along the path of tape coordinate t (programme seconds)
const pathDist=t=>PATH_TOTAL-(t-position)*PATH_PXS;
function pathRanges(){
 const clip=(a,b)=>{const lo=Math.max(0,Math.min(a,b)),hi=Math.min(PATH_TOTAL,Math.max(a,b));return hi>lo?[lo,hi]:null};
 return {
  programme:clip(pathDist(TAPE_SECONDS),pathDist(0)),
  leaders:[clip(pathDist(0),pathDist(TAPE_FIRST)),clip(pathDist(TAPE_LAST),pathDist(TAPE_SECONDS))].filter(Boolean),
  empty:[clip(pathDist(TAPE_FIRST),PATH_TOTAL+1),clip(-1,pathDist(TAPE_LAST))].filter(Boolean)
 };
}
function drawPathState(g,ranges){
 if(!bareDeck.naturalWidth)return;
 const sx=bareDeck.naturalWidth/960,sy=bareDeck.naturalHeight/540;
 // photographed tape is replaced by the bare deck wherever there is no oxide tape
 for(const [a,b] of [...ranges.empty,...ranges.leaders]){
  g.save();g.clip(pathBand(a,b,11));
  g.drawImage(bareDeck,225*sx,170*sy,520*sx,45*sy,225,170,520,45);g.restore();
  g.save();g.globalAlpha=.5;g.clip(pathBand(a,b,12.5));
  g.drawImage(bareDeck,225*sx,170*sy,520*sx,45*sy,225,170,520,45);g.restore();
 }
 // clear leader: a nearly invisible ribbon that catches the light at its edges
 for(const [a,b] of ranges.leaders){
  g.save();g.fillStyle='rgba(240,232,210,.13)';g.fill(pathBand(a,b,6.4));
  g.lineWidth=.55;g.strokeStyle='rgba(255,250,232,.5)';g.stroke(pathBand(a,b,6.4));
  g.globalAlpha=.25;g.fillStyle='#fff8e6';g.fill(pathBand(a,b,.5));g.restore();
 }
}
let livePainted=false;
let lastScene='';
function animateStudio(now){
 requestAnimationFrame(animateStudio);
 if(document.hidden||!reelsReady)return;
 // Nothing moves while the transport is still and the monitor is dark: keep the
 // last frame instead of repainting it, to spare the visitor's battery.
 const scene=[loaded,power,mode,position.toFixed(3),reelAngle[0].toFixed(4),reelAngle[1].toFixed(4),density,liveCanvas.width,facesOK,!!bareDeck.naturalWidth,LAMPS.map(l=>l[4]()?1:0).join('')].join();
 const idle=!(power&&loaded&&mode!=='stop')&&Math.abs(tapeSpeed)<1e-4;
 if(idle&&scene===lastScene&&livePainted)return;
 lastScene=scene;
 const g=livePaint;g.setTransform(liveCanvas.width/960,0,0,liveCanvas.height/540,0,0);g.clearRect(0,0,960,540);
 if(loaded&&facesOK){
  for(const r of REELS){g.drawImage(r.deckPatch.canvas,r.deckPatch.x,r.deckPatch.y,r.deckPatch.w,r.deckPatch.h)}
  for(const r of REELS){
   const rot=reelAngle[r.i],step=rot-r.prevAngle;r.prevAngle=rot;
   drawReel(g,r,packRadius(r.i),rot,step);
  }
  // restore the photographed parts that stand in front of the reels
  g.save();g.clip(occluders);
  const sx=photo.naturalWidth/960,sy=photo.naturalHeight/540;
  g.drawImage(photo,240*sx,135*sy,200*sx,45*sy,240,135,200,45);
  g.drawImage(photo,530*sx,135*sy,210*sx,45*sy,530,135,210,45);
  g.restore();
 }
 if(loaded){
  if(typeof programs!=='undefined'&&programs[loaded]){
   const travel=position*PLATE_PX_PER_SECOND,perFrame=Math.abs(tapeSpeed)*PLATE_PX_PER_SECOND/60;
   const ranges=pathRanges();
   drawPathState(g,ranges);
   // the programme pictures appear only on the stretch of oxide tape
   if(ranges.programme){g.save();g.clip(pathBand(...ranges.programme,9));
    drawThreadedFilm(g,travel,Math.min(1,Math.max(0,(perFrame-6)/14)));g.restore()}
  }
 }
 drawLamps(g);
 const [sx,sy,sw,sh]=geometry.screen;
 g.save();g.beginPath();g.roundRect(sx,sy,sw,sh,[sw*.15]);g.clip();g.fillStyle='#131815';g.fillRect(sx,sy,sw,sh);
 if(power&&loaded&&mode!=='stop'){g.drawImage(c,sx,sy,sw,sh);g.globalAlpha=.13;g.fillStyle='#06100c';for(let j=sy;j<sy+sh;j+=1.8)g.fillRect(sx,j,sw,.55)}
 g.restore();
 if(!livePainted){livePainted=true;document.dispatchEvent(new Event('ampex:frame'))}
}
requestAnimationFrame(animateStudio);
function viewStudio(){stage.style.transform='perspective(1600px) scale('+Math.max(1,zoom)+') rotateY('+((tilt-.22)*4)+'deg)';room.classList.toggle('empty-deck',!loaded)}
const initialLoad=loadReel;
loadReel=function(id){initialLoad(id);viewStudio()};
document.querySelector('#view').addEventListener('input',viewStudio);document.querySelector('#zoom').addEventListener('input',viewStudio);
viewStudio();

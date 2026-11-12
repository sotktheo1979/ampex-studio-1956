// Perspective rendering of the transport in millimetre-like studio coordinates.
const deckCanvas=document.querySelector('#deckCanvas'), paint=deckCanvas.getContext('2d');
let loaded='studio', tilt=.22, zoom=1, pressed='', pressedUntil=0;
const hits=[];
function project(x,y,z){
  const X=x*Math.cos(tilt)+z*Math.sin(tilt), Z=z*Math.cos(tilt)-x*Math.sin(tilt);
  const depth=1150-Z*.78+y*.62, scale=1.39*1150/depth*zoom;
  return [590+X*scale,288-(y*.78+Z*.62)*scale];
}
function face(points,fill,stroke){
  const p=points.map(v=>project(...v));paint.beginPath();p.forEach(([x,y],i)=>i?paint.lineTo(x,y):paint.moveTo(x,y));paint.closePath();paint.fillStyle=fill;paint.fill();
  if(stroke){paint.strokeStyle=stroke;paint.lineWidth=1;paint.stroke()}return p;
}
function metal(a,b,c){const g=paint.createLinearGradient(150,80,1000,520);g.addColorStop(0,a);g.addColorStop(.43,b);g.addColorStop(1,c);return g}
function cylinder(x,z,y,r,h,colors){
  const pts=[],bottom=[];for(let i=0;i<=64;i++){let a=i*Math.PI/32;pts.push([x+r*Math.cos(a),y+h,z+r*Math.sin(a)]);bottom.push([pts[i][0],y,pts[i][2]])}
  for(let i=32;i<64;i++){let v=Math.round((.48+.42*Math.cos((i-47)*.17))*colors);face([bottom[i],bottom[i+1],pts[i+1],pts[i]],'rgb('+[v+10,v+6,v].join(',')+')')}
  face(pts,metal('#6c6e68','#e3e0ce','#878779'),'#d4cfc0');
}
function reelAt(x,r,spin){
  cylinder(x,36,3,r,9,94);cylinder(x,36,12,r*.97,9,61);cylinder(x,36,21,r,3,176);
  const rim=[];for(let j=0;j<96;j++){let a=j*Math.PI/48;rim.push([x+(r-3)*Math.cos(a),24.4,36+(r-3)*Math.sin(a)])}face(rim,metal('#888d85','#e0ddd0','#888d86'),'#f6f1db');
  for(let k=0;k<3;k++){let a=spin+k*2*Math.PI/3,slot=[];for(let j=0;j<=22;j++){let b=a-.57+j*.052;slot.push([x+r*.83*Math.cos(b),25,36+r*.83*Math.sin(b)])}for(let j=22;j>=0;j--){let b=a-.57+j*.052;slot.push([x+r*.35*Math.cos(b),25,36+r*.35*Math.sin(b)])}face(slot,'#332820','#f4e9cb')}
  cylinder(x,36,25,19,5,145);cylinder(x,36,30,7,6,111)
}
function letter(t,x,y,z,size,color){let p=project(x,y,z);paint.fillStyle=color;paint.font=size+'px Georgia';paint.textAlign='center';paint.fillText(t,...p)}
function renderDeck(now){
  if(!document.querySelector(".room").classList.contains("inspection")){requestAnimationFrame(renderDeck);return}
  paint.clearRect(0,0,1180,730);hits.length=0;
  const cream=metal('#f0dbc0','#c5aa78','#88764f'),green=metal('#637c72','#44655d','#2b4340');
  face([[-295,-243,-126],[295,-243,-126],[295,-74,-126],[-295,-74,-126]],'#393329');
  face([[-297,-235,-130],[-297,0,-130],[-297,0,134],[-297,-235,134]],'#a48d67');
  face([[297,-235,-130],[297,0,-130],[297,0,134],[297,-235,134]],cream);
  face([[-299,-238,-132],[299,-238,-132],[299,-68,-132],[-299,-68,-132]],cream);
  face([[-268,-218,-133],[267,-218,-133],[267,-96,-133],[-268,-96,-133]],metal('#262923','#665e48','#322e26'));
  for(let i=0;i<12;i++){let x=-240+i*43;face([[x,-212,-134],[x+13,-212,-134],[x+13,-112,-134],[x,-112,-134]],metal('#49453c','#817762','#383830'))}
  face([[-300,-82,-139],[300,-82,-139],[300,0,-106],[-300,0,-106]],cream);
  face([[-279,-66,-138],[279,-66,-138],[279,-9,-110],[-279,-9,-110]],green);
  face([[-298,0,-106],[298,0,-106],[298,0,133],[-298,0,133]],cream,'#e7d8bc');
  face([[-270,1,-92],[270,1,-92],[270,1,117],[-270,1,117]],metal('#67635a','#a3987f','#5e6056'),'#d8cdb6');
  if(loaded){reelAt(-169,74,angle*Math.PI/180);reelAt(162,74,angle*Math.PI/170)}else{cylinder(-169,36,1,10,30,155);cylinder(162,36,1,10,30,155)}
  const guides=[[-117,-26,13],[-96,-59,11],[-49,-48,13],[0,-56,21],[53,-47,13],[99,-62,11],[123,-24,12]];
  for(const [x,z,r] of guides)cylinder(x,z,2,r,28,185);
  if(loaded){
    let route=[[-225,0]], arcs=[[-117,-26,13,3.35,4.05],[-96,-59,11,3.82,5.16],[-49,-48,13,1.97,1.23],[0,-56,21,4.05,5.35],[53,-47,13,1.91,1.2],[99,-62,11,4.32,5.68],[123,-24,12,5.48,6.04]];
    for(const [x,z,r,start,end] of arcs)for(let j=0;j<=12;j++){const a=start+(end-start)*j/12;route.push([x+(r+.5)*Math.cos(a),z+(r+.5)*Math.sin(a)])}route.push([222,0]);
    for(let j=1;j<route.length;j++){let [a,b]=route[j-1],[c,d]=route[j];let shade=Math.round(63+24*Math.sin(Math.atan2(d-b,c-a)+.6));face([[a,6,b],[c,6,d],[c,24,d],[a,24,b]],'rgba('+shade+','+(shade-19)+','+(shade-33)+',.89)');let p=project(a,24,b),q=project(c,24,d);paint.beginPath();paint.moveTo(...p);paint.lineTo(...q);paint.strokeStyle='#cb987462';paint.stroke()}
  }
  for(const [x,z,r] of guides)cylinder(x,z,30,r+1,2,185);
  for(let i=0;i<2;i++){let x=-218+i*57;face([[x-22,-51,-132],[x+22,-51,-132],[x+22,-20,-117],[x-22,-20,-117]],'#232a24');face([[x-18,-46,-131],[x+18,-46,-131],[x+18,-23,-119],[x-18,-23,-119]],power?'#cbb782':'#756e57');letter('VU',x,-40,-130,8,'#3d392e')}
  const controls=[['rewind','◀◀'],['stop','■'],['play','▶'],['forward','▶▶'],['record','●']];
  controls.forEach(([id,label],i)=>{let x=-72+i*52,y=pressed===id&&pressedUntil>now?-38:-34;const p=project(x,y,-127);paint.fillStyle='#252720';paint.fillRect(p[0]-20,p[1]-11,40,25);const g=paint.createLinearGradient(0,p[1]-10,0,p[1]+11);g.addColorStop(0,id==='record'?'#ac6555':'#d7cfac');g.addColorStop(1,id==='record'?'#693a30':'#8e8972');paint.fillStyle=g;paint.fillRect(p[0]-17,p[1]-10,34,19);paint.font='12px sans-serif';paint.textAlign='center';paint.fillStyle='#282923';paint.fillText(label,...p);hits.push({id,x:p[0],y:p[1]});});
  letter('A M P E X',0,-78,-141,17,'#39372d');letter('VRX–1000',218,-39,-130,12,'#eee1bc');
  requestAnimationFrame(renderDeck)
}
deckCanvas.onclick=e=>{let b=deckCanvas.getBoundingClientRect(),x=(e.clientX-b.left)*1180/b.width,y=(e.clientY-b.top)*730/b.height;let k=hits.find(k=>Math.abs(k.x-x)<25&&Math.abs(k.y-y)<18);if(k)setMode(k.id)};
requestAnimationFrame(renderDeck);

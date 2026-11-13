// Startup coordinator. The page stays behind a quiet curtain until every visible
// piece — stylesheets, the decoded master photograph, the rebuilt reels, the key
// caps and the first composited frame — is ready, then it is shown in one piece.
(function(){
 const root=document.documentElement,curtain=document.getElementById('boot');
 const started=performance.now();
 let done=false;
 function fail(reason){
  if(done)return;done=true;
  root.classList.add('boot-failed');
  const msg=curtain&&curtain.querySelector('.boot-msg');
  if(msg)msg.textContent=reason||'Το στούντιο δεν φόρτωσε σωστά.';
 }
 function reveal(){
  if(done)return;done=true;
  root.classList.remove('booting');root.classList.add('ampex-ready');
  if(curtain){
   const quick=performance.now()-started<450;
   curtain.classList.add(quick?'gone':'leaving');
   setTimeout(()=>curtain.remove(),quick?0:600);
  }
  // Warm the images used later (eject, reel change) so they never pop in.
  for(const src of ['empty.webp','hands.webp']){const i=new Image();i.decoding='async';i.src=src}
 }
 const decoded=img=>new Promise((ok,no)=>{
  const go=()=>img.decode?img.decode().then(ok,()=>img.naturalWidth?ok():no()):ok();
  if(img.complete){img.naturalWidth?go():no()}
  else{img.addEventListener('load',go,{once:true});img.addEventListener('error',()=>no(),{once:true})}
 });
 const framePainted=new Promise(ok=>{if(typeof livePainted!=="undefined"&&livePainted)ok();else document.addEventListener('ampex:frame',ok,{once:true})});
 const settle=()=>new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)));
 window.addEventListener('error',e=>{if(!done&&/\.js$/.test((e.filename||'').split('?')[0]))fail('Παρουσιάστηκε σφάλμα κατά την προετοιμασία του στούντιο.')});
 const timeout=setTimeout(()=>fail('Η φόρτωση αργεί περισσότερο από το αναμενόμενο. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.'),25000);
 Promise.all([
  decoded(photo),
  decoded(reelFaces).catch(()=>{}),          // reels fall back to the plain photograph
  document.fonts?document.fonts.ready:null,
  framePainted
 ]).then(settle).then(()=>{clearTimeout(timeout);reveal()},()=>{clearTimeout(timeout);fail('Δεν ήταν δυνατή η φόρτωση της φωτογραφίας του στούντιο.')});
 const retry=document.getElementById('bootRetry');if(retry)retry.onclick=()=>location.reload();
})();

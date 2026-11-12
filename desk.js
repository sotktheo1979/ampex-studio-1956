const bar=$('#deskControls');
for(const [modeName,label] of Object.entries({rewind:'Rewind',stop:'Stop',play:'Play',pause:'Pause',forward:'Fast forward',record:'Record'})){
 const button=document.createElement('button');button.textContent=label;button.dataset.mode=modeName;button.onclick=()=>setMode(modeName);bar.append(button)
}
bar.insertAdjacentHTML('beforeend','<button id="eject">Εξαγωγή</button><button id="deskPower" aria-pressed="true">Τροφοδοσία</button><label>Γωνία <input id="view" type="range" min="-28" max="32" value="13"></label><label>Μεγέθυνση <input id="zoom" type="range" min="90" max="135" value="100"></label>');
function shelfStatus(){document.querySelectorAll('[data-reel]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.reel===loaded));$('#reelStatus').textContent=loaded?'Η μπομπίνα τοποθετήθηκε':'Κενή βάση · επιλέξτε μπομπίνα'}
function loadReel(id){if(power)setMode('stop');position=0;angle=0;loaded=id;source=id||'studio';$('#source').value=source;updateTime();shelfStatus();clickSound();toast(id?'Η ταινία είναι έτοιμη.':'Η μπομπίνα επέστρεψε στο ράφι.')}
document.querySelectorAll('[data-reel]').forEach(b=>b.onclick=()=>loadReel(b.dataset.reel));$('#source').onchange=e=>loadReel(e.target.value);$('#eject').onclick=()=>loadReel('');$('#deskPower').onclick=()=>{$('#power').click();$('#deskPower').setAttribute('aria-pressed',power);toast(power?'Τροφοδοσία ενεργή':'Τροφοδοσία κλειστή')};$('#view').oninput=e=>tilt=+e.target.value*Math.PI/180;$('#zoom').oninput=e=>zoom=+e.target.value/100;
document.addEventListener('click',e=>{if(sound&&e.target.closest('button,select')&&!e.target.closest('[data-mode],[data-reel],#eject,#power,#deskPower'))clickSound()});
shelfStatus();

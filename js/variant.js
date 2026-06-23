/* === Sorcery Chess · variant.js ===
   The home-screen "choose your game" dropdown (Sorcery / Classic) and the
   modes-page filtering that keeps the offered battle types in step with the chosen variant.
   Plain (non-module) script sharing one global scope — load order fixed, before boot.js.

   VARIANT / pendingVariant / VARIANTS live in state.js. This file owns only the UI:
   building the dropdown, remembering the choice (sorceryChessVariant), and adjusting the
   modes page. The actual board build happens in newGame() off the committed VARIANT. */

const VARIANT_KEY='sorceryChessVariant';
// restore the player's last variant choice (defaults to sorcery, the headline mode)
try{ const sv=localStorage.getItem(VARIANT_KEY); if(sv && VARIANTS[sv]) pendingVariant=sv; }catch(e){}

const variantPick=document.getElementById('variantPick');
const variantBtn=document.getElementById('variantBtn');
const variantMenu=document.getElementById('variantMenu');

function closeVariantMenu(){
  variantMenu.classList.remove('open');
  variantBtn.setAttribute('aria-expanded','false');
}
// paint the dropdown button + highlight the active option to match pendingVariant
function paintVariantBtn(){
  const cfg=VARIANTS[pendingVariant]||VARIANTS.sorcery;
  document.getElementById('vbGlyph').textContent=cfg.glyph;
  document.getElementById('vbName').textContent=cfg.name;
  document.getElementById('vbTag').textContent=cfg.tagline;
  variantMenu.querySelectorAll('.vopt').forEach(o=>o.classList.toggle('on',o.dataset.variant===pendingVariant));
}
function setPendingVariant(id){
  if(!VARIANTS[id]){ closeVariantMenu(); return; }
  pendingVariant=id;
  try{ localStorage.setItem(VARIANT_KEY,id); }catch(e){}
  closeVariantMenu();
  paintVariantBtn();
  updateVariantUI();
  if(typeof updateModeLocks==='function') updateModeLocks(); // defeats are per-variant — re-show this one's progress
  const cfg=VARIANTS[id];
  toast(cfg.soon ? cfg.name+' is being conjured — coming soon.' : cfg.name+' selected.');
}
(function buildVariantMenu(){
  for(const id in VARIANTS){
    const v=VARIANTS[id];
    const o=document.createElement('div');
    o.className='vopt'+(v.soon?' soon':'');
    o.dataset.variant=id; o.setAttribute('role','menuitemradio');
    o.innerHTML='<span class="vo-glyph">'+v.glyph+'</span>'+
      '<span class="vo-body"><b>'+v.name+(v.soon?' <span class="vo-soon">Soon</span>':'')+'</b>'+
      '<small>'+v.blurb+'</small></span><span class="vo-tick">✓</span>';
    o.addEventListener('click',()=>setPendingVariant(id));
    variantMenu.appendChild(o);
  }
})();
variantBtn.addEventListener('click',e=>{
  e.stopPropagation();
  if(variantMenu.classList.contains('open')){ closeVariantMenu(); }
  else{ variantMenu.classList.add('open'); variantBtn.setAttribute('aria-expanded','true'); }
});
document.addEventListener('click',e=>{ if(!variantPick.contains(e.target)) closeVariantMenu(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeVariantMenu(); });

/* modes page: show only the battle types the chosen variant supports, and replace the
   cards with a "coming soon" notice for any variants flagged not-yet-playable (cfg.soon). */
function updateVariantUI(){
  const cfg=VARIANTS[pendingVariant]||VARIANTS.sorcery;
  const banner=document.getElementById('variantBanner');
  if(banner) banner.innerHTML='<span class="vb-pill">'+cfg.glyph+' '+cfg.name+
    '</span><span class="vb-note">'+cfg.tagline+'</span>';
  const cards=document.getElementById('modeCards');
  const soon=document.getElementById('soonNote');
  if(cards) cards.querySelectorAll('.modecard').forEach(c=>{
    c.style.display=(cfg.battles||[]).includes(c.dataset.battle)?'':'none';
  });
  if(soon){
    if(cfg.soon){
      soon.style.display='';
      soon.innerHTML='<span class="sn-glyph">'+cfg.glyph+'</span>'+
        '<b>'+cfg.name+' — coming soon</b>'+
        '<p>'+cfg.blurb+' For now, switch back to Sorcery or Classic chess to play.</p>'+
        '<button class="ghost" id="soonBack">← Pick a playable game</button>';
      const back=document.getElementById('soonBack');
      if(back) back.addEventListener('click',()=>setPendingVariant('sorcery'));
    } else soon.style.display='none';
  }
}
paintVariantBtn();

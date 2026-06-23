/* === Sorcery Chess · theme.js ===
   The six colour skins: THEMES, applyTheme/setTheme cross-fade, mute button wiring.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* site-wide colour themes: six skins picked from a navbar dropdown, choice
   remembered in localStorage (sorceryChessTheme). A theme rides on <html>
   (theme-X drives the page backdrop) and <body> (theme-X swaps the glass +
   --accent variables). Dark is the bare default (no class). The board and the
   in-board spellcaster --magic glow stay fixed in every theme. Legacy saves of
   'light'/'dark' still map straight through. */
const THEMES=[
  {id:'dark',     name:'Obsidian',  sw:'linear-gradient(135deg,#7c8cff,#241640)'},
  {id:'light',    name:'Daylight',  sw:'linear-gradient(135deg,#ffffff,#c4cbe0)'},
  {id:'crimson',  name:'Crimson',   sw:'linear-gradient(135deg,#ff5a6a,#5a0a14)'},
  {id:'sapphire', name:'Sapphire',  sw:'linear-gradient(135deg,#38bdf8,#062a5a)'},
  {id:'emerald',  name:'Emerald',   sw:'linear-gradient(135deg,#34d8a0,#063d2a)'},
  {id:'amethyst', name:'Amethyst',  sw:'linear-gradient(135deg,#c084fc,#2a1050)'}
];
const THEME_IDS=THEMES.map(t=>t.id);
let theme='dark';
try{ const sv=localStorage.getItem('sorceryChessTheme'); if(THEME_IDS.includes(sv)) theme=sv; }catch(e){}
const themeBtn=document.getElementById('themeBtn');
const themeMenu=document.getElementById('themeMenu');
const themePick=document.getElementById('themePick');
function applyTheme(){
  const html=document.documentElement, body=document.body;
  THEME_IDS.forEach(id=>{ html.classList.remove('theme-'+id); body.classList.remove('theme-'+id); });
  if(theme!=='dark'){ html.classList.add('theme-'+theme); body.classList.add('theme-'+theme); }
  themeMenu.querySelectorAll('.thopt').forEach(o=>o.classList.toggle('on',o.dataset.theme===theme));
}
function closeThemeMenu(){ themeMenu.classList.remove('open'); themeBtn.setAttribute('aria-expanded','false'); }
/* swap the skin with a smooth full-page cross-fade. The View Transitions API
   snapshots the old look and dissolves it into the new one, so the gradient
   backdrops + glass surfaces blend even though plain CSS can't transition them.
   Falls back to an instant swap where the API (or reduced-motion) says no. */
function setTheme(id){
  if(id===theme){ closeThemeMenu(); return; }
  theme=id;
  try{ localStorage.setItem('sorceryChessTheme',theme); }catch(e){}
  closeThemeMenu();
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(document.startViewTransition && !reduce) document.startViewTransition(()=>applyTheme());
  else applyTheme();
}
(function buildThemeMenu(){
  for(const t of THEMES){
    const o=document.createElement('div');
    o.className='thopt'; o.dataset.theme=t.id; o.setAttribute('role','menuitemradio');
    o.innerHTML='<span class="sw" style="background:'+t.sw+'"></span>'+
                '<span class="lbl">'+t.name+'</span><span class="tick">✓</span>';
    o.addEventListener('click',()=>setTheme(t.id));
    themeMenu.appendChild(o);
  }
})();
themeBtn.addEventListener('click',e=>{
  e.stopPropagation();
  if(themeMenu.classList.contains('open')){ closeThemeMenu(); }
  else{ themeMenu.classList.add('open'); themeBtn.setAttribute('aria-expanded','true'); }
});
document.addEventListener('click',e=>{ if(!themePick.contains(e.target)) closeThemeMenu(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeThemeMenu(); });
applyTheme();

const muteBtn=document.getElementById('muteBtn');
function syncMute(){ muteBtn.textContent = muted ? '🔇 Sound: off' : '🔊 Sound: on'; }
muteBtn.addEventListener('click',()=>{
  muted=!muted;
  try{ localStorage.setItem('sorceryChessMuted',muted?'1':'0'); }catch(e){}
  syncMute();
});
syncMute();

document.getElementById('abilityBtn').addEventListener('click',onAbilityClick);


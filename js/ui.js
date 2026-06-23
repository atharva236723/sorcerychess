/* === Sorcery Chess · ui.js ===
   Revive modal, piece guide, animated 2D/3D camera, fullscreen play, toast, ambient background seeding.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ---------- modals ---------- */
let pendingReviveIdx=null;
function askRevive(idx,dp){
  pendingReviveIdx=idx;
  document.getElementById('confirmText').textContent=
    `Bring the ${cap(turn)} ${NAME[dp.type]} (${GLYPH[dp.type][dp.color]}) back to life on the Witch's square? `+
    `The Witch will die after the ritual.`;
  document.getElementById('confirmModal').style.display='flex';
}
document.getElementById('confirmYes').addEventListener('click',()=>{
  document.getElementById('confirmModal').style.display='none';
  if(pendingReviveIdx!=null){ doRevive(pendingReviveIdx); pendingReviveIdx=null; }
});
document.getElementById('confirmNo').addEventListener('click',()=>{
  document.getElementById('confirmModal').style.display='none';
  pendingReviveIdx=null;
});
document.getElementById('newGameYes').addEventListener('click',()=>{
  document.getElementById('newGameModal').style.display='none';
  if(pendingMatch){ const m=pendingMatch; pendingMatch=null; beginMatch(m.vs,m.level); }
  else newGame();
});
document.getElementById('newGameNo').addEventListener('click',()=>{
  document.getElementById('newGameModal').style.display='none';
  pendingMatch=null;
});
document.getElementById('exitYes').addEventListener('click',exitGame);
document.getElementById('exitNo').addEventListener('click',()=>{
  document.getElementById('exitModal').style.display='none';
});
const guideEl=document.getElementById('pieceGuide');
const guideToggle=document.getElementById('guideToggle');
function setGuide(show){ // hidden by default; the choice is remembered
  guideEl.style.display=show?'flex':'none';
  guideToggle.style.display=show?'none':'block';
  try{ localStorage.setItem('sorceryChessGuide',show?'1':'0'); }catch(e){}
}
document.getElementById('guideHide').addEventListener('click',()=>setGuide(false));
guideToggle.addEventListener('click',()=>setGuide(true));
try{ if(localStorage.getItem('sorceryChessGuide')==='1') setGuide(true); }catch(e){}
document.querySelectorAll('.modal').forEach(m=>{
  m.addEventListener('click',e=>{ if(e.target===m) m.style.display='none'; });
});

/* ---------- camera: animated 2D/3D mode switch (no manual rotation) ---------- */
const TILT_3D=34;
let viewTilt=TILT_3D;
let is3D=true;
try{ is3D = localStorage.getItem('sorceryChessView')!=='2d'; }catch(e){}
if(!is3D) viewTilt=0;
let viewRaf=null;
function applyView(){ // batch to one style write per frame
  if(viewRaf) return;
  viewRaf=requestAnimationFrame(()=>{
    viewRaf=null;
    document.documentElement.style.setProperty('--tilt',viewTilt+'deg');
  });
}
/* ease the camera between the flat and tilted views */
let viewAnim=null;
function tweenView(toTilt,dur=750){
  if(viewAnim) cancelAnimationFrame(viewAnim);
  const t0=performance.now(), fromT=viewTilt;
  const ease=x=>x<.5 ? 2*x*x : 1-Math.pow(-2*x+2,2)/2;
  const step=now=>{
    const k=Math.min(1,(now-t0)/dur);
    viewTilt=fromT+(toTilt-fromT)*ease(k);
    applyView();
    viewAnim = k<1 ? requestAnimationFrame(step) : null;
  };
  viewAnim=requestAnimationFrame(step);
}
const modeBtn=document.getElementById('modeBtn');
function syncModeBtn(){ modeBtn.textContent = is3D ? '◻ 2D view' : '🧊 3D view'; }
modeBtn.addEventListener('click',()=>{
  is3D=!is3D;
  try{ localStorage.setItem('sorceryChessView',is3D?'3d':'2d'); }catch(e){}
  tweenView(is3D?TILT_3D:0);
  syncModeBtn();
});
syncModeBtn();
applyView(); // honour the saved mode on startup

/* ---------- fullscreen play: the board swells to fill the whole screen ----------
   Uses the native Fullscreen API on the play view when available (so the browser
   chrome vanishes too); if that's blocked we still grow the board via the .fsplay
   class alone. A bumped --cell clamp does the actual enlarging (see CSS). */
const fsBtn=document.getElementById('fsBtn');
/* the board's smooth grow + the surroundings fading out are pure CSS transitions
   (the --fs crossfade on --cell, plus the #fsbackdrop / #bgfx opacity fades) — flipping
   this class is all the JS has to do. */
function setFsClass(on){
  document.body.classList.toggle('fsplay',on);
  syncFsBtn();
}
function syncFsBtn(){
  const on=document.body.classList.contains('fsplay');
  fsBtn.textContent = on ? '⤢ Exit fullscreen' : '⛶ Fullscreen';
}
function enterFullscreen(){
  // fullscreen the document root (not just the play view) so the win overlay and
  // confirm modals — which live at body level — still render over the board
  const el=document.documentElement;
  const req=el.requestFullscreen||el.webkitRequestFullscreen;
  if(req){ try{ const p=req.call(el); if(p&&p.catch) p.catch(()=>setFsClass(true)); }catch(e){ setFsClass(true); } }
  else setFsClass(true); // no API → CSS-only "maximised" board
}
function exitFullscreen(){
  if(document.fullscreenElement||document.webkitFullscreenElement){
    (document.exitFullscreen||document.webkitExitFullscreen).call(document);
  } else setFsClass(false);
}
function toggleFullscreen(){ document.body.classList.contains('fsplay') ? exitFullscreen() : enterFullscreen(); }
fsBtn.addEventListener('click',toggleFullscreen);
document.getElementById('fsExit').addEventListener('click',exitFullscreen);
// the native API flips the class so Esc / browser-driven exits stay in sync with our styling
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>
  document.addEventListener(ev,()=>setFsClass(!!(document.fullscreenElement||document.webkitFullscreenElement))));

/* transient floating notice that fades away on its own */
let toastTimer=null;
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
}

/* seed the arcane background: twinkling stars + drifting sorcery glyphs.
   Built once into #bgfx (a fixed plane behind the whole site, outside the
   board's preserve-3d scene). Plain 2D nodes — cheap, no filters in the scene. */
(function buildBg(){
  const bg=document.getElementById('bgfx');
  if(!bg) return;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  for(let i=0;i<80;i++){
    const s=document.createElement('div');
    s.className='star';
    const d=rnd(1,2.6);
    s.style.left=rnd(0,100).toFixed(2)+'%';
    s.style.top=rnd(0,100).toFixed(2)+'%';
    s.style.width=d.toFixed(1)+'px'; s.style.height=d.toFixed(1)+'px';
    s.style.setProperty('--tw',rnd(2.4,6).toFixed(2)+'s');
    s.style.setProperty('--td',(-rnd(0,6)).toFixed(2)+'s');
    bg.appendChild(s);
  }
  const RUNE=['✦','✧','⟡','✶','❉','⚝','✴','◆','✺','❋','⭑','✵'];
  for(let i=0;i<18;i++){
    const r=document.createElement('div');
    r.className='rune';
    r.textContent=RUNE[i%RUNE.length];
    r.style.left=rnd(2,96).toFixed(2)+'%';
    r.style.top=rnd(8,92).toFixed(2)+'%';
    r.style.setProperty('--rs',rnd(11,26).toFixed(0)+'px');
    const rd=rnd(11,22);
    r.style.setProperty('--rd',rd.toFixed(1)+'s');
    r.style.setProperty('--rdl',(-rnd(0,rd)).toFixed(1)+'s');
    bg.appendChild(r);
  }
})();


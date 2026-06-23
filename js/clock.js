/* === Sorcery Chess · clock.js ===
   The chess clock: per-side countdown, autosave tick, flag-fall loss.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ---------- chess clock: 5:00 each, +2s per move, flag fall loses ---------- */
const fmtClock=s=>{s=Math.max(0,Math.ceil(s)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
function renderClocks(){
  for(const col of PLAYER_COLORS){
    const el=document.getElementById(TIMER_ID[col]);
    if(!el) continue;
    const txt=fmtClock(clocks[col]);
    if(el.textContent!==txt) el.textContent=txt; // ticks 5×/s but the text changes 1×/s — skip no-op writes
    el.classList.toggle('active', turn===col && !gameOver);
    el.classList.toggle('danger', clocks[col]<=30);
  }
}
let lastTick=performance.now(), saveCountdown=0;
let clockPaused=true; // no ticking on the auth screen or the About/Contact/Privacy pages
setInterval(()=>{
  const now=performance.now(), dt=(now-lastTick)/1000;
  lastTick=now;
  if(gameOver||clockPaused||!useTimer) return; // a timer-free match never ticks down
  clocks[turn]-=dt;
  if(clocks[turn]<=0){
    clocks[turn]=0;
    renderClocks();
    showEnd(`${cap(enemyOf(turn))} wins on time!`,enemyOf(turn));
    sfx('win');
    render();
    return;
  }
  renderClocks();
  saveCountdown-=dt;
  if(saveCountdown<=0){ saveCountdown=2; saveGame(); } // keep the saved clock honest across refreshes
},200);


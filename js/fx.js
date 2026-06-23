/* === Sorcery Chess · fx.js ===
   Level 4-5 fate waiver, the summoned battle music and the dark-summoning ritual.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* levels 4–5 are behind a waiver: a sarcastic warning with one chance to walk away */
const FATE_MSGS={
  4:"Oh, how brave. The Malevolent has reduced grandmasters to tears and at least three "
   +"chess engines to early retirement. Your pawns have already begun writing their wills, "
   +"and your queen is quietly updating her CV. Are you quite sure dignity means nothing to you?",
  5:"The Dominion does not 'play' chess — it conducts funerals with extra steps. Historians "
   +"will study your defeat the way they study shipwrecks: with great pity, from a safe "
   +"distance. We are contractually obliged to offer you one (1) chance to walk away. Use it."
};
let fateLevel=null;
/* a brief synthesised summoning score — same WebAudio approach as sfx(), honours mute */
function summonMusic(){
  if(muted) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume();
    const ctx=audioCtx, t=ctx.currentTime, out=ctx.destination;
    // low detuned drone, slowly swelling and rising beneath everything
    [40,40.7,60].forEach(f=>{
      const o=ctx.createOscillator(), g=ctx.createGain(), lp=ctx.createBiquadFilter();
      lp.type='lowpass'; lp.frequency.value=420;
      o.type='sawtooth'; o.frequency.setValueAtTime(f,t);
      o.frequency.linearRampToValueAtTime(f*1.5,t+3);
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(.15,t+1.2);
      g.gain.setValueAtTime(.15,t+2.4);
      g.gain.exponentialRampToValueAtTime(.0001,t+3.3);
      o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t+3.4);
    });
    // deep bell toll on the open
    [[110,.18],[164.8,.09]].forEach(([f,v])=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type='triangle'; o.frequency.value=f;
      g.gain.setValueAtTime(v,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+1.7);
      o.connect(g).connect(out); o.start(t+.02); o.stop(t+1.8);
    });
    // dissonant rising cluster — the shriek that crowns the ritual
    [233,247,370].forEach(f=>{
      const o=ctx.createOscillator(), g=ctx.createGain();
      o.type='sawtooth'; o.frequency.setValueAtTime(f,t+1.4);
      o.frequency.exponentialRampToValueAtTime(f*2.2,t+3);
      g.gain.setValueAtTime(0,t+1.4);
      g.gain.linearRampToValueAtTime(.05,t+2.2);
      g.gain.exponentialRampToValueAtTime(.0001,t+3.2);
      o.connect(g).connect(out); o.start(t+1.4); o.stop(t+3.3);
    });
    // heartbeat thumps, quickening toward the summon
    [0,.42,1.05,1.45,2.1,2.5].forEach(start=>{
      const len=Math.max(1,(ctx.sampleRate*.18)|0), buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
      const s=ctx.createBufferSource(); s.buffer=buf;
      const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=170;
      const g=ctx.createGain(); g.gain.setValueAtTime(.5,t+start); g.gain.exponentialRampToValueAtTime(.0001,t+start+.18);
      s.connect(f).connect(g).connect(out); s.start(t+start);
    });
  }catch(e){}
}
/* full-screen horror cutscene; runs cb when it ends (or when the player clicks to skip) */
let summonTimer=null;
function summonDarkness(lvl,cb){
  const el=document.getElementById('summonFx');
  document.getElementById('summonName').textContent=AI_NAMES[lvl];
  summonMusic();
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); // restart the animation
  let done=false;
  const finish=()=>{ if(done) return; done=true;
    clearTimeout(summonTimer); el.removeEventListener('click',finish);
    el.classList.remove('on'); cb&&cb(); };
  el.addEventListener('click',finish);
  summonTimer=setTimeout(finish,3100);
}
document.querySelectorAll('[data-ai]').forEach(b=>
  b.addEventListener('click',()=>{
    const lvl=+b.dataset.ai;
    if(!isUnlocked(lvl)){ toast(lockReason(lvl)); return; } // still sealed — earn it first
    if(lvl>=4){ // dread opponents: always timed, gated behind a sarcastic waiver
      fateLevel=lvl;
      document.getElementById('fateText').textContent=FATE_MSGS[lvl];
      document.getElementById('fateYes').textContent='☠ I accept my fate — summon '+AI_NAMES[lvl];
      document.getElementById('fateModal').style.display='flex';
    } else askTimer('ai',lvl); // ordinary levels first ask timed vs clockless
  }));
document.getElementById('fateYes').addEventListener('click',()=>{
  document.getElementById('fateModal').style.display='none';
  if(fateLevel){ const l=fateLevel; fateLevel=null; summonDarkness(l,()=>startMatch('ai',l)); }
});
document.getElementById('fateNo').addEventListener('click',()=>{
  document.getElementById('fateModal').style.display='none';
  fateLevel=null;
  toast('A wise choice. Your king thanks you.');
});


/* === Sorcery Chess · sound.js ===
   sfx() — the tiny WebAudio synth (no audio assets) and the mute flag.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ---------- sound (tiny WebAudio synth, no assets) ---------- */
let muted=false;
try{ muted = localStorage.getItem('sorceryChessMuted')==='1'; }catch(e){}
let audioCtx=null;
function sfx(kind){
  if(muted) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended') audioCtx.resume();
    const t=audioCtx.currentTime;
    const tone=(freq,start,dur,{type='sine',vol=.15,glide=null}={})=>{
      const o=audioCtx.createOscillator(), g=audioCtx.createGain();
      o.type=type; o.frequency.setValueAtTime(freq,t+start);
      if(glide) o.frequency.exponentialRampToValueAtTime(glide,t+start+dur);
      g.gain.setValueAtTime(0,t+start);
      g.gain.linearRampToValueAtTime(vol,t+start+.012);
      g.gain.exponentialRampToValueAtTime(.0001,t+start+dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t+start); o.stop(t+start+dur+.05);
    };
    // filtered noise burst: lowpass = thump / wood, highpass = shimmer / hiss
    const noise=(start,dur,vol=.12,cutoff=800,pass='lowpass')=>{
      const len=Math.max(1,(audioCtx.sampleRate*dur)|0);
      const buf=audioCtx.createBuffer(1,len,audioCtx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
      const src=audioCtx.createBufferSource(); src.buffer=buf;
      const f=audioCtx.createBiquadFilter(); f.type=pass; f.frequency.value=cutoff;
      const g=audioCtx.createGain();
      g.gain.setValueAtTime(vol,t+start);
      g.gain.exponentialRampToValueAtTime(.0001,t+start+dur);
      src.connect(f); f.connect(g); g.connect(audioCtx.destination);
      src.start(t+start);
    };
    switch(kind){
      case 'select':                                                       // featherlight tick on picking up a piece
        tone(700,0,.04,{vol:.05}); break;
      case 'move':                                                         // wooden tap on the board
        tone(210,0,.07,{type:'triangle',vol:.18,glide:160}); noise(0,.05,.05,1200); break;
      case 'capture':                                                      // heavy thud — a piece dies
        noise(0,.12,.2,500); tone(140,0,.1,{type:'square',vol:.08});
        tone(75,.03,.22,{type:'triangle',vol:.22,glide:50}); break;
      case 'poison':                                                       // two detuned snakes sliding downward
        tone(311,0,.5,{type:'sawtooth',vol:.07,glide:120});
        tone(298,.04,.5,{type:'sawtooth',vol:.07,glide:110});
        noise(.1,.35,.04,300); break;
      case 'poisonDeath':                                                  // the venom finishes its work — sick dissolve
        tone(220,0,.55,{type:'sawtooth',vol:.1,glide:55});
        tone(233,.05,.5,{type:'sawtooth',vol:.08,glide:60});
        noise(.15,.4,.08,250); break;
      case 'freeze':                                                       // crystalline shards + icy hiss
        tone(1568,0,.3,{vol:.09}); tone(1245,.08,.3,{vol:.09}); tone(988,.16,.4,{vol:.09});
        noise(0,.45,.05,5000,'highpass'); break;
      case 'cure':                                                         // potion bubbling upward
        tone(392,0,.1,{vol:.1,glide:440}); tone(523,.09,.1,{vol:.11,glide:587});
        tone(659,.18,.22,{vol:.12,glide:784}); break;
      case 'revive':                                                       // ritual chord swelling from the grave
        tone(262,0,.7,{vol:.07}); tone(330,.1,.6,{vol:.07}); tone(392,.2,.55,{vol:.08});
        tone(523,.35,.6,{vol:.1}); noise(.05,.6,.03,2500,'highpass'); break;
      case 'promote':                                                      // a pawn is crowned
        tone(392,0,.1,{type:'square',vol:.07}); tone(494,.09,.1,{type:'square',vol:.07});
        tone(587,.18,.1,{type:'square',vol:.07}); tone(784,.27,.3,{type:'square',vol:.09}); break;
      case 'check':                                                        // two-note warning
        tone(330,0,.16,{type:'sawtooth',vol:.09}); tone(311,.18,.32,{type:'sawtooth',vol:.11}); break;
      case 'win':                                                          // victory fanfare
        tone(523,0,.16); tone(659,.13,.16); tone(784,.26,.16); tone(1047,.39,.5,{vol:.16}); break;
      case 'draw':                                                         // deflating sigh
        tone(392,0,.25); tone(330,.22,.45); break;
      case 'start':                                                        // fresh board
        tone(392,0,.12,{vol:.1}); tone(523,.1,.2,{vol:.12}); break;
    }
  }catch(e){}
}


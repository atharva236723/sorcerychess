/* === Sorcery Chess · rules.js ===
   makePiece, newGame, exitGame, and the move/ability generators (slide/step moves, legalMoves, abilityTargets).
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

function makePiece(type,color){
  const p = {type,color,poison:null,frozen:0,moved:false};
  if(type==='wizard'){ p.charges = 4; p.cd = 0; }
  if(type==='freezer') p.cd = 0;
  return p;
}

function newGame(){
  // the active variant decides the board size and back-rank layout (sorcery 12×12 + spellcasters,
  // classic 8×8 standard) — N is set here so every later N-based loop builds the right grid
  const cfg = variantCfg();
  N = cfg.size || 12;
  const back = cfg.back || BACK_RANK;
  PLAYER_COLORS = ['white','black'];
  eliminated = {};
  board = Array.from({length:N},()=>Array(N).fill(null));
  back.forEach((t,c)=>{
    board[0][c]  = makePiece(t,'black');
    board[N-1][c]= makePiece(t,'white');
  });
  for(let c=0;c<N;c++){
    board[1][c]   = makePiece('pawn','black');
    board[N-2][c] = makePiece('pawn','white');
  }
  turn='white'; selected=null; mode='move'; gameOver=false; checkState=null; lastMove=[];
  // the Malevolent & the Dominion play a faster game: 3 minutes each instead of 5
  const startSecs = clockStartFor();
  clocks={}; graveyard={};
  PLAYER_COLORS.forEach(col=>{ clocks[col]=startSecs; graveyard[col]=[]; });
  clearSave();
  pendingAnims=[]; pendingFlights=[];
  // intro: the empty slab drops in and materialises first…
  introPending=true;
  // …then the opening cascade: pieces pop in as a wave spreading from the board's centre
  const mid=(N-1)/2;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++)
    if(board[r][c]) pendingAnims.push({type:'spawn',r,c,delay:INTRO_MS+(Math.abs(r-mid)+Math.abs(c-mid))*55});
  document.getElementById('overlay').style.display='none';
  document.getElementById('overlay').classList.remove('won');
  document.getElementById('celebr').innerHTML=''; // stop the fireworks
  sfx('start'); // silent on the very first page load (no user gesture yet) — audible on every replay
  render();
}

function requestExitGame(){ // any live match must be confirmed — no accidental walk-outs
  if(gameBooted && !gameOver)
    document.getElementById('exitModal').style.display='flex';
  else exitGame();
}
function exitGame(quiet){ // quiet=true when leaving an already-finished game from the win overlay
  document.getElementById('exitModal').style.display='none';
  netTeardown(); // close any online connection so a stale peer can't deliver ghost moves
  if(aiTimer){ clearTimeout(aiTimer); aiTimer=null; } // a queued computer move must not outlive the match
  gameOver=true; gameBooted=false;
  clearSave();
  const ov=document.getElementById('overlay');
  ov.style.display='none'; ov.classList.remove('won');
  document.getElementById('celebr').innerHTML='';
  showPage('home');
  if(!quiet) toast('Match abandoned — the realm awaits your return.');
}

const inBounds=(r,c)=> r>=0 && r<N && c>=0 && c<N;
const enemyOf=col=>col==='white'?'black':'white';
// where a pawn promotes: the far edge it is marching toward
function isPromoSquare(color,r,c){ return r===0||r===N-1; }

function slideMoves(r,c,dirs,piece,noCapture){
  const out=[];
  for(const[dr,dc] of dirs){
    let rr=r+dr,cc=c+dc;
    while(inBounds(rr,cc)){
      const t=board[rr][cc];
      if(!t){ out.push({r:rr,c:cc}); }
      else { if(t.color!==piece.color && !noCapture) out.push({r:rr,c:cc,capture:true}); break; }
      rr+=dr; cc+=dc;
    }
  }
  return out;
}
function stepMoves(r,c,steps,piece,noCapture){
  const out=[];
  for(const[dr,dc] of steps){
    const rr=r+dr,cc=c+dc;
    if(!inBounds(rr,cc)) continue;
    const t=board[rr][cc];
    if(!t) out.push({r:rr,c:cc});
    else if(t.color!==piece.color && !noCapture) out.push({r:rr,c:cc,capture:true});
  }
  return out;
}
const DIAG=[[1,1],[1,-1],[-1,1],[-1,-1]];
const ORTH=[[1,0],[-1,0],[0,1],[0,-1]];
const ALL8=[...DIAG,...ORTH];
const KNIGHT=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];

function legalMoves(r,c){
  const p=board[r][c];
  if(!p || p.frozen>0) return [];
  switch(p.type){
    case 'bishop': return slideMoves(r,c,DIAG,p);
    case 'rook':   return slideMoves(r,c,ORTH,p);
    case 'freezer':return slideMoves(r,c,ALL8,p,true);
    case 'queen': case 'alchemist': case 'wizard': case 'witch': return slideMoves(r,c,ALL8,p);
    case 'king': return stepMoves(r,c,ALL8,p);
    case 'knight': return stepMoves(r,c,KNIGHT,p);
    case 'pawn': {
      const out=[];
      const d=p.color==='white'?-1:1; const fwd=[d,0], caps=[[d,-1],[d,1]];
      const [fr,fc]=fwd;
      if(inBounds(r+fr,c+fc)&&!board[r+fr][c+fc]){
        out.push({r:r+fr,c:c+fc});
        if(!p.moved && inBounds(r+2*fr,c+2*fc) && !board[r+2*fr][c+2*fc]) out.push({r:r+2*fr,c:c+2*fc});
      }
      for(const [dr,dc] of caps){
        const rr=r+dr,cc=c+dc;
        if(inBounds(rr,cc)&&board[rr][cc]&&board[rr][cc].color!==p.color) out.push({r:rr,c:cc,capture:true});
      }
      return out;
    }
  }
  return [];
}

function abilityInfo(p,r,c){
  if(p.frozen>0) return null;
  if(p.type==='witch') // a revive never blocks or removes an attack, so it can't answer a check
    return {label:checkState==='check'?'✟ Revive (cannot stop check)':'✟ Revive a fallen piece',
      usable:graveyard[p.color].length>0 && checkState!=='check'};
  // wizard, alchemist & freezer have no button — their targets glow blue and are clicked directly
  return null;
}
// abilities only reach the FIRST piece along the user's own movement lines
function abilityTargets(r,c){
  const p=board[r][c];
  if(!p) return [];
  const out=[];
  const scan=(dirs,pred)=>{
    for(const[dr,dc] of dirs){
      let rr=r+dr,cc=c+dc;
      while(inBounds(rr,cc)){
        const t=board[rr][cc];
        if(t){ if(pred(t)) out.push({r:rr,c:cc}); break; }
        rr+=dr; cc+=dc;
      }
    }
  };
  if(p.type==='wizard' && p.charges>0 && !(p.cd>0))
    scan(ALL8, t=>t.color!==p.color && t.type!=='king' && t.poison==null);
  if(p.type==='alchemist')
    scan(ALL8, t=>t.color===p.color && t.poison!=null);
  if(p.type==='freezer' && p.cd===0)
    scan(ALL8, t=>t.color!==p.color && t.frozen===0);
  return out;
}


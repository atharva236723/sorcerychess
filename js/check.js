/* === Sorcery Chess · check.js ===
   Check / checkmate / stalemate detection, kill(), movesFor/targetsFor, updateGameState.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ---------- check / checkmate / stalemate ---------- */
let checkState=null; // null or 'check' for the player whose turn it is

function findKing(color){
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c];
    if(p&&p.type==='king'&&p.color===color) return {r,c};
  }
  return null;
}

function inCheck(color){
  const k=findKing(color);
  if(!k) return false;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c];
    if(!p||p.color===color) continue;
    if(legalMoves(r,c).some(m=>m.capture&&m.r===k.r&&m.c===k.c)) return true;
  }
  return false;
}

// would this move leave `color` in check? (board is mutated and restored)
function moveLeavesCheck(fr,fc,tr,tc,color){
  const p=board[fr][fc], cap=board[tr][tc];
  board[tr][tc]=p; board[fr][fc]=null;
  const chk=inCheck(color);
  board[fr][fc]=p; board[tr][tc]=cap;
  return chk;
}

// abilities swap the two pieces; a freezer also freezes its target (a frozen piece gives no check)
function abilityLeavesCheck(ar,ac,tr,tc,color){
  const a=board[ar][ac], t=board[tr][tc];
  const oldFrozen=t.frozen;
  if(a.type==='freezer') t.frozen=FREEZE_DURATION;
  board[ar][ac]=t; board[tr][tc]=a;
  const chk=inCheck(color);
  board[ar][ac]=a; board[tr][tc]=t; t.frozen=oldFrozen;
  return chk;
}

// can `color` make any move or ability that leaves its king safe?
function hasEscape(color){
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c];
    if(!p||p.color!==color) continue;
    for(const m of legalMoves(r,c)) if(!moveLeavesCheck(r,c,m.r,m.c,color)) return true;
    for(const t of abilityTargets(r,c)) if(!abilityLeavesCheck(r,c,t.r,t.c,color)) return true;
  }
  return false;
}

// a revive never changes which squares are attacked, so it only counts as a
// safe action while the king is not already in check
function canRevive(color){
  if(graveyard[color].length===0) return false;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c];
    if(p&&p.color===color&&p.type==='witch'&&p.frozen===0) return true;
  }
  return false;
}

// what the player may actually play: while in check, only actions that save the king —
// and the King himself only ever sees (and gets) squares where he is safe
function movesFor(r,c){
  let mv=legalMoves(r,c);
  const p=board[r][c];
  if(p&&p.type==='king') mv=mv.filter(m=>!moveLeavesCheck(r,c,m.r,m.c,p.color));
  if(checkState!=='check') return mv;
  return mv.filter(m=>!moveLeavesCheck(r,c,m.r,m.c,turn));
}
function targetsFor(r,c){
  const ts=abilityTargets(r,c);
  if(checkState!=='check') return ts;
  return ts.filter(t=>!abilityLeavesCheck(r,c,t.r,t.c,turn));
}

function updateGameState(){
  checkState=null;
  if(inCheck(turn)){
    if(hasEscape(turn)){ checkState='check'; sfx('check'); }
    else { showEnd(`Checkmate — ${cap(enemyOf(turn))} wins!`,enemyOf(turn)); sfx('win'); }
  } else if(!hasEscape(turn) && !canRevive(turn)){
    // no safe action and the king is not under attack → draw; if frost is what
    // pins the player down, say so explicitly
    const frozenBound=board.some(row=>row.some(p=>p&&p.color===turn&&p.frozen>0));
    showEnd(frozenBound ? `Draw — ${cap(turn)}'s pieces are frozen and the king is safe`
                        : 'Stalemate — Draw');
    sfx('draw');
  }
}

function kill(r,c,sound='capture'){
  const p=board[r][c]; if(!p) return;
  sfx(sound);
  const cellEl=boardEl.children[r*N+c];
  board[r][c]=null;
  graveyard[p.color].push(p);
  if(cellEl) pendingFlights.push({
    glyph:GLYPH[p.type][p.color], color:p.color, special:SPECIAL.has(p.type),
    from:cellEl.getBoundingClientRect(),
    to:{type:'grave', color:p.color, idx:graveyard[p.color].length-1}
  });
  if(p.type==='king') win(enemyOf(p.color));
}


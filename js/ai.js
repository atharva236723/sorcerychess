/* === Sorcery Chess · ai.js ===
   The computer opponent: material+positional eval, alpha-beta search, difficulty ladder, scheduleAI/aiMove.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ---------- computer opponent: plays black via the same doMove/doAbility entry
   points a human uses, so animation, sfx, persistence and check rules all apply.
   Scoring works on material: poison/freeze/cure shift a piece's worth, so one
   evaluation function prices ordinary moves and spellcaster abilities alike. ---------- */
const AI_DELAY=750;
const AI_NAMES={1:'The Apprentice',2:'The Sorcerer',3:'The Archmage',4:'The Malevolent',5:'The Dominion'};
const AI_VAL={pawn:100,knight:300,bishop:330,rook:500,queen:900,king:100000,
              wizard:450,alchemist:650,freezer:480,witch:400};
let aiTimer=null;

function aiWorth(p){ // a poisoned piece is mostly lost already; frozen is a temporary dent
  let v=AI_VAL[p.type];
  if(p.poison!=null) v*=.2;
  else if(p.frozen>0) v*=.85;
  return v;
}
function aiEval(positional){ // material balance from black's point of view (+ position at levels 3–5)
  let s=0, wk=null, bk=null;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c]; if(!p) continue;
    if(p.type==='king'){ if(p.color==='white') wk={r,c}; else bk={r,c}; }
    let v=aiWorth(p);
    if(positional){
      if(p.type==='pawn') v+=(p.color==='black'?r-1:N-2-r)*7;       // marching pawns
      else{
        const ctr=(5.5-Math.abs(r-5.5))+(5.5-Math.abs(c-5.5));      // 0 rim … 11 centre
        v += p.type==='king' ? -ctr*2 : ctr*2.2;                    // pieces centralise, kings hide
      }
    }
    s += p.color==='black' ? v : -v;
  }
  // levels 3–5 play for the throat: every black piece is paid to crowd the white
  // king, white's attackers are paid to stay away from the black king, and the
  // white king himself is dragged toward the rim/corner where mating nets close
  // fastest — the harder the foe, the heavier the squeeze (this is what lets the
  // computer actually *finish*: a lone king is herded to the edge into mate range)
  if(positional && aiLevel>=3 && wk && bk){
    const aggro = aiLevel>=5?1.6 : aiLevel===4?1.25 : 0.8;
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      const p=board[r][c];
      if(!p || p.type==='king' || p.type==='pawn' || p.frozen>0) continue;
      if(p.color==='black') s += (11-Math.max(Math.abs(r-wk.r),Math.abs(c-wk.c)))*6*aggro;
      else                  s -= (11-Math.max(Math.abs(r-bk.r),Math.abs(c-bk.c)))*4;
    }
    // drive the white king to the rim/corner…
    s += (Math.abs(wk.r-5.5)+Math.abs(wk.c-5.5))*8*aggro;
    // …and march the black king up to support the mate (K+piece endgame technique)
    s += (11-Math.max(Math.abs(wk.r-bk.r),Math.abs(wk.c-bk.c)))*4*aggro;
  }
  return s;
}
// every move + spellcaster ability black may legally play right now
// (movesFor/targetsFor already restrict to check escapes while in check)
function aiActions(){
  const acts=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c];
    if(!p||p.color!=='black') continue;
    for(const m of movesFor(r,c)) acts.push({kind:'move',fr:r,fc:c,tr:m.r,tc:m.c});
    for(const t of targetsFor(r,c)) acts.push({kind:'ability',fr:r,fc:c,tr:t.r,tc:t.c,actor:p.type});
  }
  return acts;
}
// try a candidate on the real board and undo it (same trick hasEscape uses)
function aiApply(a){
  const u={a, p:board[a.fr][a.fc], t:board[a.tr][a.tc]};
  if(a.kind==='move'){
    board[a.tr][a.tc]=u.p; board[a.fr][a.fc]=null;
  } else {
    u.poison=u.t.poison; u.frozen=u.t.frozen;
    if(a.actor==='wizard') u.t.poison=2;
    if(a.actor==='freezer') u.t.frozen=FREEZE_DURATION;
    if(a.actor==='alchemist') u.t.poison=null;
    board[a.fr][a.fc]=u.t; board[a.tr][a.tc]=u.p; // abilities swap the two pieces
  }
  return u;
}
function aiUndo(u){
  const a=u.a;
  if(a.kind==='move'){ board[a.fr][a.fc]=u.p; board[a.tr][a.tc]=u.t; }
  else { u.t.poison=u.poison; u.t.frozen=u.frozen; board[a.fr][a.fc]=u.p; board[a.tr][a.tc]=u.t; }
}
// the most valuable piece `color` could capture right now (pseudo-legal is enough;
// capturing the king scores ~100k, which is what teaches the AI not to hang its own)
function aiBestCapture(color){
  let best=0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c];
    if(!p||p.color!==color) continue;
    for(const m of legalMoves(r,c)){
      if(!m.capture||!board[m.r][m.c]) continue;
      const v=aiWorth(board[m.r][m.c]);
      if(v>best) best=v;
    }
  }
  return best;
}
// 1-ply greedy: position after the action, minus white's best snap-back
function aiScore(a){
  const u=aiApply(a);
  const s=aiEval()-aiBestCapture('white');
  aiUndo(u);
  return s;
}

/* levels 3–5: full alpha-beta over moves, captures searched first, hard time budget.
   Black maximises. A branch that reaches a king returns ±900000 immediately, which is
   how mate threats propagate without any explicit check logic in the search. */
let aiDeadline=0, aiNodes=0;
function aiMovesAll(color){
  const out=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c];
    if(!p||p.color!==color) continue;
    for(const m of legalMoves(r,c))
      out.push({fr:r,fc:c,tr:m.r,tc:m.c,v:m.capture&&board[m.r][m.c]?aiWorth(board[m.r][m.c]):0});
  }
  out.sort((a,b)=>b.v-a.v);
  return out;
}
function aiAB(depth,alpha,beta,color){
  if(((++aiNodes)&255)===0 && performance.now()>aiDeadline) return aiEval(true);
  if(depth===0) return aiEval(true);
  const maxing=color==='black';
  const moves=aiMovesAll(color);
  if(!moves.length) return aiEval(true);
  let best=maxing?-Infinity:Infinity;
  for(const m of moves){
    const tgt=board[m.tr][m.tc];
    if(tgt&&tgt.type==='king') return maxing?900000+depth:-(900000+depth); // +depth: a faster kill outscores a slower one
    const p=board[m.fr][m.fc];
    board[m.tr][m.tc]=p; board[m.fr][m.fc]=null;
    const s=aiAB(depth-1,alpha,beta,enemyOf(color));
    board[m.fr][m.fc]=p; board[m.tr][m.tc]=tgt;
    if(maxing){ if(s>best)best=s; if(best>alpha)alpha=best; }
    else      { if(s<best)best=s; if(best<beta)beta=best; }
    if(alpha>=beta) break;
  }
  return best;
}
// root: every action (abilities included) gets a deep look, best-first so the time
// budget spends itself on the most promising lines; checks jump the queue so the
// search burns its clock on forcing, king-hunting continuations
function aiPickDeep(acts,depth,msBudget){
  aiNodes=0; aiDeadline=performance.now()+msBudget;
  const ranked=acts.map(a=>{
    const u=aiApply(a);
    let q=aiEval(true)-aiBestCapture('white');
    if(inCheck('white')) q+=45;
    aiUndo(u);
    return {a,q};
  }).sort((x,y)=>y.q-x.q);
  let best=-Infinity, chosen=ranked[0].a;
  for(const {a} of ranked){
    const u=aiApply(a);
    const s=aiAB(depth,-Infinity,Infinity,'white');
    aiUndo(u);
    if(s>best){ best=s; chosen=a; }
    if(performance.now()>aiDeadline) break;
  }
  return chosen;
}

/* ---------- checkmate awareness ----------
   The material search above prices a king *capture* at ±900000, but only within its
   2–4 ply horizon and it never consults the engine's real mate test — so the computer
   wins material yet keeps missing the kill. These helpers ask inCheck/hasEscape directly
   (the exact test updateGameState uses) so the AI reliably *recognises* and *delivers*
   checkmate, with the dread foes hunting forced mates several plies deep. */

// every move + ability `color` can play (no own-king-safety filter — used for simulation
// where the real legality is judged afterwards by inCheck/hasEscape)
function aiAllActions(color){
  const acts=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c];
    if(!p||p.color!==color) continue;
    for(const m of legalMoves(r,c)) acts.push({kind:'move',fr:r,fc:c,tr:m.r,tc:m.c});
    for(const t of abilityTargets(r,c)) acts.push({kind:'ability',fr:r,fc:c,tr:t.r,tc:t.c,actor:p.type});
  }
  return acts;
}
// an action by `mover` that checkmates `enemy` outright (the engine's own mate condition:
// enemy in check with no escape), or null. `acts` defaults to every legal mover action.
function aiMateInOne(mover,acts){
  const enemy=enemyOf(mover);
  for(const a of (acts||aiAllActions(mover))){
    const u=aiApply(a);
    const mate=inCheck(enemy)&&!hasEscape(enemy);
    aiUndo(u);
    if(mate) return a;
  }
  return null;
}
let aiMateDeadline=0;
// can `mover` force checkmate within `plies` of its own moves? returns the root action or
// null. only checking moves are pursued (a forced mate is a chain of checks) and every legal
// defender reply must lose; guarded by aiMateDeadline so a deep hunt can never hang the tab.
function aiForcedMate(mover,plies,acts){
  const enemy=enemyOf(mover);
  for(const a of (acts||aiAllActions(mover))){
    if(performance.now()>aiMateDeadline) return null;
    const u=aiApply(a);
    let good=false;
    if(inCheck(enemy)){
      if(!hasEscape(enemy)) good=true;                     // mate right now
      else if(plies>1) good=aiDefenderLost(enemy,mover,plies-1);
    }
    aiUndo(u);
    if(good) return a;
  }
  return null;
}
// after mover's check, does EVERY legal reply by `defender` still lose to a forced mate?
function aiDefenderLost(defender,mover,plies){
  let anyLegal=false;
  for(const d of aiAllActions(defender)){
    if(performance.now()>aiMateDeadline) return false;
    const u=aiApply(d);
    let verdict; // 0 = illegal (didn't escape), 1 = survives, 2 = still mated
    if(inCheck(defender)) verdict=0;                        // reply leaves own king hanging → not legal
    else if(inCheck(mover)) verdict=1;                      // reply counter-checks mover → breaks the net
    else verdict = aiForcedMate(mover,plies)?2:1;
    aiUndo(u);
    if(verdict===0) continue;
    anyLegal=true;
    if(verdict===1) return false;                           // a legal escape exists → not forced mate
  }
  return anyLegal;
}
// pick a mate if one is on the board: every foe can spot mate-in-1 (rarely for the
// apprentice, always from the archmage up), and the Malevolent/Dominion additionally
// hunt forced mates 2–3 of their own moves deep
function aiSeekMate(rootActs){
  const SEE={1:0.35,2:0.7,3:1,4:1,5:1}[aiLevel]||0;
  if(Math.random()>=SEE) return null;
  const m1=aiMateInOne('black',rootActs);
  if(m1) return m1;
  if(aiLevel<4) return null;
  aiMateDeadline=performance.now()+(aiLevel===5?1400:900);
  return aiForcedMate('black',aiLevel===5?3:2,rootActs);
}
function aiExecute(chosen){
  selected=null; mode='move';
  if(chosen.kind==='move') doMove(chosen.fr,chosen.fc,chosen.tr,chosen.tc);
  else doAbility(chosen.fr,chosen.fc,chosen.tr,chosen.tc);
}

function scheduleAI(){
  if(gameMode==='ai' && turn==='black' && !gameOver && !aiTimer)
    aiTimer=setTimeout(aiMove,AI_DELAY);
}
function aiMove(){
  aiTimer=null;
  if(gameMode!=='ai'||turn!=='black'||gameOver) return;
  const acts=aiActions();
  if(!acts.length) return; // updateGameState already declared mate/stalemate
  // close the net first: if a checkmate is available (and this foe is sharp enough to
  // see it), deliver it instead of grubbing for material. acts is already escape-filtered
  // when black is itself in check, so a "mate" can never be an illegal non-escaping move.
  const mate=aiSeekMate(acts);
  if(mate){ aiExecute(mate); return; }
  let chosen=null;
  if(aiLevel===1){
    // Apprentice: random, fond of captures (and grabs the juiciest one when he
    // does notice), but never hands over the king
    const safe=acts.filter(a=>aiScore(a)>-40000);
    const pool=safe.length?safe:acts;
    const caps=pool.filter(a=>a.kind==='move'&&board[a.tr][a.tc])
                   .sort((a,b)=>aiWorth(board[b.tr][b.tc])-aiWorth(board[a.tr][a.tc]));
    chosen=(caps.length&&Math.random()<.7) ? caps[0]
                                           : pool[(Math.random()*pool.length)|0];
  } else if(aiLevel===2){
    // Sorcerer: greedy 1-ply, only a touch of wildness left
    let best=-Infinity;
    for(const a of acts){
      const s=aiScore(a)+Math.random()*10;
      if(s>best){ best=s; chosen=a; }
    }
  } else if(aiLevel===3){
    // Archmage: a real (if shallow) alpha-beta — the first rung of the deep ladder
    chosen=aiPickDeep(acts,2,1500);
  } else {
    // The Malevolent / The Dominion: cold, deep, and entirely without mercy
    chosen=aiPickDeep(acts, aiLevel===4?3:4, aiLevel===4?2500:4500);
  }
  aiExecute(chosen);
}


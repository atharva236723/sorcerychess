/* === Sorcery Chess · turn.js ===
   doMove / doAbility / doRevive, endTurn, win, showEnd and the victory celebration.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

function slideAnim(toR,toC,fromR,fromC,magic){
  pendingAnims.push({type:'slide',r:toR,c:toC,dx:fromC-toC,dy:fromR-toR,magic});
}

function doMove(fr,fc,tr,tc){
  if(gameMode==='online'&&!applyingRemote) netSend({kind:'move',fr,fc,tr,tc});
  const p=board[fr][fc];
  const victim=board[tr][tc];
  if(victim){ kill(tr,tc); if(gameOver) {render(); return;} }
  else sfx('move');
  board[tr][tc]=p; board[fr][fc]=null; p.moved=true;
  lastMove=[{r:fr,c:fc},{r:tr,c:tc}];
  slideAnim(tr,tc,fr,fc);
  if(p.type==='pawn' && isPromoSquare(p.color,tr,tc)){
    board[tr][tc]=Object.assign(makePiece('queen',p.color),{moved:true});
    sfx('promote');
  }
  endTurn();
}

function doAbility(ar,ac,tr,tc){
  if(gameMode==='online'&&!applyingRemote) netSend({kind:'ability',ar,ac,tr,tc});
  const actor=board[ar][ac];
  const t=board[tr][tc];
  if(actor.type==='wizard'){
    actor.charges--; t.poison=2; actor.cd=WIZARD_COOLDOWN; sfx('poison');
  } else if(actor.type==='alchemist'){
    t.poison=null; sfx('cure');
  } else if(actor.type==='freezer'){
    t.frozen=FREEZE_DURATION; actor.cd=FREEZE_COOLDOWN; sfx('freeze');
  }
  // the ability user and its target exchange squares, trailing a blue aura
  board[ar][ac]=t; board[tr][tc]=actor;
  actor.moved=true;
  lastMove=[{r:ar,c:ac},{r:tr,c:tc}];
  slideAnim(tr,tc,ar,ac,true);
  slideAnim(ar,ac,tr,tc,true);
  endTurn();
}

function doRevive(idx){
  const {r,c}=selected;
  if(gameMode==='online'&&!applyingRemote) netSend({kind:'revive',r,c,idx});
  const witch=board[r][c];
  const graveEl=document.getElementById(turn==='white'?'graveWhite':'graveBlack');
  const tokEl=graveEl.children[idx];
  const cellEl=boardEl.children[r*N+c];
  const revived=graveyard[turn].splice(idx,1)[0];
  revived.poison=null; revived.frozen=0; revived.moved=true;
  board[r][c]=revived;
  graveyard[turn].push(witch);
  sfx('revive');
  lastMove=[{r,c}];
  if(tokEl&&cellEl){
    // the revived piece rises from the graveyard while the witch sinks into its place there
    pendingFlights.push({glyph:GLYPH[revived.type][revived.color], color:revived.color,
      special:SPECIAL.has(revived.type), from:tokEl.getBoundingClientRect(), to:{type:'cell',r,c}});
    pendingFlights.push({glyph:GLYPH[witch.type][witch.color], color:witch.color, special:true,
      from:cellEl.getBoundingClientRect(), to:{type:'grave', color:turn, idx:graveyard[turn].length-1}});
  }
  endTurn();
}

function endTurn(){
  // counters tick down at the end of each turn for the player who just moved
  const mover=turn;
  if(useTimer) clocks[mover]+=CLOCK_INCREMENT; // every action played earns the increment
  const dying=[];
  let wizardReady=false;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const p=board[r][c];
    if(!p||p.color!==mover) continue;
    if(p.frozen>0) p.frozen--;
    if(p.cd>0){
      p.cd--;
      if(p.type==='wizard' && p.cd===0 && p.charges>0) wizardReady=true;
    }
    if(p.poison!=null){ p.poison--; if(p.poison<=0) dying.push({r,c}); }
  }
  dying.forEach(({r,c})=>kill(r,c,'poisonDeath'));
  if(wizardReady) toast(`✶ ${cap(mover)}'s Wizard can poison again`);
  selected=null; mode='move';
  if(!gameOver){
    turn=enemyOf(turn);
    updateGameState();
  }
  if(!gameOver) saveGame(); // a finished game is never saved — showEnd() clears it
  render();
  scheduleAI(); // no-op unless it's now the computer's turn
}

function win(color){
  showEnd(`${cap(color)} wins!`,color);
  sfx('win');
}

function showEnd(text,winner){
  if(gameMode==='ai') text=text.replace('White wins','You win').replace('Black wins',AI_NAMES[aiLevel]+' wins');
  if(gameMode==='online'){
    // phrase it from this player's seat; online duels are unranked and never touch career stats
    text=text.replace(cap(myColor)+' wins','You win').replace(cap(enemyOf(myColor))+' wins','Opponent wins');
    gameOver=true; clearSave();
    document.getElementById('winText').textContent=text;
    document.getElementById('rankLine').innerHTML='<span style="opacity:.7">Online duel — unranked</span>';
    const ov=document.getElementById('overlay');
    ov.style.display='flex'; ov.classList.toggle('won',!!winner);
    if(winner) celebrate(winner); else document.getElementById('celebr').innerHTML='';
    return;
  }
  gameOver=true;
  clearSave();
  recordResult(winner); // log this game into the player's persistent career record
  document.getElementById('winText').textContent=text;
  // rating: the player's wins pay points scaled by the difficulty they conquered
  let gain=0;
  if(winner){
    if(gameMode==='ai'){ if(winner==='white'){ gain=winPoints(aiLevel); markBeaten(aiLevel); } } // scaled by the active variant → record the conquest, may unlock a dread foe
    else gain=friendPoints();
  }
  const rl=document.getElementById('rankLine');
  rl.innerHTML='';
  if(gain){
    const res=awardPoints(gain);
    if(res) rl.innerHTML='✦ +'+gain+' rating points — '+res.pts+' total'
      +(res.newRank>res.oldRank
        ? '<br><span class="rup">⬆ Rank up! You are now '+RANKS[res.newRank].name+'</span>' : '');
  } else if(winner==='black'){
    // the price of standing above the Arcanum: defeat drains rating (0 below it)
    const pen=pointsAtRisk();
    if(pen){
      const res=awardPoints(-pen);
      if(res) rl.innerHTML='☠ −'+pen+' rating points — '+res.pts+' total'
        +(res.newRank<res.oldRank
          ? '<br><span class="rdown">⬇ Rank lost — you fall to '+RANKS[res.newRank].name+'</span>' : '');
    }
  }
  const ov=document.getElementById('overlay');
  ov.style.display='flex';
  ov.classList.toggle('won',!!winner);
  if(winner) celebrate(winner); else document.getElementById('celebr').innerHTML='';
}

// glyph fireworks raining across the end-of-game veil
function celebrate(winner){
  const c=document.getElementById('celebr');
  c.innerHTML='';
  const GL=['✦','✶','✧','❖', winner==='white'?'♔':'♚', winner==='white'?'♕':'♛'];
  for(let b=0;b<5;b++){
    const ox=12+Math.random()*72, oy=10+Math.random()*48; // burst origin, % of viewport
    for(let i=0;i<13;i++){
      const s=document.createElement('span');
      s.className='cp'+(i%3===0?' blue':'');
      s.textContent=GL[(Math.random()*GL.length)|0];
      const ang=Math.random()*Math.PI*2, dist=70+Math.random()*160;
      s.style.left=ox+'%'; s.style.top=oy+'%';
      s.style.fontSize=(13+Math.random()*22)+'px';
      s.style.setProperty('--tx',(Math.cos(ang)*dist).toFixed(0)+'px');
      s.style.setProperty('--ty',(Math.sin(ang)*dist*.8+45).toFixed(0)+'px'); // a touch of gravity
      s.style.setProperty('--rot',((Math.random()*720-360)|0)+'deg');
      s.style.setProperty('--d',(1.5+Math.random()*1.2).toFixed(2)+'s');
      s.style.setProperty('--del',(b*.4+Math.random()*.35).toFixed(2)+'s');
      c.appendChild(s);
    }
  }
}


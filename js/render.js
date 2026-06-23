/* === Sorcery Chess · render.js ===
   onCellClick input handling, render(), graveyard rendering, slide animations and ghost flights.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

function onCellClick(r,c){
  if(gameOver) return;
  if(gameMode==='ai' && turn==='black') return; // the computer is moving
  if(gameMode==='online' && turn!==myColor) return; // wait for the opponent's move
  const p=board[r][c];

  if(mode==='ability' && selected){
    const ok=targetsFor(selected.r,selected.c).some(t=>t.r===r&&t.c===c);
    if(ok){ doAbility(selected.r,selected.c,r,c); return; }
    mode='move'; // fall through to normal selection
  }

  if(selected){
    const sp=board[selected.r][selected.c];
    // wizard poisons and freezer freezes by clicking their blue-glowing target directly
    if(sp && DIRECT_ABILITY.has(sp.type) && targetsFor(selected.r,selected.c).some(t=>t.r===r&&t.c===c)){
      doAbility(selected.r,selected.c,r,c); return;
    }
    const mv=movesFor(selected.r,selected.c).find(m=>m.r===r&&m.c===c);
    if(mv){ doMove(selected.r,selected.c,r,c); return; }
  }

  if(p && p.color===turn){
    selected={r,c}; mode='move';
    sfx('select');
  } else {
    selected=null; mode='move';
  }
  render();
}

function onAbilityClick(){
  if(!selected) return;
  const p=board[selected.r][selected.c];
  const info=abilityInfo(p,selected.r,selected.c);
  if(!info||!info.usable) return;
  if(p.type==='witch'){
    mode='revive';
    render(); return;
  }
  mode = mode==='ability' ? 'move' : 'ability';
  render();
}

/* ---------- rendering ---------- */
const boardEl=document.getElementById('board');
function render(){
  boardEl.innerHTML='';
  // keep the CSS board-fit math in step with the active variant's column count (12 sorcery / 8 classic)
  document.body.style.setProperty('--cols', N);
  // name the active variant in the board titlebar + flag it on <body> (CSS hides the magic guide for classic)
  const vcfg=variantCfg();
  document.body.classList.toggle('variant-classic', VARIANT==='classic');
  document.getElementById('boardTitle').textContent=vcfg.name;
  document.getElementById('boardDim').textContent=N+' × '+N;
  // one-shot board intro: only the render right after newGame() animates the slab in;
  // any later render drops the class so rebuilt cells don't replay the fade
  const intro=introPending; introPending=false;
  boardEl.classList.toggle('intro',intro);
  const mid=(N-1)/2;
  const moves = selected&&mode==='move' ? movesFor(selected.r,selected.c) : [];
  let targets = [];
  const selPiece = selected ? board[selected.r]?.[selected.c] : null;
  // a selected spellcaster (one of the four extra pieces) gets a dramatic arcane
  // "slay" glow on any enemy it can capture this turn
  const selSpell = !!(selPiece && SPECIAL.has(selPiece.type));
  if(selected){
    const sp=selPiece;
    // wizard & freezer targets are always visible; other specials show targets in ability mode
    if(mode==='ability' || (sp&&DIRECT_ABILITY.has(sp.type)&&mode==='move'))
      targets=targetsFor(selected.r,selected.c);
  }
  const kingSq = checkState==='check' && !gameOver ? findKing(turn) : null;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const cell=document.createElement('div');
    const up=(r+c)%2===0;
    cell.className=`cell ${up?'light':'dark'}`;
    if(intro) cell.style.animationDelay=((Math.abs(r-mid)+Math.abs(c-mid))*28)+'ms';
    if(selected&&selected.r===r&&selected.c===c) cell.classList.add('selected');
    if(lastMove.some(s=>s.r===r&&s.c===c)) cell.classList.add('last-move');
    if(kingSq&&kingSq.r===r&&kingSq.c===c) cell.classList.add('king-check');
    const mv=moves.find(m=>m.r===r&&m.c===c);
    if(targets.some(t=>t.r===r&&t.c===c)) cell.classList.add('ability-target');
    else if(mv){
      if(mv.capture){ cell.classList.add('capture-target'); if(selSpell) cell.classList.add('spell-kill'); }
      else cell.classList.add('move-target');
    }
    const p=board[r][c];
    if(p){
      const el=document.createElement('div');
      el.className=`piece ${p.color}${SPECIAL.has(p.type)?' special':''}${p.frozen>0?' frozen':''}`;
      el.title=`${cap(p.color)} ${NAME[p.type]}`
        +(p.poison!=null?` — poisoned, dies in ${p.poison} of its owner's moves`:'')
        +(p.frozen>0?` — frozen for ${p.frozen} of its owner's moves`:'')
        +(p.type==='wizard'?` — ${p.charges} poison charges`:'')
        +(p.type==='wizard'&&p.cd>0?` — poison recharging (${p.cd} of your moves)`:'')
        +(p.type==='freezer'&&p.cd>0?` — freeze recharging (${p.cd})`:'');
      const body=document.createElement('div');
      body.className='pbody';
      body.textContent=GLYPH[p.type][p.color];
      if(p.poison!=null){const t=document.createElement('span');t.className='tag poison';t.textContent='☠'+p.poison;body.appendChild(t);}
      if(p.frozen>0){const t=document.createElement('span');t.className='tag freeze';t.textContent='❆'+p.frozen;body.appendChild(t);}
      if(p.type==='wizard'&&p.cd>0){const t=document.createElement('span');t.className='tag wcd';t.textContent='✶'+p.cd;body.appendChild(t);}
      el.appendChild(body);
      cell.appendChild(el);
    }
    cell.addEventListener('click',()=>onCellClick(r,c));
    boardEl.appendChild(cell);
  }
  // slab side faces — appended AFTER all 144 cells so children[r*N+c] indexing holds
  for(const e of ['eN','eS','eE','eW']){
    const d=document.createElement('div'); d.className='edge '+e; boardEl.appendChild(d);
  }
  renderClocks();
  // panel
  const btn=document.getElementById('abilityBtn');
  const picker=document.getElementById('revivePicker');
  picker.style.display='none'; picker.innerHTML='';
  if(selected && board[selected.r]?.[selected.c]){
    const p=board[selected.r][selected.c];
    const info=abilityInfo(p,selected.r,selected.c);
    if(info){
      btn.style.display='block';
      btn.textContent=(mode==='ability'?'✕ Cancel — ':'')+info.label;
      btn.disabled=!info.usable;
    } else btn.style.display='none';
    if(mode==='revive'){
      picker.style.display='flex';
      picker.innerHTML='<div class="title">Click a glowing dead piece in your graveyard to revive it — the Witch will die.</div>';
      const cancel=document.createElement('button');
      cancel.className='ghost'; cancel.textContent='Cancel revive';
      cancel.addEventListener('click',()=>{mode='move';render();});
      picker.appendChild(cancel);
    }
  } else btn.style.display='none';
  // mode banner: name the current opponent; the two dread AIs also drench the view in horror
  const dread = gameMode==='ai' && aiLevel>=4;
  document.body.classList.toggle('horror', dread);
  document.body.classList.toggle('notimer', !useTimer); // hide the clocks in a timer-free match
  const mb=document.getElementById('modeBanner');
  const clockNote = useTimer ? '' : ' · No timer';
  if(gameMode==='ai'){
    mb.innerHTML='⚔ Facing '+AI_NAMES[aiLevel]+
      '<span class="mb-sub">Computer opponent · Level '+aiLevel+clockNote+'</span>';
  } else if(gameMode==='online'){
    mb.innerHTML='🌐 Online Match<span class="mb-sub">You play '+cap(myColor)+' · vs a distant rival</span>';
  } else {
    mb.innerHTML='⚔ Local Match<span class="mb-sub">Two players · one device'+clockNote+'</span>';
  }
  mb.classList.toggle('dread', dread);
  // turn + check status
  document.getElementById('turnDot').className='dot '+turn;
  document.getElementById('turnText').textContent =
    gameMode==='ai'     ? (turn==='white' ? 'Your move' : AI_NAMES[aiLevel]+' is thinking…')
  : gameMode==='online' ? (turn===myColor ? 'Your move' : 'Opponent to move…')
                        : cap(turn)+' to move';
  document.getElementById('checkMsg').textContent=
    checkState==='check' ? '⚠ '+cap(turn)+' is in check!' : '';
  PLAYER_COLORS.forEach(renderGraveyard);
  applyAnims();
  applyFlights();
}

function renderGraveyard(color){
  const el=document.getElementById(GRAVE_ID[color]);
  if(!el) return;
  el.innerHTML='';
  document.getElementById(GCOUNT_ID[color]).textContent=graveyard[color].length;
  if(graveyard[color].length===0){
    const e=document.createElement('span');
    e.className='gempty'; e.textContent='No fallen pieces';
    el.appendChild(e); return;
  }
  graveyard[color].forEach((dp,i)=>{
    const s=document.createElement('span');
    s.className=`gtoken ${color}`;
    s.textContent=GLYPH[dp.type][dp.color];
    s.title=`${cap(color)} ${NAME[dp.type]} (dead)`;
    if(mode==='revive' && color===turn){
      s.classList.add('revivable');
      s.title=`Revive the ${NAME[dp.type]}`;
      s.addEventListener('click',()=>askRevive(i,dp));
    }
    el.appendChild(s);
  });
}

function applyAnims(){
  const anims=pendingAnims; pendingAnims=[];
  const sz=boardEl.children[0]?boardEl.children[0].offsetWidth:46; // current responsive cell size
  for(const a of anims){
    const cell=boardEl.children[a.r*N+a.c];
    const el=cell && cell.querySelector('.piece');
    if(!el) continue;
    if(a.type==='slide'){
      el.classList.add('sliding');
      if(a.magic) el.classList.add('magic');
      el.style.transition='none';
      el.style.transform=`translate(${a.dx*sz}px,${a.dy*sz}px)`;
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        el.style.transition=`transform ${a.dur||.28}s ease`;
        el.style.transform='';
        el.addEventListener('transitionend',()=>el.classList.remove('sliding','magic'),{once:true});
      }));
    } else if(a.type==='spawn'){
      // 'backwards' keeps the piece invisible until its turn in the cascade
      el.style.animation=`spawnIn .5s cubic-bezier(.34,1.56,.64,1) ${a.delay||0}ms backwards`;
    }
  }
}

// fly a ghost copy of a piece between its board square and its graveyard slot
function applyFlights(){
  const flights=pendingFlights; pendingFlights=[];
  for(const f of flights){
    if(!f.from) continue;
    let destEl=null;
    if(f.to.type==='grave'){
      const g=document.getElementById(GRAVE_ID[f.to.color]);
      destEl=g.children[f.to.idx]||null;
    } else {
      const cell=boardEl.children[f.to.r*N+f.to.c];
      destEl=cell&&cell.querySelector('.piece');
    }
    if(!destEl) continue;
    const dRect=destEl.getBoundingClientRect();
    const size=Math.min(f.from.width,f.from.height)*.83;
    const sx=f.from.left+(f.from.width-size)/2, sy=f.from.top+(f.from.height-size)/2;
    const ghost=document.createElement('div');
    ghost.className=`piece ${f.color} ghostfly${f.special?' special':''}`;
    ghost.textContent=f.glyph;
    ghost.style.width=size+'px'; ghost.style.height=size+'px';
    ghost.style.fontSize=(size*(f.special?.55:.62))+'px';
    ghost.style.left=sx+'px'; ghost.style.top=sy+'px';
    document.body.appendChild(ghost);
    destEl.style.visibility='hidden';
    const dx=dRect.left+(dRect.width-size)/2-sx;
    const dy=dRect.top+(dRect.height-size)/2-sy;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      ghost.style.transform=`translate(${dx}px,${dy}px) scale(${dRect.width/size})`;
    }));
    let done=false;
    const finish=()=>{ if(done) return; done=true; ghost.remove(); destEl.style.visibility=''; };
    ghost.addEventListener('transitionend',finish,{once:true});
    setTimeout(finish,800); // safety net if the transition never fires
  }
}

const cap=s=>s[0].toUpperCase()+s.slice(1);


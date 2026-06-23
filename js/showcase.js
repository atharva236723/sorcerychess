/* === Sorcery Chess · showcase.js ===
   The two decorative IIFEs: the homepage self-playing board and the codex spell demos.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ---- homepage centerpiece: a floating 3D board that plays itself forever ----
   Not the real game — a decorative self-mover. It picks a random piece with a
   pseudo-legal move every beat, slides it (capturing if it lands on an enemy),
   promotes pawns, and re-racks the position once the board thins out. Runs only
   while the home page is visible and the tab is focused. */
(function(){
  const N=8, CELL=36, BEAT=1500;
  const boardEl=document.getElementById('scBoard');
  if(!boardEl) return;
  const GLYPH={K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟'};
  const START=['rnbqkbnr','pppppppp','........','........',
               '........','........','PPPPPPPP','RNBQKBNR']; // upper=white(bottom)
  let model=null, timer=null, running=false;

  for(let r=0;r<N;r++)for(let c=0;c<N;c++){ // 64 cells, built once
    const sq=document.createElement('div');
    sq.className='sc-sq '+((r+c)%2 ? 'dark':'light');
    sq.style.transform=`translate(${c*CELL}px,${r*CELL}px)`;
    boardEl.appendChild(sq);
  }
  const place=(el,r,c)=>{ el.style.transform=`translate3d(${c*CELL}px,${r*CELL}px,0)`; };
  function spawn(type,color,r,c){
    const el=document.createElement('div');
    el.className='scp '+(color==='w'?'wp':'bp');
    el.innerHTML='<span class="body">'+GLYPH[type]+'</span>';
    place(el,r,c); boardEl.appendChild(el);
    return {el,type,color,r,c};
  }
  function setup(){
    boardEl.querySelectorAll('.scp').forEach(e=>e.remove());
    model=[];
    for(let r=0;r<N;r++){ model[r]=[];
      for(let c=0;c<N;c++){ const ch=START[r][c];
        if(ch==='.'){ model[r][c]=null; continue; }
        const color=ch===ch.toUpperCase()?'w':'b';
        model[r][c]=spawn(ch.toUpperCase(),color,r,c);
      } }
  }
  function moves(p){
    const out=[], {type,color,r,c}=p, enemy=color==='w'?'b':'w';
    const add=(r2,c2)=>{ if(r2<0||r2>7||c2<0||c2>7) return false;
      const t=model[r2][c2];
      if(!t){ out.push([r2,c2]); return true; }
      if(t.color===enemy) out.push([r2,c2]);
      return false; };
    const slide=(dr,dc)=>{ let r2=r+dr,c2=c+dc; while(add(r2,c2)){ r2+=dr; c2+=dc; } };
    if(type==='P'){
      const d=color==='w'?-1:1, home=color==='w'?6:1;
      if(r+d>=0&&r+d<8&&!model[r+d][c]){ out.push([r+d,c]);
        if(r===home&&!model[r+2*d][c]) out.push([r+2*d,c]); }
      for(const dc of [-1,1]){ const r2=r+d,c2=c+dc;
        if(r2>=0&&r2<8&&c2>=0&&c2<8){ const t=model[r2][c2]; if(t&&t.color===enemy) out.push([r2,c2]); } }
    } else if(type==='N'){
      for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r+dr,c+dc);
    } else if(type==='K'){
      for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++) if(dr||dc) add(r+dr,c+dc);
    } else {
      if(type==='B'||type==='Q') for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr,dc);
      if(type==='R'||type==='Q') for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr,dc);
    }
    return out;
  }
  function count(){ let n=0; for(let r=0;r<8;r++)for(let c=0;c<8;c++) if(model[r][c]) n++; return n; }
  function reset(){
    boardEl.querySelectorAll('.scp').forEach(e=>e.classList.add('dead'));
    setTimeout(()=>{ if(running) setup(); }, 520);
  }
  function step(){
    if(!model) return;
    const movers=[];
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){ const p=model[r][c];
      if(p){ const m=moves(p); if(m.length) movers.push([p,m]); } }
    if(movers.length<3 || count()<=6){ reset(); return; }
    const [p,m]=movers[Math.floor(Math.random()*movers.length)];
    const caps=m.filter(([r2,c2])=>model[r2][c2]); // bias toward captures for liveliness
    const [r2,c2]=(caps.length&&Math.random()<0.42)
      ? caps[Math.floor(Math.random()*caps.length)]
      : m[Math.floor(Math.random()*m.length)];
    const target=model[r2][c2];
    if(target){ const el=target.el; el.classList.add('dead'); setTimeout(()=>el.remove(),480); }
    model[p.r][p.c]=null; model[r2][c2]=p; p.r=r2; p.c=c2; place(p.el,r2,c2);
    if(p.type==='P'&&(r2===0||r2===7)){ p.type='Q'; p.el.querySelector('.body').textContent=GLYPH.Q; }
  }
  function start(){ if(running||document.hidden) return; running=true;
    if(!model) setup(); clearInterval(timer); timer=setInterval(step,BEAT); }
  function stop(){ running=false; clearInterval(timer); timer=null; }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) stop();
    else if(document.getElementById('page-home').classList.contains('active')) start();
  });
  window.__scShowcase={start,stop};
  if(document.getElementById('page-home').classList.contains('active')) start();

  // parallax: the floating board subtly leans toward the cursor as it crosses the hero.
  // we only shift the showcase's perspective-origin, so it never fights the keyframe spin.
  const hero=document.querySelector('#page-home .hero'), sc=document.getElementById('showcase');
  if(hero && sc && !matchMedia('(pointer:coarse)').matches){
    let raf=0, px=50, py=36;
    hero.addEventListener('pointermove',e=>{
      const r=hero.getBoundingClientRect();
      px=50+((e.clientX-r.left)/r.width-0.5)*26;   // ±13% sideways
      py=36+((e.clientY-r.top)/r.height-0.5)*16;   // ±8% vertically
      if(!raf) raf=requestAnimationFrame(()=>{ raf=0; sc.style.perspectiveOrigin=px+'% '+py+'%'; });
    });
    hero.addEventListener('pointerleave',()=>{ sc.style.perspectiveOrigin='50% 36%'; });
  }
})();

/* ====== Spellcaster codex: looping mini-board spell demos (the "video") ======
   Each card on the Spellcasters page owns a 5×5 board that plays the piece's
   signature spell on a loop. Pure DOM + CSS transitions, dependency-free; the
   loop runs only while the page is visible (showPage + visibilitychange gate it,
   exactly like the homepage showcase). A spec is { pieces, acts, hold }: acts are
   timed steps (`at` = ms after the previous step) that mutate the board through a
   small action set (move/swap/tag/untag/cast/beam/kill/revive/say). */
(function(){
  const HOST=document.getElementById('page-codex');
  if(!HOST) return;
  const SIZE=5, CELL=42;
  const GLYPHS={pawn:'♟', queen:'♛', knight:'♞'};
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;

  // ---- the four spells, declared as timed scripts ----
  const SPECS={
    wizard:{
      pieces:{ wiz:{glyph:'✶',cls:'mag',r:4,c:0}, foe:{glyph:GLYPHS.pawn,cls:'blk',r:1,c:3} },
      acts:[
        {at:400, do:A=>A.say('The Wizard sights an enemy down the diagonal.')},
        {at:1000,do:A=>{A.cast('wiz');A.beam('wiz','foe');A.say('✶ A hex streaks across the board…');}},
        {at:650, do:A=>{A.tag('foe','poison');A.say('…and the foe is poisoned.');}},
        {at:850, do:A=>{A.swap('wiz','foe');A.say('Caster and victim trade places at once.');}},
        {at:1100,do:A=>{A.kill('foe');A.say('Two of its moves later, the poison kills.');}}
      ], hold:1700
    },
    alchemist:{
      pieces:{ alc:{glyph:'⚗',cls:'mag',r:2,c:4}, ally:{glyph:GLYPHS.pawn,cls:'wht',r:2,c:1,tag:'poison'} },
      acts:[
        {at:400, do:A=>A.say('A friendly pawn writhes — poisoned and doomed.')},
        {at:1000,do:A=>{A.cast('alc');A.beam('alc','ally');A.say('⚗ The Alchemist brews an antidote…');}},
        {at:700, do:A=>{A.untag('ally');A.say('…the poison is purged.');}},
        {at:850, do:A=>{A.swap('alc','ally');A.say('Healer and healed exchange squares.');}}
      ], hold:1800
    },
    witch:{
      pieces:{ wit:{glyph:'⚚',cls:'mag',r:2,c:2}, fallen:{glyph:GLYPHS.knight,cls:'wht grave',r:4,c:4} },
      acts:[
        {at:400, do:A=>A.say('A Knight lies fallen in the graveyard.')},
        {at:1100,do:A=>{A.cast('wit');A.say('⚚ The Witch channels forbidden power…');}},
        {at:850, do:A=>{A.revive('fallen',2,2);A.kill('wit');A.say('The Knight rises where she stood…');}},
        {at:900, do:A=>A.say('…and the Witch crumbles to dust in its place.')}
      ], hold:1800
    },
    freezer:{
      pieces:{ frz:{glyph:'❅',cls:'mag',r:4,c:2}, foe:{glyph:GLYPHS.queen,cls:'blk',r:0,c:2} },
      acts:[
        {at:400, do:A=>A.say('The Freezer faces a Queen — but never strikes to kill.')},
        {at:1000,do:A=>{A.cast('frz');A.beam('frz','foe');A.say('❅ Frost races up the file…');}},
        {at:700, do:A=>{A.tag('foe','freeze');A.say('…and entombs her in ice for three moves.');}},
        {at:850, do:A=>{A.swap('frz','foe');A.say('Then it slips past, swapping places.');}}
      ], hold:1800
    }
  };

  function Demo(host, spec){
    host.style.setProperty('--dcell', CELL+'px');
    const grid=document.createElement('div'); grid.className='demo-grid';
    for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
      const sq=document.createElement('div');
      sq.className='demo-sq '+((r+c)%2?'dark':'light');
      sq.style.transform=`translate(${c*CELL}px,${r*CELL}px)`;
      grid.appendChild(sq);
    }
    host.appendChild(grid);
    const caption=host.parentElement.querySelector('.demo-caption');
    let pieces={}, timers=[], live=true;

    const place=(el,r,c)=>{ el.style.transform=`translate(${c*CELL}px,${r*CELL}px)`; };
    function makePiece(id,p){
      const el=document.createElement('div'); el.className='demo-pc '+p.cls;
      el.innerHTML='<span class="pc-glyph">'+p.glyph+'</span>';
      place(el,p.r,p.c); grid.appendChild(el);
      pieces[id]={el,r:p.r,c:p.c};
      if(p.tag) A.tag(id,p.tag);
    }
    const A={
      say(t){ if(caption) caption.textContent=t; },
      move(id,r,c){ const p=pieces[id]; if(!p) return; p.r=r; p.c=c; place(p.el,r,c); },
      swap(a,b){ const pa=pieces[a],pb=pieces[b]; if(!pa||!pb) return;
        const tr={r:pa.r,c:pa.c}; A.move(a,pb.r,pb.c); A.move(b,tr.r,tr.c); },
      tag(id,kind){ const p=pieces[id]; if(!p) return;
        let t=p.el.querySelector('.pc-tag'); if(!t){ t=document.createElement('span'); p.el.querySelector('.pc-glyph').appendChild(t); }
        t.className='pc-tag '+kind; t.textContent=kind==='poison'?'☠':'❄'; p.el.classList.add('is-'+kind); },
      untag(id){ const p=pieces[id]; if(!p) return; const t=p.el.querySelector('.pc-tag'); if(t) t.remove();
        p.el.classList.remove('is-poison','is-freeze'); },
      cast(id){ const p=pieces[id]; if(!p) return; p.el.classList.add('casting');
        setTimeout(()=>p.el.classList.remove('casting'),600); },
      beam(a,b){ const pa=pieces[a],pb=pieces[b]; if(!pa||!pb) return;
        const x1=pa.c*CELL+CELL/2, y1=pa.r*CELL+CELL/2, x2=pb.c*CELL+CELL/2, y2=pb.r*CELL+CELL/2;
        const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy), ang=Math.atan2(dy,dx)*180/Math.PI;
        const bm=document.createElement('div'); bm.className='demo-beam';
        bm.style.width=len+'px'; bm.style.left=x1+'px'; bm.style.top=y1+'px';
        bm.style.transform='rotate('+ang+'deg)'; grid.appendChild(bm);
        setTimeout(()=>bm.remove(),900); },
      kill(id){ const p=pieces[id]; if(p) p.el.classList.add('dead'); },
      revive(id,r,c){ const p=pieces[id]; if(!p) return; p.el.classList.remove('grave'); p.el.classList.add('rise'); A.move(id,r,c); }
    };
    function clear(){ grid.querySelectorAll('.demo-pc,.demo-beam').forEach(e=>e.remove()); pieces={}; }
    function run(){
      if(!live) return;
      clear(); for(const id in spec.pieces) makePiece(id, spec.pieces[id]);
      let t=0, last=0;
      spec.acts.forEach(act=>{ t+=act.at||0; last=t;
        timers.push(setTimeout(()=>{ if(live) act.do(A); }, t)); });
      if(!reduce) timers.push(setTimeout(run, last + (spec.hold||1600)));
    }
    return {
      start(){ live=true; timers.forEach(clearTimeout); timers=[]; run(); },
      stop(){ live=false; timers.forEach(clearTimeout); timers=[]; }
    };
  }

  const demos=[...HOST.querySelectorAll('.demo-board')].map(host=>{
    const d=Demo(host, SPECS[host.dataset.demo]);
    const btn=host.parentElement.querySelector('.demo-replay');
    if(btn) btn.addEventListener('click',()=>{ d.start(); });
    return d;
  });
  let on=false;
  function start(){ if(on||document.hidden) return; on=true; demos.forEach(d=>d.start()); }
  function stop(){ on=false; demos.forEach(d=>d.stop()); }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) stop();
    else if(HOST.classList.contains('active')) start();
  });
  window.__codexDemos={start,stop};
  if(HOST.classList.contains('active')) start();
})();


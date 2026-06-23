/* === Sorcery Chess · hierarchy.js ===
   Rank lore/tiers, the Hall of Ascension, the showPage router and footer/brand link wiring.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ---------- the Hall of Ascension: every rank gets a crest and a creed ----------
   Crests are generated SVG, not assets — the medallion grows grander with the tier:
   pearls on the ring count the rank, rune rings appear in the Order, radiant spokes
   ignite in the Arcanum, and only the top of the ladder wears a crown. */
const RANK_LORE=[
  {g:'♟', q:'Every monarch you will ever fear once stood exactly where you stand.', by:'Carved over the arena gates'},
  {g:'⚐', q:'Carry the banner long enough, and one day the banner carries you.', by:'The page’s oath'},
  {g:'♞', q:'Polish the armour. Watch the masters. Lose — and write down why.', by:'The squire’s three duties'},
  {g:'🜁', q:'Magic does not choose the worthy. It chooses the ones who stay.', by:'First law of the Arcanum'},
  {g:'🜂', q:'Talent opens the gate. Discipline walks through it.', by:'Training-yard proverb'},
  {g:'🜃', q:'Kneel to learn. Rise to practise. Stand to teach.', by:'Temple inscription'},
  {g:'🜄', q:'From nothing, something — that is the entire art. The rest is paperwork.', by:'Conjurers’ guild charter'},
  {g:'✶', q:'The board whispers to everyone. Few ever learn to whisper back.', by:'Attributed to the first Enchanter'},
  {g:'☿', q:'Speak the old names softly. The pieces remember who calls them.', by:'From the Book of Summons'},
  {g:'⚔', q:'Steel asks the question. Sorcery is the answer.', by:'Spellblade maxim'},
  {g:'☾', q:'Power borrowed at midnight must be repaid by dawn.', by:'Warning in the warlocks’ ledger'},
  {g:'✠', q:'Do not fear the storm of war. Be the storm.', by:'Battlemage field manual, page one'},
  {g:'⚚', q:'The strongest spell ever cast on any board is patience.', by:'The High Mage’s only lesson'},
  {g:'✺', q:'When you can lose your queen and smile, you are nearly ready.', by:'Grand Sorcerer’s examination notes'},
  {g:'❖', q:'Hold the centre, and the edges kneel of their own accord.', by:'The Archon’s doctrine'},
  {g:'♕', q:'Heavy hangs the head that stands one square from the throne.', by:'Court chronicle, final volume'},
  {g:'♚', q:'There is no rank above this one. There is only defending it.', by:'The Monarch, to every challenger'}
];
const ROMAN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII'];
const RANK_TIERS=[ // walked top-down: the throne first, then the long descent to where you began
  {label:'The Throne',      ranks:[16,15]},
  {label:'The High Circle', ranks:[14,13,12]},
  {label:'The Battleborn',  ranks:[11,10,9]},
  {label:'The Arcanum',     ranks:[8,7,6]},
  {label:'The Order',       ranks:[5,4,3]},
  {label:'The Commons',     ranks:[2,1,0]}
];
function rankEmblem(i){
  const t=i+1, C=60;
  const tone=Math.round(120+(t/17)*135); // medallions brighten as you climb
  const main='rgb('+tone+','+tone+','+tone+')';
  let s='';
  if(t>=7){ // radiant spokes ignite once true sorcery begins — one per rank
    let rays='';
    for(let k=0;k<t;k++){
      const a=(k/t)*Math.PI*2 - Math.PI/2, r2=t>=16?57:52;
      rays+='<line x1="'+(C+Math.cos(a)*46).toFixed(1)+'" y1="'+(C+Math.sin(a)*46).toFixed(1)
           +'" x2="'+(C+Math.cos(a)*r2).toFixed(1)+'" y2="'+(C+Math.sin(a)*r2).toFixed(1)+'"/>';
    }
    s+='<g class="rays" stroke="'+main+'" stroke-width="1.4" opacity=".55">'+rays+'</g>';
  }
  if(t>=12) s+='<circle cx="60" cy="60" r="52" fill="none" stroke="'+main+'" stroke-width="1" opacity=".5"/>';
  if(t>=4)  s+='<circle cx="60" cy="60" r="47" fill="none" stroke="'+main+'" stroke-width="1" stroke-dasharray="2 5" opacity=".7"/>';
  s+='<circle cx="60" cy="60" r="42" fill="none" stroke="'+main+'" stroke-width="'+(t>=13?2:1.5)+'"/>';
  s+='<circle cx="60" cy="60" r="35" fill="#0a0a0a" stroke="#3f3f3f" stroke-width="1"/>';
  let studs=''; // a pearl on the ring for every rank already climbed
  for(let k=0;k<t;k++){
    const a=(k/t)*Math.PI*2 - Math.PI/2;
    studs+='<circle cx="'+(C+Math.cos(a)*42).toFixed(1)+'" cy="'+(C+Math.sin(a)*42).toFixed(1)+'" r="2"/>';
  }
  s+='<g fill="'+(t>=13?'#fff':main)+'">'+studs+'</g>';
  if(t===17)      s+='<path d="M44 16 L49 5 L55 13 L60 2 L65 13 L71 5 L76 16 Z" fill="#fff"/><circle cx="60" cy="11" r="1.6" fill="#0a0a0a"/>';
  else if(t===16) s+='<path d="M48 14 L54 6 L60 12 L66 6 L72 14 Z" fill="#fff"/>';
  s+='<text x="60" y="61" text-anchor="middle" dominant-baseline="central" font-size="32" fill="#fff" '
    +'font-family="\'Inter\',\'Segoe UI Symbol\',sans-serif">'+RANK_LORE[i].g+'</text>';
  return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+s+'</svg>';
}
/* tally every account on this device into the rank it currently sits at, so the
   Hall can show how many sorcerers stand on each step of the ladder */
function rankPopulation(){
  const users=getUsers(), counts=new Array(RANKS.length).fill(0);
  for(const k in users){ if(users[k]) counts[rankOf(users[k].points||0)]++; }
  return counts;
}
function openHierarchy(){
  let email=null; try{ email=localStorage.getItem(SESSION_KEY); }catch(e){}
  const u=email?getUsers()[email]:null;
  const pts=u?(u.points||0):0, cur=rankOf(pts);
  const pop=rankPopulation();
  let html='', d=0;
  for(const tier of RANK_TIERS){
    html+='<div class="htier">✦&nbsp; '+tier.label+' &nbsp;✦</div>';
    for(const i of tier.ranks){
      const r=RANKS[i], lore=RANK_LORE[i], next=RANKS[i+1];
      const state=i<cur?'done':i===cur?'now':'lock';
      let extra='';
      if(state==='now'){
        extra=next
          ? '<div class="hprog"><div class="rcbar"><div class="rcfill" style="width:'
            +Math.round((pts-r.at)/(next.at-r.at)*100)+'%"></div></div><span>'
            +(next.at-pts)+' pts to '+next.name+'</span></div>'
          : '<div class="hlocknote">The summit. Long may you reign.</div>';
      } else if(state==='lock'){
        extra='<div class="hlocknote">Unlocks at '+r.at+' pts — '+(r.at-pts)+' to go</div>';
      }
      const n=pop[i];
      const popBadge=n
        ? '<span class="hpop"><span class="pn">'+n+'</span> '+(n===1?'sorcerer':'sorcerers')+' here</span>'
        : '<span class="hpop empty">Unclaimed</span>';
      // above the Arcanum the climb turns perilous — every defeat now drains rating
      const peril=i>ARCANUM_TOP
        ? '<div class="hwarn">⚠ Beyond the Arcanum — a lost match drains '+lossPenalty('classic')+'–'+lossPenalty('sorcery')+' rating points, by chess type.</div>'
        : '';
      html+='<div class="hentry '+state+(i>ARCANUM_TOP?' peril':'')+'" style="animation-delay:'+(d++*45)+'ms">'
          +'<div class="hcrest">'+rankEmblem(i)+'</div>'
          +'<div class="hbody"><div class="hrankline">'
          +'<span class="hname">'+r.name+'</span>'
          +'<span class="hnum">'+ROMAN[i]+' · '+(i?r.at+' PTS':'WHERE ALL BEGIN')+'</span>'
          +popBadge
          +(state==='now'?'<span class="hyou">You stand here</span>':'')
          +'</div><p class="hquote">“'+lore.q+'”<span class="hby">— '+lore.by+'</span></p>'
          +peril+extra+'</div></div>';
    }
  }
  document.getElementById('hallPath').innerHTML=html;
  document.getElementById('hierModal').style.display='flex';
  const scroller=document.getElementById('hallScroll');
  ensureHallLenis();
  if(hallLenis){ hallLenis.resize(); hallLenis.scrollTo(0,{immediate:true}); } // recompute height for the freshly built path
  else scroller.scrollTop=0; // behold the throne first…
  const here=document.querySelector('#hallPath .hentry.now');
  if(here) setTimeout(()=>{ // …then descend to where you stand
    const top=Math.max(here.offsetTop-(scroller.clientHeight-here.offsetHeight)/2,0);
    if(hallLenis) hallLenis.scrollTo(top,{duration:1.2});
    else scroller.scrollTo({top,behavior:'smooth'});
  },500);
}
// null-guard the app-chrome listeners so hierarchy.js (which also exports rankEmblem)
// can be reused on the standalone leaderboard.html, where this nav chrome is absent.
const _hierBtn=document.getElementById('hierBtn');
if(_hierBtn) _hierBtn.addEventListener('click',openHierarchy);
const _whoRank=document.getElementById('whoRank');
if(_whoRank){ _whoRank.addEventListener('click',openHierarchy); _whoRank.title='View the hierarchy'; }
const _hallClose=document.getElementById('hallClose');
if(_hallClose) _hallClose.addEventListener('click',
  ()=>{ const m=document.getElementById('hierModal'); if(m) m.style.display='none'; });

function showPage(name){
  currentPage=name;
  // the actual view swap — run inside a View Transition so home/modes/play crossfade
  // exactly like the cross-document navigations between the standalone pages
  const apply=()=>{
    scrollTop(); // every view opens at the top — never mid-page from wherever the last view was scrolled
    // null-guard each lookup: a stale/cached DOM missing one .page section must not throw
    // here and abort switching the others (this is part of why login could blank the page)
    for(const p of PAGES){ const el=document.getElementById('page-'+p); if(el) el.classList.toggle('active',p===name); }
    document.querySelectorAll('#topnav .nl').forEach(a=>a.classList.toggle('active',
      a.dataset.page===name || (a.dataset.page==='play'&&name==='modes'))); // modes is part of Play
    // the chess clock only runs while the player is actually looking at the board
    clockPaused = !document.body.classList.contains('authed') || name!=='play';
    // strip the navbar/footer the moment the board is on screen, restore them everywhere else
    document.body.classList.toggle('playing', name==='play');
    if(name==='modes'){ updateModeLocks(); updateVariantUI(); } // sealed difficulties + variant-filtered battles
    // the homepage's self-playing board only animates while it's on screen
    if(window.__scShowcase){ name==='home' ? window.__scShowcase.start() : window.__scShowcase.stop(); }
    if(name==='home'){ updateStatsUI(true);    // count the career stats up each time the home view opens
      updateChampion(); }                      // and refresh who reigns
  };
  // codex/leaderboard/points/profile are now standalone .html files reached by normal
  // navigation (which the View Transitions API animates on its own).
  if(document.startViewTransition && !matchMedia('(prefers-reduced-motion:reduce)').matches)
    document.startViewTransition(apply);
  else apply();
}
// every nav/footer link plus the in-page .nl/.fl CTAs (home hero, codex footer) route the same way.
// Links to the standalone MPA pages (about/contact/privacy/terms) carry a real href and NO
// data-page, so we let the browser navigate to them normally instead of hijacking the click.
document.querySelectorAll('.nl, .fl').forEach(a=>
  a.addEventListener('click',e=>{
    const p=a.dataset.page;
    if(!p) return; // real-href link to another page — navigate normally
    e.preventDefault();
    showPage(p==='play'&&!gameBooted ? 'modes' : p); // no match yet → pick an opponent first
  }));
// clicking the brand always returns to the home page (guarded — absent on standalone pages)
const _brandHome=document.getElementById('brandHome');
if(_brandHome) _brandHome.addEventListener('click',e=>{
  e.preventDefault();
  showPage('home');
});


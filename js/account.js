/* === Sorcery Chess · account.js ===
   Local accounts, rank ladder, points, career stats, avatars/auras, reigning champion.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ---------- site shell: local-only accounts + page navigation ---------- */
const USERS_KEY='sorceryChessUsers', SESSION_KEY='sorceryChessUser';
// about / contact / privacy / terms are now standalone crawlable .html pages (MPA for SEO),
// no longer SPA views — so they're not in this router list.
/* The SPA views that still live inside index.html. codex/leaderboard/points/profile
   are now standalone MPA pages (codex.html etc.), so they are no longer toggled here. */
const PAGES=['home','modes','play'];
let currentPage='home';
let gameBooted=false; // true once a match exists (restored save, or started from the modes page)

function getUsers(){ try{ return JSON.parse(localStorage.getItem(USERS_KEY))||{}; }catch(e){ return {}; } }
function setUsers(u){ try{ localStorage.setItem(USERS_KEY,JSON.stringify(u)); }catch(e){} }

// one-way hash so passwords are never kept in plain text (local demo auth, not real security)
async function hashPass(pw){
  try{
    const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('sorcery:'+pw));
    return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){ // crypto.subtle needs a secure context — degrade rather than lock the player out
    let h=0; for(const ch of 'sorcery:'+pw) h=(h*31+ch.codePointAt(0))>>>0;
    return 'x'+h.toString(16);
  }
}

/* ---------- rating ladder: points from wins climb 17 ranks, Junior → The Monarch.
   Points live on the user record in sorceryChessUsers, so each account keeps its own. ---------- */
const RANKS=[
  {name:'Junior',at:0},        {name:'Page',at:40},          {name:'Squire',at:100},
  {name:'Initiate',at:180},    {name:'Adept',at:280},        {name:'Acolyte',at:400},
  {name:'Conjurer',at:550},    {name:'Enchanter',at:730},    {name:'Invoker',at:940},
  {name:'Spellblade',at:1180}, {name:'Warlock',at:1460},     {name:'Battlemage',at:1780},
  {name:'High Mage',at:2150},  {name:'Grand Sorcerer',at:2580},{name:'Archon',at:3080},
  {name:'Crown Prince',at:3660},{name:'The Monarch',at:4330}
];
const WIN_POINTS={1:10,2:25,3:50,4:120,5:200}; // beating a tougher conjured mind pays more (BASE — scaled per variant)
const FRIEND_POINTS=10;                        // local matches are casual (BASE — scaled per variant)
/* ---- per-variant stakes: each kind of chess pays — and drains — rating on its own scale.
   Classic is the baseline (×1); Sorcery's spellcasters make it harder, so it pays more (×1.5).
   The same multiplier applies to the loss penalty, so the richer a variant's wins, the costlier
   its defeats. All point figures the player ever sees flow through winPoints/friendPoints/
   lossPenalty so they stay in lockstep. ---- */
const VARIANT_MULT={sorcery:1.5, classic:1};
function variantMult(v){ v=v||(typeof VARIANT!=='undefined'&&VARIANT)||'sorcery'; return VARIANT_MULT[v]||1; }
function winPoints(level,v){ return Math.round((WIN_POINTS[level]||10)*variantMult(v)); }
function friendPoints(v){ return Math.round(FRIEND_POINTS*variantMult(v)); }
function lossPenalty(v){ return Math.round(LOSS_PENALTY*variantMult(v)); }
/* ---- the cost of falling: once a sorcerer climbs ABOVE the Arcanum tier, defeat
   bleeds rating. The Arcanum tops out at Invoker (rank index 8 in RANKS / the
   Hall's "The Arcanum" tier = Conjurer/Enchanter/Invoker), so anyone at Spellblade
   (index 9) or higher pays LOSS_PENALTY when they lose. Below that the climb is
   consequence-free. The warning is spelled out in the Hall of Ascension. ---- */
const ARCANUM_TOP=8;       // Invoker — the ceiling of The Arcanum tier
const LOSS_PENALTY=20;     // rating drained on a loss once you stand above the Arcanum
function rankOf(pts){
  let i=0;
  while(i+1<RANKS.length && pts>=RANKS[i+1].at) i++;
  return i;
}
// how many points the signed-in player stands to lose on a defeat (0 below the Arcanum)
function pointsAtRisk(){
  const c=curUser(); if(!c) return 0;
  return rankOf(c.user.points||0)>ARCANUM_TOP ? lossPenalty() : 0;
}
function awardPoints(n){
  let email=null; try{ email=localStorage.getItem(SESSION_KEY); }catch(e){}
  if(!email) return null;
  const users=getUsers(), u=users[email];
  if(!u) return null;
  const before=u.points||0;
  u.points=Math.max(0,before+n); // a penalty can drain rating, but never below zero
  bankVariantPoints(u,n);        // also tally it under the variant being played
  setUsers(users);
  updateRankUI();
  updateChampion(); // a fresh win may have changed who holds the throne
  return {pts:u.points, oldRank:rankOf(before), newRank:rankOf(u.points)};
}
/* ---- per-variant renown: each kind of chess keeps its own points/wins/games so the
   leaderboard can rank players for the chess type they've actually been playing.
   Stored as u.vstats={sorcery:{points,wins,games}, classic:{…}}; the global u.points
   still drives the rank ladder/home/champion exactly as before. ---- */
function variantBucket(u,variant){
  u.vstats=u.vstats||{};
  return (u.vstats[variant]=u.vstats[variant]||{points:0,wins:0,games:0});
}
function bankVariantPoints(u,n){
  if(typeof VARIANT==='undefined' || !VARIANT) return;
  const v=variantBucket(u,VARIANT);
  v.points=Math.max(0,(v.points||0)+n);
}

/* ---------- per-account career record: games / wins / losses / streaks ----------
   Lives on the user object in sorceryChessUsers, so every account keeps its own
   history and it survives logout → log back in, just like points do. ---------- */
function recordResult(winner){
  let email=null; try{ email=localStorage.getItem(SESSION_KEY); }catch(e){}
  if(!email) return;
  const users=getUsers(), u=users[email]; if(!u) return;
  u.games=(u.games||0)+1;
  if(typeof VARIANT!=='undefined' && VARIANT){           // mirror the result into the variant's own record
    const vb=variantBucket(u,VARIANT);
    vb.games=(vb.games||0)+1;
    if(winner==='white') vb.wins=(vb.wins||0)+1;
  }
  if(winner==='white'){                                  // the player (always White) prevailed
    u.wins=(u.wins||0)+1;
    u.streak=(u.streak||0)+1;
    if(u.streak>(u.bestStreak||0)) u.bestStreak=u.streak;
  } else if(winner==='black'){
    u.losses=(u.losses||0)+1; u.streak=0;
  } else {
    u.draws=(u.draws||0)+1; u.streak=0;                  // a draw breaks a win streak
  }
  u.lastPlayed=Date.now();
  if(!u.joined) u.joined=u.lastPlayed;                    // backfill for accounts made before stats existed
  setUsers(users);
  updateStatsUI();
}

/* animate a number from its current value up to `to` — gives the home stats some life */
function animateCount(el, to){
  if(!el) return;
  const suffix=/%$/.test(el.textContent)?'%':'';
  const from=parseInt(el.textContent,10)||0;
  if(from===to){ el.textContent=to+suffix; return; }
  const start=performance.now(), dur=650;
  (function step(now){
    const t=Math.min(1,(now-start)/dur), e=1-Math.pow(1-t,3); // easeOutCubic
    el.textContent=Math.round(from+(to-from)*e)+suffix;
    if(t<1) requestAnimationFrame(step);
  })(start);
}

/* paint the home-page stats card from the signed-in account's record */
function updateStatsUI(animate){
  let email=null; try{ email=localStorage.getItem(SESSION_KEY); }catch(e){}
  const u=email?getUsers()[email]:null;
  if(!u) return;
  const games=u.games||0, wins=u.wins||0, best=u.bestStreak||0;
  const rate=games?Math.round(wins/games*100):0;
  const set=(id,val)=>{
    const el=document.getElementById(id); if(!el) return;
    if(animate) animateCount(el, val);
    else el.textContent=val+(/Rate/i.test(id)?'%':'');
  };
  set('stGames',games); set('stWins',wins); set('stStreak',best);
  const rEl=document.getElementById('stRate');
  if(rEl){ if(animate) animateCount(rEl, rate); else rEl.textContent=rate+'%'; }
  // a hot streak (3+) gets the blue magic glow
  const sg=document.getElementById('statGrid');
  if(sg) sg.children[3].classList.toggle('glow', best>=3);
  // member-since line — friendly month + year
  const ml=document.getElementById('memberLine');
  if(ml){
    if(u.joined){
      const d=new Date(u.joined);
      const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
      ml.innerHTML='⚔ Sorcerer since <b>'+m+' '+d.getFullYear()+'</b>'
        + (games? ' · <b>'+games+'</b> '+(games===1?'battle':'battles')+' fought' : ' · awaiting your first battle');
    } else ml.textContent='';
  }
}

/* ====================================================================
   PROFILE IDENTITY — avatar, aura, title, favourite caster, bio — plus the
   "reigning champion" shown decoratively on home. All of it lives on the user
   record in sorceryChessUsers, so every account keeps its own look. ==================================================================== */
function escapeHtml(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function curUser(){
  let email=null; try{ email=localStorage.getItem(SESSION_KEY); }catch(e){}
  if(!email) return null;
  const u=getUsers()[email]; return u?{email,user:u}:null;
}
function mutateUser(fn){
  const c=curUser(); if(!c) return;
  const users=getUsers(); fn(users[c.email]); setUsers(users);
}
const AURAS=[
  {id:'azure',  rgb:'61,169,255'},  {id:'ember',  rgb:'255,120,80'},
  {id:'jade',   rgb:'52,216,160'},  {id:'violet', rgb:'192,132,252'},
  {id:'gold',   rgb:'240,200,90'},  {id:'rose',   rgb:'255,120,170'},
  {id:'frost',  rgb:'150,210,255'}, {id:'blood',  rgb:'240,70,70'},
  {id:'toxin',  rgb:'150,230,90'},  {id:'abyss',  rgb:'120,90,255'},
  {id:'cyan',   rgb:'40,230,230'},  {id:'sun',    rgb:'255,170,40'},
  {id:'orchid', rgb:'230,90,230'},  {id:'silver', rgb:'200,210,225'}
];
const AVATARS=['♛','♚','♞','♝','✶','⚗','⚚','❅','☿','☾','☄','✠','⚔','🜁','🜂','🜃','🜄','✺','❖','⚜','✦','☉','♆','⚕',
  '☥','♅','♄','⚛','✷','✹','⟁','⌖','☖','♖','♘','☗','✧','❂','⊕','⊗','♁','☼','⚝','✵','⫯','♜','♟','卍'];
const TITLES=['the Unranked','the Apprentice','Stormcaller','Bane of Kings','the Unbroken','Frostweaver',
  'the Ascendant','Keeper of the Board','Shadowmage','the Eternal','Dawnbringer','Warden of Squares',
  'the Cursed','Voidwalker','Kingslayer','the Serene','the Undying','Spellbreaker','Lord of Ruin',
  'the Tactician','Riftcaller','the Merciless','Crown of Embers','the Wandering','Hexbearer','the Boundless'];
const FAVS=[{id:'wizard',g:'✶',n:'Wizard'},{id:'alchemist',g:'⚗',n:'Alchemist'},
  {id:'freezer',g:'❅',n:'Freezer'},{id:'witch',g:'⚚',n:'Witch'}];
/* allegiances — a faction the player swears to, shown as a chip on their profile */
const REALMS=[{id:'storm',g:'⚡',n:'Storm Court'},{id:'frost',g:'❄',n:'Frost Hold'},
  {id:'ember',g:'🔥',n:'Ember Pact'},{id:'shadow',g:'🌑',n:'Shadow Conclave'},
  {id:'verdant',g:'🌿',n:'Verdant Circle'},{id:'astral',g:'✨',n:'Astral Order'}];
/* card frames — a decorative border treatment for the profile header card */
const FRAMES=[{id:'',n:'Plain'},{id:'gilded',n:'Gilded'},{id:'runed',n:'Runed'},
  {id:'shadow',n:'Shadowbound'},{id:'arcane',n:'Arcane'}];
function auraRgb(u){ const a=AURAS.find(x=>x.id===(u&&u.aura)); return a?a.rgb:'var(--accent-rgb)'; }
function avatarGlyph(u){ return (u&&u.avatar)||'♛'; }
/* paint a circular avatar (navbar or profile header) from a user record */
function paintAvatar(el,glyphEl,u){
  if(!el) return;
  el.style.setProperty('--pa',auraRgb(u));
  if(u&&u.pic){
    el.style.backgroundImage='url('+u.pic+')'; el.classList.add('haspic');
    if(glyphEl) glyphEl.style.display='none';
  } else {
    el.style.backgroundImage=''; el.classList.remove('haspic');
    if(glyphEl){ glyphEl.style.display=''; glyphEl.textContent=avatarGlyph(u); }
  }
}
function updateAvatarUI(){
  const c=curUser();
  paintAvatar(document.getElementById('navAv'),document.getElementById('navAvGlyph'),c?c.user:null);
}
/* the champion card reflects the currently signed-in account (their name, rank and
   points) — not the device's top scorer — so a freshly signed-up user always sees
   their own name here rather than some other local account's. */
function sessionUser(){
  let email=null; try{ email=localStorage.getItem(SESSION_KEY); }catch(e){}
  return email?getUsers()[email]:null;
}
function updateChampion(){
  const nameEl=document.getElementById('champName'), titleEl=document.getElementById('champTitle');
  if(!nameEl) return;
  const u=sessionUser();
  if(u){
    nameEl.textContent=u.name;
    const r=RANKS[rankOf(u.points||0)].name;
    titleEl.innerHTML=(u.title?'<b>'+escapeHtml(u.title)+'</b> · ':'')+escapeHtml(r)+' · '+(u.points||0)+' pts';
  } else {
    nameEl.textContent='The throne stands empty';
    titleEl.textContent='Win a battle to claim it';
  }
}


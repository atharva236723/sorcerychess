/* === Sorcery Chess · leaderboard.js ===
   The Worldwide Leaderboard — the top 20 sorcerers of the realm. Every local account
   competes for the board against a roster of legendary NPC mages; the signed-in player
   is highlighted, and shown their true global standing even if they sit below the top 20.
   Auto-split-style feature file. Plain (non-module) script: every file shares one global
   scope, so the <script> load order is fixed (this loads before boot.js) — do not reorder. */

/* The legends of the realm — fixed renown so the world feels populated and a climbing
   player has thrones to chase. Points are tuned against RANKS (Junior 0 → The Monarch 4330)
   so even a strong real account can break into, and eventually top, the board. */
const LEGENDS=[
  {name:'Vaelthar the Undying', glyph:'♚', realm:'Obsidian Throne',  points:6420, wins:842, games:910,
    title:'Sovereign of the Deathless', lore:'Crowned nine times and slain eight — the grave keeps returning him to the board.'},
  {name:'Morgrana Hexqueen',    glyph:'♛', realm:'Shadow Conclave',  points:5980, wins:771, games:858,
    title:'The Thousand Curses', lore:'No opening survives her gaze; she has hexed kings out of games not yet played.'},
  {name:'Azrael Stormcaller',   glyph:'⚡', realm:'Storm Court',      points:5610, wins:702, games:806,
    title:'Voice of the Tempest', lore:'Her gambits land like lightning — by the time you hear them, the king has fallen.'},
  {name:'Selisanne Frostweave', glyph:'❅', realm:'Frost Hold',       points:5240, wins:648, games:760,
    title:'Warden of the Long Winter', lore:'She freezes the tempo until her foes simply run out of moves and warmth.'},
  {name:'Pyrrhus Emberlord',    glyph:'🔥', realm:'Ember Pact',       points:4870, wins:601, games:722,
    title:'The Unquenched', lore:'Sacrifices pieces like kindling; by his fortieth move the whole board is burning.'},
  {name:'Nyx of the Void',      glyph:'☾', realm:'Astral Order',      points:4510, wins:560, games:690,
    title:'She Who Unmakes', lore:'Plays from silence and shadow — armies vanish into lines no one saw coming.'},
  {name:'Caldris Spellblade',   glyph:'⚔', realm:'Battleborn Reach',  points:4180, wins:512, games:648,
    title:'Edge of the Endgame', lore:'Treats every exchange as a sword fight, and has never lost the final one.'},
  {name:'Verena Dawnbringer',   glyph:'☉', realm:'Verdant Circle',    points:3760, wins:466, games:604,
    title:'The First Light', lore:'Where others see a lost position she sees a sunrise, and plays toward it relentlessly.'},
  {name:'Thorne Grimm',         glyph:'✠', realm:'Iron Marches',      points:3390, wins:421, games:566,
    title:'The Iron Wall', lore:'His fortresses have outlasted sieges of a hundred moves; patience is his deadliest spell.'},
  {name:'Isolde Riftcaller',    glyph:'✺', realm:'Astral Order',      points:3040, wins:382, games:528,
    title:'Tearer of Lines', lore:'Opens rifts in the center no defense can close, then pours her pieces through.'},
  {name:'Garruk Boneweaver',    glyph:'⚚', realm:'Shadow Conclave',   points:2710, wins:341, games:492,
    title:'Keeper of the Dead', lore:'Master of the Witch — his graveyard is less a resting place than a second army.'},
  {name:'Lyra Moonshadow',      glyph:'☽', realm:'Frost Hold',        points:2420, wins:308, games:458,
    title:'The Quiet Tide', lore:'Wins so gently her foes thank her, never noticing the net until it closes.'},
  {name:'Drust the Cursed',     glyph:'☠', realm:'Obsidian Throne',   points:2110, wins:271, games:420,
    title:'Bearer of the Black Mark', lore:'Poison follows wherever he plays; foes lose pieces they swear they guarded.'},
  {name:'Elowen Spellsong',     glyph:'✶', realm:'Verdant Circle',    points:1840, wins:238, games:386,
    title:'The Weaving Voice', lore:'Her combinations sing — sequences so clean they are taught as lullabies to young mages.'},
  {name:'Kael Ashwalker',       glyph:'🜂', realm:'Ember Pact',        points:1560, wins:205, games:352,
    title:'The Cinder Road', lore:'Rises from losing positions through fire and trades, leaving only ash and a won king.'},
  {name:'Sabriel Windborne',    glyph:'🜁', realm:'Storm Court',       points:1290, wins:172, games:316,
    title:'Rider of the Gale', lore:'Fast, restless, relentless — she wins more games on the clock than on the board.'},
  {name:'Orin the Patient',     glyph:'⚜', realm:'Iron Marches',      points:1040, wins:141, games:284,
    title:'He Who Waits', lore:'Will trade an hour of caution for a single mistake, then never let it go.'},
  {name:'Mirelle Frostbite',    glyph:'❄', realm:'Frost Hold',        points:820,  wins:114, games:250,
    title:'The Slow Freeze', lore:'A rising talent of the Hold whose endgames grow colder and surer each season.'},
  {name:'Valdric Halfmage',     glyph:'🜃', realm:'Battleborn Reach',  points:620,  wins:88,  games:214,
    title:'The Half-Schooled', lore:'Never finished his training, yet beats those who did with raw, fearless instinct.'},
  {name:'Petra Quickhex',       glyph:'☿', realm:'Verdant Circle',    points:450,  wins:64,  games:178,
    title:'The Blink', lore:'Casts faster than thought; half her wins are over before her foe has settled in.'},
  {name:'Joss the Apprentice',  glyph:'🜄', realm:'Storm Court',       points:300,  wins:43,  games:140,
    title:'The Eager', lore:'Still learning, already dangerous — every loss sharpens him for the next.'},
  {name:'Wren Saplingmage',     glyph:'✦', realm:'Ember Pact',        points:170,  wins:24,  games:96,
    title:'The Green Spark', lore:'New to the realm but climbing fast, with a fondness for reckless, beautiful attacks.'},
  {name:'Tobin Firstspark',     glyph:'♟', realm:'The Commons',       points:80,   wins:11,  games:52,
    title:'The Hopeful', lore:'A commoner who taught himself the game by candlelight and refuses to stop climbing.'},
  {name:'Della Candlewick',     glyph:'⚐', realm:'The Commons',       points:30,   wins:4,   games:21,
    title:'The Newly Lit', lore:'Her first season on the boards — but every legend, they say, began as a single flame.'}
];

/* which chess type the board is ranking — follows the home dropdown (pendingVariant)
   when the page opens, but can be switched live via the leaderboard's own tabs. */
let lbVariant='sorcery';
let lbField=[]; // the most recently rendered ranked field, so a clicked row → its player

/* map a real account's stored allegiance id to a readable realm name */
function realmName(u){
  if(u && u.realm && typeof REALMS!=='undefined'){
    const r=REALMS.find(x=>x.id===u.realm);
    if(r) return r.n;
  }
  return 'The Free Cities';
}

/* a real account's renown for one chess type — read from its per-variant record,
   falling back to zero for a variant it has never played. */
function playerVStats(u,variant){
  const v=u.vstats&&u.vstats[variant];
  return { points:(v&&v.points)||0, wins:(v&&v.wins)||0, games:(v&&v.games)||0 };
}
/* a legend's renown for one chess type. Sorcery (the headline game) uses their full
   fame; for other variants a deterministic per-legend factor reshuffles the field so
   each chess type has its own distinct ladder rather than a clone of Sorcery's. */
function legendVStats(l,variant){
  if(variant==='sorcery') return { points:l.points, wins:l.wins, games:l.games };
  let h=0; const s=l.name+'|'+variant;
  for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  const f=0.55+(h%46)/100; // 0.55–1.00, stable per (legend, variant)
  return { points:Math.round(l.points*f), wins:Math.round(l.wins*f), games:Math.round(l.games*f) };
}

/* assemble every contender — the legends plus every local account — into one ranked
   field for the chosen chess type (defaults to the active lbVariant). */
function leaderboardField(variant){
  variant=variant||lbVariant||'sorcery';
  let myEmail=null; try{ myEmail=localStorage.getItem(SESSION_KEY); }catch(e){}
  const field=LEGENDS.map(l=>{
    const s=legendVStats(l,variant);
    return { name:l.name, glyph:l.glyph, realm:l.realm,
      points:s.points, wins:s.wins, games:s.games, npc:true, you:false, legend:l };
  });
  const users=getUsers();
  for(const email in users){
    const u=users[email]; if(!u) continue;
    const s=playerVStats(u,variant);
    field.push({
      name:u.name||'Sorcerer', glyph:avatarGlyph(u), realm:realmName(u),
      points:s.points, wins:s.wins, games:s.games,
      npc:false, you:(email===myEmail), email
    });
  }
  // renown decides the order; a hair of tie-breaking by win-rate keeps it stable
  field.sort((a,b)=> b.points-a.points || (b.wins/(b.games||1))-(a.wins/(a.games||1)));
  field.forEach((p,i)=>p.pos=i+1);
  return field;
}

function lbMedal(pos){ return pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':''; }
function winRate(p){ return p.games? Math.round(p.wins/p.games*100) : 0; }

/* one podium card for the top three */
function lbPodiumCard(p){
  const rk=RANKS[rankOf(p.points)].name;
  return '<div class="lb-podium-card lb-p'+p.pos+(p.you?' you':'')+'" data-pos="'+p.pos+'" tabindex="0" role="button" title="View '+escapeHtml(p.name)+'">'
    + '<div class="lb-pod-medal">'+lbMedal(p.pos)+'</div>'
    + '<div class="lb-pod-av"><span>'+escapeHtml(p.glyph)+'</span></div>'
    + '<div class="lb-pod-name">'+escapeHtml(p.name)+(p.you?' <em>(you)</em>':'')+'</div>'
    + '<div class="lb-pod-rank">'+escapeHtml(rk)+'</div>'
    + '<div class="lb-pod-pts">'+p.points.toLocaleString()+'<span> pts</span></div>'
    + '<div class="lb-pod-realm">'+escapeHtml(p.realm)+'</div>'
    + '</div>';
}

/* one ranked row for places 4–20 (and for the "your standing" footer) */
function lbRow(p){
  const rk=RANKS[rankOf(p.points)].name;
  return '<div class="lb-row'+(p.you?' you':'')+(p.npc?'':' real')+'" data-pos="'+p.pos+'" tabindex="0" role="button" title="View '+escapeHtml(p.name)+'">'
    + '<div class="lb-pos">'+p.pos+'</div>'
    + '<div class="lb-av"><span>'+escapeHtml(p.glyph)+'</span></div>'
    + '<div class="lb-id"><b>'+escapeHtml(p.name)+(p.you?' <em>(you)</em>':'')+'</b>'
      + '<small>'+escapeHtml(p.realm)+'</small></div>'
    + '<div class="lb-rank">'+escapeHtml(rk)+'</div>'
    + '<div class="lb-wr">'+winRate(p)+'%</div>'
    + '<div class="lb-pts">'+p.points.toLocaleString()+'</div>'
    + '</div>';
}

/* the variant-filter tabs above the podium — one per chess type, the active one lit */
function renderLbTabs(){
  const el=document.getElementById('lbVariants');
  if(!el || typeof VARIANTS==='undefined') return;
  let html='';
  for(const id in VARIANTS){
    const v=VARIANTS[id];
    html+='<button class="lb-vtab'+(id===lbVariant?' on':'')+'" role="tab" data-variant="'+id+'"'
      +(id===lbVariant?' aria-selected="true"':'')+'>'
      +'<span class="lb-vg">'+v.glyph+'</span>'+v.name+'</button>';
  }
  el.innerHTML=html;
  el.querySelectorAll('.lb-vtab').forEach(b=>b.addEventListener('click',()=>{
    lbVariant=b.dataset.variant; renderLeaderboard();
  }));
}

/* called when the leaderboard page opens: sync the board to the chess type the player
   last chose on the home dropdown, then render. */
function openLeaderboard(){
  lbVariant=(typeof pendingVariant!=='undefined' && VARIANTS[pendingVariant]) ? pendingVariant : 'sorcery';
  renderLeaderboard();
}

function renderLeaderboard(){
  const podEl=document.getElementById('lbPodium'),
        listEl=document.getElementById('lbList'),
        youEl=document.getElementById('lbYou');
  if(!podEl||!listEl) return;
  renderLbTabs();
  const field=leaderboardField(lbVariant);
  lbField=field; // keep the ranked field so a click can look a player up by position
  const top=field.slice(0,20);

  podEl.innerHTML=top.slice(0,3).map(lbPodiumCard).join('');
  listEl.innerHTML='<div class="lb-row lb-head">'
    + '<div class="lb-pos">#</div><div class="lb-av"></div>'
    + '<div class="lb-id">Sorcerer</div><div class="lb-rank">Rank</div>'
    + '<div class="lb-wr">Win&nbsp;%</div><div class="lb-pts">Points</div></div>'
    + top.slice(3).map(lbRow).join('');

  // the signed-in player's true standing, called out if they're not already on the board
  const me=field.find(p=>p.you);
  if(youEl){
    if(me && me.pos>20){
      youEl.style.display='';
      youEl.innerHTML='<div class="lb-youlabel">Your standing — keep climbing</div>'+lbRow(me);
    } else {
      youEl.style.display='none'; youEl.innerHTML='';
    }
  }
}

/* ====================================================================
   PLAYER CARD — click any sorcerer on the board for a detailed dossier.
   Pulls the legend's lore for NPCs, or the full local account record (title,
   bio, favoured caster, aura, portrait) for real players. ==================================================================== */
// a stable aura colour for a legend with no account — hashed from the name into the AURAS palette
function lbAuraRgb(name){
  let h=0; for(let i=0;i<name.length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  return AURAS[h%AURAS.length].rgb;
}
function lbStatCell(label,val,cls){
  return '<div class="pc-cell"><span class="pc-cl">'+label+'</span><b'+(cls?' class="'+cls+'"':'')+'>'+val+'</b></div>';
}
function openPlayerCard(p){
  if(!p) return;
  const box=document.getElementById('playerCard'); if(!box) return;
  const ri=rankOf(p.points), r=RANKS[ri], next=RANKS[ri+1];
  const wr=winRate(p), losses=Math.max(0,p.games-p.wins);
  const vName=(VARIANTS[lbVariant]||VARIANTS.sorcery).name;

  // identity extras: a real account carries far more than the legends do
  const u=(!p.npc && p.email) ? getUsers()[p.email] : null;
  const rgb=u ? auraRgb(u) : lbAuraRgb(p.name);
  let title='', lore='', chips='', pic='', extraCells='';
  if(p.npc && p.legend){ title=p.legend.title||''; lore=p.legend.lore||''; }
  if(u){
    title=u.title||'';
    lore=u.bio||'';
    if(u.fav){ const f=FAVS.find(x=>x.id===u.fav); if(f) chips+='<span class="pc-chip">'+f.g+' Favours the '+escapeHtml(f.n)+'</span>'; }
    if(u.pic) pic=u.pic;
    if(u.bestStreak) extraCells+=lbStatCell('Best streak','🔥 '+u.bestStreak, u.bestStreak>=3?'glow':'');
    if(u.joined){
      const d=new Date(u.joined), M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
      extraCells+=lbStatCell('Sorcerer since', M+' '+d.getFullYear());
    }
  }

  const medal=lbMedal(p.pos);
  const avInner = pic
    ? '<span class="pc-av haspic" style="background-image:url('+pic+')"></span>'
    : '<span class="pc-av"><span class="pc-avg">'+escapeHtml(p.glyph)+'</span></span>';
  const progress = next
    ? '<div class="pc-prog"><div class="pc-prog-bar"><span style="width:'
        +Math.max(0,Math.min(100,Math.round((p.points-r.at)/(next.at-r.at)*100)))+'%"></span></div>'
        +'<div class="pc-prog-lab"><b>'+(next.at-p.points).toLocaleString()+'</b> points to '+escapeHtml(next.name)+'</div></div>'
    : '<div class="pc-prog"><div class="pc-prog-lab pc-apex">👑 The highest throne in the realm</div></div>';

  box.style.setProperty('--pa',rgb);
  box.innerHTML=
      '<button class="pc-x" type="button" aria-label="Close" id="pcClose">✕</button>'
    + '<div class="pc-hero">'
    +   '<div class="pc-crest" aria-hidden="true">'+rankEmblem(ri)+'</div>'
    +   '<div class="pc-avwrap">'+avInner+(medal?'<span class="pc-medal">'+medal+'</span>':'')+'</div>'
    +   '<div class="pc-name">'+escapeHtml(p.name)+(p.you?' <em>(you)</em>':'')+'</div>'
    +   (title?'<div class="pc-epithet">'+escapeHtml(title)+'</div>':'')
    +   '<div class="pc-chips"><span class="pc-chip rank">'+escapeHtml(r.name)+'</span>'
    +     '<span class="pc-chip">⚑ '+escapeHtml(p.realm)+'</span>'+chips
    +     (p.npc?'<span class="pc-chip npc">✦ Legend of the realm</span>':'')+'</div>'
    + '</div>'
    + '<div class="pc-bigrow">'
    +   '<div class="pc-big"><span class="pc-cl">Global rank</span><b>'+(medal||'')+' #'+p.pos+'</b></div>'
    +   '<div class="pc-big"><span class="pc-cl">Renown · '+escapeHtml(vName)+'</span><b class="accent">'+p.points.toLocaleString()+'<small> pts</small></b></div>'
    + '</div>'
    + progress
    + '<div class="pc-cells">'
    +   lbStatCell('Win rate', wr+'%', wr>=60?'glow':'')
    +   lbStatCell('Victories', p.wins.toLocaleString())
    +   lbStatCell('Defeats', losses.toLocaleString())
    +   lbStatCell('Battles', p.games.toLocaleString())
    +   extraCells
    + '</div>'
    + (lore?'<blockquote class="pc-lore">“'+escapeHtml(lore)+'”</blockquote>':'');

  const modal=document.getElementById('playerModal');
  modal.style.display='flex';
  const x=document.getElementById('pcClose');
  if(x) x.addEventListener('click',()=>modal.style.display='none');
  // let any sub-Lenis on the scroll box re-measure now that it has content
  if(typeof subLenis!=='undefined') subLenis.forEach(s=>{ try{ s.resize&&s.resize(); }catch(e){} });
}

// delegated clicks (and keyboard activation) on the podium + the ranked list + your-standing row
function lbOpenFromEl(el){
  const card=el.closest('[data-pos]'); if(!card) return;
  const pos=+card.dataset.pos;
  const p=lbField.find(x=>x.pos===pos);
  if(p) openPlayerCard(p);
}
['lbPodium','lbList','lbYou'].forEach(id=>{
  const host=document.getElementById(id); if(!host) return;
  host.addEventListener('click',e=>lbOpenFromEl(e.target));
  host.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); lbOpenFromEl(e.target); } });
});

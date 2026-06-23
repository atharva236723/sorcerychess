/* === Sorcery Chess · profile.js ===
   The profile page, difficulty unlock locks, and updateRankUI.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

let profileBuilt=false;
function buildProfileGrids(){
  if(profileBuilt) return; profileBuilt=true;
  const ag=document.getElementById('avatarGrid');
  AVATARS.forEach(g=>{ const o=document.createElement('div'); o.className='opt av'; o.textContent=g; o.dataset.av=g;
    o.addEventListener('click',()=>{ mutateUser(u=>{u.avatar=g; u.pic=null;}); renderProfile(); updateAvatarUI(); }); ag.appendChild(o); });
  const aurg=document.getElementById('auraGrid');
  AURAS.forEach(a=>{ const o=document.createElement('div'); o.className='aura'; o.dataset.aura=a.id; o.title=a.id;
    o.style.background='rgb('+a.rgb+')'; o.style.color='rgb('+a.rgb+')';
    o.addEventListener('click',()=>{ mutateUser(u=>{u.aura=a.id;}); renderProfile(); updateAvatarUI(); }); aurg.appendChild(o); });
  const tg=document.getElementById('titleGrid');
  TITLES.forEach(t=>{ const o=document.createElement('div'); o.className='opt ttl'; o.textContent=t; o.dataset.ttl=t;
    o.addEventListener('click',()=>{ mutateUser(u=>{u.title=t;}); renderProfile(); updateChampion(); }); tg.appendChild(o); });
  const fg=document.getElementById('favGrid');
  FAVS.forEach(f=>{ const o=document.createElement('div'); o.className='opt fav'; o.dataset.fav=f.id;
    o.innerHTML=f.g+'<span>'+f.n+'</span>';
    o.addEventListener('click',()=>{ mutateUser(u=>{u.fav=f.id;}); renderProfile(); }); fg.appendChild(o); });
  const rg=document.getElementById('realmGrid');
  REALMS.forEach(r=>{ const o=document.createElement('div'); o.className='opt fav'; o.dataset.realm=r.id;
    o.innerHTML=r.g+'<span>'+r.n+'</span>';
    o.addEventListener('click',()=>{ mutateUser(u=>{u.realm=(u.realm===r.id?'':r.id);}); renderProfile(); }); rg.appendChild(o); });
  const frg=document.getElementById('frameGrid');
  FRAMES.forEach(f=>{ const o=document.createElement('div'); o.className='opt ttl'; o.dataset.frame=f.id; o.textContent=f.n;
    o.addEventListener('click',()=>{ mutateUser(u=>{u.frame=f.id;}); renderProfile(); }); frg.appendChild(o); });
}
function renderProfile(){
  const c=curUser(); if(!c) return; const u=c.user;
  buildProfileGrids();
  const pw=document.getElementById('profWrap');
  pw.style.setProperty('--pa',auraRgb(u));
  FRAMES.forEach(f=>{ if(f.id) pw.classList.remove('frame-'+f.id); });
  if(u.frame) pw.classList.add('frame-'+u.frame);
  paintAvatar(document.getElementById('profAvatar'),document.getElementById('profAvGlyph'),u);
  document.getElementById('profName').textContent=u.name;
  document.getElementById('profTitle').textContent=u.title||'the Unranked';
  const pts=u.points||0, r=RANKS[rankOf(pts)].name, fav=FAVS.find(f=>f.id===u.fav);
  const realm=REALMS.find(x=>x.id===u.realm);
  document.getElementById('profMeta').innerHTML=
     '<span class="pchip">'+escapeHtml(r)+'</span>'
    +'<span class="pchip"><span>Points</span> '+pts+'</span>'
    +'<span class="pchip"><span>Battles</span> '+(u.games||0)+'</span>'
    +'<span class="pchip"><span>Wins</span> '+(u.wins||0)+'</span>'
    +(fav?'<span class="pchip"><span>Wields</span> '+fav.g+' '+fav.n+'</span>':'')
    +(realm?'<span class="pchip"><span>Sworn to</span> '+realm.g+' '+escapeHtml(realm.n)+'</span>':'');
  document.getElementById('profBio').textContent=u.bio||'A tale yet unwritten.';
  document.getElementById('profClearPic').style.display=u.pic?'':'none';
  document.querySelectorAll('#avatarGrid .opt').forEach(o=>o.classList.toggle('on',!u.pic && o.dataset.av===avatarGlyph(u)));
  document.querySelectorAll('#auraGrid .aura').forEach(o=>o.classList.toggle('on',o.dataset.aura===(u.aura||'')));
  document.querySelectorAll('#titleGrid .opt').forEach(o=>o.classList.toggle('on',o.dataset.ttl===(u.title||'')));
  document.querySelectorAll('#favGrid .opt').forEach(o=>o.classList.toggle('on',o.dataset.fav===(u.fav||'')));
  document.querySelectorAll('#realmGrid .opt').forEach(o=>o.classList.toggle('on',o.dataset.realm===(u.realm||'')));
  document.querySelectorAll('#frameGrid .opt').forEach(o=>o.classList.toggle('on',o.dataset.frame===(u.frame||'')));
  document.getElementById('profNameInput').value=u.name||'';
  document.getElementById('profBioInput').value=u.bio||'';
}
/* Profile editor controls — wired only on the page that actually carries the profile
   DOM (now the standalone profile.html). On index.html the profile view has moved out,
   so these elements are absent and the early return keeps profile.js loading cleanly
   there — it still defines updateRankUI and the per-variant defeat system used app-wide.
   (#navProfile is now a real link to profile.html, so no click handler hijacks it.) */
(function(){
  const up=document.getElementById('profUploadBtn');
  if(!up) return;
  up.addEventListener('click',()=>document.getElementById('profPicInput').click());
  document.getElementById('profPicInput').addEventListener('change',e=>{
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    if(!/^image\//.test(f.type)){ toast('That file is not an image.'); e.target.value=''; return; }
    if(f.size>2*1024*1024){ toast('Please choose an image under 2 MB.'); e.target.value=''; return; }
    const reader=new FileReader();
    reader.onload=()=>{
      try{ mutateUser(u=>{u.pic=reader.result;}); }
      catch(err){ toast('That image is too large to store.'); return; }
      renderProfile(); updateAvatarUI(); toast('Portrait conjured!');
    };
    reader.readAsDataURL(f); e.target.value='';
  });
  document.getElementById('profClearPic').addEventListener('click',()=>{ mutateUser(u=>{u.pic=null;}); renderProfile(); updateAvatarUI(); });
  document.getElementById('profSaveBtn').addEventListener('click',()=>{
    const name=document.getElementById('profNameInput').value.trim();
    const bio=document.getElementById('profBioInput').value.trim();
    if(!name){ toast('Your name cannot be empty.'); return; }
    mutateUser(u=>{ u.name=name; u.bio=bio; });
    const cf=document.getElementById('cfName'); if(cf) cf.value=name;
    renderProfile(); updateChampion(); updateAvatarUI();
    toast('Profile saved.');
  });
})();

/* ---------- difficulty unlocks: dread opponents are earned, not chosen ----------
   The Malevolent (4) opens once levels 1–3 are beaten; the Dominion (5) once 1–4 are.
   Defeats are tracked PER VARIANT — beating the Apprentice in Sorcery Chess does not mark
   it beaten in Classic, so each chess type's dread foes must be earned on their own board.
   They live on the user record as `beatenV` ({sorcery:[…],classic:[…]}).
   A legacy flat `beaten` array predates variants — it belonged to Sorcery, so it is read as
   (and migrated into) the sorcery bucket. The variant defaults to `pendingVariant` (the home
   dropdown choice the modes page is showing); markBeaten uses `VARIANT` (the game just won). */
function currentBeatenVariant(){ return (typeof pendingVariant!=='undefined' && pendingVariant) || 'sorcery'; }
function beatenFor(u,variant){
  if(!u) return [];
  if(u.beatenV && Array.isArray(u.beatenV[variant])) return u.beatenV[variant];
  if(variant==='sorcery' && Array.isArray(u.beaten)) return u.beaten; // legacy flat list = sorcery
  return [];
}
function beatenLevels(variant){
  variant=variant||currentBeatenVariant();
  let email=null; try{ email=localStorage.getItem(SESSION_KEY); }catch(e){}
  const u=email?getUsers()[email]:null;
  return beatenFor(u,variant);
}
function markBeaten(level){
  let email=null; try{ email=localStorage.getItem(SESSION_KEY); }catch(e){}
  if(!email) return;
  const users=getUsers(), u=users[email]; if(!u) return;
  const v=(typeof VARIANT!=='undefined' && VARIANT) || 'sorcery';
  u.beatenV=u.beatenV||{};
  // first write after the upgrade: fold any legacy flat list into Sorcery's bucket
  if(Array.isArray(u.beaten) && !Array.isArray(u.beatenV.sorcery)) u.beatenV.sorcery=[...u.beaten];
  const set=new Set(Array.isArray(u.beatenV[v])?u.beatenV[v]:[]);
  set.add(level); u.beatenV[v]=[...set];
  setUsers(users);
  updateModeLocks();
}
function isUnlocked(level,variant){
  if(level<=3) return true;
  const b=new Set(beatenLevels(variant));
  if(level===4) return [1,2,3].every(l=>b.has(l));      // Malevolent: beat the first three
  if(level===5) return [1,2,3,4].every(l=>b.has(l));    // Dominion: beat all four before it
  return true;
}
function lockReason(level){
  if(level===4) return '🔒 The Malevolent stays sealed until you defeat the Apprentice, the Sorcerer and the Archmage.';
  if(level===5) return '🔒 The Dominion stays sealed until you defeat all four lesser minds — Apprentice through the Malevolent.';
  return '';
}
function updateModeLocks(){
  const variant=currentBeatenVariant();            // defeats are per-variant — show this one's progress
  const beaten=new Set(beatenLevels(variant));
  document.querySelectorAll('[data-ai]').forEach(b=>{
    const lvl=+b.dataset.ai;
    if(!b.dataset.label) b.dataset.label=b.textContent; // remember the pristine label once
    const locked=!isUnlocked(lvl,variant);
    const won=beaten.has(lvl);
    b.classList.toggle('locked', locked);
    b.classList.toggle('beaten', !locked && won); // show conquered difficulties at a glance
    if(locked){
      b.innerHTML=b.dataset.label+'<span class="lockhint">🔒 '+(lvl===5?'Defeat all 4 earlier minds':'Defeat levels 1–3')+'</span>';
    } else if(won){
      b.innerHTML=b.dataset.label+'<span class="wonhint">✓ Defeated</span>';
    } else {
      b.innerHTML=b.dataset.label+'<span class="wonhint pending">⚔ Not yet defeated</span>';
    }
  });
}
function updateRankUI(){
  let email=null; try{ email=localStorage.getItem(SESSION_KEY); }catch(e){}
  const u=email?getUsers()[email]:null;
  if(!u) return;
  const pts=u.points||0, ri=rankOf(pts), r=RANKS[ri], next=RANKS[ri+1];
  document.getElementById('whoRank').textContent=r.name;
  document.getElementById('rcRank').textContent=r.name;
  // ranks count down from the bottom: a beginner is the lowest (Rank 17), the Monarch is Rank 1
  document.getElementById('rcTier').textContent='Rank '+(RANKS.length-ri)+' of '+RANKS.length;
  document.getElementById('rcPts').textContent=pts+' pts';
  const fill=document.getElementById('rcFill'), nxt=document.getElementById('rcNext');
  if(next){
    fill.style.width=Math.round((pts-r.at)/(next.at-r.at)*100)+'%';
    nxt.textContent=(next.at-pts)+' pts to '+next.name;
  } else {
    fill.style.width='100%';
    nxt.textContent='The highest rank in the realm';
  }
}


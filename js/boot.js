/* === Sorcery Chess · boot.js ===
   enterSite, auth-screen wiring, Lenis smooth-scroll setup, and the init() boot sequence. Loads last.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

// Own the scroll position ourselves: the browser's default 'auto' restoration re-scrolls a
// returning visitor to wherever they last were on reload, which lands a signed-in player
// mid-home instead of at the top. We always open views at the top via scrollTop(), so opt out.
try{ if('scrollRestoration' in history) history.scrollRestoration='manual'; }catch(e){}

function enterSite(user){
  try{ liErr.textContent=''; suErr.textContent=''; }catch(e){}
  const liP=document.getElementById('liPass'), suP=document.getElementById('suPass');
  if(liP) liP.value=''; if(suP) suP.value='';
  document.body.classList.add('authed');
  // Land on the home view FIRST, before anything else can fail. A cosmetic painter that
  // throws (e.g. a browser holding a stale cached index.html that is missing an element a
  // newer painter expects) must NEVER strand a signed-in player on a blank page with no
  // .page active — that was the "empty page on login" bug. Navigation is the one thing
  // that has to happen no matter what, so it goes first and is itself guarded.
  try{ showPage('home'); }catch(e){ console.error('enterSite: showPage failed', e); }
  // Per-account cosmetic painters, each isolated so one failure can't abort the rest
  // (or undo the navigation above): rank chip, career stats, dread-foe unlocks, avatar, champion.
  [updateRankUI, ()=>updateStatsUI(false), updateModeLocks, updateAvatarUI, updateChampion]
    .forEach(fn=>{ try{ fn(); }catch(e){ console.error('enterSite: paint step failed', e); } });
  // Always land at the very TOP of the home view — never mid-page. showPage already
  // scrolled to 0, but the home view only becomes tall once its .page is active and the
  // per-account painters above have filled it, and on a returning-visit reload the browser
  // may restore the previous scroll position AFTER this runs. scrollRestoration is forced
  // 'manual' (see below) and we re-assert the top once layout has settled (next frame),
  // resizing Lenis first so it measures the now-taller page.
  try{ scrollTop(); }catch(e){}
  requestAnimationFrame(()=>{ try{ if(lenis) lenis.resize(); scrollTop(); }catch(e){} });
  // restore an unfinished match quietly — the Play tab resumes it, clock paused until then
  try{
    if(!gameBooted && loadGame()){ gameBooted=true; render(); scheduleAI(); }
    else if(gameBooted) render(); // logging back in mid-session: just refresh the board
  }catch(e){ console.error('enterSite: game restore failed', e); }
}

/* auth card: tab switching + submit handlers */
const liErr=document.getElementById('liErr'), suErr=document.getElementById('suErr');
function authTab(login){
  document.getElementById('tabLogin').classList.toggle('on',login);
  document.getElementById('tabSignup').classList.toggle('on',!login);
  document.getElementById('loginForm').style.display=login?'':'none';
  document.getElementById('signupForm').style.display=login?'none':'';
  liErr.textContent=''; suErr.textContent='';
}
document.getElementById('tabLogin').addEventListener('click',()=>authTab(true));
document.getElementById('tabSignup').addEventListener('click',()=>authTab(false));

document.getElementById('signupForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const name=document.getElementById('suName').value.trim();
  const email=document.getElementById('suEmail').value.trim().toLowerCase();
  const pass=document.getElementById('suPass').value;
  if(!name){ suErr.textContent='Please enter a display name.'; return; }
  const users=getUsers();
  if(users[email]){ suErr.textContent='An account with this email already exists — log in instead.'; return; }
  users[email]={name, email, hash:await hashPass(pass), points:0,
    games:0, wins:0, losses:0, draws:0, streak:0, bestStreak:0, joined:Date.now(), lastPlayed:0};
  setUsers(users);
  try{ localStorage.setItem(SESSION_KEY,email); }catch(e2){}
  toast('Welcome to the arena, '+name+'!');
  enterSite(users[email]);
});

document.getElementById('loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const email=document.getElementById('liEmail').value.trim().toLowerCase();
  const pass=document.getElementById('liPass').value;
  const user=getUsers()[email];
  if(!user){ liErr.textContent='No account with this email — sign up first.'; return; }
  if(user.hash!==await hashPass(pass)){ liErr.textContent='Wrong password — try again.'; return; }
  try{ localStorage.setItem(SESSION_KEY,email); }catch(e2){}
  toast('Welcome back, '+user.name+'!');
  enterSite(user);
});

// Logging out is easy to hit by accident and drops the player back to the sign-in card,
// so confirm first via #logoutModal (which animates in like every other modal). The actual
// sign-out only runs once they confirm; "Stay a while" or a click-outside just closes it.
function performLogout(){
  try{ localStorage.removeItem(SESSION_KEY); }catch(e){}
  document.body.classList.remove('authed');
  clockPaused=true; // the saved game stays — it resumes on the next sign-in
  authTab(true);
}
document.getElementById('logoutBtn').addEventListener('click',()=>{
  document.getElementById('logoutModal').style.display='flex';
});
document.getElementById('logoutYes').addEventListener('click',()=>{
  document.getElementById('logoutModal').style.display='none';
  performLogout();
});
document.getElementById('logoutNo').addEventListener('click',()=>{
  document.getElementById('logoutModal').style.display='none';
});

/* The privacy "wipe account" button and the contact form now live on the standalone
   privacy.html / contact.html pages (MPA for SEO), each with its own self-contained
   inline script — so there is nothing to wire up here anymore. */

/* ---- Lenis smooth scrolling (lenis.dev) + the scroll timeline ----
   Lenis gives the whole page inertia-based smooth scrolling. We keep a single
   global instance (window.__lenis) and a scrollTop() helper that view-switches
   use to snap to the top. Everything no-ops gracefully if the CDN didn't load. */
let lenis=null;
let hallLenis=null; // a second Lenis driving the Hall of Ascension's own scroll, so it
                    // glides with the same inertia as the page rather than snapping natively
const subLenis=[];  // every *other* inner scroll surface (the game panel, any tall modal) gets
                    // its own Lenis too, so anything you scroll on the site glides identically
// one shared feel so the page, the hall and every inner surface scroll the same way
const LENIS_EASE=t=>Math.min(1,1.001-Math.pow(2,-10*t));
function scrollTop(){ // jump to the top of the page when switching views
  // never let a scroll hiccup abort the caller (showPage relies on this returning) —
  // the native scroll is the guaranteed fallback if Lenis isn't ready or throws
  try{ if(lenis){ lenis.scrollTo(0,{immediate:true}); return; } }catch(e){}
  window.scrollTo(0,0);
}
/* Smooth-scroll any overflow container. wrapper===content is fine for a plain scroll
   box; data-lenis-prevent stops the page Lenis from also consuming these wheel events.
   Lenis caches its scroll limit from the element's box, so we re-measure on TWO signals:
   a ResizeObserver (box size changed — e.g. a modal toggling display:none → shown) AND a
   MutationObserver (content changed). The second matters because a capped-height box
   (max-height + overflow:auto, like #panel) keeps the SAME box size when its content grows
   or collapses — toggling the piece guide is exactly this. Without it Lenis keeps the old
   limit and clamps scrolling short, stranding the lower controls off-screen. */
function attachLenis(el,opts){
  if(!window.Lenis || !el || el.dataset.lenisOn) return null;
  el.dataset.lenisOn='1';
  el.setAttribute('data-lenis-prevent','');
  const inst=new Lenis(Object.assign({wrapper:el, content:el, duration:1.0,
    easing:LENIS_EASE, smoothWheel:true, touchMultiplier:1.6}, opts||{}));
  subLenis.push(inst);
  let pending=false; // collapse a burst of mutations into one re-measure per frame
  const remeasure=()=>{ if(pending) return; pending=true;
    requestAnimationFrame(()=>{ pending=false; try{ inst.resize(); }catch(e){} }); };
  if('ResizeObserver' in window) new ResizeObserver(remeasure).observe(el);
  if('MutationObserver' in window) new MutationObserver(remeasure)
    .observe(el,{childList:true, subtree:true, attributes:true, attributeFilter:['style','class','hidden']});
  return inst;
}
// lazily attach Lenis to the hall's scroll container (the modal exists from page load)
function ensureHallLenis(){
  if(hallLenis || !window.Lenis) return;
  const wrap=document.getElementById('hallScroll');
  if(!wrap) return;
  hallLenis=new Lenis({ wrapper:wrap, content:document.getElementById('hallPath'),
    duration:1.0, easing:LENIS_EASE, smoothWheel:true, touchMultiplier:1.6 });
}
(function initScroll(){
  if(window.Lenis){
    lenis=new Lenis({ duration:1.1, easing:LENIS_EASE,
      smoothWheel:true, touchMultiplier:1.6 });
    window.__lenis=lenis;
    // one rAF loop drives the page, the hall, and every inner scroll surface
    function raf(time){
      lenis.raf(time);
      if(hallLenis) hallLenis.raf(time);
      for(const s of subLenis) s.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    lenis.on('scroll',updateTimeline);
    // give the game side panel and every tall modal box the same inertial glide
    attachLenis(document.getElementById('panel'));
    document.querySelectorAll('.modal .box').forEach(b=>attachLenis(b));
  }
  // reveal the timeline items as they enter the viewport
  const items=[...document.querySelectorAll('#timeline .tl-item')];
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver((ents)=>{
      ents.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    },{threshold:.35, rootMargin:'0px 0px -10% 0px'});
    items.forEach(it=>io.observe(it));
  } else { items.forEach(it=>it.classList.add('in')); }

  // grow the spine fill in step with how far the timeline has scrolled past center
  const track=document.getElementById('tlTrack'), fill=document.getElementById('tlFill');
  let ticking=false;
  window.__updateTimeline=function updateTimeline(){
    if(!track||!fill) return;
    if(ticking) return; ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      const r=track.getBoundingClientRect(), vh=window.innerHeight;
      // 0 when the track top reaches mid-screen, 1 when its bottom does
      const prog=Math.max(0,Math.min(1,(vh*0.5 - r.top)/r.height));
      fill.style.height=(prog*100).toFixed(2)+'%';
    });
  };
  window.addEventListener('scroll',window.__updateTimeline,{passive:true});
  window.addEventListener('resize',window.__updateTimeline);
  window.__updateTimeline();
})();
function updateTimeline(){ if(window.__updateTimeline) window.__updateTimeline(); }

/* ---- universal click ripple: a soft pulse from the pointer on every button press ----
   One delegated listener covers all current and future buttons. The styled span is
   appended to the button (which is position:relative; overflow:hidden) and self-removes. */
(function(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  document.addEventListener('pointerdown',e=>{
    const btn=e.target.closest('button');
    if(!btn || btn.disabled) return;
    const rect=btn.getBoundingClientRect();
    const size=Math.max(rect.width,rect.height)*2;
    const rip=document.createElement('span');
    rip.className='ripple';
    rip.style.width=rip.style.height=size+'px';
    rip.style.left=(e.clientX-rect.left-size/2)+'px';
    rip.style.top=(e.clientY-rect.top-size/2)+'px';
    // pale/transparent buttons need a bright ripple to be visible; solid white ones a dark one
    if(btn.classList.contains('ghost')||btn.classList.contains('dread')||btn.closest('.authtabs'))
      rip.classList.add('light');
    btn.appendChild(rip);
    rip.addEventListener('animationend',()=>rip.remove());
  },{passive:true});
})();

/* boot: restore the signed-in session, or ask the player to sign in */
(function(){
  let sess=null; try{ sess=localStorage.getItem(SESSION_KEY); }catch(e){}
  const user=sess?getUsers()[sess]:null;
  if(user) enterSite(user);
})();

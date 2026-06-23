/* === Sorcery Chess · smooth.js ===
   Lenis smooth-scroll for the standalone MPA pages (about / contact / privacy /
   terms / codex / leaderboard / points / profile / 404 / 500). The SPA shell
   wires Lenis up in boot.js (initScroll/attachLenis); these pages deliberately
   don't load that bundle, so this small self-contained file gives them the
   identical inertial glide:
     • one page-level Lenis driving the whole document scroll,
     • a sub-Lenis on every inner overflow box (anything carrying
       [data-lenis-prevent], e.g. the leaderboard player dossier), each with a
       ResizeObserver so a box that boots display:none still measures correctly
       the moment it's shown or its content grows,
     • a single shared rAF loop ticking them all, with the same LENIS_EASE the
       app uses so the feel matches the SPA exactly.
   Everything no-ops gracefully if the Lenis CDN failed to load — the browser's
   native scroll is the guaranteed fallback. Plain classic script. */
(function(){
  if(!window.Lenis) return;
  // shared feel — identical to boot.js's LENIS_EASE so every surface scrolls the same
  var EASE=function(t){ return Math.min(1,1.001-Math.pow(2,-10*t)); };
  var subs=[]; // inner scroll surfaces, each ticked from the one rAF loop below
  var page=new Lenis({ duration:1.1, easing:EASE, smoothWheel:true, touchMultiplier:1.6 });
  function raf(time){
    page.raf(time);
    for(var i=0;i<subs.length;i++) subs[i].raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  /* smooth-scroll any overflow container; data-lenis-prevent stops the page Lenis
     from also consuming its wheel events (the box may already carry it). */
  function attach(el){
    if(!el || el.dataset.lenisOn) return;
    el.dataset.lenisOn='1';
    el.setAttribute('data-lenis-prevent','');
    var inst=new Lenis({ wrapper:el, content:el, duration:1.0,
      easing:EASE, smoothWheel:true, touchMultiplier:1.6 });
    subs.push(inst);
    if('ResizeObserver' in window) new ResizeObserver(function(){ inst.resize(); }).observe(el);
  }
  document.querySelectorAll('[data-lenis-prevent]').forEach(attach);
  // expose the same hooks boot.js does, in case a page script wants to add a box later
  window.__lenis=page;
  window.__attachLenis=attach;
})();

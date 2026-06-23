/* === Sorcery Chess · standalone.js ===
   Tiny shared helper for the standalone MPA content pages (codex / points /
   leaderboard / profile). These pages deliberately do NOT load the heavy app
   bundle (ui.js / render.js / boot.js etc.), so this file supplies the few
   cross-cutting bits the reused feature modules still expect:
     • a minimal toast() — same global name profile.js calls on save/upload,
     • active-nav highlighting for the standalone .site-nav.
   The colour theme is applied by the inline bootstrap script in each page's <head>
   (copied from about.html), so it is not handled here. Plain classic script. */

/* highlight the current page's link in the standalone nav */
(function(){
  var here=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  document.querySelectorAll('.site-nav a.nav-l').forEach(function(a){
    var href=(a.getAttribute('href')||'').split('/').pop().toLowerCase();
    if(href && href===here) a.setAttribute('aria-current','page');
  });
})();

/* generic modal close: clicking the dark backdrop (the .modal itself, not its .box)
   dismisses it — the standalone twin of ui.js's click-outside handler, so the
   leaderboard player dossier closes the same way it does in the app. */
document.addEventListener('click',function(e){
  if(e.target.classList && e.target.classList.contains('modal')) e.target.style.display='none';
});

/* transient floating notice that fades on its own — mirrors ui.js's toast so the
   reused modules' toast() calls resolve without dragging in the whole ui.js. The
   #toast element + its styling come from components.css; create one if absent. */
var toastTimer=null;
function toast(msg){
  var el=document.getElementById('toast');
  if(!el){ el=document.createElement('div'); el.id='toast'; document.body.appendChild(el); }
  el.textContent=msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ el.classList.remove('show'); },2600);
}

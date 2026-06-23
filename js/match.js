/* === Sorcery Chess · match.js ===
   startMatch / beginMatch — kick off a friend or AI game.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* mode select: vs computer (3 levels), local friend, online (needs a server) */
let pendingMatch=null;
function startMatch(vs,level){
  if(gameBooted && !gameOver && lastMove.length){ // a live game would be abandoned — confirm
    pendingMatch={vs,level};
    document.getElementById('newGameModal').style.display='flex';
    return;
  }
  beginMatch(vs,level);
}
function beginMatch(vs,level){
  VARIANT=pendingVariant; // commit the home-screen variant choice to this match
  gameMode=vs;
  if(level) aiLevel=level;
  if(vs==='ai' && aiLevel>=4) useTimer=true; // the Malevolent & the Dominion are always timed
  gameBooted=true;
  showPage('play'); // before newGame() so the board intro plays in view
  newGame();
}


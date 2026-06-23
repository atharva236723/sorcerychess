/* === Sorcery Chess · persistence.js ===
   saveGame / clearSave / loadGame — survive a page refresh via localStorage.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ---------- persistence: survive a page refresh ---------- */
const SAVE_KEY='sorceryChessSave';
function saveGame(){
  if(gameMode==='online') return; // a peer-to-peer match can't be resumed from disk — never persist it
  try{
    localStorage.setItem(SAVE_KEY,JSON.stringify({board,turn,graveyard,checkState,lastMove,clocks,vs:gameMode,ai:aiLevel,timer:useTimer,variant:VARIANT,eliminated}));
  }catch(e){}
}
function clearSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
}
function loadGame(){
  try{
    const d=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!d) return false;
    // restore the variant (and its board size) BEFORE validating — an 8×8 classic save
    // must be checked against N=8, not the default 12
    VARIANT=(d.variant&&VARIANTS[d.variant])?d.variant:'sorcery';
    N=variantCfg().size||12;
    PLAYER_COLORS=['white','black'];
    if(!Array.isArray(d.board)||d.board.length!==N||!d.graveyard) return false;
    board=d.board; turn=PLAYER_COLORS.includes(d.turn)?d.turn:'white';
    graveyard=d.graveyard; PLAYER_COLORS.forEach(c=>{ if(!graveyard[c]) graveyard[c]=[]; });
    eliminated=d.eliminated||{};
    checkState=d.checkState||null; lastMove=d.lastMove||[];
    gameMode=d.vs==='ai'?'ai':'friend';
    aiLevel=[1,2,3,4,5].includes(d.ai)?d.ai:2;
    // dread opponents are always timed; otherwise honour the saved choice (old saves default to timed)
    useTimer=(gameMode==='ai'&&aiLevel>=4) ? true : (d.timer!==false);
    const ck=d.clocks, ckOk=ck&&PLAYER_COLORS.every(c=>typeof ck[c]==='number'&&ck[c]>0);
    clocks=ckOk?ck:Object.fromEntries(PLAYER_COLORS.map(c=>[c,clockStartFor()]));
    selected=null; mode='move'; gameOver=false;
    pendingAnims=[]; pendingFlights=[];
    document.getElementById('overlay').style.display='none';
    return true;
  }catch(e){ return false; }
}


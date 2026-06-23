/* === Sorcery Chess · online.js ===
   PeerJS peer-to-peer online play plus the online and timer-choice modals.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

/* ====================================================================
   ONLINE PLAY (PeerJS, peer-to-peer WebRTC)
   One player hosts a short room code (used as the PeerJS id); the other
   joins it. Once the data channel opens both sides run the same
   deterministic newGame(), so their boards start identical, and every
   action travels through netSend → the opponent's netHandle, which
   replays it through the very same doMove / doAbility / doRevive entry
   points a local player uses. Online duels are clockless and unranked.
   ==================================================================== */
const PEER_PREFIX='sorcery-chess-12-'; // namespaces our ids on the public PeerJS broker
// STUN finds each peer's public address; the free TURN relays cover strict NATs/firewalls
const RTC_CONFIG={iceServers:[
  {urls:'stun:stun.l.google.com:19302'},
  {urls:'stun:stun1.l.google.com:19302'},
  {urls:'turn:openrelay.metered.ca:80', username:'openrelayproject', credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443', username:'openrelayproject', credential:'openrelayproject'},
  {urls:'turn:openrelay.metered.ca:443?transport=tcp', username:'openrelayproject', credential:'openrelayproject'}
]};
function genCode(){ // 5 chars, no ambiguous 0/O/1/I
  const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s='';
  for(let i=0;i<5;i++) s+=A[(Math.random()*A.length)|0];
  return s;
}
function netSend(obj){ try{ if(net&&net.conn&&net.conn.open) net.conn.send(obj); }catch(e){} }
function netTeardown(){
  if(!net) return;
  try{ if(net.conn) net.conn.close(); }catch(e){}
  try{ if(net.peer) net.peer.destroy(); }catch(e){}
  net=null;
}
// replay an opponent's action through the same code paths a local move uses
function netHandle(d){
  if(!d || gameMode!=='online') return;
  if(d.kind==='hello'){ // the host announces the chosen variant; the joiner builds the matching board
    VARIANT=(d.variant&&VARIANTS[d.variant])?d.variant:'sorcery';
    newGame(); return;
  }
  if(d.kind==='rematch'){ newGame(); return; }
  if(gameOver) return;
  applyingRemote=true;
  try{
    if(d.kind==='move') doMove(d.fr,d.fc,d.tr,d.tc);
    else if(d.kind==='ability') doAbility(d.ar,d.ac,d.tr,d.tc);
    else if(d.kind==='revive'){ selected={r:d.r,c:d.c}; mode='revive'; doRevive(d.idx); }
  } finally { applyingRemote=false; }
}
function wireConn(conn){
  conn.on('data',netHandle);
  conn.on('close',onPeerLost);
  conn.on('error',()=>onPeerLost());
}
function onPeerLost(){
  if(gameMode==='online' && gameBooted && !gameOver){
    toast('Your opponent vanished from the realm.');
    showEnd('Opponent disconnected — you win!',myColor);
  }
}
function beginOnline(host){
  myColor = host ? 'white' : 'black';
  gameMode='online';
  useTimer=false;            // online duels run without a clock to avoid network drift
  gameBooted=true;
  document.getElementById('onlineModal').style.display='none';
  resetOnlineModal();
  toast(host ? 'Challenger connected — you command White.' : 'Connected — you command Black.');
  showPage('play'); // before newGame() so the intro plays in view
  if(host){
    VARIANT=pendingVariant;            // the host's variant choice rules the duel
    netSend({kind:'hello',variant:VARIANT}); // tell the joiner which board to build
    newGame();
  }
  // the joiner waits for the host's hello (netHandle) before building the board, so both match
}
function rematch(){ // the win overlay's "Play again"
  if(gameMode==='online'){
    if(net&&net.conn&&net.conn.open){ netSend({kind:'rematch'}); newGame(); }
    else { toast('Your opponent has left — returning home.'); exitGame(); }
    return;
  }
  newGame();
}
function hostStart(){
  if(!window.Peer){ olStatus('olHostStatus','Online failed to load — check your connection.','err'); return; }
  netTeardown();
  const code=genCode();
  showHostView(code);
  const peer=new Peer(PEER_PREFIX+code,{config:RTC_CONFIG});
  net={peer,conn:null,host:true};
  peer.on('connection',conn=>{
    if(net.conn){ try{conn.close();}catch(e){} return; } // one challenger only
    net.conn=conn; wireConn(conn);
    conn.on('open',()=>beginOnline(true));
  });
  peer.on('error',err=>{
    const t=err&&err.type;
    if(t==='unavailable-id'){ try{peer.destroy();}catch(e){} net=null; hostStart(); return; } // code clash → retry
    olStatus('olHostStatus','Connection error ('+(t||'unknown')+'). Try again.','err');
  });
}
function joinStart(code){
  if(!window.Peer){ olStatus('olJoinStatus','Online failed to load — check your connection.','err'); return; }
  if(!code){ olStatus('olJoinStatus','Enter a room code first.','err'); return; }
  netTeardown();
  showJoinConnecting();
  const peer=new Peer({config:RTC_CONFIG});
  net={peer,conn:null,host:false};
  peer.on('open',()=>{
    const conn=peer.connect(PEER_PREFIX+code,{reliable:true});
    net.conn=conn; wireConn(conn);
    conn.on('open',()=>beginOnline(false));
  });
  peer.on('error',err=>{
    const t=err&&err.type;
    olStatus('olJoinStatus', t==='peer-unavailable' ? 'No room found with that code.' : 'Connection error ('+(t||'unknown')+').','err');
  });
}
// ---- online modal: view switching + status helpers ----
function olShow(id){ ['olChoose','olHost','olJoin'].forEach(s=>document.getElementById(s).style.display=(s===id?'':'none')); }
function olStatus(id,msg,kind){
  const s=document.getElementById(id);
  s.style.display='flex'; s.className='olstatus'+(kind?' '+kind:'');
  s.innerHTML='<span class="oldot"></span>'+msg;
}
function resetOnlineModal(){
  olShow('olChoose');
  document.getElementById('olJoinStatus').style.display='none';
  document.getElementById('olJoinCode').value='';
}
function showHostView(code){
  document.getElementById('olCode').textContent=code;
  olStatus('olHostStatus','Waiting for a challenger…');
  olShow('olHost');
}
function showJoinConnecting(){ olStatus('olJoinStatus','Connecting…'); }
function openOnline(){
  if(!window.Peer){ toast('Online play failed to load — check your connection.'); return; }
  resetOnlineModal();
  document.getElementById('onlineModal').style.display='flex';
}
document.getElementById('modeOnlineBtn').addEventListener('click',openOnline);
document.getElementById('onlineClose').addEventListener('click',()=>{
  document.getElementById('onlineModal').style.display='none';
  if(gameMode!=='online'||!gameBooted) netTeardown(); // don't kill a live match's link
});
document.getElementById('olCreateBtn').addEventListener('click',hostStart);
document.getElementById('olJoinView').addEventListener('click',()=>olShow('olJoin'));
document.getElementById('olHostBack').addEventListener('click',()=>{ netTeardown(); resetOnlineModal(); });
document.getElementById('olJoinBack').addEventListener('click',()=>{ netTeardown(); resetOnlineModal(); });
document.getElementById('olConnect').addEventListener('click',()=>
  joinStart(document.getElementById('olJoinCode').value.trim().toUpperCase()));
document.getElementById('olJoinCode').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('olConnect').click(); });
document.getElementById('olCopy').addEventListener('click',()=>{
  const code=document.getElementById('olCode').textContent;
  try{ navigator.clipboard&&navigator.clipboard.writeText(code); }catch(e){}
  toast('Room code copied: '+code);
});
// resume a saved game in progress, otherwise go pick an opponent (the navbar Play link is gone)
document.getElementById('playNowBtn').addEventListener('click',()=>
  showPage(gameBooted && !gameOver ? 'play' : 'modes'));
document.getElementById('modeFriendBtn').addEventListener('click',()=>askTimer('friend',null));

/* ---------- timer choice: every ordinary match asks timed vs clockless first ----------
   (the two dread AIs skip this — they are always timed and route straight through.) */
let pendingTimer=null; // {vs,level} held while the timer modal is open
function askTimer(vs,level){
  pendingTimer={vs,level};
  document.getElementById('timerTitle').textContent =
    vs==='ai' ? '⏱ Clock for '+AI_NAMES[level] : '⏱ Choose your clock';
  document.getElementById('timerModal').style.display='flex';
}
function chooseTimer(on){
  document.getElementById('timerModal').style.display='none';
  if(!pendingTimer) return;
  const {vs,level}=pendingTimer; pendingTimer=null;
  useTimer=on;
  startMatch(vs,level);
}
document.getElementById('timerOn').addEventListener('click',()=>chooseTimer(true));
document.getElementById('timerOff').addEventListener('click',()=>chooseTimer(false));

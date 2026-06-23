/* === Sorcery Chess · state.js ===
   Board dimensions, glyphs, piece tables, clock/AI constants, and all global mutable game state.
   Auto-split from the original single-file index.html. Plain (non-module) script:
   every file shares one global scope, so the <script> load order is fixed — do not reorder. */

let N = 12; // board side length — set per game variant by newGame()/loadGame() (was a 12-only const)
const GLYPH = {
  king:{white:'♔',black:'♚'}, queen:{white:'♕',black:'♛'},
  rook:{white:'♖',black:'♜'}, bishop:{white:'♗',black:'♝'},
  knight:{white:'♘',black:'♞'}, pawn:{white:'♙',black:'♟'},
  wizard:{white:'✶',black:'✶'}, alchemist:{white:'⚗',black:'⚗'},
  witch:{white:'⚚',black:'⚚'}, freezer:{white:'❅',black:'❅'}
};
const NAME = {king:'King',queen:'Queen',rook:'Rook',bishop:'Bishop',knight:'Knight',pawn:'Pawn',
  wizard:'Wizard',alchemist:'Alchemist',witch:'Witch',freezer:'Freezer'};
const SPECIAL = new Set(['wizard','alchemist','witch','freezer']);
const BACK_RANK = ['rook','knight','freezer','bishop','wizard','queen','king','witch','bishop','alchemist','knight','rook'];
const CLASSIC_BACK = ['rook','knight','bishop','queen','king','bishop','knight','rook'];

/* ---- game variants ----
   The site offers three kinds of chess. Each one declares its board size, back-rank
   layout, player count and which battle types it supports. `VARIANT` is the variant of
   the CURRENT/last match (committed in beginMatch/beginOnline, restored by loadGame);
   `pendingVariant` is the home-screen dropdown choice for the NEXT match. Keeping them
   separate means changing the dropdown never corrupts a live game's saved board. */
const VARIANTS = {
  sorcery:{ id:'sorcery', name:'Sorcery Chess', glyph:'✶', size:12, back:BACK_RANK,
    players:2, battles:['ai','friend','online'], tagline:'12×12 · four spellcasters',
    blurb:'The full classical army plus Wizard, Alchemist, Witch and Freezer on a 12×12 board — poison, frost, alchemy and resurrection.' },
  classic:{ id:'classic', name:'Classic Chess', glyph:'♚', size:8, back:CLASSIC_BACK,
    players:2, battles:['ai','friend','online'], tagline:'8×8 · the timeless game',
    blurb:'Pure traditional chess on the classic 8×8 board — no magic, no spellcasters, just the oldest duel in the world.' }
};
let VARIANT='sorcery';        // the variant of the current/last game
let pendingVariant='sorcery'; // the home dropdown choice for the next match
function variantCfg(){ return VARIANTS[VARIANT] || VARIANTS.sorcery; }
// the active players this game, in turn order. Set by newGame()/loadGame(); the engine
// rotates turns and tallies graveyards/clocks over it.
let PLAYER_COLORS=['white','black'];
let eliminated={};            // color -> true once its king has fallen
// id maps so the engine can address each graveyard / clock without hardcoding white|black
const GRAVE_ID={white:'graveWhite',black:'graveBlack'};
const GCOUNT_ID={white:'gcWhite',black:'gcBlack'};
const TIMER_ID={white:'timerWhite',black:'timerBlack'};
const FREEZE_COOLDOWN = 3;
const FREEZE_DURATION = 3; // a frozen piece thaws after this many of its owner's moves
const WIZARD_COOLDOWN = 3; // ticks once on the casting turn → poison again after 2 own moves
// specials whose blue-glowing targets are clicked directly on the board
const DIRECT_ABILITY = new Set(['wizard','freezer','alchemist']);

let board, turn, selected, mode, graveyard, gameOver;
let lastMove=[]; // squares touched by the previous action, highlighted on the board
const CLOCK_START=300, CLOCK_INCREMENT=2; // 5 minutes each, +2s per move played
const DREAD_CLOCK=180; // the Malevolent (4) & the Dominion (5) get a tighter 3-minute clock
// the clock each side starts a fresh match with — shortened for the two dread opponents
const clockStartFor=()=>(gameMode==='ai' && aiLevel>=4) ? DREAD_CLOCK : CLOCK_START;
let clocks={white:CLOCK_START, black:CLOCK_START};
let pendingAnims = []; // applied on next render: {type:'slide',r,c,dx,dy in cell units,magic} or {type:'spawn',r,c}
const INTRO_MS = 950;     // board drop + cell fade finish before the first piece appears
let introPending = false; // one-shot: the render right after newGame() plays the board intro
let gameMode = 'friend';  // 'friend' (two players, one device), 'ai' (computer plays black), or 'online'
let aiLevel = 2;          // 1 Apprentice, 2 Sorcerer, 3 Archmage
// ---- online play (PeerJS) ----
let net=null;             // {peer, conn, host} while an online match is connected
let myColor='white';      // which side this browser controls when gameMode==='online'
let applyingRemote=false; // true while replaying an opponent's action, so we don't echo it back
let useTimer = true;      // false = relaxed, clockless match; always true vs the two dread AIs
let pendingFlights = []; // ghost pieces flying board<->graveyard: {glyph,color,special,from:rect,to:{type:'grave',color,idx}|{type:'cell',r,c}}


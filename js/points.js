/* === Sorcery Chess · points.js ===
   The "Points & Ranks" explainer page (#page-points): how rating is earned, scaled per
   variant, drained beyond the Arcanum, and how it climbs the 17-rank ladder — plus a live
   panel reflecting the signed-in player's own standing in the variant they've chosen.
   Plain (non-module) script sharing one global scope — load order fixed, before boot.js.
   Pulls every figure through winPoints/friendPoints/lossPenalty (account.js) so the page
   can never drift out of sync with what the game actually awards. */

// the five computer difficulties, with the same glyphs the modes page uses
const PTS_DIFFS=[
  {lvl:1, glyph:'🜁', name:'Apprentice'},
  {lvl:2, glyph:'🜂', name:'Sorcerer'},
  {lvl:3, glyph:'🜃', name:'Archmage'},
  {lvl:4, glyph:'☠', name:'The Malevolent', dread:true},
  {lvl:5, glyph:'♚', name:'The Dominion',   dread:true}
];
// Classic first (the baseline), then Sorcery — cheapest stakes to steepest
const PTS_VARIANT_ORDER=['classic','sorcery'];

function ptsMultLabel(mult){ return '×'+(Number.isInteger(mult)?mult:mult.toFixed(1)); }

// one variant "stakes card": its multiplier, win table by difficulty, and the friend/loss/online lines
function ptsVariantCard(id){
  const cfg=VARIANTS[id]; if(!cfg) return '';
  const rows=PTS_DIFFS.map(d=>
    '<tr'+(d.dread?' class="dread"':'')+'><td class="d-foe"><span class="d-g">'+d.glyph+'</span>'+d.name+'</td>'
    +'<td class="d-pts">+'+winPoints(d.lvl,id)+'</td></tr>').join('');
  return '<div class="ptsv'+(cfg.soon?' soon':'')+'" data-variant="'+id+'">'
    + '<div class="ptsv-head"><span class="ptsv-glyph">'+cfg.glyph+'</span>'
    +   '<div class="ptsv-id"><b>'+cfg.name+'</b><small>'+cfg.tagline+'</small></div>'
    +   '<span class="ptsv-mult" title="rating multiplier for this chess type">'+ptsMultLabel(variantMult(id))+'</span></div>'
    + (cfg.soon?'<div class="ptsv-soon">⏳ Coming soon — these stakes await its arrival.</div>':'')
    + '<table class="ptsv-tbl"><thead><tr><th>Defeat the computer…</th><th>Earn</th></tr></thead><tbody>'+rows+'</tbody></table>'
    + '<div class="ptsv-foot">'
    +   '<div class="pf-row"><span>⚔ Local match win</span><b class="up">+'+friendPoints(id)+'</b></div>'
    +   '<div class="pf-row"><span>☠ Loss beyond the Arcanum</span><b class="down">−'+lossPenalty(id)+'</b></div>'
    + '</div></div>';
}

// the live "your standing" banner — what the signed-in player would earn/lose right now
function ptsYouHtml(){
  const c=curUser();
  const v=(typeof pendingVariant!=='undefined' && pendingVariant) || 'sorcery';
  const vcfg=VARIANTS[v]||VARIANTS.sorcery;
  if(!c) return '<div class="py-rank"><b>Sign in to track your renown.</b>'
    +'<span class="py-pts">Your rank, your stakes and your conquests appear here.</span></div>';
  const pts=c.user.points||0, ri=rankOf(pts), r=RANKS[ri], next=RANKS[ri+1];
  const peril=ri>ARCANUM_TOP;
  const beaten=new Set(beatenFor(c.user,v));
  const conquered=[1,2,3,4,5].filter(l=>beaten.has(l)).length;
  return '<div class="py-rank"><span class="py-k">You stand at</span>'
    +'<b>'+escapeHtml(r.name)+'</b><span class="py-pts">'+pts+' rating points · '+vcfg.glyph+' '+vcfg.name+'</span></div>'
    +'<div class="py-grid">'
    +  '<div class="py-cell"><span class="py-lab">A win vs the Sorcerer pays</span><b class="up">+'+winPoints(2,v)+'</b></div>'
    +  '<div class="py-cell"><span class="py-lab">A loss right now costs</span><b class="'+(peril?'down':'safe')+'">'+(peril?'−'+lossPenalty(v):'nothing yet')+'</b></div>'
    +  '<div class="py-cell"><span class="py-lab">'+vcfg.name+' foes cleared</span><b>'+conquered+'<small>/5</small></b></div>'
    +'</div>'
    +(next
      ? '<div class="py-next"><span class="py-bar"><span style="width:'+Math.round((pts-r.at)/(next.at-r.at)*100)+'%"></span></span>'
        +'<b>'+(next.at-pts)+'</b> points to '+escapeHtml(next.name)+'</div>'
      : '<div class="py-next">👑 You hold the highest throne in the realm.</div>');
}

// the full 17-rung ladder, Monarch at the top, the player's current rung lit
function ptsLadderHtml(){
  const c=curUser(); const pts=c?(c.user.points||0):0; const here=rankOf(pts);
  return RANKS.map((r,i)=>{
    const cls=i===here?' now':(i<here?' done':'');
    return '<div class="rung'+cls+'"><span class="rung-n">'+(RANKS.length-i)+'</span>'
      +'<span class="rung-name">'+escapeHtml(r.name)+'</span>'
      +'<span class="rung-at">'+(i?r.at+' pts':'start')+'</span></div>';
  }).reverse().join('');
}

// paint the whole page — called by showPage('points')
function renderPoints(){
  const vc=document.getElementById('ptsVariants');
  if(vc) vc.innerHTML=PTS_VARIANT_ORDER.map(ptsVariantCard).join('');
  const you=document.getElementById('ptsYou');
  if(you) you.innerHTML=ptsYouHtml();
  const lad=document.getElementById('ptsLadder');
  if(lad) lad.innerHTML=ptsLadderHtml();
}

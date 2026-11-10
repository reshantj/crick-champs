(()=>{
const URL='https://bgafsvpgijqywjoiersq.supabase.co',KEY='sb_publishable_k4ZsbNa5sBBFHHN3Q1QZDw_pgjdlj4x',db=window.supabase.createClient(URL,KEY),$=s=>document.querySelector(s);
let match=null,deliveries=[],sessionUser=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const msg=t=>$('#scoreMsg').textContent=t;
async function requireUser(){const {data:{session}}=await db.auth.getSession();if(!session){location.href='../?login=1';return false}sessionUser=session.user;return true}
async function loadSavedMatches(){if(!sessionUser)return;const r=await db.from('cc_live_matches').select('id,match_title,team_a,team_b,runs,wickets,legal_balls,status,updated_at').eq('owner_id',sessionUser.id).order('updated_at',{ascending:false}).limit(50);if(r.error){$('#savedMatches').textContent='Saved matches could not load: '+r.error.message;return}$('#savedMatches').innerHTML=(r.data||[]).map(m=>`<div class="feedrow"><span><b>${esc(m.match_title)}</b> · ${esc(m.team_a)} vs ${esc(m.team_b)} · ${m.runs}/${m.wickets} (${Math.floor(m.legal_balls/6)}.${m.legal_balls%6}) · ${esc(m.status)}</span><button data-resume="${esc(m.id)}">Open match</button></div>`).join('')||'<p>No saved matches yet.</p>'}
let teams=[],players=[],tournaments=[];
async function loadMatchSetup(){
 const [tr,pr,tor]=await Promise.all([
  db.from('cc_teams').select('id,name').eq('owner_id',sessionUser.id).order('name'),
  db.from('cc_players').select('id,display_name,team_id').eq('created_by',sessionUser.id).order('display_name'),
  db.from('cc_tournaments').select('id,name').eq('organizer_id',sessionUser.id).order('name')
 ]);
 if(tr.error||pr.error||tor.error){$('#createMsg').textContent='Could not load saved teams/players/tournaments: '+[tr.error,pr.error,tor.error].filter(Boolean).map(x=>x.message).join(' · ');return}
 teams=tr.data||[];players=pr.data||[];tournaments=tor.data||[];
 $('#teamA').innerHTML='<option value="">Select Team A</option>'+teams.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
 $('#teamB').innerHTML='<option value="">Select Team B</option>'+teams.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
 $('#tournament').innerHTML='<option value="">Friendly / No tournament</option>'+tournaments.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
 refreshPlayerOptions();
}
function refreshPlayerOptions(){
 const ids=[$('#teamA').value,$('#teamB').value].filter(Boolean);
 const roster=players.filter(p=>!p.team_id||ids.includes(p.team_id));
 const opts='<option value="">Select player</option>'+roster.map(p=>`<option value="${esc(p.display_name)}" data-team="${esc(p.team_id||'')}">${esc(p.display_name)}</option>`).join('');
 ['striker','nonStriker','bowler'].forEach(id=>{const old=$('#'+id).value;$('#'+id).innerHTML=opts;if(old)$('#'+id).value=old});
}
$('#teamA').addEventListener('change',refreshPlayerOptions);$('#teamB').addEventListener('change',refreshPlayerOptions);
async function create(e){e.preventDefault();let ta=teams.find(x=>x.id===$('#teamA').value),tb=teams.find(x=>x.id===$('#teamB').value),A=ta?.name||'',B=tb?.name||'',bat=$('#batting').value==='A'?A:B,bowl=$('#batting').value==='A'?B:A;if(!ta||!tb||ta.id===tb.id){$('#createMsg').textContent='Select two different saved teams.';return}let selectedTournament=$('#tournament').value||null;let payload={owner_id:sessionUser.id,match_title:$('#title').value.trim(),team_a:A,team_b:B,batting_team:bat,bowling_team:bowl,striker:$('#striker').value.trim(),non_striker:$('#nonStriker').value.trim(),bowler:$('#bowler').value.trim(),initial_striker:$('#striker').value.trim(),initial_non_striker:$('#nonStriker').value.trim(),initial_bowler:$('#bowler').value.trim(),is_public:$('#public').checked,team_a_id:ta.id,team_b_id:tb.id,tournament_id:selectedTournament};let r=await db.from('cc_live_matches').insert(payload).select().single();if(r.error){$('#createMsg').textContent='Could not create match: '+r.error.message;return}match=r.data;await loadMatch();$('#create').hidden=true;$('#saved').hidden=true;$('#score').hidden=false;history.replaceState(null,'',`?id=${match.id}`);await loadSavedMatches()}
function render(){let legal=match.legal_balls||0;$('#scoreValue').textContent=`${match.runs}/${match.wickets}`;$('#overs').textContent=`${Math.floor(legal/6)}.${legal%6} overs`;$('#sName').value=match.striker;$('#nsName').value=match.non_striker;$('#bName').value=match.bowler;$('#onStrike').textContent=match.striker;$('#lastBall').textContent=match.last_event||'Match started';$('#matchTitle').textContent=match.match_title;$('#teamsLine').textContent=`${match.batting_team} batting · ${match.bowling_team} bowling · Innings ${match.innings} · ${match.status}`;$('#watchLink').href=`../watch/?id=${match.id}`;$('#watchLink').textContent=location.origin+location.pathname.replace(/scorer\/?$/,'watch/')+`?id=${match.id}`;$('#feed').innerHTML=deliveries.slice().reverse().map(d=>`<div class="feedrow"><span>${d.over_number}.${d.ball_in_over} · ${esc(d.striker)} vs ${esc(d.bowler)}</span><b>${esc(d.commentary||d.total_runs+' runs')}</b></div>`).join('')||'<p>No balls recorded yet.</p>';$('#finishMatch').disabled=match.status==='completed';}
async function loadMatch(id){const m=await db.from('cc_live_matches').select('*').eq('id',id).eq('owner_id',sessionUser.id).single();if(m.error)throw m.error;match=m.data;const d=await db.from('cc_live_deliveries').select('*').eq('match_id',match.id).order('sequence_no');if(d.error)throw d.error;deliveries=d.data||[];$('#create').hidden=true;$('#saved').hidden=true;$('#score').hidden=false;render()}
function swap(){const x=match.striker;match.striker=match.non_striker;match.non_striker=x}
// Crick Champs custom rotation: 1 and 3 completed runs swap; 2, 4, 5 and 6 do not.
// End-of-over rotation is applied separately after the sixth legal ball.
function rotateForCompletedRuns(n){
  // Custom Crick Champs rule: simulate completed runs for 1, 2 and 3.
  // Two changes return to the original ends. 4, 5 and 6 do not rotate.
  if(n===1||n===2||n===3){for(let i=0;i<n;i++)swap()}
}
async function ball(kind,runs=0){if(!match||match.status==='completed'){msg('This match is completed.');return}const before={...match};const striker=$('#sName').value.trim()||match.striker,nonStriker=$('#nsName').value.trim()||match.non_striker,bowler=$('#bName').value.trim()||match.bowler;match.striker=striker;match.non_striker=nonStriker;match.bowler=bowler;
let bat=0,extra=0,total=0,legal=true,wicket=false,label='',completed=0;
if(kind==='dot')label='0';
if(kind==='runs'){bat=runs;total=runs;completed=runs;label=String(runs)}
if(kind==='four'){bat=4;total=4;label='4'}
if(kind==='six'){bat=6;total=6;label='6'}
if(kind==='wide'){extra=Math.max(1,runs);total=extra;legal=false;completed=Math.max(0,extra-1);label=`Wd ${extra}`}
if(kind==='no_ball'){extra=1;bat=0;total=extra;legal=false;label='NB 1';}
if(kind==='bye'||kind==='leg_bye'){completed=Math.max(1,runs);extra=completed;total=extra;label=(kind==='bye'?'B ':'Lb ')+completed}
if(kind==='wicket'){wicket=true;label='W'}
match.runs=(match.runs||0)+total;match.extras=(match.extras||0)+extra;if(legal)match.legal_balls=(match.legal_balls||0)+1;if(wicket)match.wickets=(match.wickets||0)+1;
rotateForCompletedRuns(completed);if(legal&&match.legal_balls%6===0)swap();
let dismissedName=null,incomingName=null;
if(wicket){
  dismissedName=$('#dismissedBatter').value==='non_striker'?nonStriker:striker;
  incomingName=$('#nextBatter').value.trim();
  if(!incomingName){match=before;msg('Enter the incoming batter before recording a wicket.');return;}
  if(incomingName===striker||incomingName===nonStriker){match=before;msg('Incoming batter must be different from the current batters.');return;}
  if(match.striker===dismissedName)match.striker=incomingName;
  else if(match.non_striker===dismissedName)match.non_striker=incomingName;
  else{match=before;msg('Dismissed batter could not be identified.');return;}
}
match.last_event=label;match.updated_at=new Date().toISOString();
const seq=deliveries.length+1,ov=Math.floor(before.legal_balls/6),ballNo=(before.legal_balls%6)+1;
const ins=await db.from('cc_live_deliveries').insert({match_id:match.id,sequence_no:seq,over_number:ov,ball_in_over:ballNo,event_type:kind,innings_no:before.innings,bat_runs:bat,extra_runs:extra,total_runs:total,wicket,dismissed_batter:dismissedName,incoming_batter:incomingName,striker:striker,non_striker:nonStriker,bowler:bowler,commentary:label,state_after:{striker:match.striker,non_striker:match.non_striker,bowler:match.bowler,innings:match.innings}});
if(ins.error){match=before;msg('Ball not saved: '+ins.error.message);return}
const up=await db.from('cc_live_matches').update({runs:match.runs,wickets:match.wickets,legal_balls:match.legal_balls,extras:match.extras,striker:match.striker,non_striker:match.non_striker,bowler:match.bowler,last_event:label,updated_at:match.updated_at}).eq('id',match.id).eq('owner_id',sessionUser.id);
if(up.error){msg('Delivery saved, but match summary update failed: '+up.error.message+'. Refresh and inspect the saved delivery.');return}
$('#nextBatter').value='';await loadMatch(match.id);msg('Ball saved permanently to Supabase.')}
async function endInnings(){if(!match)return;const next=match.innings+1;if(next>4){await finishMatch();return}const batting=match.bowling_team,bowling=match.batting_team;const r=await db.from('cc_live_matches').update({innings:next,batting_team:batting,bowling_team:bowling,runs:0,wickets:0,legal_balls:0,extras:0,status:'live',last_event:'New innings'}).eq('id',match.id).eq('owner_id',sessionUser.id);if(r.error){msg(r.error.message);return}await loadMatch(match.id);msg('New innings saved.')}
async function finishMatch(){if(!match)return;if(!confirm('Mark this match as completed? Its score and deliveries will remain saved.'))return;const r=await db.from('cc_live_matches').update({status:'completed',last_event:'Match completed',updated_at:new Date().toISOString()}).eq('id',match.id).eq('owner_id',sessionUser.id);if(r.error){msg(r.error.message);return}await loadMatch(match.id);await loadSavedMatches();await loadMatchSetup();msg('Match completed and retained in Supabase.')}
async function undo(){if(!deliveries.length)return;const last=deliveries[deliveries.length-1];const del=await db.from('cc_live_deliveries').delete().eq('id',last.id);if(del.error){msg('Undo failed: '+del.error.message);return}const remaining=deliveries.slice(0,-1);const inningsRows=remaining.filter(x=>Number(x.innings_no||1)===Number(match.innings||1));const runs=inningsRows.reduce((a,x)=>a+Number(x.total_runs||0),0),wickets=inningsRows.filter(x=>x.wicket).length,extras=inningsRows.reduce((a,x)=>a+Number(x.extra_runs||0),0),legal=inningsRows.filter(x=>!['wide','no_ball'].includes(x.event_type)).length;const state=inningsRows.length?inningsRows[inningsRows.length-1].state_after:null;const patch={runs,wickets,extras,legal_balls:legal,striker:state?.striker||match.initial_striker||match.striker,non_striker:state?.non_striker||match.initial_non_striker||match.non_striker,bowler:state?.bowler||match.initial_bowler||match.bowler,last_event:inningsRows.at(-1)?.commentary||'Match started',status:'live',updated_at:new Date().toISOString()};const up=await db.from('cc_live_matches').update(patch).eq('id',match.id).eq('owner_id',sessionUser.id);if(up.error){msg('Delivery removed but score repair failed: '+up.error.message);return}await loadMatch(match.id);msg('Last delivery undone and match state restored.');}
$('#createForm').addEventListener('submit',create);document.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>ball(b.dataset.kind,Number(b.dataset.runs||$('#extraRuns').value||0))));$('#swap').addEventListener('click',async()=>{swap();const r=await db.from('cc_live_matches').update({striker:match.striker,non_striker:match.non_striker}).eq('id',match.id).eq('owner_id',sessionUser.id);if(r.error){msg(r.error.message);return}render()});$('#undo').addEventListener('click',undo);$('#endInnings').addEventListener('click',endInnings);$('#finishMatch').addEventListener('click',finishMatch);$('#savedMatches').addEventListener('click',async e=>{const b=e.target.closest('[data-resume]');if(!b)return;try{await loadMatch(b.dataset.resume)}catch(err){$('#createMsg').textContent=err.message}});
async function init(){if(!await requireUser())return;const id=new URLSearchParams(location.search).get('id');await loadSavedMatches();if(id){try{await loadMatch(id)}catch(e){$('#createMsg').textContent='Could not reopen match: '+e.message}}}
init();
})();

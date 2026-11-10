(()=> {
const URL='https://bgafsvpgijqywjoiersq.supabase.co',KEY='sb_publishable_k4ZsbNa5sBBFHHN3Q1QZDw_pgjdlj4x';
const db=window.supabase.createClient(URL,KEY),$=s=>document.querySelector(s),id=new URLSearchParams(location.search).get('id');
let match=null,deliveries=[],channel;
const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const legalBall=d=>!['wide','no_ball'].includes(String(d.event_type||'').toLowerCase());
function figures(rows){
 const total=rows.reduce((a,d)=>a+Number(d.total_runs||0),0);
 const wk=rows.filter(d=>d.wicket).length;
 const legal=rows.filter(legalBall).length;
 const extras=rows.reduce((a,d)=>a+Number(d.extra_runs||0),0);
 return {total,wk,legal,extras,overs:`${Math.floor(legal/6)}.${legal%6}`};
}
function batting(rows){
 const map=new Map();
 for(const d of rows){
  const name=d.striker||'Unknown batter';if(!map.has(name))map.set(name,{name,runs:0,balls:0,fours:0,sixes:0,out:false});
  const x=map.get(name),bat=Number(d.bat_runs||0);
  x.runs+=bat;if(legalBall(d)||!['wide'].includes(String(d.event_type||'').toLowerCase()))x.balls++;
  if(bat===4)x.fours++;if(bat===6)x.sixes++;
  if(d.wicket&&String(d.dismissed_batter||'')===name)x.out=true;
 }
 return [...map.values()];
}
function bowling(rows){
 const map=new Map();
 for(const d of rows){
  const name=d.bowler||'Unknown bowler';if(!map.has(name))map.set(name,{name,legal:0,runs:0,wickets:0});
  const x=map.get(name),type=String(d.event_type||'').toLowerCase();
  if(legalBall(d))x.legal++;
  // Bowler-conceded runs exclude byes and leg-byes.
  if(!['bye','leg_bye'].includes(type))x.runs+=Number(d.total_runs||0);
  if(d.wicket&&!['run_out','retired_hurt','obstructing_field'].includes(String(d.wicket_type||'').toLowerCase()))x.wickets++;
 }
 return [...map.values()].map(x=>({...x,overs:`${Math.floor(x.legal/6)}.${x.legal%6}`,economy:x.legal?(x.runs/(x.legal/6)).toFixed(2):'0.00'}));
}
function table(headers,rows){return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows||'<tr><td colspan="6">No saved records yet.</td></tr>'}</tbody></table></div>`}
function render(){
 const m=match;$('#status').textContent='Scoreboard connected · Live updates enabled';$('#match').hidden=false;
 $('#title').textContent=m.match_title||'Live match';$('#teams').textContent=`${m.team_a||'Team A'} vs ${m.team_b||'Team B'}`;
 $('#battingTeamLabel').textContent=m.batting_team||'Batting';$('#bowlingTeamLabel').textContent=m.bowling_team||'Bowling';
 $('#score').textContent=`${m.runs||0}/${m.wickets||0}`;$('#overs').textContent=`${Math.floor((m.legal_balls||0)/6)}.${(m.legal_balls||0)%6} overs`;
 $('#innings').textContent=`Innings ${m.innings||1} · ${String(m.status||'live').replaceAll('_',' ')}`;
 $('#statusPill').textContent=m.status==='live'?'● LIVE':String(m.status||'').toUpperCase();
 $('#striker').textContent=m.striker||'—';$('#nonStriker').textContent=m.non_striker||'—';$('#bowler').textContent=m.bowler||'—';$('#inningsNumber').textContent=m.innings||1;
 const nums=[1,2],all=nums.map(n=>{const rows=deliveries.filter(d=>Number(d.innings_no||1)===n);const f=figures(rows);return {n,rows,f}});
 const cards=all.map(({n,rows,f})=>{
  const bat=batting(rows),bowl=bowling(rows);
  const battingTeam=n===1?(m.innings===1?m.batting_team:(m.bowling_team||m.team_b)):(m.innings===2?m.batting_team:(m.bowling_team||m.team_a));
  const target=n===2?all[0].f.total+1:null;
  const batRows=bat.map(x=>`<tr><td>${esc(x.name)}${x.out?' <small>(out)</small>':''}</td><td>${x.runs}</td><td>${x.balls}</td><td>${x.fours}</td><td>${x.sixes}</td><td>${x.balls?(x.runs*100/x.balls).toFixed(1):'—'}</td></tr>`).join('');
  const bowlRows=bowl.map(x=>`<tr><td>${esc(x.name)}</td><td>${x.overs}</td><td>${x.runs}</td><td>${x.wickets}</td><td>${x.economy}</td></tr>`).join('');
  const fall=rows.filter(d=>d.wicket).map((d,i)=>`${i+1}-${f.total} (${d.dismissed_batter||'Batter'})`).join(', ');
  return `<div class="panel innings-card"><h2>${n===1?'1st':'2nd'} Innings · ${esc(battingTeam||'Batting team')}</h2><div class="summary-grid"><div><small>SCORE</small><b>${f.total}/${f.wk}</b></div><div><small>OVERS</small><b>${f.overs}</b></div><div><small>EXTRAS</small><b>${f.extras}</b></div><div><small>${n===2?'TARGET':'LEGAL BALLS'}</small><b>${target??f.legal}</b></div></div><h3>Batting scorecard</h3>${table(['Batter','R','B','4s','6s','SR'],batRows)}<h3>Bowling figures</h3>${table(['Bowler','O','R','W','Econ'],bowlRows)}<h3>Fall of wickets</h3><p>${esc(fall||'No wickets recorded')}</p></div>`;
 }).join('');
 $('#inningsCards').innerHTML=cards;
 const recent=deliveries.slice(-18).reverse().map(d=>`<tr><td>${Number(d.innings_no||1)}</td><td>${esc(d.over_number??'—')}.${esc(d.ball_in_over??'—')}</td><td>${esc(d.striker||'—')}</td><td>${esc(d.bowler||'—')}</td><td>${esc(d.commentary||d.event_type||'')}</td><td>${Number(d.total_runs||0)}${d.wicket?' · W':''}</td></tr>`).join('');
 $('#ballFeed').innerHTML=table(['Inn','Over','Batter','Bowler','Event','Runs'],recent);
}
async function load(){
 if(!id){$('#status').textContent='No match selected.';return}
 const r=await db.from('cc_live_matches').select('*').eq('id',id).eq('is_public',true).maybeSingle();
 if(r.error||!r.data){$('#status').textContent='This match is unavailable or is not public.';return}
 match=r.data;
 const d=await db.from('cc_live_deliveries').select('*').eq('match_id',id).order('sequence_no',{ascending:true});
 if(d.error){$('#status').textContent='Match loaded, but deliveries could not be read: '+d.error.message;return}
 deliveries=d.data||[];render();
}
load();
channel=db.channel('public-match-'+id)
 .on('postgres_changes',{event:'*',schema:'public',table:'cc_live_matches',filter:'id=eq.'+id},load)
 .on('postgres_changes',{event:'*',schema:'public',table:'cc_live_deliveries',filter:'match_id=eq.'+id},load)
 .subscribe();
})();
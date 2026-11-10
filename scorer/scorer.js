
(()=>{
const URL='https://bgafsvpgijqywjoiersq.supabase.co';
const KEY='sb_publishable_k4ZsbNa5sBBFHHN3Q1QZDw_pgjdlj4x';
const db=window.supabase.createClient(URL,KEY);
const $=s=>document.querySelector(s);

let match=null,deliveries=[],sessionUser=null,teams=[],players=[],tournaments=[];

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const msg=t=>$('#scoreMsg').textContent=t;
const err=(a,b,c)=>[a,b,c].filter(Boolean).map(x=>x.message).join(' · ');

async function requireUser(){
    const {data:{session}}=await db.auth.getSession();
    if(!session){
        location.href='../?login=1';
        return false;
    }
    sessionUser=session.user;
    return true;
}

async function loadSavedMatches(){
    const r=await db.from('cc_live_matches')
        .select('id,match_title,team_a,team_b,runs,wickets,legal_balls,status,updated_at')
        .eq('owner_id',sessionUser.id)
        .order('updated_at',{ascending:false})
        .limit(50);

    if(r.error){
        $('#savedMatches').textContent='Saved matches could not load: '+r.error.message;
        return;
    }

    $('#savedMatches').innerHTML=(r.data||[]).map(m=>
        `<div class="feedrow">
            <span><b>${esc(m.match_title)}</b> · ${esc(m.team_a)} vs ${esc(m.team_b)} · ${m.runs}/${m.wickets} (${Math.floor((m.legal_balls||0)/6)}.${(m.legal_balls||0)%6}) · ${esc(m.status)}</span>
            <button data-resume="${esc(m.id)}">Open match</button>
        </div>`
    ).join('')||'<p>No saved matches yet.</p>';
}

async function loadMatchSetup(){
    const [tr,pr,tor]=await Promise.all([
        db.from('cc_teams').select('id,name').eq('owner_id',sessionUser.id).order('name'),
        db.from('cc_players').select('id,display_name,team_id').eq('created_by',sessionUser.id).order('display_name'),
        db.from('cc_tournaments').select('id,name').eq('organizer_id',sessionUser.id).order('name')
    ]);

    if(tr.error||pr.error||tor.error){
        $('#createMsg').textContent='Could not load saved setup: '+err(tr.error,pr.error,tor.error);
        return;
    }

    teams=tr.data||[];
    players=pr.data||[];
    tournaments=tor.data||[];

    $('#teamA').innerHTML='<option value="">Select Team A</option>'+teams.map(x=>
        `<option value="${esc(x.id)}">${esc(x.name)}</option>`
    ).join('');

    $('#teamB').innerHTML='<option value="">Select Team B</option>'+teams.map(x=>
        `<option value="${esc(x.id)}">${esc(x.name)}</option>`
    ).join('');

    $('#tournament').innerHTML='<option value="">Friendly / No tournament</option>'+tournaments.map(x=>
        `<option value="${esc(x.id)}">${esc(x.name)}</option>`
    ).join('');

    refreshPlayerOptions();
}

function refreshPlayerOptions(){
    const ids=[$('#teamA').value,$('#teamB').value].filter(Boolean);
    const roster=players.filter(p=>p.team_id&&ids.includes(p.team_id));
    const opts='<option value="">Select player</option>'+roster.map(p=>
        `<option value="${esc(p.display_name)}">${esc(p.display_name)}</option>`
    ).join('');

    ['striker','nonStriker','bowler'].forEach(id=>{
        const old=$('#'+id).value;
        $('#'+id).innerHTML=opts;
        if(old)$('#'+id).value=old;
    });
}

$('#teamA').addEventListener('change',refreshPlayerOptions);
$('#teamB').addEventListener('change',refreshPlayerOptions);

async function create(e){
    e.preventDefault();

    const ta=teams.find(x=>x.id===$('#teamA').value);
    const tb=teams.find(x=>x.id===$('#teamB').value);

    if(!ta||!tb||ta.id===tb.id){
        $('#createMsg').textContent='Select two different saved teams.';
        return;
    }

    const bat=$('#batting').value==='A'?ta.name:tb.name;
    const bowl=$('#batting').value==='A'?tb.name:ta.name;
    const st=$('#striker').value;
    const ns=$('#nonStriker').value;
    const bw=$('#bowler').value;

    if(!st||!ns||!bw||st===ns){
        $('#createMsg').textContent='Select two different opening batters and an opening bowler.';
        return;
    }

    const payload={
        owner_id:sessionUser.id,
        match_title:$('#title').value.trim(),
        team_a:ta.name,
        team_b:tb.name,
        batting_team:bat,
        bowling_team:bowl,
        striker:st,
        non_striker:ns,
        bowler:bw,
        initial_striker:st,
        initial_non_striker:ns,
        initial_bowler:bw,
        first_innings_team:bat,
        second_innings_team:null,
        is_public:$('#public').checked,
        team_a_id:ta.id,
        team_b_id:tb.id,
        tournament_id:$('#tournament').value||null
    };

    const r=await db.from('cc_live_matches').insert(payload).select().single();

    if(r.error){
        $('#createMsg').textContent='Could not create match: '+r.error.message;
        return;
    }

    await loadMatch(r.data.id);
    history.replaceState(null,'',`?id=${r.data.id}`);
    await loadSavedMatches();
}

function swap(){
    const x=match.striker;
    match.striker=match.non_striker;
    match.non_striker=x;
}

function render(){
    const legal=match.legal_balls||0;

    $('#scoreValue').textContent=`${match.runs}/${match.wickets}`;
    $('#overs').textContent=`${Math.floor(legal/6)}.${legal%6} overs`;
    $('#sName').value=match.striker||'';
    $('#nsName').value=match.non_striker||'';
    $('#bName').value=match.bowler||'';
    $('#onStrike').textContent=match.striker||'—';
    $('#lastBall').textContent=match.last_event||'Match started';
    $('#matchTitle').textContent=match.match_title;

    $('#teamsLine').textContent=
        `${match.batting_team} batting · ${match.bowling_team} bowling · Innings ${match.innings} · ${match.status}`;

    const link=new URL(`../watch/?id=${encodeURIComponent(match.id)}`,location.href);

    $('#watchLink').href=link.href;
    $('#watchLink').textContent=link.href;
    $('#watchLink').hidden=!match.is_public;
    $('#copyLink').hidden=!match.is_public;
    $('#makePublic').hidden=!!match.is_public;

    $('#publicLinkNote').textContent=match.is_public
        ?'Public spectator link:'
        :'This match is private. Make it public to open the spectator scoreboard.';

    $('#feed').innerHTML=deliveries
        .filter(d=>Number(d.innings_no||1)===Number(match.innings))
        .slice().reverse()
        .map(d=>`<div class="feedrow">
            <span>${d.over_number}.${d.ball_in_over} · ${esc(d.striker)} vs ${esc(d.bowler)}</span>
            <b>${esc(d.commentary||d.total_runs+' runs')}</b>
        </div>`)
        .join('')||'<p>No balls recorded in this innings.</p>';

    $('#finishMatch').disabled=match.status==='completed';
    $('#endInnings').textContent=Number(match.innings)===1
        ?'End 1st innings'
        :'End 2nd innings / Finish match';
}

async function loadMatch(id){
    const m=await db.from('cc_live_matches')
        .select('*')
        .eq('id',id)
        .eq('owner_id',sessionUser.id)
        .single();

    if(m.error)throw m.error;

    match=m.data;

    const d=await db.from('cc_live_deliveries')
        .select('*')
        .eq('match_id',id)
        .order('sequence_no',{ascending:true});

    if(d.error)throw d.error;

    deliveries=d.data||[];

    $('#create').hidden=true;
    $('#saved').hidden=true;
    $('#score').hidden=false;

    render();
}

function currentNames(){
    return {
        striker:$('#sName').value.trim()||match.striker,
        non_striker:$('#nsName').value.trim()||match.non_striker,
        bowler:$('#bName').value.trim()||match.bowler
    };
}

async function ball(kind,runs=0){
    if(!match||match.status==='completed'){
        msg('This match is completed.');
        return;
    }

    const before={...match};
    const names=currentNames();

    if(!names.striker||!names.non_striker||!names.bowler||names.striker===names.non_striker){
        msg('Check striker, non-striker and bowler names.');
        return;
    }

    Object.assign(match,names);

    let bat=0,extra=0,total=0,legal=true,wicket=false,label='',completed=0;

    if(kind==='dot'){
        label='0';
    }else if(kind==='runs'){
        bat=Math.max(0,Number(runs)||0);
        total=bat;
        completed=bat;
        label=String(bat);
    }else if(kind==='four'){
        bat=4;
        total=4;
        label='4';
    }else if(kind==='six'){
        bat=6;
        total=6;
        label='6';
    }else if(kind==='wide'){
        extra=Math.max(1,Number(runs)||1);
        total=extra;
        legal=false;
        completed=extra-1;
        label=`Wd ${extra}`;
    }else if(kind==='no_ball'){
        extra=Math.max(1,Number(runs)||1);
        total=extra;
        legal=false;
        label=`NB ${extra}`;
    }else if(kind==='bye'||kind==='leg_bye'){
        completed=Math.max(1,Number(runs)||1);
        extra=completed;
        total=extra;
        label=(kind==='bye'?'B ':'Lb ')+completed;
    }else if(kind==='wicket'){
        wicket=true;
        label='W';
    }

    const oldStriker=names.striker;
    const oldNon=names.non_striker;

    // CUSTOM RULE:
    // 1 run = 1 rotation
    // 2 runs = 2 rotations
    // 3 runs = 3 rotations
    // 4, 5 and 6 runs = no rotation
    if(kind==='runs'&&[1,2,3].includes(bat)){
        for(let i=0;i<bat;i++){
            swap();
        }
    }

    // Bye, leg-bye and wide completed runs use odd/even rotation.
    if(['bye','leg_bye','wide'].includes(kind)&&completed%2===1){
        swap();
    }

    if(legal){
        match.legal_balls=(before.legal_balls||0)+1;
    }

    if(wicket){
        const dismissed=$('#dismissedBatter').value==='non_striker'
            ?oldNon
            :oldStriker;

        const incoming=$('#nextBatter').value.trim();

        if(!incoming){
            match=before;
            msg('Enter the incoming batter before recording a wicket.');
            return;
        }

        if([oldStriker,oldNon].includes(incoming)){
            match=before;
            msg('Incoming batter must be different from the current batters.');
            return;
        }

        if(match.striker===dismissed){
            match.striker=incoming;
        }else if(match.non_striker===dismissed){
            match.non_striker=incoming;
        }else{
            match=before;
            msg('Dismissed batter could not be identified.');
            return;
        }
    }

    // Separate end-of-over rotation after six legal deliveries.
    if(legal&&match.legal_balls%6===0){
        swap();
    }

    match.runs=(before.runs||0)+total;
    match.extras=(before.extras||0)+extra;
    match.wickets=(before.wickets||0)+(wicket?1:0);
    match.last_event=label;
    match.updated_at=new Date().toISOString();

    const seq=deliveries.length
        ?Math.max(...deliveries.map(d=>Number(d.sequence_no)||0))+1
        :1;

    const ov=Math.floor((before.legal_balls||0)/6);
    const ballNo=(before.legal_balls||0)%6+1;

    const state={
        striker:match.striker,
        non_striker:match.non_striker,
        bowler:match.bowler,
        innings:match.innings,
        runs:match.runs,
        wickets:match.wickets,
        extras:match.extras,
        legal_balls:match.legal_balls
    };

    const ins=await db.from('cc_live_deliveries').insert({
        match_id:match.id,
        sequence_no:seq,
        over_number:ov,
        ball_in_over:ballNo,
        event_type:kind,
        innings_no:Number(before.innings||1),
        bat_runs:bat,
        extra_runs:extra,
        total_runs:total,
        wicket,
        striker:oldStriker,
        non_striker:oldNon,
        bowler:names.bowler,
        commentary:label,
        dismissed_batter:wicket
            ?($('#dismissedBatter').value==='non_striker'?oldNon:oldStriker)
            :null,
        incoming_batter:wicket?$('#nextBatter').value.trim():null,
        wicket_type:wicket?$('#wicketType').value:null,
        state_after:state,
        batting_team:before.batting_team
    });

    if(ins.error){
        match=before;
        msg('Delivery not saved: '+ins.error.message);
        return;
    }

    const up=await db.from('cc_live_matches').update({
        runs:match.runs,
        wickets:match.wickets,
        legal_balls:match.legal_balls,
        extras:match.extras,
        striker:match.striker,
        non_striker:match.non_striker,
        bowler:match.bowler,
        last_event:label,
        updated_at:match.updated_at
    })
    .eq('id',match.id)
    .eq('owner_id',sessionUser.id);

    if(up.error){
        msg('Delivery saved, but match summary update failed: '+up.error.message);
        await loadMatch(match.id);
        return;
    }

    $('#nextBatter').value='';
    await loadMatch(match.id);
    msg('Delivery saved to Supabase.');
}

async function endInnings(){
    if(!match)return;

    if(Number(match.innings)===1){
        const batting=match.bowling_team;
        const bowling=match.batting_team;
        const st=$('#sName').value.trim();
        const ns=$('#nsName').value.trim();
        const bw=$('#bName').value.trim();

        if(!st||!ns||!bw||st===ns){
            msg('Before starting innings 2, enter its opening striker, non-striker and bowler in the fields above.');
            return;
        }

        const r=await db.from('cc_live_matches').update({
            innings:2,
            first_innings_team:match.first_innings_team||match.batting_team,
            second_innings_team:batting,
            batting_team:batting,
            bowling_team:bowling,
            striker:st,
            non_striker:ns,
            bowler:bw,
            initial_striker:st,
            initial_non_striker:ns,
            initial_bowler:bw,
            runs:0,
            wickets:0,
            legal_balls:0,
            extras:0,
            status:'live',
            last_event:'Second innings started',
            updated_at:new Date().toISOString()
        })
        .eq('id',match.id)
        .eq('owner_id',sessionUser.id);

        if(r.error){
            msg('Could not start second innings: '+r.error.message);
            return;
        }

        await loadMatch(match.id);
        msg('Second innings started. Opening batters and bowler saved.');
    }else{
        await finishMatch();
    }
}

async function finishMatch(){
    if(!match)return;

    if(!confirm('Mark this match completed? Saved deliveries and both innings will remain.'))return;

    const r=await db.from('cc_live_matches').update({
        status:'completed',
        last_event:'Match completed',
        updated_at:new Date().toISOString()
    })
    .eq('id',match.id)
    .eq('owner_id',sessionUser.id);

    if(r.error){
        msg(r.error.message);
        return;
    }

    await loadMatch(match.id);
    await loadSavedMatches();
    msg('Match completed and retained.');
}

async function undo(){
    if(!deliveries.length)return;

    const last=deliveries[deliveries.length-1];

    if(Number(last.innings_no||1)!==Number(match.innings||1)){
        msg('The last saved delivery belongs to a previous innings.');
        return;
    }

    const del=await db.from('cc_live_deliveries').delete().eq('id',last.id);

    if(del.error){
        msg('Undo failed: '+del.error.message);
        return;
    }

    const remaining=deliveries.filter(x=>x.id!==last.id);
    const rows=remaining.filter(x=>Number(x.innings_no||1)===Number(match.innings||1));

    const runs=rows.reduce((a,x)=>a+Number(x.total_runs||0),0);
    const wickets=rows.filter(x=>x.wicket).length;
    const extras=rows.reduce((a,x)=>a+Number(x.extra_runs||0),0);
    const legal=rows.filter(x=>!['wide','no_ball'].includes(String(x.event_type).toLowerCase())).length;
    const state=rows.at(-1)?.state_after;
    const first=rows[0];

    const patch={
        runs,
        wickets,
        extras,
        legal_balls:legal,
        striker:state?.striker||first?.striker||match.initial_striker,
        non_striker:state?.non_striker||first?.non_striker||match.initial_non_striker,
        bowler:state?.bowler||first?.bowler||match.initial_bowler,
        last_event:rows.at(-1)?.commentary||'Innings started',
        status:'live',
        updated_at:new Date().toISOString()
    };

    const up=await db.from('cc_live_matches').update(patch)
        .eq('id',match.id)
        .eq('owner_id',sessionUser.id);

    if(up.error){
        msg('Undo removed the delivery but summary update failed: '+up.error.message);
        return;
    }

    await loadMatch(match.id);
    msg('Last delivery undone.');
}

// BUTTON EVENTS

$('#createForm').addEventListener('submit',create);

document.querySelectorAll('[data-kind]').forEach(b=>
    b.addEventListener('click',()=>ball(
        b.dataset.kind,
        Number(b.dataset.runs??$('#extraRuns').value??0)
    ))
);

$('#swap').addEventListener('click',async()=>{
    const n=currentNames();
    match.striker=n.non_striker;
    match.non_striker=n.striker;

    const r=await db.from('cc_live_matches').update({
        striker:match.striker,
        non_striker:match.non_striker
    })
    .eq('id',match.id)
    .eq('owner_id',sessionUser.id);

    if(r.error){
        msg(r.error.message);
        return;
    }

    render();
    msg('Ends swapped manually.');
});

$('#undo').addEventListener('click',undo);
$('#endInnings').addEventListener('click',endInnings);
$('#finishMatch').addEventListener('click',finishMatch);

$('#makePublic').addEventListener('click',async()=>{
    if(!match)return;

    const r=await db.from('cc_live_matches').update({
        is_public:true,
        updated_at:new Date().toISOString()
    })
    .eq('id',match.id)
    .eq('owner_id',sessionUser.id);

    if(r.error){
        msg('Could not enable public link: '+r.error.message);
        return;
    }

    await loadMatch(match.id);
    msg('Public spectator link enabled.');
});

// COPY SPECTATOR LINK

async function copySpectatorLink(){
    const anchor=$('#watchLink');
    const url=anchor.href;

    if(!match||!url||url==='about:blank'){
        msg('Open a match first.');
        return;
    }

    try{
        if(navigator.clipboard&&window.isSecureContext){
            await navigator.clipboard.writeText(url);
        }else{
            const field=document.createElement('textarea');
            field.value=url;
            field.setAttribute('readonly','');
            field.style.position='fixed';
            field.style.opacity='0';

            document.body.appendChild(field);
            field.select();
            field.setSelectionRange(0,field.value.length);

            const copied=document.execCommand('copy');
            field.remove();

            if(!copied)throw new Error('Browser blocked clipboard access');
        }

        msg('Spectator link copied: '+url);
    }catch(e){
        msg('Copy failed. Select and copy this URL: '+url);
    }
}

$('#copyLink').addEventListener('click',copySpectatorLink);

$('#watchLink').addEventListener('click',async()=>{
    if(!match?.is_public){
        msg('This match is private. Make it public before opening the spectator page.');
        return;
    }
});

$('#savedMatches').addEventListener('click',async e=>{
    const b=e.target.closest('[data-resume]');
    if(!b)return;

    try{
        await loadMatch(b.dataset.resume);
    }catch(x){
        $('#createMsg').textContent=x.message;
    }
});

async function init(){
    if(!await requireUser())return;

    $('#dismissedBatter').addEventListener('change',()=>{});

    const id=new URLSearchParams(location.search).get('id');

    await loadMatchSetup();
    await loadSavedMatches();

    if(id){
        try{
            await loadMatch(id);
        }catch(e){
            $('#createMsg').textContent='Could not reopen match: '+e.message;
        }
    }
}

init();
})();

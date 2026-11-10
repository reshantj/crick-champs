
(()=>{
'use strict';

const SUPABASE_URL='https://bgafsvpgijqywjoiersq.supabase.co';
const KEY='sb_publishable_k4ZsbNa5sBBFHHN3Q1QZDw_pgjdlj4x';
const db=window.supabase.createClient(SUPABASE_URL,KEY);
const $=s=>document.querySelector(s);

let match=null;
let deliveries=[];
let sessionUser=null;
let teams=[];
let players=[];
let tournaments=[];

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));

const msg=t=>$('#scoreMsg').textContent=t;


// ========================================
// GENERATE MATCH LINK FROM SUPABASE ID
// ========================================

function generateMatchLink(matchId,isPublic=true){

    const input=$('#watchUrl');
    const link=$('#watchLink');
    const copy=$('#copyLink');
    const status=$('#watchLinkStatus');

    if(!input||!link||!copy)return;

    if(!matchId){
        input.value='';
        input.placeholder='Match ID not available';
        link.href='#';
        link.textContent='Open Match';
        copy.disabled=true;

        if(status)status.textContent='Match ID not available.';
        return;
    }

    if(isPublic!==true){
        input.value='';
        input.placeholder='This match is private';
        link.href='#';
        link.textContent='Private Match';
        copy.disabled=true;

        if(status)status.textContent='This match is not publicly viewable.';
        return;
    }

    const url=new window.URL(
        'https://reshantj.github.io/crick-champs/watch/'
    );

    url.searchParams.set('id',String(matchId));

    input.value=url.href;
    link.href=url.href;
    link.textContent='Open Match';
    copy.disabled=false;

    if(status){
        status.textContent='Your public match link is ready to share.';
    }
}


// ========================================
// AUTHENTICATION
// ========================================

async function requireUser(){

    const {data:{session},error}=await db.auth.getSession();

    if(error){
        console.error(error);
        return false;
    }

    if(!session){
        location.href='../?login=1';
        return false;
    }

    sessionUser=session.user;
    return true;
}


// ========================================
// SAVED MATCHES
// ========================================

async function loadSavedMatches(){

    const r=await db.from('cc_live_matches')
        .select('id,match_title,team_a,team_b,runs,wickets,legal_balls,status,updated_at,is_public')
        .eq('owner_id',sessionUser.id)
        .order('updated_at',{ascending:false})
        .limit(50);

    if(r.error){
        $('#savedMatches').textContent=
            'Saved matches could not load: '+r.error.message;
        return;
    }

    $('#savedMatches').innerHTML=(r.data||[]).map(m=>{

        const publicMatch=m.is_public===true;

        const url=new window.URL(
            'https://reshantj.github.io/crick-champs/watch/'
        );

        url.searchParams.set('id',String(m.id));

        return `
        <div class="panel" style="margin:12px 0;padding:14px;">
            <h3>${esc(m.match_title)}</h3>
            <p>${esc(m.team_a)} vs ${esc(m.team_b)}</p>
            <p>
                <b>Score:</b>
                ${m.runs||0}/${m.wickets||0}
                (${Math.floor((m.legal_balls||0)/6)}.${(m.legal_balls||0)%6})
            </p>
            <p><b>Status:</b> ${esc(m.status)}</p>
            <label>Public Match Link</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <input type="text" readonly
                    value="${publicMatch?esc(url.href):'Private match — no public link'}"
                    style="flex:1;min-width:220px;"
                    ${publicMatch?'':'disabled'}>
                ${publicMatch?`
                    <button type="button" data-copy-match="${esc(m.id)}">Copy Link</button>
                    <a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">Watch Live</a>
                `:`<span>Private match</span>`}
                <button type="button" data-resume="${esc(m.id)}">Open Scorer</button>
            </div>
        </div>`;
    }).join('')||'<p>No saved matches yet.</p>';
}


// ========================================
// LOAD TEAMS AND PLAYERS
// ========================================

async function loadMatchSetup(){

    const [tr,pr,tor]=await Promise.all([

        db.from('cc_teams')
            .select('id,name')
            .eq('owner_id',sessionUser.id)
            .order('name'),

        db.from('cc_players')
            .select('id,display_name,team_id')
            .eq('created_by',sessionUser.id)
            .order('display_name'),

        db.from('cc_tournaments')
            .select('id,name')
            .eq('organizer_id',sessionUser.id)
            .order('name')
    ]);

    if(tr.error){
        $('#createMsg').textContent='Team loading error: '+tr.error.message;
        return;
    }

    if(pr.error){
        $('#createMsg').textContent='Player loading error: '+pr.error.message;
        return;
    }

    if(tor.error){
        $('#createMsg').textContent='Tournament loading error: '+tor.error.message;
        return;
    }

    teams=tr.data||[];
    players=pr.data||[];
    tournaments=tor.data||[];

    $('#teamA').innerHTML=
        '<option value="">Select Team A</option>'+
        teams.map(x=>
            `<option value="${esc(x.id)}">${esc(x.name)}</option>`
        ).join('');

    $('#teamB').innerHTML=
        '<option value="">Select Team B</option>'+
        teams.map(x=>
            `<option value="${esc(x.id)}">${esc(x.name)}</option>`
        ).join('');

    $('#tournament').innerHTML=
        '<option value="">Friendly / No tournament</option>'+
        tournaments.map(x=>
            `<option value="${esc(x.id)}">${esc(x.name)}</option>`
        ).join('');

    refreshPlayerOptions();

    $('#createMsg').textContent=
        `Loaded ${teams.length} saved teams and ${players.length} saved players.`;
}


// ========================================
// PLAYER OPTIONS
// ========================================

function refreshPlayerOptions(){

    const ids=[
        $('#teamA').value,
        $('#teamB').value
    ].filter(Boolean);

    const roster=players.filter(p=>
        !p.team_id||ids.includes(String(p.team_id))
    );

    const opts=
        '<option value="">Select player</option>'+
        roster.map(p=>
            `<option value="${esc(p.display_name)}">${esc(p.display_name)}</option>`
        ).join('');

    ['striker','nonStriker','bowler'].forEach(id=>{

        const el=$('#'+id);
        if(!el)return;

        const old=el.value;
        el.innerHTML=opts;

        if(old&&roster.some(p=>p.display_name===old)){
            el.value=old;
        }
    });
}

$('#teamA').addEventListener('change',refreshPlayerOptions);
$('#teamB').addEventListener('change',refreshPlayerOptions);


// ========================================
// CREATE MATCH
// ========================================

async function create(e){

    e.preventDefault();

    const status=$('#createMsg');
    const button=$('#createForm').querySelector('button[type="submit"],input[type="submit"]');

    if(button)button.disabled=true;
    status.textContent='Creating match...';

    try{

        const ta=teams.find(x=>x.id===$('#teamA').value);
        const tb=teams.find(x=>x.id===$('#teamB').value);

        if(!ta||!tb||ta.id===tb.id){
            throw new Error('Select two different saved teams.');
        }

        const bat=$('#batting').value==='A'?ta.name:tb.name;
        const bowl=$('#batting').value==='A'?tb.name:ta.name;

        const st=$('#striker').value;
        const ns=$('#nonStriker').value;
        const bw=$('#bowler').value;

        if(!st||!ns||!bw||st===ns){
            throw new Error('Select two different opening batters and an opening bowler.');
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

        const r=await db.from('cc_live_matches')
            .insert(payload)
            .select()
            .single();

        if(r.error){
            console.error('MATCH INSERT ERROR:',r.error);
            throw new Error(
                r.error.message+
                (r.error.details?' | Details: '+r.error.details:'')+
                (r.error.hint?' | Hint: '+r.error.hint:'')+
                ' | Code: '+(r.error.code||'unknown')
            );
        }

        if(!r.data||!r.data.id){
            throw new Error('Supabase insert returned no match ID.');
        }

        match=r.data;

        generateMatchLink(match.id,match.is_public);

        history.replaceState(
            null,'','?id='+encodeURIComponent(match.id)
        );

        $('#create').hidden=true;
        $('#saved').hidden=true;
        $('#score').hidden=false;

        try{

            const d=await db.from('cc_live_deliveries')
                .select('*')
                .eq('match_id',match.id)
                .order('sequence_no',{ascending:true});

            if(d.error)throw d.error;

            deliveries=d.data||[];
            render();

        }catch(loadError){

            console.error('MATCH CREATED; DELIVERY LOAD FAILED:',loadError);

            generateMatchLink(match.id,match.is_public);

            status.textContent=
                'Match created (ID: '+match.id+'), but score data could not load: '+loadError.message;

            await loadSavedMatches();
            return;
        }

        generateMatchLink(match.id,match.is_public);

        await loadSavedMatches();

        status.textContent='Match created successfully. Match ID: '+match.id;

    }catch(error){

        console.error('CREATE MATCH FAILED:',error);

        status.textContent=
            'MATCH CREATION FAILED: '+(error.message||String(error));

    }finally{

        if(button)button.disabled=false;
    }
}


// ========================================
// SWAP BATTERS
// ========================================

function swap(){

    const x=match.striker;
    match.striker=match.non_striker;
    match.non_striker=x;
}


// ========================================
// RENDER SCOREBOARD
// ========================================

function render(){

    if(!match)return;

    const legal=match.legal_balls||0;

    $('#scoreValue').textContent=
        `${match.runs||0}/${match.wickets||0}`;

    $('#overs').textContent=
        `${Math.floor(legal/6)}.${legal%6} overs`;

    $('#sName').value=match.striker||'';
    $('#nsName').value=match.non_striker||'';
    $('#bName').value=match.bowler||'';

    $('#onStrike').textContent=match.striker||'—';
    $('#lastBall').textContent=match.last_event||'Match started';
    $('#matchTitle').textContent=match.match_title||'Live match';

    $('#teamsLine').textContent=
        `${match.batting_team} batting · ${match.bowling_team} bowling · Innings ${match.innings} · ${match.status}`;

    generateMatchLink(match.id,match.is_public);

    $('#feed').innerHTML=deliveries
        .filter(d=>Number(d.innings_no||1)===Number(match.innings))
        .slice()
        .reverse()
        .map(d=>`
            <div class="feedrow">
                <span>${d.over_number}.${d.ball_in_over} · ${esc(d.striker)} vs ${esc(d.bowler)}</span>
                <b>${esc(d.commentary||d.total_runs+' runs')}</b>
            </div>
        `)
        .join('')||'<p>No balls recorded in this innings.</p>';

    $('#finishMatch').disabled=match.status==='completed';

    $('#endInnings').textContent=Number(match.innings)===1
        ?'End 1st innings'
        :'End 2nd innings / Finish match';
}


// ========================================
// LOAD EXISTING MATCH
// ========================================

async function loadMatch(id){

    const m=await db.from('cc_live_matches')
        .select('*')
        .eq('id',id)
        .eq('owner_id',sessionUser.id)
        .single();

    if(m.error)throw m.error;

    match=m.data;

    generateMatchLink(match.id,match.is_public);

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

    generateMatchLink(match.id,match.is_public);
}


// ========================================
// CURRENT PLAYER NAMES
// ========================================

function currentNames(){

    return {
        striker:$('#sName').value.trim()||match.striker,
        non_striker:$('#nsName').value.trim()||match.non_striker,
        bowler:$('#bName').value.trim()||match.bowler
    };
}


// ========================================
// RECORD BALL
// ========================================

async function ball(kind,runs=0){

    if(!match||match.status==='completed'){
        msg('This match is completed.');
        return;
    }

    const before={...match};
    const names=currentNames();

    if(!names.striker||!names.non_striker||!names.bowler||
       names.striker===names.non_striker){
        msg('Check striker, non-striker and bowler names.');
        return;
    }

    Object.assign(match,names);

    let bat=0,extra=0,total=0,legal=true,wicket=false,label='',completed=0;

    if(kind==='dot'){
        label='0';
    }
    else if(kind==='runs'){
        bat=Math.max(0,Number(runs)||0);
        total=bat;
        completed=bat;
        label=String(bat);
    }
    else if(kind==='four'){
        bat=4;total=4;label='4';
    }
    else if(kind==='six'){
        bat=6;total=6;label='6';
    }
    else if(kind==='wide'){
        extra=Math.max(1,Number(runs)||1);
        total=extra;
        legal=false;
        completed=extra-1;
        label=`Wd ${extra}`;
    }
    else if(kind==='no_ball'){
        extra=Math.max(1,Number(runs)||1);
        total=extra;
        legal=false;
        label=`NB ${extra}`;
    }
    else if(kind==='bye'||kind==='leg_bye'){
        completed=Math.max(1,Number(runs)||1);
        extra=completed;
        total=extra;
        label=(kind==='bye'?'B ':'Lb ')+completed;
    }
    else if(kind==='wicket'){
        wicket=true;
        label='W';
    }

    const oldStriker=names.striker;
    const oldNon=names.non_striker;

    // CUSTOM ROTATION:
    // Single = 1 swap
    // Double = 2 swaps
    // Triple = 3 swaps
    // Four, five and six = no swap.

    if(kind==='runs'&&[1,2,3].includes(bat)){
        for(let i=0;i<bat;i++)swap();
    }

    // Byes and leg-byes use completed-run parity.
    if(['bye','leg_bye'].includes(kind)&&completed%2===1){
        swap();
    }

    if(legal){
        match.legal_balls=(before.legal_balls||0)+1;
    }

    if(wicket){

        const dismissed=$('#dismissedBatter').value==='non_striker'
            ?oldNon:oldStriker;

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

    // Separate over-end rotation after six legal balls.
    if(legal&&match.legal_balls%6===0){
        swap();
    }

    match.runs=(before.runs||0)+total;
    match.extras=(before.extras||0)+extra;
    match.wickets=(before.wickets||0)+(wicket?1:0);
    match.last_event=label;
    match.updated_at=new Date().toISOString();

    const seq=deliveries.length
        ?Math.max(...deliveries.map(d=>Number(d.sequence_no)||0))+1:1;

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
            ?($('#dismissedBatter').value==='non_striker'?oldNon:oldStriker):null,
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
    await loadSavedMatches();

    msg('Delivery saved to Supabase.');
}


// ========================================
// END INNINGS
// ========================================

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
        await loadSavedMatches();

        msg('Second innings started. Opening batters and bowler saved.');

    }else{
        await finishMatch();
    }
}


// ========================================
// FINISH MATCH
// ========================================

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


// ========================================
// UNDO LAST BALL
// ========================================

async function undo(){

    if(!deliveries.length)return;

    const last=deliveries[deliveries.length-1];

    if(Number(last.innings_no||1)!==Number(match.innings||1)){
        msg('The last saved delivery belongs to a previous innings.');
        return;
    }

    const del=await db.from('cc_live_deliveries')
        .delete()
        .eq('id',last.id);

    if(del.error){
        msg('Undo failed: '+del.error.message);
        return;
    }

    const remaining=deliveries.filter(x=>x.id!==last.id);

    const rows=remaining.filter(
        x=>Number(x.innings_no||1)===Number(match.innings||1)
    );

    const runs=rows.reduce((a,x)=>a+Number(x.total_runs||0),0);
    const wickets=rows.filter(x=>x.wicket).length;
    const extras=rows.reduce((a,x)=>a+Number(x.extra_runs||0),0);

    const legal=rows.filter(
        x=>!['wide','no_ball'].includes(String(x.event_type).toLowerCase())
    ).length;

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
    await loadSavedMatches();

    msg('Last delivery undone.');
}


// ========================================
// COPY CURRENT MATCH LINK
// ========================================

async function copySpectatorLink(){

    const input=$('#watchUrl');

    if(!match||match.is_public!==true||!input.value){
        msg('No public match link available.');
        return;
    }

    try{

        if(navigator.clipboard&&window.isSecureContext){

            await navigator.clipboard.writeText(input.value);

        }else{

            input.focus();
            input.select();
            input.setSelectionRange(0,input.value.length);

            const copied=document.execCommand('copy');

            if(!copied)throw new Error('Clipboard access blocked');
        }

        msg('Public match link copied successfully!');

    }catch(e){

        input.focus();
        input.select();
        input.setSelectionRange(0,input.value.length);

        msg('Copy failed. Select the displayed link and copy it manually.');
    }
}


// ========================================
// MAIN EVENT HANDLERS
// ========================================

$('#createForm').addEventListener('submit',create);

document.querySelectorAll('[data-kind]').forEach(b=>
    b.addEventListener('click',()=>ball(
        b.dataset.kind,
        Number(b.dataset.runs??$('#extraRuns').value??0)
    ))
);

$('#swap').addEventListener('click',async()=>{

    const n=currentNames();

    const oldStriker=match.striker;
    const oldNon=match.non_striker;

    match.striker=n.non_striker;
    match.non_striker=n.striker;

    const r=await db.from('cc_live_matches').update({
        striker:match.striker,
        non_striker:match.non_striker
    })
    .eq('id',match.id)
    .eq('owner_id',sessionUser.id);

    if(r.error){

        match.striker=oldStriker;
        match.non_striker=oldNon;

        msg(r.error.message);
        return;
    }

    render();
    msg('Ends swapped manually.');
});

$('#undo').addEventListener('click',undo);
$('#endInnings').addEventListener('click',endInnings);
$('#finishMatch').addEventListener('click',finishMatch);
$('#copyLink').addEventListener('click',copySpectatorLink);


// ========================================
// SAVED MATCHES: COPY AND OPEN
// ========================================

$('#savedMatches').addEventListener('click',async e=>{

    const copyButton=e.target.closest('[data-copy-match]');

    if(copyButton){

        const matchId=copyButton.dataset.copyMatch;

        const url=new window.URL(
            'https://reshantj.github.io/crick-champs/watch/'
        );

        url.searchParams.set('id',String(matchId));

        try{

            if(navigator.clipboard&&window.isSecureContext){

                await navigator.clipboard.writeText(url.href);

            }else{

                const field=document.createElement('textarea');

                field.value=url.href;
                field.setAttribute('readonly','');

                field.style.position='fixed';
                field.style.left='-9999px';

                document.body.appendChild(field);

                field.select();
                field.setSelectionRange(0,field.value.length);

                const copied=document.execCommand('copy');

                field.remove();

                if(!copied)throw new Error('Clipboard access blocked');
            }

            copyButton.textContent='Copied!';

        }catch(error){

            const field=copyButton.parentElement.querySelector('input');

            if(field){
                field.focus();
                field.select();
            }

            copyButton.textContent='Select link to copy';
        }

        return;
    }

    const resumeButton=e.target.closest('[data-resume]');

    if(!resumeButton)return;

    try{

        await loadMatch(resumeButton.dataset.resume);

        history.replaceState(
            null,
            '',
            '?id='+encodeURIComponent(resumeButton.dataset.resume)
        );

    }catch(error){

        $('#createMsg').textContent=error.message;
    }
});


// ========================================
// INITIALIZE
// ========================================

async function init(){

    if(!await requireUser())return;

    $('#dismissedBatter').addEventListener('change',()=>{});

    const id=new window.URLSearchParams(location.search).get('id');

    await loadMatchSetup();
    await loadSavedMatches();

    if(id){

        try{

            await loadMatch(id);

        }catch(e){

            $('#createMsg').textContent=
                'Could not reopen match: '+e.message;
        }
    }
}

init();

})();

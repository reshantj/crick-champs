(()=>{
  const SUPABASE_URL='https://bgafsvpgijqywjoiersq.supabase.co';
  const KEY='sb_publishable_k4ZsbNa5sBBFHHN3Q1QZDw_pgjdlj4x';
  const db=window.supabase?.createClient(SUPABASE_URL,KEY);
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const notice=$('#notice');

  let users=[],matches=[];

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const fmt=v=>v?new Date(v).toLocaleString():'—';
  const num=v=>Number(v??0).toLocaleString();

  const fail=m=>{
    notice.textContent=m;
    notice.classList.add('error');
  };

  const titles={
    overview:'Business overview',
    users:'User management',
    subscribers:'Subscribers & plans',
    scoreboards:'Matches & scoreboards',
    teams:'Teams & players',
    tournaments:'Tournaments & fixtures',
    payments:'Payments & refunds',
    activity:'Admin activity & audit',
    system:'Platform health'
  };

  async function rpc(n,a={}){
    return db.rpc(n,a);
  }

  async function audit(a,d={}){
    const r=await rpc('admin_write_audit_log',{
      _action:a,
      _details:d
    });
    if(r.error) console.warn(r.error.message);
  }

  function stats(sel,arr){
    $(sel).innerHTML=arr.map(([k,v])=>
      `<article class="stat">
        <span>${esc(k)}</span>
        <strong>${esc(num(v))}</strong>
      </article>`
    ).join('');
  }

  function nav(p){
    if(!titles[p])p='overview';

    $$('.nav').forEach(a=>
      a.classList.toggle('active',a.dataset.page===p)
    );

    $$('.page').forEach(x=>
      x.classList.toggle('active',x.id==='page-'+p)
    );

    $('#pageTitle').textContent=titles[p];
    $('#welcomeTitle').textContent=titles[p];

    history.replaceState(null,'','#'+p);
  }

  async function loadUsers(){
    let r=await rpc('admin_list_users',{_limit:200});

    if(r.error){
      $('#userRows').innerHTML=
        `<tr><td colspan="6">${esc(r.error.message)}</td></tr>`;
      return;
    }

    users=r.data||[];
    renderUsers();
  }

  function renderUsers(){
    let q=($('#userSearch').value||'').toLowerCase();

    let a=users.filter(x=>
      (x.email||'').toLowerCase().includes(q)||
      (x.full_name||'').toLowerCase().includes(q)
    );

    $('#userRows').innerHTML=a.map(x=>{
      const root=(x.email||'').toLowerCase()==='reshantj@gmail.com';
      const st=x.account_status||'active';

      const actions=root
        ?'<b class="protected-label">Protected · Super Admin</b>'
        :st==='suspended'
          ?`<button class="btn secondary small"
              data-user-action="restore"
              data-user-id="${esc(x.user_id)}"
              data-user-email="${esc(x.email)}">Restore Access</button>
            <button class="btn danger small"
              data-user-action="delete"
              data-user-id="${esc(x.user_id)}"
              data-user-email="${esc(x.email)}">Delete Account</button>`
          :`<button class="btn warning small"
              data-user-action="force"
              data-user-id="${esc(x.user_id)}"
              data-user-email="${esc(x.email)}">Force Stop</button>
            <button class="btn danger small"
              data-user-action="delete"
              data-user-id="${esc(x.user_id)}"
              data-user-email="${esc(x.email)}">Delete Account</button>`;

      return `<tr>
        <td>${esc(x.full_name||'—')}</td>
        <td>${esc(x.email)}</td>
        <td>${esc(fmt(x.created_at))}</td>
        <td>${esc(fmt(x.last_sign_in_at))}</td>
        <td>${st==='suspended'?'Suspended':x.last_sign_in_at?'Previously signed in':'No sign-in'}</td>
        <td>${actions}</td>
      </tr>`;
    }).join('')||'<tr><td colspan="6">No users.</td></tr>';
  }

  async function loadMatches(){
    let r=await rpc('admin_list_matches',{_limit:200});

    if(r.error){
      $('#matchRows').innerHTML=
        `<tr><td colspan="6">Match list unavailable: ${esc(r.error.message)}</td></tr>`;
      $('#overviewMatches').textContent='Match RPC unavailable';
      return;
    }

    matches=r.data||[];
    renderMatches();
  }

  function renderMatches(){
    let q=($('#matchSearch').value||'').toLowerCase();
    let f=$('#matchFilter').value;

    let a=matches.filter(m=>
      (f==='all'||String(m.status||'').toLowerCase()===f)&&
      JSON.stringify(m).toLowerCase().includes(q)
    );

    $('#matchRows').innerHTML=a.map(m=>
      `<tr>
        <td>${esc(m.match_title||m.id)}</td>
        <td>${esc(m.tournament_name||'—')}</td>
        <td>${esc(m.status||'—')}</td>
        <td>${esc(m.score_summary||'Score details unavailable')}</td>
        <td>${esc(fmt(m.updated_at||m.created_at))}</td>
        <td>
          <button class="btn secondary small" data-id="${esc(m.id)}">View</button>
          <button class="btn danger small"
            data-delete-table="cc_live_matches"
            data-delete-id="${esc(m.id)}"
            data-delete-label="match ${esc(m.match_title||m.id)}">Delete</button>
        </td>
      </tr>`
    ).join('')||'<tr><td colspan="6">No matches found.</td></tr>';

    $('#overviewMatches').innerHTML=
      `<table><tbody>${
        a.slice(0,5).map(m=>
          `<tr>
            <td>${esc(m.match_title||m.id)}</td>
            <td>${esc(m.status||'—')}</td>
            <td>${esc(m.score_summary||'—')}</td>
          </tr>`
        ).join('')
      }</tbody></table>`;
  }

  async function load(){
    notice.classList.remove('error');
    notice.textContent='Loading protected platform data…';

    let r=await rpc('admin_dashboard_stats');

    if(r.error){
      fail('Run migration 003 first: '+r.error.message);
      return;
    }

    let d=r.data||{};

    stats('#stats',[
      ['Registered users',d.users],
      ['Teams',d.teams],
      ['Tournaments',d.tournaments],
      ['Matches',d.matches],
      ['New users · 30 days',d.new_users_30d],
      ['Active users · 30 days',d.active_users_30d],
      ['Paid subscribers',d.paid_subscribers],
      ['Recorded revenue ₹',d.revenue_total]
    ]);

    $('#membershipBreakdown').innerHTML=
      `Free accounts: <b>${num(d.free_users)}</b><br>
       Paid subscribers: <b>${num(d.paid_subscribers)}</b><br>
       Conversion: <b>${Number(d.paid_conversion_pct||0).toFixed(1)}%</b>`;

    $('#liveSummary').innerHTML=
      `Online now: <b>${d.online_now??'Not configured'}</b><br>
       Active sessions: <b>${d.active_sessions??'Not configured'}</b>`;

    await Promise.all([loadUsers(),loadMatches()]);

    let a=await rpc('admin_recent_audit_logs',{_limit:50});

    $('#auditRows').innerHTML=a.error
      ?esc(a.error.message)
      :(a.data||[]).map(x=>
        `<div class="activity-item">
          <span>${esc(x.action)}
            <small>${esc(x.actor_email||'Admin')} · ${esc(JSON.stringify(x.details||{}))}</small>
          </span>
          <span>${esc(fmt(x.created_at))}</span>
        </div>`
      ).join('')||'No activity yet';

    stats('#subscriberStats',[
      ['Paid subscribers',d.paid_subscribers],
      ['Free users',d.free_users],
      ['Conversion %',d.paid_conversion_pct]
    ]);

    stats('#paymentStats',[
      ['Revenue ₹',d.revenue_total],
      ['Refunds ₹',d.refund_total],
      ['Failed payments',d.failed_payments]
    ]);

    let [tr,pr,tor]=await Promise.all([
      rpc('admin_list_cc_teams',{_limit:300}),
      rpc('admin_list_cc_players',{_limit:500}),
      rpc('admin_list_cc_tournaments',{_limit:300})
    ]);

    $('#teamContent').innerHTML=tr.error
      ?esc(tr.error.message)
      :'<table><thead><tr><th>Team</th><th>City</th><th>Owner</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
        (tr.data||[]).map(x=>
          `<tr>
            <td>${esc(x.name)}</td>
            <td>${esc(x.city||'—')}</td>
            <td>${esc(x.owner_email||'—')}</td>
            <td>${esc(x.status)}</td>
            <td>
              <button class="btn danger small"
                data-delete-table="cc_teams"
                data-delete-id="${esc(x.id)}"
                data-delete-label="team ${esc(x.name)}">Delete</button>
            </td>
          </tr>`
        ).join('')+
        '</tbody></table><p class="hint">Delete actions are restricted to the verified Super Admin and are written to the audit log.</p>';

    $('#tournamentContent').innerHTML=tor.error
      ?esc(tor.error.message)
      :'<table><thead><tr><th>Tournament</th><th>Format</th><th>City</th><th>Organizer</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
        (tor.data||[]).map(x=>
          `<tr>
            <td>${esc(x.name)}</td>
            <td>${esc(x.format)}</td>
            <td>${esc(x.city||'—')}</td>
            <td>${esc(x.organizer_email||'—')}</td>
            <td>${esc(x.status)}</td>
            <td>
              <button class="btn danger small"
                data-delete-table="cc_tournaments"
                data-delete-id="${esc(x.id)}"
                data-delete-label="tournament ${esc(x.name)}">Delete</button>
            </td>
          </tr>`
        ).join('')+
        '</tbody></table>';

    $('#teamContent').insertAdjacentHTML('beforeend',
      '<h3>Player directory</h3><div class="table-wrap"><table><thead><tr><th>Player</th><th>Team</th><th>Batting</th><th>Bowling</th><th>Added by</th><th>Action</th></tr></thead><tbody>'+
      (pr.error
        ?`<tr><td colspan="6">${esc(pr.error.message)}</td></tr>`
        :(pr.data||[]).map(x=>
          `<tr>
            <td>${esc(x.display_name)}</td>
            <td>${esc(x.team_id||'—')}</td>
            <td>${esc(x.batting_hand||'—')}</td>
            <td>${esc(x.bowling_style||'—')}</td>
            <td>${esc(x.creator_email||'—')}</td>
            <td>
              <button class="btn danger small"
                data-delete-table="cc_players"
                data-delete-id="${esc(x.id)}"
                data-delete-label="player ${esc(x.display_name)}">Delete</button>
            </td>
          </tr>`
        ).join(''))+
      '</tbody></table></div>'
    );

    notice.textContent='Super Admin verified. Connected data loaded; unavailable integrations are marked.';
    await audit('admin_dashboard_loaded');
  }

  async function deleteRecord(button){
    const table=button.dataset.deleteTable;
    const id=button.dataset.deleteId;
    const label=button.dataset.deleteLabel||'this record';

    if(!table||!id){
      alert('Missing table name or record ID.');
      return;
    }

    if(!confirm(`Permanently delete ${label}? This cannot be undone.`)){
      return;
    }

    button.disabled=true;

    try{
      const r=await rpc('admin_delete_record',{
        _table:table,
        _id:id
      });

      if(r.error){
        throw new Error(r.error.message);
      }

      const result=r.data;

      if(!result||result.deleted!==true){
        throw new Error(result?.message||'No record was deleted.');
      }

      alert(`Deleted successfully. Rows deleted: ${result.rows_deleted??1}`);

      await audit('admin_record_deleted',{
        table,
        record_id:id,
        label
      });

      await load();

    }catch(err){
      alert('Delete failed: '+(err.message||String(err)));
      button.disabled=false;
    }
  }

  async function showMatchDetail(id){
    let r=await rpc('admin_match_detail',{_match_id:id});
    let el=$('#scoreDetail');

    el.hidden=false;

    if(r.error){
      el.innerHTML=`<p class="error">${esc(r.error.message)}</p>`;
      return;
    }

    const d=r.data||{};
    const m=d.match||{};
    const balls=d.deliveries||[];

    const innings=[1,2].map(n=>{
      const rows=balls.filter(x=>
        Number(x.innings_no??x.innings??1)===n
      );

      const runs=rows.reduce((v,x)=>
        v+Number(x.total_runs||0),0
      );

      const wickets=rows.filter(x=>x.wicket).length;

      const legal=rows.filter(x=>
        !['wide','no_ball'].includes(
          String(x.event_type||'').toLowerCase()
        )
      ).length;

      return {
        n,
        rows,
        runs,
        wickets,
        overs:`${Math.floor(legal/6)}.${legal%6}`
      };
    });

    el.innerHTML=`
      <div class="scoreboard-detail">
        <div class="scoreboard-head">
          <div>
            <span class="eyebrow">${esc(m.status||'MATCH')}</span>
            <h2>${esc(m.match_title||`${m.team_a||'Team A'} vs ${m.team_b||'Team B'}`)}</h2>
            <p>${esc(m.team_a||'Team A')} vs ${esc(m.team_b||'Team B')}</p>
          </div>
        </div>

        ${innings.map(inn=>{
          const batting=inn.n===1
            ?(m.innings===1?m.batting_team:m.team_a)
            :(m.innings===2?m.batting_team:m.team_b);

          const rows=inn.rows;

          return `
            <section class="innings-card">
              <h3>${inn.n===1?'1st':'2nd'} Innings ${rows.length?'':'· No saved deliveries'}</h3>
              <p class="innings-team">${esc(batting||'Batting team not recorded')}</p>
              <strong class="big-score">
                ${inn.runs}/${inn.wickets}
                <small>${inn.overs} overs</small>
              </strong>

              <div class="delivery-list">
                ${rows.length
                  ?rows.map(x=>
                    `<div>
                      <b>${esc(x.over_number??'—')}.${esc(x.ball_in_over??'—')}</b>
                      <span>${esc(x.event_type||'Delivery')}</span>
                      <strong>${esc(x.total_runs??0)} runs${x.wicket?' · WICKET':''}</strong>
                      <small>${esc(x.commentary||'')}</small>
                    </div>`
                  ).join('')
                  :'<p>No deliveries saved for this innings.</p>'
                }
              </div>
            </section>
          `;
        }).join('')}

        <div class="scoreboard-current">
          <span>Current striker: <b>${esc(m.striker||'—')}</b></span>
          <span>Non-striker: <b>${esc(m.non_striker||'—')}</b></span>
          <span>Bowler: <b>${esc(m.bowler||'—')}</b></span>
        </div>

        <p class="hint">
          Innings scores are calculated from saved deliveries grouped by innings number.
          Older deliveries without an innings number are assigned to the first innings;
          they cannot be reliably split retrospectively.
        </p>
      </div>
    `;
  }

  async function init(){
    if(!db){
      fail('Supabase client unavailable');
      return;
    }

    let {data:{session}}=await db.auth.getSession();

    if(!session){
      fail('Sign in on the main website first');
      return;
    }

    $('#adminEmail').textContent=session.user.email||'Admin';
    $('#logout').hidden=false;

    let role=await rpc('has_role',{_role:'super_admin'});

    if(role.error||role.data!==true){
      fail('Access denied: Super Admin role not verified');
      return;
    }

    $('#dashboard').hidden=false;

    const beat=async()=>{
      const h=await db.from('cc_presence').upsert({
        user_id:session.user.id,
        last_seen_at:new Date().toISOString()
      },{onConflict:'user_id'});

      if(h.error)console.warn('Admin presence heartbeat:',h.error.message);
    };

    await beat();

    setInterval(()=>{
      if(!document.hidden)beat();
    },30000);

    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden)beat();
    });

    await load();
    nav(location.hash.slice(1)||'overview');
  }

  $('#nav').addEventListener('click',e=>{
    let a=e.target.closest('[data-page]');

    if(a){
      e.preventDefault();
      nav(a.dataset.page);
      audit('admin_section_opened',{section:a.dataset.page});
    }
  });

  window.addEventListener('hashchange',()=>
    nav(location.hash.slice(1))
  );

  $('#refresh').addEventListener('click',load);
  $('#reloadUsers').addEventListener('click',loadUsers);
  $('#userSearch').addEventListener('input',renderUsers);
  $('#matchSearch').addEventListener('input',renderMatches);
  $('#matchFilter').addEventListener('change',renderMatches);

  $('#matchRows').addEventListener('click',async e=>{
    let b=e.target.closest('[data-id]');
    if(!b)return;
    await showMatchDetail(b.dataset.id);
  });

  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-delete-table][data-delete-id]');
    if(!b)return;
    await deleteRecord(b);
  });

  $('#userRows').addEventListener('click',async e=>{
    const b=e.target.closest('[data-user-action]');
    if(!b)return;

    const action=b.dataset.userAction;
    const id=b.dataset.userId;
    const email=b.dataset.userEmail;

    if(!id||email?.toLowerCase()==='reshantj@gmail.com')return;

    const prompts={
      force:`Force Stop ${email}? New sign-ins will be blocked. Existing sessions may remain active until their tokens expire.`,
      restore:`Restore access for ${email}?`,
      delete:`Permanently delete ${email}? This cannot be undone.`
    };

    if(!confirm(prompts[action]))return;

    b.disabled=true;

    try{
      const endpoint=action==='delete'
        ?'admin-delete-user'
        :'admin-user-control';

      const body=action==='delete'
        ?{user_id:id}
        :{
          user_id:id,
          action:action==='force'?'force_stop':'restore_access'
        };

      const result=await db.functions.invoke(endpoint,{body});

      if(result.error)throw result.error;

      alert(result.data?.message||'Action completed.');

      await loadUsers();

      await audit('admin_user_'+action,{
        user_id:id,
        email
      });

    }catch(err){
      let detail=err?.message||String(err);

      try{
        const ctx=err?.context;

        if(ctx&&typeof ctx.text==='function'){
          const raw=await ctx.text();

          if(raw){
            try{
              const parsed=JSON.parse(raw);
              detail=parsed.error||parsed.message||raw;
            }catch{
              detail=raw;
            }
          }
        }
      }catch{}

      alert(
        'Action failed: '+detail+
        '\n\nIf this says function not found or failed to send request, deploy the Supabase Edge Functions from the supabase/functions folder.'
      );

      b.disabled=false;
    }
  });

  $('#logout').addEventListener('click',async()=>{
    await db.auth.signOut();
    location.href='../';
  });

  db?.auth.onAuthStateChange((e,s)=>{
    if(e==='SIGNED_OUT'||!s)location.href='../';
  });

  init();
})();

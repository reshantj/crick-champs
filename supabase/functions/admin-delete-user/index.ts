import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization'); if (!authHeader) throw new Error('Authentication required');
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await caller.auth.getUser(); if (userErr || !user) throw new Error('Invalid session');
    const { data: allowed, error: roleErr } = await caller.rpc('has_role', { _role: 'super_admin' });
    if (roleErr || allowed !== true) throw new Error('Super Admin access required');
    const { user_id } = await req.json(); if (!user_id || user_id === user.id) throw new Error('Invalid target account');
    const admin = createClient(url, service);
    const { data: target, error: targetErr } = await admin.auth.admin.getUserById(user_id);
    if (targetErr || !target.user) throw new Error('User not found');
    if ((target.user.email || '').toLowerCase() === 'reshantj@gmail.com') throw new Error('The primary Super Admin account is protected');
    // Remove the target's own operational records in FK-safe order. Financial/audit history is not silently erased.
    const checked = async (label: string, operation: () => PromiseLike<any>) => {
      const { error } = await operation();
      if (error) throw new Error(`Could not remove ${label}: ${error.message}`);
    };
    await checked('matches', () => admin.from('cc_live_matches').delete().eq('owner_id', user_id));
    await checked('players', () => admin.from('cc_players').delete().eq('created_by', user_id));
    await checked('team memberships', () => admin.from('cc_team_members').delete().eq('user_id', user_id));
    const owned = await admin.from('cc_teams').select('id').eq('owner_id', user_id);
    if (owned.error) throw new Error(`Could not inspect owned teams: ${owned.error.message}`);
    const ids = (owned.data || []).map((x: { id: string }) => x.id);
    if (ids.length) {
      await checked('team memberships', () => admin.from('cc_team_members').delete().in('team_id', ids));
      await checked('player team links', () => admin.from('cc_players').update({ team_id: null }).in('team_id', ids));
      await checked('teams', () => admin.from('cc_teams').delete().in('id', ids));
    }
    await checked('tournaments', () => admin.from('cc_tournaments').delete().eq('organizer_id', user_id));
    await checked('presence', () => admin.from('cc_presence').delete().eq('user_id', user_id));
    await checked('profile', () => admin.from('profiles').delete().eq('id', user_id));
    await checked('role', () => admin.from('user_roles').delete().eq('user_id', user_id));
    await checked('account controls', () => admin.from('admin_user_controls').delete().eq('user_id', user_id));
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user_id);
    if (deleteErr) throw new Error(`Account could not be deleted. A protected financial or historical record may still reference it: ${deleteErr.message}`);
    await admin.from('admin_audit_logs').insert({ actor_id: user.id, action: 'user_account_deleted', details: { target_user_id: user_id, target_email: target.user.email } });
    return reply({ success: true, message: 'Account and its owned operational records were deleted.' });
  } catch (e) { return reply({ error: e instanceof Error ? e.message : 'Request failed' }, 400); }
});

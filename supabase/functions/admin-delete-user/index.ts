import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
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
    // Auth foreign keys with RESTRICT intentionally stop deletion if owned business records still depend on this account.
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user_id);
    if (deleteErr) throw new Error(`Account could not be deleted safely: ${deleteErr.message}. Transfer or archive dependent records first.`);
    await admin.from('admin_audit_logs').insert({ actor_id: user.id, action: 'user_account_deleted', details: { target_user_id: user_id, target_email: target.user.email } });
    return new Response(JSON.stringify({ success: true, message: 'User account deleted.' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) { return new Response(JSON.stringify({ error: e.message || 'Request failed' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
});

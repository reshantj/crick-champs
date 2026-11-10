import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization'); if (!authHeader) throw new Error('Authentication required');
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await caller.auth.getUser(); if (userErr || !user) throw new Error('Invalid session');
    if ((user.email || '').toLowerCase() === 'reshantj@gmail.com') { /* identity is still checked against role below */ }
    const { data: allowed, error: roleErr } = await caller.rpc('has_role', { _role: 'super_admin' });
    if (roleErr || allowed !== true) throw new Error('Super Admin access required');
    const { user_id, action } = await req.json();
    if (!user_id || !['force_stop', 'restore_access'].includes(action)) throw new Error('Invalid request');
    if (user_id === user.id) throw new Error('You cannot suspend your own administrator account');
    const admin = createClient(url, service);
    const { data: target, error: targetErr } = await admin.auth.admin.getUserById(user_id);
    if (targetErr || !target.user) throw new Error('User not found');
    if ((target.user.email || '').toLowerCase() === 'reshantj@gmail.com') throw new Error('The primary Super Admin account is protected');
    const suspended = action === 'force_stop';
    const { error: banErr } = await admin.auth.admin.updateUserById(user_id, { ban_duration: suspended ? '876000h' : 'none' });
    if (banErr) throw banErr;
    const { error: stateErr } = await admin.from('admin_user_controls').upsert({ user_id, account_status: suspended ? 'suspended' : 'active', updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (stateErr) throw stateErr;
    await admin.from('admin_audit_logs').insert({ actor_id: user.id, action: suspended ? 'user_force_stopped' : 'user_access_restored', details: { target_user_id: user_id, target_email: target.user.email } });
    return new Response(JSON.stringify({ success: true, message: suspended ? 'Account suspended; new sign-ins are blocked. Existing sessions may remain valid until token expiry.' : 'Account access restored.' }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) { return new Response(JSON.stringify({ error: e.message || 'Request failed' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }); }
});

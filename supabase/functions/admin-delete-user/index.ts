import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !service) throw new Error('Supabase Edge Function environment is incomplete.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authentication required');

    const caller = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userErr } = await caller.auth.getUser();
    if (userErr || !user) throw new Error('Invalid session');

    const { data: allowed, error: roleErr } = await caller.rpc('has_role', { _role: 'super_admin' });
    if (roleErr || allowed !== true) throw new Error('Super Admin access required');

    const body = await req.json();
    const user_id = body?.user_id;
    if (typeof user_id !== 'string' || !user_id || user_id === user.id) {
      throw new Error('Invalid target account');
    }

    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: target, error: targetErr } = await admin.auth.admin.getUserById(user_id);
    if (targetErr || !target.user) throw new Error('User not found');
    if ((target.user.email || '').toLowerCase() === 'reshantj@gmail.com') {
      throw new Error('The primary Super Admin account is protected');
    }

    // The SQL SECURITY DEFINER RPC performs FK-safe cleanup. This avoids the
    // previous direct REST DELETE failure: permission denied for cc_live_matches.
    const { data: prepared, error: prepareErr } = await admin.rpc('admin_prepare_user_deletion', {
      _user_id: user_id,
      _actor_id: user.id,
    });
    if (prepareErr) throw new Error(`Could not prepare account deletion: ${prepareErr.message}`);
    if (!prepared?.prepared) throw new Error('Account cleanup was not confirmed');

    const { error: deleteErr } = await admin.auth.admin.deleteUser(user_id);
    if (deleteErr) {
      throw new Error(`Account could not be deleted after operational cleanup: ${deleteErr.message}`);
    }

    // Audit failure should be visible but must not pretend the account deletion failed.
    const { error: auditErr } = await admin.from('admin_audit_logs').insert({
      actor_id: user.id,
      action: 'user_account_deleted',
      details: { target_user_id: user_id, target_email: target.user.email },
    });
    return reply({
      success: true,
      message: 'Account and owned operational records were deleted.',
      audit_warning: auditErr?.message ?? null,
    });
  } catch (e) {
    return reply({ error: e instanceof Error ? e.message : 'Request failed' }, 400);
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, hmacDigest } from '../_shared/pin.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const { bootstrap_secret, pin, nama_lengkap, user_id } = await request.json();
    const expectedSecret = Deno.env.get('BOOTSTRAP_SECRET');
    const pepper = Deno.env.get('PIN_PEPPER');
    if (!expectedSecret || bootstrap_secret !== expectedSecret) return json({ error: 'Tidak diizinkan.' }, 403);
    if (!pepper || pepper.length < 32 || typeof pin !== 'string' || !/^\d{6}$/.test(pin)) return json({ error: 'Konfigurasi atau PIN tidak valid.' }, 400);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: admins, error: listError } = await admin.from('profiles').select('id,user_id').eq('role', 'admin');
    if (listError) throw listError;
    let userId = user_id as string | undefined;
    let created = false;
    let existingProfileIdToLink: string | null = null;
    if (admins?.length) {
      if (admins.length !== 1 || (userId && admins[0].user_id && admins[0].user_id !== userId)) return json({ error: 'Bootstrap hanya boleh menautkan admin tunggal yang belum memiliki PIN.' }, 409);
      if (admins[0].user_id) {
        userId = admins[0].user_id;
        const { data: credential, error } = await admin.from('pin_credentials').select('user_id').eq('user_id', userId).maybeSingle();
        if (error) throw error;
        if (credential) return json({ error: 'PIN admin sudah aktif. Hapus secret bootstrap dari Edge Function.' }, 409);
      } else {
        const email = `admin-${crypto.randomUUID()}@login.invalid`;
        const { data, error } = await admin.auth.admin.createUser({ email, password: crypto.randomUUID() + crypto.randomUUID(), email_confirm: true });
        if (error || !data.user) throw error || new Error('Gagal membuat akun admin.');
        userId = data.user.id;
        created = true;
        existingProfileIdToLink = admins[0].id;
      }
    } else {
      const email = `admin-${crypto.randomUUID()}@login.invalid`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: crypto.randomUUID() + crypto.randomUUID(), email_confirm: true });
      if (error || !data.user) throw error || new Error('Gagal membuat akun admin.');
      userId = data.user.id;
      created = true;
      const { error: profileError } = await admin.from('profiles').insert({ user_id: userId, nama_lengkap: String(nama_lengkap || 'Admin Desa').trim(), role: 'admin' });
      if (profileError) {
        await admin.auth.admin.deleteUser(userId);
        throw profileError;
      }
    }
    const digest = await hmacDigest(pepper, `pin:${pin}`);
    const { error: credentialError } = await admin.from('pin_credentials').insert({ user_id: userId, pin_digest: digest });
    if (credentialError) {
      if (created) await admin.auth.admin.deleteUser(userId!);
      throw credentialError;
    }
    if (existingProfileIdToLink) {
      const { error: linkError } = await admin.from('profiles').update({ user_id: userId, updated_at: new Date().toISOString() }).eq('id', existingProfileIdToLink);
      if (linkError) {
        await admin.from('pin_credentials').delete().eq('user_id', userId);
        if (created) await admin.auth.admin.deleteUser(userId!);
        throw linkError;
      }
    }
    return json({ success: true, message: 'Admin pertama siap. Segera hapus secret BOOTSTRAP_SECRET dari Edge Function.' });
  } catch (error) {
    console.error('bootstrap-admin failed:', error);
    const diagnostic = error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
    return json({ error: 'Bootstrap admin gagal.', diagnostic }, 400);
  }
});

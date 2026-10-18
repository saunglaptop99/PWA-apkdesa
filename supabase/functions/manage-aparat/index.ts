import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, hmacDigest } from '../_shared/pin.ts';

const roles = new Set(['admin', 'dusun', 'rw', 'rt']);
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  let createdUserId: string | null = null;
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pepper = Deno.env.get('PIN_PEPPER');
    if (!pepper || pepper.length < 32) throw new Error('PIN_PEPPER belum dikonfigurasi.');
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Sesi admin tidak ditemukan.' }, 401);

    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) return json({ error: 'Sesi admin tidak valid.' }, 401);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: adminProfile, error: adminError } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
    if (adminError || adminProfile.role !== 'admin') return json({ error: 'Hanya admin desa yang dapat mengelola akun aparat.' }, 403);

    const body = await request.json();
    if (body.action === 'delete') {
      const { data: target, error: targetError } = await admin.from('profiles').select('user_id,role').eq('id', body.id).single();
      if (targetError) throw targetError;
      if (target.role === 'admin') return json({ error: 'Akun admin tidak dapat dihapus dari panel ini.' }, 400);
      const { error } = target.user_id
        ? await admin.auth.admin.deleteUser(target.user_id)
        : await admin.from('profiles').delete().eq('id', body.id);
      if (error) throw error;
      return json({ success: true });
    }

    const profile = body.profile || {};
    const id = body.id || null;
    const pin = body.pin;
    if (!profile.nama_lengkap?.trim() || !roles.has(profile.role)) return json({ error: 'Nama dan role aparat wajib valid.' }, 400);
    if (!id && (typeof pin !== 'string' || !/^\d{6}$/.test(pin))) return json({ error: 'PIN awal wajib 6 angka.' }, 400);
    if (pin !== undefined && pin !== '' && (typeof pin !== 'string' || !/^\d{6}$/.test(pin))) return json({ error: 'PIN harus 6 angka.' }, 400);
    if (profile.role === 'rt' && (!profile.wilayah_dusun || !profile.wilayah_rw || !profile.wilayah_rt)) return json({ error: 'Aparat RT wajib memiliki dusun, RW, dan RT.' }, 400);
    if (profile.role === 'rw' && (!profile.wilayah_dusun || !profile.wilayah_rw)) return json({ error: 'Aparat RW wajib memiliki dusun dan RW.' }, 400);
    if (profile.role === 'dusun' && !profile.wilayah_dusun) return json({ error: 'Kepala dusun wajib memiliki wilayah dusun.' }, 400);

    if (profile.role !== 'admin') {
      let territoryQuery = admin.from('wilayah_desa').select('id').eq('dusun', String(profile.wilayah_dusun).trim());
      if (['rt', 'rw'].includes(profile.role)) territoryQuery = territoryQuery.eq('rw', String(profile.wilayah_rw).padStart(2, '0'));
      if (profile.role === 'rt') territoryQuery = territoryQuery.eq('rt', String(profile.wilayah_rt).padStart(2, '0'));
      const { data: territory, error: territoryError } = await territoryQuery.maybeSingle();
      if (territoryError) throw territoryError;
      if (!territory) return json({ error: 'Wilayah tugas belum ada di master wilayah. Tambahkan Dusun/RW/RT terlebih dahulu.' }, 400);
    }

    let userId: string;
    if (id) {
      const { data: existing, error } = await admin.from('profiles').select('id,user_id,role').eq('id', id).single();
      if (error) throw error;
      if (existing.role === 'admin' && user.id !== existing.user_id) return json({ error: 'Perubahan profil admin lain tidak diizinkan.' }, 403);
      if (existing.user_id) {
        userId = existing.user_id;
      } else {
        if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) return json({ error: 'Profil lama belum memiliki akun. Isi PIN baru 6 angka untuk mengaktifkannya.' }, 400);
        const email = `aparat-${crypto.randomUUID()}@login.invalid`;
        const { data, error: createError } = await admin.auth.admin.createUser({ email, password: crypto.randomUUID() + crypto.randomUUID(), email_confirm: true, user_metadata: { nama_lengkap: profile.nama_lengkap.trim() } });
        if (createError || !data.user) throw createError || new Error('Akun Auth gagal dibuat.');
        userId = data.user.id;
        createdUserId = userId;
      }
    } else {
      const email = `aparat-${crypto.randomUUID()}@login.invalid`;
      const { data, error } = await admin.auth.admin.createUser({ email, password: crypto.randomUUID() + crypto.randomUUID(), email_confirm: true, user_metadata: { nama_lengkap: profile.nama_lengkap.trim() } });
      if (error || !data.user) throw error || new Error('Akun Auth gagal dibuat.');
      userId = data.user.id;
      createdUserId = userId;
    }

    const { data: previousCredential, error: previousCredentialError } = await admin.from('pin_credentials').select('pin_digest').eq('user_id', userId).maybeSingle();
    if (previousCredentialError) throw previousCredentialError;
    if (!pin && !previousCredential) return json({ error: 'Akun ini belum memiliki PIN. Masukkan PIN baru 6 angka untuk mengaktifkannya.' }, 400);
    const payload = {
      user_id: userId,
      username: profile.username?.trim().toLowerCase() || null,
      nama_lengkap: profile.nama_lengkap.trim(),
      jabatan: profile.jabatan?.trim() || null,
      telepon: profile.telepon?.trim() || null,
      role: profile.role,
      wilayah_dusun: profile.role === 'admin' ? null : profile.wilayah_dusun,
      wilayah_rw: ['rt', 'rw'].includes(profile.role) ? String(profile.wilayah_rw).padStart(2, '0') : null,
      wilayah_rt: profile.role === 'rt' ? String(profile.wilayah_rt).padStart(2, '0') : null,
      updated_at: new Date().toISOString(),
    };
    const digest = pin ? await hmacDigest(pepper, `pin:${pin}`) : null;
    if (digest) {
      const { data: duplicate, error } = await admin.from('pin_credentials').select('user_id').eq('pin_digest', digest).maybeSingle();
      if (error) throw error;
      if (duplicate && duplicate.user_id !== userId) {
        if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
        createdUserId = null;
        return json({ error: 'PIN sudah dipakai aparat lain. Pilih PIN berbeda.' }, 409);
      }
    }
    if (digest) {
      const { error } = await admin.from('pin_credentials').upsert({ user_id: userId, pin_digest: digest, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
    }
    const { error: profileError } = id
      ? await admin.from('profiles').update(payload).eq('id', id)
      : await admin.from('profiles').insert(payload);
    if (profileError) {
      if (digest) {
        if (previousCredential) {
          const { error: rollbackError } = await admin.from('pin_credentials').update({ pin_digest: previousCredential.pin_digest, updated_at: new Date().toISOString() }).eq('user_id', userId);
          if (rollbackError) console.error('PIN rollback failed:', rollbackError);
        } else {
          const { error: rollbackError } = await admin.from('pin_credentials').delete().eq('user_id', userId);
          if (rollbackError) console.error('PIN rollback failed:', rollbackError);
        }
      }
      throw profileError;
    }
    createdUserId = null;
    return json({ success: true });
  } catch (error) {
    if (createdUserId) {
      const cleanup = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
      await cleanup.auth.admin.deleteUser(createdUserId);
    }
    console.error('manage-aparat failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Gagal memproses akun aparat.' }, 400);
  }
});

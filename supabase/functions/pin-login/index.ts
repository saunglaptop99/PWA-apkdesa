import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, hmacDigest } from '../_shared/pin.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const { pin } = await request.json();
    if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) return json({ message: 'PIN harus terdiri dari 6 angka.' }, 400);

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const pepper = Deno.env.get('PIN_PEPPER');
    if (!pepper || pepper.length < 32) throw new Error('PIN_PEPPER belum dikonfigurasi dengan benar.');
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const bucket = await hmacDigest(pepper, `ip:${clientIp}`);
    const { data: allowed, error: limitError } = await admin.rpc('pin_login_allowed', { p_bucket_key: bucket });
    if (limitError) throw limitError;
    if (!allowed) return json({ message: 'Terlalu banyak percobaan. Tunggu 15 menit lalu coba lagi.' }, 429);

    const digest = await hmacDigest(pepper, `pin:${pin}`);
    const { data: credential, error: credentialError } = await admin
      .from('pin_credentials').select('user_id').eq('pin_digest', digest).maybeSingle();
    if (credentialError) throw credentialError;
    if (!credential) return json({ message: 'PIN tidak cocok. Periksa kembali atau hubungi admin.' }, 401);

    const { data: profile, error: profileError } = await admin.from('profiles').select('id').eq('user_id', credential.user_id).maybeSingle();
    if (profileError || !profile) return json({ message: 'Akun tidak aktif. Hubungi admin desa.' }, 401);
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(credential.user_id);
    if (accountError || !account.user?.email) return json({ message: 'Akun tidak aktif. Hubungi admin desa.' }, 401);

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email: account.user.email });
    if (linkError || !link.properties?.hashed_token) throw linkError || new Error('Gagal membuat sesi login.');
    await admin.rpc('pin_login_clear', { p_bucket_key: bucket });
    return json({ token_hash: link.properties.hashed_token });
  } catch (error) {
    console.error('pin-login failed:', error);
    return json({ message: 'Layanan login belum siap. Hubungi admin desa.' }, 500);
  }
});

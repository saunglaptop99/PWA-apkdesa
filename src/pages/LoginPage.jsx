import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDesa } from '../context/DesaContext';
import { AlertCircle, ArrowRight, LockKeyhole } from 'lucide-react';

export default function LoginPage() {
  const { loginWithPin } = useAuth();
  const { pengaturanDesa } = useDesa();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired] = useState(() => {
    try {
      const expired = sessionStorage.getItem('sim-session-expired') === '1';
      sessionStorage.removeItem('sim-session-expired');
      return expired;
    } catch { return false; }
  });

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const result = await loginWithPin(pin);
    if (!result.success) setError(result.message);
    setLoading(false);
  };

  return (
    <div
      className="login-page min-h-screen flex flex-col px-5 py-8"
      style={{ '--login-background-image': `url("${import.meta.env.BASE_URL}halaman-desa-login.webp")` }}
    >
      <div className="login-content w-full max-w-md mx-auto">
        <div className="login-header mb-7">
          <img className="login-emblem" src={`${import.meta.env.BASE_URL}bekasikab.png`} alt="Lambang Kabupaten Bekasi" />
          <p className="login-kabupaten">KABUPATEN BEKASI</p>
          <p className="login-overline">Portal Aparatur Desa</p>
          <h1 className="login-title">{pengaturanDesa?.nama_desa?.trim() || 'Nama Desa'}</h1>
          <p className="login-subtitle">Masuk dengan PIN yang diberikan admin.</p>
        </div>
        <form onSubmit={submit} className="login-form space-y-5">
          {sessionExpired && <div role="status" className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">Sesi berakhir demi keamanan. Silakan masuk kembali.</div>}
          {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"><AlertCircle size={15} /><span>{error}</span></div>}
          <label className="block text-sm font-semibold text-slate-800">PIN aparat
            <span className="relative block mt-2"><LockKeyhole className="absolute left-3.5 top-3.5 text-slate-400" size={17} /><input type="password" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} required placeholder="6 angka" className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 text-lg tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-teal-700" /></span>
          </label>
          <button type="submit" disabled={loading} className="login-submit w-full py-3 bg-teal-800 hover:bg-teal-900 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-70">{loading ? 'Memverifikasi…' : 'Masuk'}{!loading && <ArrowRight size={16} />}</button>
          <p className="text-xs text-slate-500 leading-relaxed">PIN dikelola admin. Jika aparat lupa PIN, hubungi admin desa. Jika admin lupa PIN, pemulihan harus dilakukan pengelola project Supabase.</p>
        </form>
        <p className="login-credit mt-6 text-[10px] text-slate-500">Dikembangkan oleh <strong>K2C Komputindo Team</strong><br />081298406844</p>
      </div>
    </div>
  );
}

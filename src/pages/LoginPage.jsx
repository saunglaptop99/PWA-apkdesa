import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth, DEMO_PROFILES } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Sparkles, UserCheck, Shield } from 'lucide-react';

export default function LoginPage() {
  const { loginDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDemoOptions, setShowDemoOptions] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage(error.message || 'Kredensial salah atau akun belum terdaftar oleh Admin Desa.');
      }
    } catch (err) {
      setErrorMessage('Terjadi gangguan jaringan saat menghubungi server autentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950 flex flex-col justify-center px-4 py-8 sm:px-6 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        {/* Header Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl mb-3 text-emerald-300">
            <ShieldCheck size={42} strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">PORTAL APARAT DESA</h1>
          <p className="text-xs text-teal-200 mt-1 max-w-xs mx-auto">
            Aplikasi PWA Administrasi Kependudukan, Bansos & Layanan Surat Terpadu
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/40">
          <div className="mb-5">
            <h2 className="text-lg font-extrabold text-slate-800">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Akses disesuaikan dengan wilayah kewenangan RT, RW, Dusun, atau Admin.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Aparat</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-400" size={17} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="rt01@desa.id"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 text-slate-400" size={17} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all shadow-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
            >
              {loading ? 'Memverifikasi Kredensial...' : 'Masuk Sekarang'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>

          {/* Quick Demo Login Option for Instant Testing */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDemoOptions(!showDemoOptions)}
              className="w-full py-2 px-3 rounded-xl bg-teal-50/70 hover:bg-teal-100/70 text-teal-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Sparkles size={14} className="text-teal-600" />
              <span>{showDemoOptions ? 'Tutup Pilihan Demo' : 'Uji Coba Cepat (Pilih Role Langsung)'}</span>
            </button>

            {showDemoOptions && (
              <div className="mt-3 space-y-1.5 animate-fade-in">
                <p className="text-[10px] text-slate-400 text-center mb-1">
                  Pilih salah satu peran aparatur untuk langsung menguji aplikasi:
                </p>
                {DEMO_PROFILES.map((dp) => (
                  <button
                    key={dp.id}
                    type="button"
                    onClick={() => loginDemo(dp)}
                    className="w-full p-2 rounded-xl border border-teal-100 hover:border-teal-300 hover:bg-teal-50/50 text-left flex justify-between items-center transition-all group"
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-800 group-hover:text-teal-800">
                        {dp.nama_lengkap}
                      </div>
                      <div className="text-[9.5px] text-slate-400">
                        {dp.role === 'admin'
                          ? 'Akses Semua Data Warga & Mutasi'
                          : dp.role === 'dusun'
                          ? `Hanya Wilayah Dusun ${dp.wilayah_dusun}`
                          : dp.role === 'rw'
                          ? `Hanya Wilayah RW ${dp.wilayah_rw}`
                          : `Hanya Wilayah RT ${dp.wilayah_rt} / RW ${dp.wilayah_rw}`}
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                      {dp.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[10.5px] text-slate-400 font-medium">
              PWA Offline-Ready • Hak Akses Terisolasi RLS Supabase
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

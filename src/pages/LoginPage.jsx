import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useDesa } from '../context/DesaContext';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  UserCheck,
  Check,
  ChevronDown,
  Delete,
  MapPin,
} from 'lucide-react';

export default function LoginPage() {
  const { aparatList, loginWithPin } = useAuth();
  const { pengaturanDesa } = useDesa();

  // Login Mode: 'pin' (default cepat) | 'email'
  const [loginMode, setLoginMode] = useState('pin');

  // PIN Login State
  const [selectedAparatId, setSelectedAparatId] = useState(
    aparatList?.[3]?.id || aparatList?.[0]?.id || ''
  );
  const [pinDigits, setPinDigits] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Email Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const selectedAparat = aparatList.find((a) => a.id === selectedAparatId) || aparatList[0];

  const handleKeypadPress = async (num) => {
    if (pinDigits.length >= 6) return;
    const nextPin = pinDigits + num;
    setPinDigits(nextPin);
    setPinError('');

    // Otomatis verifikasi jika sudah 6 digit
    if (nextPin.length === 6) {
      await executePinLogin(nextPin);
    }
  };

  const handleKeypadDelete = () => {
    setPinDigits((prev) => prev.slice(0, -1));
    setPinError('');
  };

  const handleKeypadClear = () => {
    setPinDigits('');
    setPinError('');
  };

  const executePinLogin = async (pinToVerify) => {
    setPinLoading(true);
    setPinError('');

    const res = await loginWithPin(selectedAparat.id, pinToVerify);
    if (!res.success) {
      setPinError(res.message || 'Kode PIN tidak sesuai! Default: 123456');
      setPinDigits('');
    }
    setPinLoading(false);
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setEmailError(error.message || 'Kredensial email/password salah.');
      }
    } catch (err) {
      setEmailError('Gagal menghubungi server autentikasi.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950 flex flex-col justify-center px-4 py-6 sm:px-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl mb-2.5 text-emerald-300">
            <ShieldCheck size={38} strokeWidth={2.2} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
            PORTAL APARAT {pengaturanDesa?.nama_desa ? `DESA ${pengaturanDesa.nama_desa}` : 'DESA'}
          </h1>
          <p className="text-xs text-teal-200 mt-0.5">
            Sistem Informasi Kependudukan & Pelayanan Warga Terpadu
          </p>
        </div>

        {/* Card Login */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 sm:p-7 shadow-2xl border border-white/40">
          {/* Toggle Mode Login */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setLoginMode('pin')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                loginMode === 'pin'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-900/15'
                  : 'hover:text-slate-900'
              }`}
            >
              <KeyRound size={14} />
              <span>Login PIN Cepat</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMode('email')}
              className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                loginMode === 'email'
                  ? 'bg-teal-700 text-white shadow-md shadow-teal-900/15'
                  : 'hover:text-slate-900'
              }`}
            >
              <Mail size={14} />
              <span>Email & Password</span>
            </button>
          </div>

          {/* MODE 1: LOGIN CEPAT DENGAN PIN */}
          {loginMode === 'pin' && (
            <div className="space-y-4">
              {/* Dropdown / Selector Aparat */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pilih Akun Aparatur Wilayah:
                </label>
                <div className="relative">
                  <select
                    value={selectedAparat?.id || ''}
                    onChange={(e) => {
                      setSelectedAparatId(e.target.value);
                      setPinDigits('');
                      setPinError('');
                    }}
                    className="w-full p-2.5 pr-8 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold bg-white text-slate-800 focus:ring-2 focus:ring-teal-600 outline-none shadow-sm appearance-none cursor-pointer"
                  >
                    {aparatList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nama_lengkap} — [{a.role.toUpperCase()}{' '}
                        {a.wilayah_rt ? `RT ${a.wilayah_rt}` : ''}
                        {a.wilayah_rw ? `/RW ${a.wilayah_rw}` : ''}
                        {a.wilayah_dusun ? ` ${a.wilayah_dusun}` : ''}]
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Info Wilayah Terpilih */}
              <div className="p-3 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-200/80 text-teal-900 font-extrabold uppercase">
                      {selectedAparat?.role}
                    </span>
                    <span className="text-xs font-bold text-slate-800">{selectedAparat?.nama_lengkap}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-teal-800">
                    <MapPin size={11} className="text-teal-600" />
                    <span>
                      {selectedAparat?.role === 'admin'
                        ? 'Kewenangan: Seluruh Desa'
                        : selectedAparat?.role === 'dusun'
                        ? `Wilayah: Dusun ${selectedAparat.wilayah_dusun}`
                        : selectedAparat?.role === 'rw'
                        ? `Wilayah: RW ${selectedAparat.wilayah_rw} (${selectedAparat.wilayah_dusun})`
                        : `Wilayah: RT ${selectedAparat?.wilayah_rt} / RW ${selectedAparat?.wilayah_rw}`}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-teal-700 font-mono font-bold bg-white px-2 py-1 rounded-lg border border-teal-100">
                  PIN: {selectedAparat?.pin || '123456'}
                </span>
              </div>

              {/* 6 PIN Dot Indicators */}
              <div className="text-center pt-1">
                <span className="text-xs font-bold text-slate-600 block mb-2">
                  Masukkan 6-Digit PIN Anda
                </span>
                <div className="flex justify-center items-center gap-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => {
                    const isFilled = pinDigits.length > index;
                    return (
                      <div
                        key={index}
                        className={`w-4 h-4 rounded-full transition-all duration-200 ${
                          isFilled
                            ? 'bg-teal-700 scale-125 shadow-md shadow-teal-700/30'
                            : 'bg-slate-200 border border-slate-300'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Error Message */}
              {pinError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-center gap-1.5 animate-shake text-center">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {/* On-screen Numeric Keypad (Cepat & Touch-Friendly) */}
              <div className="grid grid-cols-3 gap-2 pt-1 max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={pinLoading || pinDigits.length >= 6}
                    onClick={() => handleKeypadPress(String(num))}
                    className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-teal-100 active:scale-95 text-slate-800 text-lg font-bold shadow-sm border border-slate-200/80 transition-all flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleKeypadClear}
                  className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold transition-all flex items-center justify-center"
                >
                  C
                </button>
                <button
                  type="button"
                  disabled={pinLoading || pinDigits.length >= 6}
                  onClick={() => handleKeypadPress('0')}
                  className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-teal-100 active:scale-95 text-slate-800 text-lg font-bold shadow-sm border border-slate-200/80 transition-all flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleKeypadDelete}
                  className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all flex items-center justify-center"
                  title="Hapus"
                >
                  <Delete size={18} />
                </button>
              </div>

              {/* Status loading */}
              {pinLoading && (
                <div className="text-center text-xs text-teal-700 font-bold flex items-center justify-center gap-1.5 py-1">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-teal-700 border-t-transparent"></div>
                  <span>Memverifikasi PIN...</span>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: EMAIL & PASSWORD (SUPABASE AUTH) */}
          {loginMode === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-3.5">
              {emailError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Aparat</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-slate-400" size={17} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@desa.id"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 outline-none"
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-teal-900/15 flex items-center justify-center gap-2 transition-all disabled:opacity-70 mt-2"
              >
                {emailLoading ? 'Memverifikasi...' : 'Masuk dengan Email'}
                {!emailLoading && <ArrowRight size={16} />}
              </button>
            </form>
          )}

          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 font-medium">
              Akses Cepat PIN • Data Wilayah Terisolasi RLS Supabase
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth, DEMO_PROFILES } from '../context/AuthContext';
import {
  LogOut,
  Wifi,
  WifiOff,
  Shield,
  Layers,
  Smartphone,
  Info,
  CheckCircle,
  Database,
  UserCheck,
  ChevronRight,
} from 'lucide-react';

export default function ProfilPage() {
  const { profile, logout, isOnline, isDemoMode, loginDemo } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator Desa (Akses Penuh)';
      case 'dusun':
        return 'Kepala Dusun (Wilayah Dusun)';
      case 'rw':
        return 'Ketua RW (Wilayah RW)';
      case 'rt':
        return 'Ketua RT (Wilayah RT Saja)';
      default:
        return 'Aparat Desa';
    }
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-800 tracking-tight">Akun Aparat</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Informasi profil aparatur dan status sistem PWA</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm text-center mb-4 relative overflow-hidden">
        {/* Decorative background blob */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-teal-50 rounded-full blur-xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center mx-auto mb-3 text-xl font-black shadow-md shadow-teal-900/15">
          {profile?.nama_lengkap
            ? profile.nama_lengkap
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()
            : 'AP'}
        </div>

        <h3 className="font-extrabold text-slate-900 text-base">{profile?.nama_lengkap || 'Aparat Desa'}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{getRoleLabel(profile?.role)}</p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 bg-teal-50 border border-teal-200/80 text-teal-800 rounded-full text-[11px] font-bold uppercase tracking-wider">
          <Shield size={12} className="text-teal-600" />
          <span>Role: {profile?.role}</span>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1.5 bg-slate-50/70 p-3 rounded-2xl text-left">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Wilayah Dusun:</span>
            <span className="font-semibold text-slate-800">{profile?.wilayah_dusun || 'Seluruh Dusun (Admin)'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Wilayah RW:</span>
            <span className="font-semibold text-slate-800">{profile?.wilayah_rw ? `RW ${profile.wilayah_rw}` : 'Seluruh RW'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Wilayah RT:</span>
            <span className="font-semibold text-slate-800">{profile?.wilayah_rt ? `RT ${profile.wilayah_rt}` : 'Seluruh RT'}</span>
          </div>
        </div>
      </div>

      {/* Simulator Switcher for Reviewer / Multi-Role Testing */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-purple-50 text-purple-700">
              <UserCheck size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Uji Coba Hak Akses Wilayah</h4>
              <p className="text-[10px] text-slate-400">Ganti peran aparatur untuk menguji isolasi data</p>
            </div>
          </div>
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="text-[11px] font-bold text-purple-700 hover:text-purple-900"
          >
            {showRoleSwitcher ? 'Tutup' : 'Ubah Role'}
          </button>
        </div>

        {showRoleSwitcher && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 animate-fade-in">
            {DEMO_PROFILES.map((dp) => (
              <button
                key={dp.id}
                onClick={() => {
                  loginDemo(dp);
                  setShowRoleSwitcher(false);
                }}
                className={`w-full text-left p-2.5 rounded-xl border text-xs flex justify-between items-center transition-all ${
                  profile?.role === dp.role && profile?.id === dp.id
                    ? 'border-purple-500 bg-purple-50/70 text-purple-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    <span>{dp.nama_lengkap}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 font-mono">
                      {dp.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {dp.role === 'admin'
                      ? 'Akses Semua Data Desa'
                      : dp.role === 'dusun'
                      ? `Hanya Dusun ${dp.wilayah_dusun}`
                      : dp.role === 'rw'
                      ? `Hanya RW ${dp.wilayah_rw}`
                      : `Hanya RT ${dp.wilayah_rt} / RW ${dp.wilayah_rw}`}
                  </span>
                </div>
                {profile?.role === dp.role && profile?.id === dp.id && (
                  <CheckCircle size={15} className="text-purple-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Indikator PWA Offline & Storage */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Status Jaringan & PWA Cache</p>
              <p className="text-[10.5px] text-slate-500">
                {isOnline ? 'Terhubung • Siap sinkronisasi online' : 'Mode Offline • Data dimuat dari Workbox Cache'}
              </p>
            </div>
          </div>
          <span
            className={`text-[9.5px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
              isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}
          >
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Smartphone size={13} className="text-teal-600" />
            <span>PWA Auto-Update & Service Worker Aktif</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Aplikasi tetap dapat digunakan mencetak surat & melihat data warga saat berkunjung ke lokasi tanpa sinyal internet.
          </p>
        </div>
      </div>

      {/* Informasi Sistem & Versi */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm mb-5 text-xs text-slate-500 space-y-2">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Database size={13} className="text-teal-600" />
            <span>Basis Data</span>
          </span>
          <span className="font-mono text-slate-800">Supabase PostgreSQL + RLS</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Layers size={13} className="text-teal-600" />
            <span>Versi Aplikasi</span>
          </span>
          <span className="font-mono text-slate-800">v1.0.0 Production PWA</span>
        </div>
      </div>

      {/* Tombol Logout */}
      <button
        onClick={logout}
        className="w-full py-3 bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 rounded-2xl font-bold flex items-center justify-center gap-2 text-xs sm:text-sm border border-rose-200 shadow-sm transition-all"
      >
        <LogOut size={16} />
        <span>Keluar dari Sistem</span>
      </button>
    </div>
  );
}

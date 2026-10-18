import React from 'react';
import BrandPageHeader from '../components/common/BrandPageHeader';
import { useAuth } from '../context/AuthContext';
import { useDesa } from '../context/DesaContext';
import {
  LogOut,
  Wifi,
  WifiOff,
  Shield,
  Layers,
  Smartphone,
  Database,
  ChevronRight,
  Settings,
} from 'lucide-react';

export default function ProfilPage({ setActiveTab }) {
  const { profile, logout, isOnline } = useAuth();
  const { pengaturanDesa } = useDesa();

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator Desa (Akses Penuh)';
      case 'dusun':
        return `Kepala Dusun ${profile?.wilayah_dusun || ''}`;
      case 'rw':
        return `Ketua RW ${profile?.wilayah_rw || ''}`;
      case 'rt':
        return `Ketua RT ${profile?.wilayah_rt || '01'} / RW ${profile?.wilayah_rw || '01'}`;
      default:
        return 'Aparat Desa';
    }
  };

  return (
    <div className="app-page pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <BrandPageHeader title="Akun Aparat" subtitle={`Desa ${pengaturanDesa?.nama_desa || ''} · Status dan akses wilayah`} className="profil-topbar" />

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm text-center mb-4 relative overflow-hidden">
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

        <div className="flex justify-center items-center gap-2 mt-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 border border-teal-200/80 text-teal-800 rounded-full text-[11px] font-bold uppercase tracking-wider">
            <Shield size={12} className="text-teal-600" />
            <span>Role: {profile?.role}</span>
          </span>

        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1.5 bg-slate-50/70 p-3 rounded-2xl text-left">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Pemerintah Desa:</span>
            <span className="font-semibold text-slate-800">Desa {pengaturanDesa?.nama_desa}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Kepala Desa:</span>
            <span className="font-semibold text-slate-800">{pengaturanDesa?.nama_kepala_desa}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Wilayah Dusun:</span>
            <span className="font-semibold text-slate-800">{profile?.wilayah_dusun || 'Seluruh Dusun'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Wilayah RW:</span>
            <span className="font-semibold text-slate-800">
              {profile?.wilayah_rw ? `RW ${profile.wilayah_rw}` : 'Seluruh RW'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Wilayah RT:</span>
            <span className="font-semibold text-slate-800">
              {profile?.wilayah_rt ? `RT ${profile.wilayah_rt}` : 'Seluruh RT'}
            </span>
          </div>
        </div>
      </div>

      {/* Khusus Admin: Akses Panel Kelola Desa & Wilayah */}
      {profile?.role === 'admin' && (
        <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-3xl p-4 text-white shadow-lg shadow-teal-950/20 mb-4 animate-fade-in">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-white/10 text-emerald-300">
                <Settings size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm">Kelola Desa & Hak Akses</h4>
                <p className="text-[11px] text-teal-200">Akun aparat, Master Dusun/RW/RT, & Profil Desa</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('kelola')}
            className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 active:scale-[0.98] text-slate-950 font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <span>Buka Panel Manajemen Desa</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Indikator PWA Offline & Storage */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">Status Jaringan & PWA Cache</p>
              <p className="text-[10.5px] text-slate-500">
                {isOnline
                  ? 'Internet tersedia • status realtime terlihat di halaman warga'
                  : 'Mode Offline • Menampilkan data lokal akun ini jika tersedia'}
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
            <span>PWA Auto-Update aktif; API pribadi tidak dicache Service Worker</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Data offline hanya tersedia jika pernah dimuat di akun ini. Perubahan baru memerlukan koneksi dan tidak otomatis tersinkronisasi saat offline.
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
          <span className="font-mono text-slate-800">Supabase PostgreSQL + RLS Realtime</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Layers size={13} className="text-teal-600" />
            <span>Versi Aplikasi</span>
          </span>
          <span className="font-mono text-slate-800">v1.1.0 Production PWA</span>
        </div>
      </div>
      <p className="px-1 text-[10px] text-slate-400">Dikembangkan oleh K2C Komputindo Team · 081298406844</p>

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

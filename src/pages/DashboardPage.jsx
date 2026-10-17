import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useDesa } from '../context/DesaContext';
import { normalizeWilayah } from './WargaPage';
import {
  Users,
  AlertTriangle,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  MapPin,
  Calendar,
  Sparkles,
  Settings,
  Bell,
  Building2,
} from 'lucide-react';

export default function DashboardPage({ setActiveTab }) {
  const { profile, isOnline } = useAuth();
  const { pengaturanDesa } = useDesa();

  const [stats, setStats] = useState({
    totalWarga: 0,
    wargaMiskin: 0,
    wargaRentan: 0,
    penerimaBansos: 0,
    totalKK: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      let wargaQuery = supabase.from('warga').select('*').eq('status_kependudukan', 'aktif');

      // Terapkan isolasi wilayah
      if (profile?.role === 'rt') {
        if (profile.wilayah_rt) wargaQuery = wargaQuery.eq('rt', profile.wilayah_rt);
        if (profile.wilayah_rw) wargaQuery = wargaQuery.eq('rw', profile.wilayah_rw);
      } else if (profile?.role === 'rw') {
        if (profile.wilayah_rw) wargaQuery = wargaQuery.eq('rw', profile.wilayah_rw);
      } else if (profile?.role === 'dusun') {
        if (profile.wilayah_dusun) wargaQuery = wargaQuery.eq('dusun', profile.wilayah_dusun);
      }

      const { data: wargaData } = await wargaQuery;

      if (wargaData && wargaData.length > 0) {
        const total = wargaData.length;
        const miskin = wargaData.filter((w) => w.status_ekonomi === 'miskin').length;
        const rentan = wargaData.filter((w) => w.status_ekonomi === 'rentan').length;
        const uniqueKK = new Set(wargaData.map((w) => w.no_kk)).size;

        const { count: bansosCount } = await supabase
          .from('penerima_bansos')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalWarga: total,
          wargaMiskin: miskin,
          wargaRentan: rentan,
          penerimaBansos: bansosCount || 2,
          totalKK: uniqueKK,
        });
      } else {
        // Fallback ke local cache dengan isolasi wilayah ketat
        const cached = JSON.parse(localStorage.getItem('cached_warga_desa') || '[]');
        let filtered = cached.filter((w) => w.status_kependudukan === 'aktif');

        if (profile?.role === 'rt') {
          filtered = filtered.filter(
            (w) =>
              normalizeWilayah(w.rt) === normalizeWilayah(profile.wilayah_rt) &&
              normalizeWilayah(w.rw) === normalizeWilayah(profile.wilayah_rw)
          );
        } else if (profile?.role === 'rw') {
          filtered = filtered.filter(
            (w) => normalizeWilayah(w.rw) === normalizeWilayah(profile.wilayah_rw)
          );
        } else if (profile?.role === 'dusun') {
          filtered = filtered.filter(
            (w) => w.dusun?.trim().toLowerCase() === profile.wilayah_dusun?.trim().toLowerCase()
          );
        }

        const total = filtered.length || 0;
        const miskin = filtered.filter((w) => w.status_ekonomi === 'miskin').length || 0;
        const rentan = filtered.filter((w) => w.status_ekonomi === 'rentan').length || 0;
        const uniqueKK = new Set(filtered.map((w) => w.no_kk)).size || 0;

        setStats({
          totalWarga: total,
          wargaMiskin: miskin,
          wargaRentan: rentan,
          penerimaBansos: 2,
          totalKK: uniqueKK,
        });
      }
    } catch (err) {
      console.warn('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) loadStats();

    // Realtime listeners
    const channel = supabase
      .channel('realtime-dashboard-stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'warga' },
        () => loadStats()
      )
      .subscribe();

    const handleLocalSync = () => loadStats();
    window.addEventListener('warga-updated', handleLocalSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('warga-updated', handleLocalSync);
    };
  }, [profile]);

  const roleTitle =
    profile?.role === 'admin'
      ? 'Administrator Desa'
      : profile?.role === 'dusun'
      ? `Kepala Dusun ${profile?.wilayah_dusun || ''}`
      : profile?.role === 'rw'
      ? `Ketua RW ${profile?.wilayah_rw || ''}`
      : `Ketua RT ${profile?.wilayah_rt || '01'} / RW ${profile?.wilayah_rw || '01'}`;

  const miskinPercentage = stats.totalWarga
    ? Math.round((stats.wargaMiskin / stats.totalWarga) * 100)
    : 0;

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Top Bar Status */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <Calendar size={13} className="text-teal-600" />
          <span>
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isOnline ? '● Online' : '○ Offline Cache'}
          </span>
        </div>
      </div>

      {/* Hero Welcome Banner (Dinamis dengan Nama Desa & Kades) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-900 rounded-3xl p-5 text-white shadow-xl shadow-teal-950/15 mb-4">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute right-4 top-4 text-emerald-300/20">
          <Sparkles size={54} />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] tracking-wider uppercase font-extrabold bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
            <span>Peran: {profile?.role?.toUpperCase()}</span>
          </div>

          <h2 className="text-lg font-black mt-2 text-white tracking-tight">
            Halo, {profile?.nama_lengkap || 'Aparat Desa'}
          </h2>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-teal-100">
            <Building2 size={13} className="text-emerald-300 flex-shrink-0" />
            <span>
              Pemerintah Desa {pengaturanDesa?.nama_desa || 'Sukamaju'} (Kades: {pengaturanDesa?.nama_kepala_desa})
            </span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-teal-100">
            <MapPin size={13} className="text-emerald-300 flex-shrink-0" />
            <span>
              {profile?.wilayah_rt ? `RT ${profile.wilayah_rt} ` : ''}
              {profile?.wilayah_rw ? `/ RW ${profile.wilayah_rw} ` : ''}
              {profile?.wilayah_dusun
                ? `• Dusun ${profile.wilayah_dusun}`
                : 'Kewenangan: Seluruh Desa'}
            </span>
          </div>

          <div className="mt-3.5 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-teal-100">
            <span>Sistem Informasi Desa PWA</span>
            <span className="font-semibold text-emerald-300">{roleTitle}</span>
          </div>
        </div>
      </div>

      {/* Statistik Grid 4 Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Total Warga</span>
            <div className="p-1.5 rounded-xl bg-teal-50 text-teal-700">
              <Users size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalWarga}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
            <span>
              {profile?.role === 'rt'
                ? `Jiwa di RT ${profile.wilayah_rt}`
                : profile?.role === 'rw'
                ? `Jiwa di RW ${profile.wilayah_rw}`
                : profile?.role === 'dusun'
                ? `Jiwa Dusun ${profile.wilayah_dusun}`
                : 'Jiwa aktif desa'}
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Prasejahtera</span>
            <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            {stats.wargaMiskin}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
            <span>Prioritas Bantuan Sosial</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Kepala Keluarga</span>
            <div className="p-1.5 rounded-xl bg-blue-50 text-blue-700">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats.totalKK}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Kartu Keluarga terdaftar</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500">Bansos Salur</span>
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            {stats.penerimaBansos}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Penerima aktif 2026</span>
        </div>
      </div>

      {/* Progress Distribusi Ekonomi */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold text-slate-800">Distribusi Ekonomi Wilayah</h3>
          <span className="text-[10px] font-bold text-rose-600">{miskinPercentage}% Prasejahtera</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 flex overflow-hidden">
          <div
            style={{ width: `${(stats.wargaMiskin / (stats.totalWarga || 1)) * 100}%` }}
            className="bg-rose-500 transition-all duration-500"
            title="Miskin"
          />
          <div
            style={{ width: `${(stats.wargaRentan / (stats.totalWarga || 1)) * 100}%` }}
            className="bg-amber-400 transition-all duration-500"
            title="Rentan"
          />
          <div
            style={{
              width: `${
                ((stats.totalWarga - stats.wargaMiskin - stats.wargaRentan) / (stats.totalWarga || 1)) * 100
              }%`,
            }}
            className="bg-emerald-500 transition-all duration-500"
            title="Mampu"
          />
        </div>
        <div className="mt-2.5 flex justify-between items-center text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            <span>Miskin ({stats.wargaMiskin})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>Rentan ({stats.wargaRentan})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Mampu ({Math.max(0, stats.totalWarga - stats.wargaMiskin - stats.wargaRentan)})</span>
          </div>
        </div>
      </div>

      {/* Shortcut Menu (Akses Cepat) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm mb-4">
        <h3 className="font-bold text-slate-800 text-xs mb-3 flex items-center justify-between">
          <span>Layanan Cepat Aparat</span>
          <span className="text-[10px] font-normal text-slate-400">1-Klik Akses</span>
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <button
            onClick={() => setActiveTab('warga')}
            className="p-3 rounded-2xl bg-teal-50/70 hover:bg-teal-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
          >
            <div className="p-2 rounded-xl bg-white text-teal-700 shadow-sm mb-1.5 group-hover:scale-110 transition-transform">
              <Users size={20} />
            </div>
            <span className="text-[11px] font-bold text-slate-700">Data Warga</span>
            <span className="text-[9.5px] text-slate-400">Cari & Cetak</span>
          </button>

          <button
            onClick={() => setActiveTab('bansos')}
            className="p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
          >
            <div className="p-2 rounded-xl bg-white text-emerald-700 shadow-sm mb-1.5 group-hover:scale-110 transition-transform">
              <ShieldCheck size={20} />
            </div>
            <span className="text-[11px] font-bold text-slate-700">Cek Bansos</span>
            <span className="text-[9.5px] text-slate-400">Flagging Miskin</span>
          </button>

          {profile?.role === 'admin' ? (
            <button
              onClick={() => setActiveTab('kelola')}
              className="p-3 rounded-2xl bg-purple-50/70 hover:bg-purple-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
            >
              <div className="p-2 rounded-xl bg-white text-purple-700 shadow-sm mb-1.5 group-hover:scale-110 transition-transform">
                <Settings size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Kelola PIN</span>
              <span className="text-[9.5px] text-slate-400">Desa & Aparat</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('warga')}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
            >
              <div className="p-2 rounded-xl bg-white text-teal-800 shadow-sm mb-1.5 group-hover:scale-110 transition-transform">
                <FileText size={20} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">Surat</span>
              <span className="text-[9.5px] text-slate-400">Pengantar PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Pengumuman Aparat Desa */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-1">
          <Bell size={15} />
          <span>Agenda & Pengumuman Desa {pengaturanDesa?.nama_desa}</span>
        </div>
        <p className="text-[11px] text-amber-900 leading-relaxed">
          Penyaluran BLT Dana Desa Tahap I dijadwalkan tanggal 25 bulan ini di Kantor Desa. Harap Ketua RT memverifikasi data warga prasejahtera di wilayah masing-masing.
        </p>
      </div>
    </div>
  );
}

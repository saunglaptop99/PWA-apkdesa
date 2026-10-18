import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useDesa } from '../context/DesaContext';
import { readUserCache, writeUserCache, filterByProfileScope } from '../lib/userCache';
import BrandPageHeader from '../components/common/BrandPageHeader';
import {
  Users,
  AlertTriangle,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  MapPin,
  Calendar,
  Settings,
  Bell,
  Baby,
  Gift,
} from 'lucide-react';

export default function DashboardPage({ setActiveTab, navigateToLayanan }) {
  const { profile, user, isOnline } = useAuth();
  const { pengaturanDesa } = useDesa();

  const [stats, setStats] = useState({
    totalWarga: 0,
    wargaMiskin: 0,
    wargaRentan: 0,
    penerimaBansos: 0,
    totalKK: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsSource, setStatsSource] = useState('loading');

  const setCachedStats = () => {
    const cachedWarga = filterByProfileScope(readUserCache(user?.id, 'dashboard-warga', []), profile)
      .filter((w) => w.status_kependudukan === 'aktif');
    const cachedRecipients = readUserCache(user?.id, 'bansos-penerima', [])
      .filter((row) => filterByProfileScope([row.warga].filter(Boolean), profile).length > 0);
    setStats({
      totalWarga: cachedWarga.length,
      wargaMiskin: cachedWarga.filter((w) => w.status_ekonomi === 'miskin').length,
      wargaRentan: cachedWarga.filter((w) => w.status_ekonomi === 'rentan').length,
      penerimaBansos: cachedRecipients.length,
      totalKK: new Set(cachedWarga.map((w) => w.no_kk).filter(Boolean)).size,
    });
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      let wargaQuery = supabase
        .from('warga')
        .select('id, no_kk, status_ekonomi, dusun, rw, rt, status_kependudukan')
        .eq('status_kependudukan', 'aktif');

      // Terapkan isolasi wilayah
      if (profile?.role === 'rt') {
        if (profile.wilayah_dusun) wargaQuery = wargaQuery.eq('dusun', profile.wilayah_dusun);
        if (profile.wilayah_rt) wargaQuery = wargaQuery.eq('rt', profile.wilayah_rt);
        if (profile.wilayah_rw) wargaQuery = wargaQuery.eq('rw', profile.wilayah_rw);
      } else if (profile?.role === 'rw') {
        if (profile.wilayah_dusun) wargaQuery = wargaQuery.eq('dusun', profile.wilayah_dusun);
        if (profile.wilayah_rw) wargaQuery = wargaQuery.eq('rw', profile.wilayah_rw);
      } else if (profile?.role === 'dusun') {
        if (profile.wilayah_dusun) wargaQuery = wargaQuery.eq('dusun', profile.wilayah_dusun);
      }

      wargaQuery = wargaQuery.order('id', { ascending: true });
      const wargaData = [];
      for (let offset = 0; ; offset += 1000) {
        const { data: batch, error } = await wargaQuery.range(offset, offset + 999);
        if (error) throw error;
        wargaData.push(...(batch || []));
        if (!batch || batch.length < 1000) break;
      }
      const scopedWarga = filterByProfileScope(wargaData, profile);
      writeUserCache(user?.id, 'dashboard-warga', scopedWarga);
      const total = scopedWarga.length;
      const miskin = scopedWarga.filter((w) => w.status_ekonomi === 'miskin').length;
      const rentan = scopedWarga.filter((w) => w.status_ekonomi === 'rentan').length;
      const uniqueKK = new Set(scopedWarga.map((w) => w.no_kk).filter(Boolean)).size;

      const { count: bansosCount, error: bansosError } = await supabase
        .from('penerima_bansos')
        .select('*', { count: 'exact', head: true });
      if (bansosError) throw bansosError;

      setStats({
        totalWarga: total,
        wargaMiskin: miskin,
        wargaRentan: rentan,
        penerimaBansos: bansosCount || 0,
        totalKK: uniqueKK,
      });
      setStatsSource('database');
    } catch (err) {
      console.warn('Dashboard stats error:', err);
      setCachedStats();
      setStatsSource('cache');
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penerima_bansos' }, () => loadStats())
      .subscribe();

    const handleLocalSync = () => loadStats();
    window.addEventListener('warga-updated', handleLocalSync);
    window.addEventListener('bansos-updated', handleLocalSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('warga-updated', handleLocalSync);
      window.removeEventListener('bansos-updated', handleLocalSync);
    };
  }, [profile, user?.id, isOnline]);

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
  const greeting = new Date().getHours() < 11 ? 'Selamat pagi' : new Date().getHours() < 15 ? 'Selamat siang' : new Date().getHours() < 18 ? 'Selamat sore' : 'Selamat malam';
  const namaDesa = pengaturanDesa?.nama_desa?.trim();

  return (
    <div className="app-page dashboard-page pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Top Bar Status */}
      <BrandPageHeader
        className="dashboard-topbar"
        title={namaDesa ? `SIM DESA ${namaDesa}` : 'SIM DESA'}
        subtitle={<span className="flex items-center gap-1.5"><Calendar size={12} />{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>}
        trailing={<span className={`status-label ${isOnline ? 'is-online' : 'is-offline'}`}>{isOnline ? 'Online' : 'Offline'}</span>}
      />

      {/* Ringkasan identitas aparat dan wilayah */}
      <section className="dashboard-welcome dashboard-hero mb-4">
        <div className="hero-kicker"><span className="hero-live-dot" />{greeting}</div>
        <h1>{profile?.nama_lengkap || 'Aparat Desa'}</h1>
        <div className="hero-role">{roleTitle}</div>
        <div className="hero-divider" />
        <div className="hero-bottom">
          <div className="hero-location"><MapPin size={14} /><span>{profile?.wilayah_rt ? `RT ${profile.wilayah_rt} / ` : ''}{profile?.wilayah_rw ? `RW ${profile.wilayah_rw} · ` : ''}{profile?.wilayah_dusun ? `Dusun ${profile.wilayah_dusun}` : 'Seluruh desa'}</span></div>
          {pengaturanDesa?.nama_kepala_desa && <p className="hero-head-village">Kades · {pengaturanDesa.nama_kepala_desa}</p>}
        </div>
      </section>

      {/* Statistik Grid 4 Cards */}
      <section className="dashboard-section dashboard-panel mb-3">
        <div className="section-heading"><h2>Ringkasan wilayah</h2><span>{loading ? 'Memuat…' : statsSource === 'database' ? 'Data terkini' : 'Cache terakhir'}</span></div>
      <div className="grid grid-cols-2 gap-2 mb-0 dashboard-stats">
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
          <span className="text-[10px] text-slate-400 block mt-1">Penerima terdaftar</span>
        </div>
      </div>
      </section>

      {/* Progress Distribusi Ekonomi */}
      <div className="dashboard-panel mb-3">
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

      {/* Shortcut Menu (Akses Cepat Layanan) */}
      <div className="dashboard-panel dashboard-services mb-3">
        <h3 className="font-bold text-slate-800 text-xs mb-3 flex items-center justify-between">
          <span>Layanan Terpadu Aparat</span>
          <span className="text-[10px] font-normal text-slate-400">1-Klik Akses</span>
        </h3>
        <div className="grid grid-cols-2 gap-2 text-left dashboard-shortcuts">
          <button
            type="button"
            onClick={() => setActiveTab('warga')}
            className="p-2.5 rounded-2xl bg-teal-50/70 hover:bg-teal-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
          >
            <div className="p-2 rounded-xl bg-white text-teal-700 shadow-sm mb-1 group-hover:scale-110 transition-transform">
              <Users size={18} />
            </div>
            <span className="text-[10.5px] font-bold text-slate-700">Data Warga</span>
            <span className="text-[9px] text-slate-400">Master Kependudukan</span>
          </button>

          <button
            type="button"
            onClick={() => (navigateToLayanan ? navigateToLayanan('bansos') : setActiveTab('layanan'))}
            className="p-2.5 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
          >
            <div className="p-2 rounded-xl bg-white text-emerald-700 shadow-sm mb-1 group-hover:scale-110 transition-transform">
              <Gift size={18} />
            </div>
            <span className="text-[10.5px] font-bold text-slate-700">Bansos Desa</span>
            <span className="text-[9px] text-slate-400">PKH, BPNT & BLT</span>
          </button>

          <button
            type="button"
            onClick={() => (navigateToLayanan ? navigateToLayanan('mutasi') : setActiveTab('layanan'))}
            className="p-2.5 rounded-2xl bg-blue-50/70 hover:bg-blue-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
          >
            <div className="p-2 rounded-xl bg-white text-blue-700 shadow-sm mb-1 group-hover:scale-110 transition-transform">
              <FileSpreadsheet size={18} />
            </div>
            <span className="text-[10.5px] font-bold text-slate-700">Mutasi Warga</span>
            <span className="text-[9px] text-slate-400">Lahir, Wafat, Pindah</span>
          </button>

          <button
            type="button"
            onClick={() => (navigateToLayanan ? navigateToLayanan('posyandu') : setActiveTab('layanan'))}
            className="p-2.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
          >
            <div className="p-2 rounded-xl bg-white text-rose-600 shadow-sm mb-1 group-hover:scale-110 transition-transform">
              <Baby size={18} />
            </div>
            <span className="text-[10.5px] font-bold text-slate-700">Posyandu</span>
            <span className="text-[9px] text-slate-400">Ibu & Stunting</span>
          </button>

          {profile?.role === 'admin' && <button
            type="button"
            onClick={() => (navigateToLayanan ? navigateToLayanan('surat') : setActiveTab('layanan'))}
            className="p-2.5 rounded-2xl bg-cyan-50/70 hover:bg-cyan-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
          >
            <div className="p-2 rounded-xl bg-white text-cyan-700 shadow-sm mb-1 group-hover:scale-110 transition-transform">
              <FileText size={18} />
            </div>
            <span className="text-[10.5px] font-bold text-slate-700">Surat PDF</span>
            <span className="text-[9px] text-slate-400">Pengantar Resmi</span>
          </button>}

          {profile?.role === 'admin' ? (
            <button
              type="button"
              onClick={() => setActiveTab('kelola')}
              className="p-2.5 rounded-2xl bg-purple-50/70 hover:bg-purple-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
            >
              <div className="p-2 rounded-xl bg-white text-purple-700 shadow-sm mb-1 group-hover:scale-110 transition-transform">
                <Settings size={18} />
              </div>
              <span className="text-[10.5px] font-bold text-slate-700">Kelola Desa</span>
              <span className="text-[9px] text-slate-400">Aparat & Wilayah</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('profil')}
              className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 flex flex-col items-center justify-center transition-all group"
            >
              <div className="p-2 rounded-xl bg-white text-slate-700 shadow-sm mb-1 group-hover:scale-110 transition-transform">
                <ShieldCheck size={18} />
              </div>
              <span className="text-[10.5px] font-bold text-slate-700">Akun Aparat</span>
              <span className="text-[9px] text-slate-400">Profil Aparat</span>
            </button>
          )}
        </div>
      </div>

      {/* Status sinkronisasi ringkasan */}
      <div className="dashboard-panel dashboard-sync-panel">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-1">
          <Bell size={15} />
          <span>Informasi dashboard</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          {loading ? 'Memperbarui ringkasan data…' : statsSource === 'database' ? 'Ringkasan mengikuti data warga dan penerima bantuan yang tersimpan di database.' : isOnline ? 'Layanan data belum merespons; ringkasan terakhir dari perangkat ditampilkan.' : 'Mode offline: ringkasan terakhir dari perangkat ditampilkan sampai koneksi pulih.'}
        </p>
      </div>
    </div>
  );
}

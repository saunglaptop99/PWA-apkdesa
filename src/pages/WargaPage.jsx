import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useDesa } from '../context/DesaContext';
import {
  Search,
  FileText,
  UserPlus,
  Edit2,
  Trash2,
  MapPin,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Users,
  Radio,
  X,
  Copy,
  Check,
  Calendar,
  Briefcase,
  Home,
  ShieldCheck,
  User,
  Info,
} from 'lucide-react';
import SuratModal from '../components/surat/SuratModal';
import ExcelImportExport from '../components/warga/ExcelImportExport';
import WargaFormModal from '../components/warga/WargaFormModal';

// Sample fallback warga in case database is freshly created or offline
const INITIAL_DEMO_WARGA = [
  // RT 01 / RW 01 (Sukamaju)
  {
    id: 'w-1',
    nik: '3201011203850001',
    no_kk: '3201011203850000',
    nama: 'Bambang Sudarmono',
    tempat_lahir: 'Bandung',
    tanggal_lahir: '1985-03-12',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    pekerjaan: 'Petani',
    shdk: 'Kepala Keluarga',
    dusun: 'Sukamaju',
    rw: '01',
    rt: '01',
    alamat_detail: 'Jl. Melati No. 12 RT 01',
    status_kependudukan: 'aktif',
    status_ekonomi: 'miskin',
  },
  {
    id: 'w-2',
    nik: '3201015506890002',
    no_kk: '3201011203850000',
    nama: 'Siti Aminah',
    tempat_lahir: 'Cianjur',
    tanggal_lahir: '1989-06-15',
    jenis_kelamin: 'Perempuan',
    agama: 'Islam',
    pekerjaan: 'Ibu Rumah Tangga',
    shdk: 'Istri',
    dusun: 'Sukamaju',
    rw: '01',
    rt: '01',
    alamat_detail: 'Jl. Melati No. 12 RT 01',
    status_kependudukan: 'aktif',
    status_ekonomi: 'miskin',
  },
  {
    id: 'w-6',
    nik: '3201010101700006',
    no_kk: '3201010101700000',
    nama: 'Solihin bin Kosasih',
    tempat_lahir: 'Tasikmalaya',
    tanggal_lahir: '1970-01-01',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    pekerjaan: 'Buruh Tani',
    shdk: 'Kepala Keluarga',
    dusun: 'Sukamaju',
    rw: '01',
    rt: '01',
    alamat_detail: 'Jl. Randu Alas RT 01',
    status_kependudukan: 'aktif',
    status_ekonomi: 'miskin',
  },

  // RT 02 / RW 01 (Sukamaju) - Untuk verifikasi login khusus RT 02 / RW 01
  {
    id: 'w-3',
    nik: '3201011808920003',
    no_kk: '3201011808920000',
    nama: 'Agus Supriatna',
    tempat_lahir: 'Sumedang',
    tanggal_lahir: '1992-08-18',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    pekerjaan: 'Buruh Harian Lepas',
    shdk: 'Kepala Keluarga',
    dusun: 'Sukamaju',
    rw: '01',
    rt: '02',
    alamat_detail: 'Kp. Babakan RT 02',
    status_kependudukan: 'aktif',
    status_ekonomi: 'rentan',
  },
  {
    id: 'w-7',
    nik: '3201016509940007',
    no_kk: '3201011808920000',
    nama: 'Nurhayati Rahmawati',
    tempat_lahir: 'Bogor',
    tanggal_lahir: '1994-09-25',
    jenis_kelamin: 'Perempuan',
    agama: 'Islam',
    pekerjaan: 'Karyawan Swasta',
    shdk: 'Istri',
    dusun: 'Sukamaju',
    rw: '01',
    rt: '02',
    alamat_detail: 'Kp. Babakan RT 02',
    status_kependudukan: 'aktif',
    status_ekonomi: 'mampu',
  },
  {
    id: 'w-8',
    nik: '3201012502900008',
    no_kk: '3201012502900000',
    nama: 'Herman Wijaya',
    tempat_lahir: 'Sukabumi',
    tanggal_lahir: '1990-02-25',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    pekerjaan: 'Pedagang Warung',
    shdk: 'Kepala Keluarga',
    dusun: 'Sukamaju',
    rw: '01',
    rt: '02',
    alamat_detail: 'Jl. Anggrek No. 8 RT 02',
    status_kependudukan: 'aktif',
    status_ekonomi: 'miskin',
  },

  // RW 02 (Mekarsari)
  {
    id: 'w-4',
    nik: '3201012204780004',
    no_kk: '3201012204780000',
    nama: 'Hendra Gunawan',
    tempat_lahir: 'Garut',
    tanggal_lahir: '1978-04-22',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    pekerjaan: 'Wiraswasta',
    shdk: 'Kepala Keluarga',
    dusun: 'Mekarsari',
    rw: '02',
    rt: '01',
    alamat_detail: 'Jl. Cempaka Indah No. 5',
    status_kependudukan: 'aktif',
    status_ekonomi: 'mampu',
  },
  {
    id: 'w-5',
    nik: '3201016011950005',
    no_kk: '3201016011950000',
    nama: 'Dewi Sartika',
    tempat_lahir: 'Bogor',
    tanggal_lahir: '1995-11-20',
    jenis_kelamin: 'Perempuan',
    agama: 'Islam',
    pekerjaan: 'Pedagang',
    shdk: 'Kepala Keluarga',
    dusun: 'Mekarsari',
    rw: '02',
    rt: '02',
    alamat_detail: 'Kp. Pasir Honje RT 02',
    status_kependudukan: 'aktif',
    status_ekonomi: 'rentan',
  },
];

// Helper normalisasi nomor RT/RW agar '02' dan '2' dianggap sama persis
export const normalizeWilayah = (val) => {
  if (val === undefined || val === null) return '';
  const trimmed = String(val).trim();
  const parsed = parseInt(trimmed, 10);
  return isNaN(parsed) ? trimmed.toLowerCase() : String(parsed);
};

export default function WargaPage() {
  const { profile } = useAuth();
  const { pengaturanDesa } = useDesa();

  const [warga, setWarga] = useState([]);
  const [search, setSearch] = useState('');
  const [filterEkonomi, setFilterEkonomi] = useState('all');
  const [selectedWargaSurat, setSelectedWargaSurat] = useState(null);
  const [editingWarga, setEditingWarga] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Click-to-Detail State
  const [selectedDetailWarga, setSelectedDetailWarga] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  // Pagination State (Menghindari scrolling panjang ke bawah)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchWarga = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('warga')
        .select('*')
        .eq('status_kependudukan', 'aktif')
        .order('nama', { ascending: true });

      // Filter query Supabase sesuai role pengguna aktif
      if (profile?.role === 'rt') {
        if (profile.wilayah_rt) query = query.eq('rt', profile.wilayah_rt);
        if (profile.wilayah_rw) query = query.eq('rw', profile.wilayah_rw);
      } else if (profile?.role === 'rw') {
        if (profile.wilayah_rw) query = query.eq('rw', profile.wilayah_rw);
      } else if (profile?.role === 'dusun') {
        if (profile.wilayah_dusun) query = query.eq('dusun', profile.wilayah_dusun);
      }

      const { data, error } = await query;

      if (!error && data && data.length > 0) {
        setWarga(data);
        localStorage.setItem('cached_warga_desa', JSON.stringify(data));
      } else {
        // Fallback ke penyimpanan lokal & demo warga
        const localCached = localStorage.getItem('cached_warga_desa');
        let allWarga = localCached ? JSON.parse(localCached) : INITIAL_DEMO_WARGA;

        const localImported = JSON.parse(localStorage.getItem('cached_warga_local') || '[]');
        if (localImported.length > 0) {
          allWarga = [...localImported, ...allWarga];
        }

        // Terapkan isolasi wilayah yang ketat sesuai role login
        let filteredTerritory = allWarga.filter((w) => w.status_kependudukan === 'aktif');

        if (profile?.role === 'rt') {
          filteredTerritory = filteredTerritory.filter(
            (w) =>
              normalizeWilayah(w.rt) === normalizeWilayah(profile.wilayah_rt) &&
              normalizeWilayah(w.rw) === normalizeWilayah(profile.wilayah_rw)
          );
        } else if (profile?.role === 'rw') {
          filteredTerritory = filteredTerritory.filter(
            (w) => normalizeWilayah(w.rw) === normalizeWilayah(profile.wilayah_rw)
          );
        } else if (profile?.role === 'dusun') {
          filteredTerritory = filteredTerritory.filter(
            (w) => w.dusun?.trim().toLowerCase() === profile.wilayah_dusun?.trim().toLowerCase()
          );
        }

        setWarga(filteredTerritory);
      }
    } catch (e) {
      console.warn('Gagal fetch warga dari Supabase:', e);
      const cached = localStorage.getItem('cached_warga_desa');
      if (cached) setWarga(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarga();

    // 1. Supabase Realtime Subscription (Sinkronisasi Otomatis Antar Role)
    const realtimeChannel = supabase
      .channel('realtime-warga-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'warga' },
        () => {
          fetchWarga();
        }
      )
      .subscribe();

    // 2. Broadcast Channel & Local Event Listener (Untuk Sinkronisasi Seketika Antar Tab / Offline)
    const handleWargaUpdated = () => {
      fetchWarga();
    };
    window.addEventListener('warga-updated', handleWargaUpdated);

    return () => {
      supabase.removeChannel(realtimeChannel);
      window.removeEventListener('warga-updated', handleWargaUpdated);
    };
  }, [profile]);

  // Reset ke halaman 1 ketika pencarian, filter, atau ukuran halaman berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterEkonomi, pageSize]);

  const handleDelete = async (id, nama) => {
    if (!confirm(`Hapus data warga ${nama}?`)) return;
    try {
      await supabase.from('warga').delete().eq('id', id);

      // Update state lokal
      const updated = warga.filter((w) => w.id !== id);
      setWarga(updated);
      localStorage.setItem('cached_warga_desa', JSON.stringify(updated));

      // Beritahu tab / role lain
      window.dispatchEvent(new Event('warga-updated'));
      if (selectedDetailWarga?.id === id) {
        setSelectedDetailWarga(null);
      }
    } catch (e) {
      const updated = warga.filter((w) => w.id !== id);
      setWarga(updated);
      if (selectedDetailWarga?.id === id) {
        setSelectedDetailWarga(null);
      }
    }
  };

  const handleWargaSuccess = () => {
    fetchWarga();
    window.dispatchEvent(new Event('warga-updated'));
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const filtered = useMemo(() => {
    return warga.filter((w) => {
      const q = search.toLowerCase();
      const matchSearch =
        w.nama?.toLowerCase().includes(q) ||
        w.nik?.includes(q) ||
        w.no_kk?.includes(q);
      const matchEkonomi = filterEkonomi === 'all' || w.status_ekonomi === filterEkonomi;
      return matchSearch && matchEkonomi;
    });
  }, [warga, search, filterEkonomi]);

  // Logika Paginasi (Pagination)
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedWarga = useMemo(() => {
    return filtered.slice(startIndex, endIndex);
  }, [filtered, startIndex, endIndex]);

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="pb-28 pt-4 px-3 sm:px-4 max-w-4xl mx-auto animate-fade-in">
      {/* Header Info Wilayah Sesuai Role Pengguna */}
      <div className="flex justify-between items-start mb-3 gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800">
              <Users size={16} />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Data Kependudukan</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Wilayah Aktif: <strong className="text-teal-700">{profile?.role?.toUpperCase()}</strong>
            {profile?.wilayah_rt ? ` • RT ${profile.wilayah_rt}` : ''}
            {profile?.wilayah_rw ? ` / RW ${profile.wilayah_rw}` : ''}
            {profile?.wilayah_dusun ? ` • Dusun ${profile.wilayah_dusun}` : ''}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white shadow-md shadow-teal-900/10 flex items-center gap-1 text-xs font-bold transition-all"
            title="Tambah Warga Baru"
          >
            <UserPlus size={15} />
            <span className="hidden sm:inline">Tambah Warga</span>
          </button>
        )}
      </div>

      {/* Indikator Realtime Sinkronisasi */}
      <div className="mb-3 px-3 py-1.5 rounded-xl bg-teal-50/80 border border-teal-100 flex items-center justify-between text-[10.5px] text-teal-800">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Database Realtime Terhubung ke Semua Role</span>
        </div>
        <button
          onClick={fetchWarga}
          className="flex items-center gap-1 hover:text-teal-950 font-bold"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Admin Import/Export Bar */}
      {isAdmin && (
        <div className="mb-3 p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600">Alat Administrasi:</span>
          <ExcelImportExport onRefresh={handleWargaSuccess} wargaList={warga} />
        </div>
      )}

      {/* Pencarian & Filter Cepat */}
      <div className="space-y-2 mb-3.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No. KK, NIK, atau Nama Warga..."
            className="w-full pl-9 pr-8 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Status Ekonomi Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {['all', 'miskin', 'rentan', 'mampu'].map((kategori) => (
            <button
              key={kategori}
              onClick={() => setFilterEkonomi(kategori)}
              className={`px-3 py-1.5 rounded-xl font-semibold capitalize whitespace-nowrap text-[11px] transition-all ${
                filterEkonomi === kategori
                  ? 'bg-teal-800 text-white shadow-sm shadow-teal-900/20'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              {kategori === 'all' ? 'Semua Status' : kategori}
            </button>
          ))}
        </div>
      </div>

      {/* Baris Ringkasan & Paginasi Info */}
      <div className="px-1 mb-2.5 text-[11px] text-slate-500 font-medium flex justify-between items-center flex-wrap gap-1">
        <span>
          Menampilkan{' '}
          <strong className="text-slate-800 font-bold">
            {totalItems === 0 ? 0 : startIndex + 1} - {endIndex}
          </strong>{' '}
          dari <strong className="text-slate-800 font-bold">{totalItems}</strong> warga terdata
        </span>
        <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
          {profile?.role === 'rt'
            ? `Data Khusus RT ${profile.wilayah_rt}`
            : profile?.role === 'rw'
            ? `Data Khusus RW ${profile.wilayah_rw}`
            : profile?.role === 'dusun'
            ? `Data Dusun ${profile.wilayah_dusun}`
            : 'Semua Wilayah Desa'}
        </span>
      </div>

      {/* TABEL DATA WARGA (RINGKAS: NO KK, NIK, NAMA - KLIK UNTUK DETAIL LENGKAP) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-teal-700 border-t-transparent mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Memuat data kependudukan wilayah...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Users className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-xs font-bold text-slate-700 mb-1">Tidak ada data warga ditemukan</p>
            <p className="text-[11px] text-slate-400">
              {search
                ? `Tidak cocok dengan kata kunci "${search}"`
                : `Belum ada data warga terdaftar untuk wilayah ${profile?.role.toUpperCase()} ${
                    profile?.wilayah_rt ? `RT ${profile.wilayah_rt}` : ''
                  }.`}
            </p>
          </div>
        ) : (
          <>
            {/* TAMPILAN TABEL DESKTOP & TABLET */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-[10px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">No. KK</th>
                    <th className="py-2.5 px-3">NIK</th>
                    <th className="py-2.5 px-3">Nama Warga</th>
                    <th className="py-2.5 px-2 text-center">Wilayah</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedWarga.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedDetailWarga(item)}
                      className="hover:bg-teal-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-600 text-[11px] whitespace-nowrap">
                        {item.no_kk}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                        {item.nik}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 group-hover:text-teal-900">
                            {item.nama}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            ({item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'})
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap text-[11px] text-slate-600">
                        RT {item.rt} / RW {item.rw}
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            item.status_ekonomi === 'miskin'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.status_ekonomi === 'rentan'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.status_ekonomi || 'aktif'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className="text-teal-700 font-bold text-[11px] group-hover:underline inline-flex items-center gap-0.5">
                          Detail <ChevronRight size={13} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TAMPILAN TABEL BARIS RINGKAS KHUSUS MOBILE (NO KK, NIK, NAMA) */}
            <div className="sm:hidden divide-y divide-slate-100">
              {paginatedWarga.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedDetailWarga(item)}
                  className="p-3 hover:bg-teal-50/50 active:bg-teal-100/50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Baris 1: No. KK & Wilayah */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5 font-mono">
                        <span>KK: <strong className="text-slate-600">{item.no_kk}</strong></span>
                        <span className="text-slate-500 font-sans font-semibold">
                          RT {item.rt} / RW {item.rw} • {item.dusun}
                        </span>
                      </div>

                      {/* Baris 2: NIK */}
                      <div className="text-xs font-mono font-bold text-slate-800">
                        NIK: {item.nik}
                      </div>

                      {/* Baris 3: NAMA */}
                      <div className="mt-0.5 flex items-center justify-between">
                        <div className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                          {item.nama}{' '}
                          <span className="text-[10px] font-normal text-slate-400">
                            ({item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'})
                          </span>
                        </div>
                        <span
                          className={`text-[8.5px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                            item.status_ekonomi === 'miskin'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.status_ekonomi === 'rentan'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.status_ekonomi || 'aktif'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center self-center pl-1 text-slate-300">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* KONTROL PAGINASI (PAGINATION) - MENGHINDARI SCROLLING PANJANG */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="py-1 px-2 rounded-lg border border-slate-200 font-semibold bg-white text-xs outline-none focus:ring-1 focus:ring-teal-600"
            >
              <option value={5}>5 / hal</option>
              <option value={10}>10 / hal</option>
              <option value={25}>25 / hal</option>
              <option value={50}>50 / hal</option>
            </select>
            <span className="text-[11px] text-slate-400 font-medium">
              (Hal. {validCurrentPage} dari {totalPages})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1 transition-all"
            >
              <ChevronLeft size={13} />
              <span>Sebelumnya</span>
            </button>

            {/* Smart page pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - validCurrentPage) <= 1
              )
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`min-w-[28px] h-7 rounded-xl font-bold text-xs transition-all ${
                        validCurrentPage === p
                          ? 'bg-teal-700 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-xs flex items-center gap-1 transition-all"
            >
              <span>Selanjutnya</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DETAIL LENGKAP WARGA (MUNCUL KETIKA BARIS WARGA DIKLIK) */}
      {selectedDetailWarga && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center font-black text-sm flex-shrink-0">
                  {selectedDetailWarga.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    {selectedDetailWarga.nama}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedDetailWarga.shdk || 'Kepala Keluarga'} • Status:{' '}
                    <span className="capitalize font-semibold text-teal-800">
                      {selectedDetailWarga.status_kependudukan || 'Aktif'}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailWarga(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Copy NIK & No KK Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Nomor NIK
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {selectedDetailWarga.nik}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedDetailWarga.nik, 'nik')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-white transition-all"
                  title="Salin NIK"
                >
                  {copiedField === 'nik' ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Nomor KK
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {selectedDetailWarga.no_kk}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedDetailWarga.no_kk, 'kk')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-white transition-all"
                  title="Salin No. KK"
                >
                  {copiedField === 'kk' ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Grid Detail Demografis Lengkap */}
            <div className="space-y-3 text-xs">
              {/* Bagian 1: Data Pribadi */}
              <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/70 space-y-2">
                <span className="text-[10.5px] font-bold text-teal-800 uppercase tracking-wider block">
                  Biodata Kependudukan
                </span>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tempat, Tgl Lahir:</span>
                    <strong className="text-slate-800 font-medium">
                      {selectedDetailWarga.tempat_lahir || '-'},{' '}
                      {formatDate(selectedDetailWarga.tanggal_lahir)}
                    </strong>
                    {selectedDetailWarga.tanggal_lahir && (
                      <span className="text-[10.5px] text-slate-500 block">
                        ({calculateAge(selectedDetailWarga.tanggal_lahir)} tahun)
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Jenis Kelamin:</span>
                    <strong className="text-slate-800 font-medium">
                      {selectedDetailWarga.jenis_kelamin || '-'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Agama:</span>
                    <strong className="text-slate-800 font-medium">
                      {selectedDetailWarga.agama || 'Islam'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Pekerjaan:</span>
                    <strong className="text-slate-800 font-medium">
                      {selectedDetailWarga.pekerjaan || '-'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bagian 2: Domisili & Wilayah */}
              <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/70 space-y-2">
                <span className="text-[10.5px] font-bold text-teal-800 uppercase tracking-wider block">
                  Alamat & Wilayah Domisili
                </span>

                <div className="grid grid-cols-3 gap-2 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Dusun:</span>
                    <strong className="text-slate-800 font-medium">
                      {selectedDetailWarga.dusun || '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rukun Warga (RW):</span>
                    <strong className="text-slate-800 font-medium font-mono">
                      RW {selectedDetailWarga.rw || '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rukun Tetangga (RT):</span>
                    <strong className="text-slate-800 font-medium font-mono">
                      RT {selectedDetailWarga.rt || '-'}
                    </strong>
                  </div>
                </div>

                {selectedDetailWarga.alamat_detail && (
                  <div className="pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block">Alamat Lengkap / Jalan:</span>
                    <p className="text-slate-800 font-medium mt-0.5">
                      {selectedDetailWarga.alamat_detail}
                    </p>
                  </div>
                )}
              </div>

              {/* Bagian 3: Status Bansos & Kesejahteraan */}
              <div className="p-2.5 rounded-2xl bg-teal-50/60 border border-teal-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-teal-700 font-bold block uppercase">
                    Status Kesejahteraan / Bansos
                  </span>
                  <span className="capitalize font-bold text-slate-800 text-xs">
                    Keluarga {selectedDetailWarga.status_ekonomi || 'Mampu'}
                  </span>
                </div>
                <span
                  className={`text-[9.5px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    selectedDetailWarga.status_ekonomi === 'miskin'
                      ? 'bg-rose-100 text-rose-800'
                      : selectedDetailWarga.status_ekonomi === 'rentan'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedDetailWarga.status_ekonomi || 'Mampu'}
                </span>
              </div>
            </div>

            {/* Action Buttons Modal Detail */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setSelectedWargaSurat(selectedDetailWarga);
                  setSelectedDetailWarga(null);
                }}
                className="flex-1 py-2.5 px-3 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-teal-900/15 transition-all"
              >
                <FileText size={15} />
                <span>Cetak Surat Pengantar PDF</span>
              </button>

              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingWarga(selectedDetailWarga);
                      setSelectedDetailWarga(null);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all"
                    title="Ubah Data Warga"
                  >
                    <Edit2 size={14} className="text-teal-700" />
                    <span>Ubah</span>
                  </button>

                  <button
                    onClick={() => handleDelete(selectedDetailWarga.id, selectedDetailWarga.nama)}
                    className="p-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1 transition-all"
                    title="Hapus Data Warga"
                  >
                    <Trash2 size={14} />
                    <span>Hapus</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => setSelectedDetailWarga(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Surat Pengantar */}
      {selectedWargaSurat && (
        <SuratModal
          warga={selectedWargaSurat}
          userProfile={profile}
          onClose={() => setSelectedWargaSurat(null)}
        />
      )}

      {/* Modal Tambah Warga Baru (Admin) */}
      {showAddModal && (
        <WargaFormModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleWargaSuccess}
        />
      )}

      {/* Modal Edit Warga (Admin) */}
      {editingWarga && (
        <WargaFormModal
          wargaToEdit={editingWarga}
          onClose={() => setEditingWarga(null)}
          onSuccess={handleWargaSuccess}
        />
      )}
    </div>
  );
}

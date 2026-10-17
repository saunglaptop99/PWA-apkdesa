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
  RefreshCw,
  Users,
  Radio,
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
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

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
        (payload) => {
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
    } catch (e) {
      const updated = warga.filter((w) => w.id !== id);
      setWarga(updated);
    }
  };

  const handleWargaSuccess = () => {
    fetchWarga();
    window.dispatchEvent(new Event('warga-updated'));
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

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto">
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
          <span>Database Tersinkronisasi Otomatis Antar Role</span>
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
            placeholder="Cari NIK, KK, atau Nama Warga..."
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

      {/* Count & Info */}
      <div className="px-1 mb-2.5 text-[11px] text-slate-500 font-medium flex justify-between items-center">
        <span>
          Menampilkan <strong>{filtered.length}</strong> warga terdata
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

      {/* List Card Warga (Shopee / Mobile Native UI) */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-200/70 shadow-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-700 border-t-transparent mx-auto mb-2"></div>
            <p className="text-xs text-slate-500">Memuat data kependudukan wilayah...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white rounded-2xl border border-slate-200/70 shadow-sm">
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
          filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-sm transition-all hover:shadow-md"
              >
                {/* Header Card Warga */}
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{item.nama}</h4>
                      <span className="text-[10px] text-slate-400">
                        ({item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'})
                      </span>
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500 font-mono">
                      <span>NIK: {item.nik}</span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-600">
                      <MapPin size={11} className="text-teal-600 flex-shrink-0" />
                      <span>
                        RT {item.rt} / RW {item.rw} • Dusun {item.dusun}
                      </span>
                    </div>
                  </div>

                  {/* Status Ekonomi Badge */}
                  <span
                    className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      item.status_ekonomi === 'miskin'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : item.status_ekonomi === 'rentan'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {item.status_ekonomi}
                  </span>
                </div>

                {/* Collapsible Detail Info */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200 text-[11px] text-slate-600 space-y-1.5 bg-slate-50/70 p-2.5 rounded-xl animate-fade-in">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px]">No. Kartu Keluarga:</span>
                        <strong className="font-mono text-slate-800">{item.no_kk}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Status SHDK:</span>
                        <strong className="text-slate-800">{item.shdk || 'Kepala Keluarga'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tempat, Tgl Lahir:</span>
                        <span className="text-slate-800">
                          {item.tempat_lahir || '-'}, {item.tanggal_lahir || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Pekerjaan:</span>
                        <span className="text-slate-800">{item.pekerjaan || '-'}</span>
                      </div>
                    </div>
                    {item.alamat_detail && (
                      <div className="pt-1">
                        <span className="text-slate-400 block text-[10px]">Alamat Lengkap:</span>
                        <span className="text-slate-800">{item.alamat_detail}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Bar Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-between items-center gap-2">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
                  >
                    <span>{isExpanded ? 'Tutup Detail' : 'Lihat Detail'}</span>
                    <ChevronRight
                      size={13}
                      className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => setEditingWarga(item)}
                          className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all"
                          title="Ubah Data"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.nama)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Hapus Data"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setSelectedWargaSurat(item)}
                      className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 active:scale-95 text-teal-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-teal-900/5"
                    >
                      <FileText size={13} className="text-teal-700" />
                      <span>Cetak Surat</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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

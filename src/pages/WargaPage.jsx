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
  Phone,
  Baby,
  GraduationCap,
  HeartPulse,
  Activity,
  ExternalLink,
  Filter,
  Building,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import SuratModal from '../components/surat/SuratModal';
import ExcelImportExport from '../components/warga/ExcelImportExport';
import WargaFormModal from '../components/warga/WargaFormModal';
import RekapDownloadModal from '../components/warga/RekapDownloadModal';

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
    golongan_darah: 'O',
    agama: 'Islam',
    no_akta_lahir: '3201-LT-12031985-001',
    status_ktp: 'Sudah KTP-el',
    shdk: 'Kepala Keluarga',
    status_perkawinan: 'Kawin',
    no_akta_nikah_cerai: 'KUA.10.01/PW.01/123/2010',
    nama_ayah: 'Sudarmono Kartodirjo',
    nama_ibu: 'Suparni',
    pendidikan_terakhir: 'SMA/SMK/Sederajat',
    status_sekolah: 'Tidak / Sudah Lulus',
    pekerjaan: 'Petani',
    rentang_penghasilan: 'Rp 1.000.000 - Rp 2.500.000',
    status_ekonomi: 'miskin',
    bansos_pkh: true,
    bansos_bpnt: true,
    bansos_blt_desa: false,
    bpjs_pbi: true,
    dusun: 'Sukamaju',
    rw: '01',
    rt: '01',
    alamat_detail: 'Jl. Melati No. 12 RT 01',
    status_tempat_tinggal: 'Milik Sendiri',
    telepon: '0812-9876-5431',
    status_domisili: 'Penduduk Tetap',
    status_kependudukan: 'aktif',
    is_disabilitas: false,
    jenis_disabilitas: 'Tidak Ada',
    penyakit_kronis: 'Tidak Ada',
    status_kesehatan_khusus: 'Normal',
  },
  {
    id: 'w-2',
    nik: '3201015506890002',
    no_kk: '3201011203850000',
    nama: 'Siti Aminah',
    tempat_lahir: 'Cianjur',
    tanggal_lahir: '1989-06-15',
    jenis_kelamin: 'Perempuan',
    golongan_darah: 'A',
    agama: 'Islam',
    no_akta_lahir: '3201-LT-15061989-002',
    status_ktp: 'Sudah KTP-el',
    shdk: 'Istri',
    status_perkawinan: 'Kawin',
    no_akta_nikah_cerai: 'KUA.10.01/PW.01/123/2010',
    nama_ayah: 'Hasan Basri',
    nama_ibu: 'Maimunah',
    pendidikan_terakhir: 'SMP/Sederajat',
    status_sekolah: 'Tidak / Sudah Lulus',
    pekerjaan: 'Ibu Rumah Tangga',
    rentang_penghasilan: 'Belum Berpenghasilan',
    status_ekonomi: 'miskin',
    bansos_pkh: true,
    bansos_bpnt: true,
    bansos_blt_desa: false,
    bpjs_pbi: true,
    dusun: 'Sukamaju',
    rw: '01',
    rt: '01',
    alamat_detail: 'Jl. Melati No. 12 RT 01',
    status_tempat_tinggal: 'Milik Sendiri',
    telepon: '0812-9876-5432',
    status_domisili: 'Penduduk Tetap',
    status_kependudukan: 'aktif',
    is_disabilitas: false,
    jenis_disabilitas: 'Tidak Ada',
    penyakit_kronis: 'Tidak Ada',
    status_kesehatan_khusus: 'Ibu Hamil',
  },
  {
    id: 'w-9',
    nik: '3201011505230009',
    no_kk: '3201011203850000',
    nama: 'Rizky Sudarmono',
    tempat_lahir: 'Bogor',
    tanggal_lahir: '2023-05-15',
    jenis_kelamin: 'Laki-laki',
    golongan_darah: 'O',
    agama: 'Islam',
    no_akta_lahir: '3201-AL-15052023-088',
    status_ktp: 'Belum Wajib KTP',
    shdk: 'Anak',
    status_perkawinan: 'Belum Kawin',
    no_akta_nikah_cerai: '',
    nama_ayah: 'Bambang Sudarmono',
    nama_ibu: 'Siti Aminah',
    pendidikan_terakhir: 'Tidak / Belum Sekolah',
    status_sekolah: 'Tidak / Belum Sekolah',
    pekerjaan: 'Belum Bekerja',
    rentang_penghasilan: 'Belum Berpenghasilan',
    status_ekonomi: 'miskin',
    bansos_pkh: true,
    bansos_bpnt: false,
    bansos_blt_desa: false,
    bpjs_pbi: true,
    dusun: 'Sukamaju',
    rw: '01',
    rt: '01',
    alamat_detail: 'Jl. Melati No. 12 RT 01',
    status_tempat_tinggal: 'Milik Sendiri',
    telepon: '',
    status_domisili: 'Penduduk Tetap',
    status_kependudukan: 'aktif',
    is_disabilitas: false,
    jenis_disabilitas: 'Tidak Ada',
    penyakit_kronis: 'Tidak Ada',
    status_kesehatan_khusus: 'Balita (0-5 Tahun)',
  },
  {
    id: 'w-6',
    nik: '3201010101700006',
    no_kk: '3201010101700000',
    nama: 'Solihin bin Kosasih',
    tempat_lahir: 'Tasikmalaya',
    tanggal_lahir: '1970-01-01',
    jenis_kelamin: 'Laki-laki',
    golongan_darah: 'B',
    agama: 'Islam',
    no_akta_lahir: '3201-LT-01011970-006',
    status_ktp: 'Sudah KTP-el',
    shdk: 'Kepala Keluarga',
    status_perkawinan: 'Cerai Mati',
    no_akta_nikah_cerai: 'KUA.10/AC/1998',
    nama_ayah: 'Kosasih',
    nama_ibu: 'Rohayati',
    pendidikan_terakhir: 'SD / Sederajat',
    status_sekolah: 'Tidak / Sudah Lulus',
    pekerjaan: 'Buruh Tani',
    rentang_penghasilan: '< Rp 1.000.000',
    status_ekonomi: 'miskin',
    bansos_pkh: false,
    bansos_bpnt: true,
    bansos_blt_desa: true,
    bpjs_pbi: true,
    dusun: 'Sukamaju',
    rw: '01',
    rt: '01',
    alamat_detail: 'Jl. Randu Alas RT 01',
    status_tempat_tinggal: 'Menumpang',
    telepon: '',
    status_domisili: 'Penduduk Tetap',
    status_kependudukan: 'aktif',
    is_disabilitas: true,
    jenis_disabilitas: 'Fisik',
    penyakit_kronis: 'Hipertensi',
    status_kesehatan_khusus: 'Normal',
  },

  // RT 02 / RW 01 (Sukamaju)
  {
    id: 'w-3',
    nik: '3201011808920003',
    no_kk: '3201011808920000',
    nama: 'Agus Supriatna',
    tempat_lahir: 'Sumedang',
    tanggal_lahir: '1992-08-18',
    jenis_kelamin: 'Laki-laki',
    golongan_darah: 'AB',
    agama: 'Islam',
    no_akta_lahir: '3201-LT-18081992-003',
    status_ktp: 'Sudah KTP-el',
    shdk: 'Kepala Keluarga',
    status_perkawinan: 'Kawin',
    no_akta_nikah_cerai: 'KUA.10/NK/2016',
    nama_ayah: 'Endang Supriatna',
    nama_ibu: 'Tati Warsiti',
    pendidikan_terakhir: 'SMA/SMK/Sederajat',
    status_sekolah: 'Tidak / Sudah Lulus',
    pekerjaan: 'Buruh Harian Lepas',
    rentang_penghasilan: 'Rp 1.000.000 - Rp 2.500.000',
    status_ekonomi: 'rentan',
    bansos_pkh: false,
    bansos_bpnt: true,
    bansos_blt_desa: false,
    bpjs_pbi: true,
    dusun: 'Sukamaju',
    rw: '01',
    rt: '02',
    alamat_detail: 'Kp. Babakan RT 02',
    status_tempat_tinggal: 'Sewa / Kontrak',
    telepon: '0857-1234-5678',
    status_domisili: 'Penduduk Tetap',
    status_kependudukan: 'aktif',
    is_disabilitas: false,
    jenis_disabilitas: 'Tidak Ada',
    penyakit_kronis: 'Tidak Ada',
    status_kesehatan_khusus: 'Normal',
  },
  {
    id: 'w-7',
    nik: '3201016509940007',
    no_kk: '3201011808920000',
    nama: 'Nurhayati Rahmawati',
    tempat_lahir: 'Bogor',
    tanggal_lahir: '1994-09-25',
    jenis_kelamin: 'Perempuan',
    golongan_darah: 'O',
    agama: 'Islam',
    no_akta_lahir: '3201-LT-25091994-007',
    status_ktp: 'Sudah KTP-el',
    shdk: 'Istri',
    status_perkawinan: 'Kawin',
    no_akta_nikah_cerai: 'KUA.10/NK/2016',
    nama_ayah: 'Darmanto',
    nama_ibu: 'Suratmi',
    pendidikan_terakhir: 'Sarjana (S1 / D4)',
    status_sekolah: 'Tidak / Sudah Lulus',
    pekerjaan: 'Karyawan Swasta',
    rentang_penghasilan: 'Rp 2.500.000 - Rp 5.000.000',
    status_ekonomi: 'mampu',
    bansos_pkh: false,
    bansos_bpnt: false,
    bansos_blt_desa: false,
    bpjs_pbi: false,
    dusun: 'Sukamaju',
    rw: '01',
    rt: '02',
    alamat_detail: 'Kp. Babakan RT 02',
    status_tempat_tinggal: 'Milik Sendiri',
    telepon: '0813-8888-7777',
    status_domisili: 'Penduduk Tetap',
    status_kependudukan: 'aktif',
    is_disabilitas: false,
    jenis_disabilitas: 'Tidak Ada',
    penyakit_kronis: 'Tidak Ada',
    status_kesehatan_khusus: 'Ibu Menyusui',
  },
  {
    id: 'w-8',
    nik: '3201012502900008',
    no_kk: '3201012502900000',
    nama: 'Herman Wijaya',
    tempat_lahir: 'Sukabumi',
    tanggal_lahir: '1990-02-25',
    jenis_kelamin: 'Laki-laki',
    golongan_darah: 'A',
    agama: 'Islam',
    no_akta_lahir: '3201-LT-25021990-008',
    status_ktp: 'Sudah KTP-el',
    shdk: 'Kepala Keluarga',
    status_perkawinan: 'Kawin',
    no_akta_nikah_cerai: 'KUA.10/NK/2014',
    nama_ayah: 'Wijaya',
    nama_ibu: 'Kokom',
    pendidikan_terakhir: 'SMA/SMK/Sederajat',
    status_sekolah: 'Tidak / Sudah Lulus',
    pekerjaan: 'Pedagang Warung',
    rentang_penghasilan: 'Rp 1.000.000 - Rp 2.500.000',
    status_ekonomi: 'miskin',
    bansos_pkh: false,
    bansos_bpnt: true,
    bansos_blt_desa: true,
    bpjs_pbi: true,
    dusun: 'Sukamaju',
    rw: '01',
    rt: '02',
    alamat_detail: 'Jl. Anggrek No. 8 RT 02',
    status_tempat_tinggal: 'Milik Sendiri',
    telepon: '0821-2222-3333',
    status_domisili: 'Penduduk Tetap',
    status_kependudukan: 'aktif',
    is_disabilitas: false,
    jenis_disabilitas: 'Tidak Ada',
    penyakit_kronis: 'Asma',
    status_kesehatan_khusus: 'Normal',
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
    golongan_darah: 'B',
    agama: 'Islam',
    no_akta_lahir: '3201-LT-22041978-004',
    status_ktp: 'Sudah KTP-el',
    shdk: 'Kepala Keluarga',
    status_perkawinan: 'Kawin',
    no_akta_nikah_cerai: 'KUA.10/NK/2003',
    nama_ayah: 'Gunawan',
    nama_ibu: 'Neneng',
    pendidikan_terakhir: 'Sarjana (S1 / D4)',
    status_sekolah: 'Tidak / Sudah Lulus',
    pekerjaan: 'Wiraswasta',
    rentang_penghasilan: '> Rp 5.000.000',
    status_ekonomi: 'mampu',
    bansos_pkh: false,
    bansos_bpnt: false,
    bansos_blt_desa: false,
    bpjs_pbi: false,
    dusun: 'Mekarsari',
    rw: '02',
    rt: '01',
    alamat_detail: 'Jl. Cempaka Indah No. 5',
    status_tempat_tinggal: 'Milik Sendiri',
    telepon: '0811-9999-0000',
    status_domisili: 'Penduduk Tetap',
    status_kependudukan: 'aktif',
    is_disabilitas: false,
    jenis_disabilitas: 'Tidak Ada',
    penyakit_kronis: 'Tidak Ada',
    status_kesehatan_khusus: 'Normal',
  },
  {
    id: 'w-5',
    nik: '3201016011950005',
    no_kk: '3201016011950000',
    nama: 'Dewi Sartika',
    tempat_lahir: 'Bogor',
    tanggal_lahir: '1995-11-20',
    jenis_kelamin: 'Perempuan',
    golongan_darah: 'O',
    agama: 'Islam',
    no_akta_lahir: '3201-LT-20111995-005',
    status_ktp: 'Sudah KTP-el',
    shdk: 'Kepala Keluarga',
    status_perkawinan: 'Cerai Hidup',
    no_akta_nikah_cerai: 'PA.Cbn/AC/2021/45',
    nama_ayah: 'Sartika',
    nama_ibu: 'Rokayah',
    pendidikan_terakhir: 'SMA/SMK/Sederajat',
    status_sekolah: 'Tidak / Sudah Lulus',
    pekerjaan: 'Pedagang',
    rentang_penghasilan: 'Rp 1.000.000 - Rp 2.500.000',
    status_ekonomi: 'rentan',
    bansos_pkh: false,
    bansos_bpnt: true,
    bansos_blt_desa: false,
    bpjs_pbi: true,
    dusun: 'Mekarsari',
    rw: '02',
    rt: '02',
    alamat_detail: 'Kp. Pasir Honje RT 02',
    status_tempat_tinggal: 'Sewa / Kontrak',
    telepon: '0812-7777-6666',
    status_domisili: 'Penduduk Tetap',
    status_kependudukan: 'aktif',
    is_disabilitas: false,
    jenis_disabilitas: 'Tidak Ada',
    penyakit_kronis: 'Tidak Ada',
    status_kesehatan_khusus: 'Normal',
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
  const { pengaturanDesa, getDusunOptions, getRwOptions, getRtOptions } = useDesa();

  const [warga, setWarga] = useState([]);
  const [search, setSearch] = useState('');
  const [filterEkonomi, setFilterEkonomi] = useState('all');

  // Filter Khusus Admin: RT/RW, Dusun, KK, Kepala Keluarga
  const [filterDusun, setFilterDusun] = useState('all');
  const [filterRw, setFilterRw] = useState('all');
  const [filterRt, setFilterRt] = useState('all');
  const [filterShdk, setFilterShdk] = useState('all'); // 'all' | 'Kepala Keluarga' | 'Bukan Kepala Keluarga'
  const [filterNoKk, setFilterNoKk] = useState('');
  const [showRekapModal, setShowRekapModal] = useState(false);

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

  // Dynamic Options untuk Dropdown Wilayah Admin
  const dusunList = useMemo(() => {
    return getDusunOptions ? getDusunOptions() : [];
  }, [getDusunOptions]);

  const rwList = useMemo(() => {
    return getRwOptions ? getRwOptions(filterDusun !== 'all' ? filterDusun : '') : [];
  }, [getRwOptions, filterDusun]);

  const rtList = useMemo(() => {
    return getRtOptions
      ? getRtOptions(
          filterDusun !== 'all' ? filterDusun : '',
          filterRw !== 'all' ? filterRw : ''
        )
      : [];
  }, [getRtOptions, filterDusun, filterRw]);

  const hasActiveFilter =
    filterDusun !== 'all' ||
    filterRw !== 'all' ||
    filterRt !== 'all' ||
    filterShdk !== 'all' ||
    Boolean(filterNoKk.trim()) ||
    filterEkonomi !== 'all' ||
    Boolean(search.trim());

  const resetAllFilters = () => {
    setFilterDusun('all');
    setFilterRw('all');
    setFilterRt('all');
    setFilterShdk('all');
    setFilterNoKk('');
    setFilterEkonomi('all');
    setSearch('');
  };

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
  }, [
    search,
    filterEkonomi,
    filterDusun,
    filterRw,
    filterRt,
    filterShdk,
    filterNoKk,
    pageSize,
  ]);

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

      // Filter Dusun (Admin)
      const matchDusun =
        filterDusun === 'all' ||
        w.dusun?.trim().toLowerCase() === filterDusun.trim().toLowerCase();

      // Filter RW (Admin)
      const matchRw =
        filterRw === 'all' ||
        normalizeWilayah(w.rw) === normalizeWilayah(filterRw);

      // Filter RT (Admin)
      const matchRt =
        filterRt === 'all' ||
        normalizeWilayah(w.rt) === normalizeWilayah(filterRt);

      // Filter Kepala Keluarga (SHDK)
      let matchShdk = true;
      if (filterShdk === 'Kepala Keluarga') {
        matchShdk = w.shdk === 'Kepala Keluarga';
      } else if (filterShdk === 'Bukan Kepala Keluarga') {
        matchShdk = w.shdk !== 'Kepala Keluarga';
      }

      // Filter No. KK
      const matchNoKk =
        !filterNoKk.trim() ||
        String(w.no_kk || '').includes(filterNoKk.trim());

      return (
        matchSearch &&
        matchEkonomi &&
        matchDusun &&
        matchRw &&
        matchRt &&
        matchShdk &&
        matchNoKk
      );
    });
  }, [
    warga,
    search,
    filterEkonomi,
    filterDusun,
    filterRw,
    filterRt,
    filterShdk,
    filterNoKk,
  ]);

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
    <div className="pb-28 max-w-4xl mx-auto animate-fade-in relative">
      {/* 1. STICKY HEADER: TERKUNCI TETAP DI ATAS SAAT SCROLLING KEBAWAH */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md px-3 sm:px-4 pt-3 pb-2.5 border-b border-slate-200/80 shadow-xs space-y-2">
        {/* Baris 1: Judul Halaman & Tombol Aksi */}
        <div className="flex justify-between items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800 flex-shrink-0">
                <Users size={16} />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight truncate">
                Data Kependudukan
              </h2>
            </div>
            <p className="text-[10.5px] text-slate-500 mt-0.5 truncate">
              Wilayah Aktif: <strong className="text-teal-700 font-bold">{profile?.role?.toUpperCase()}</strong>
              {profile?.wilayah_rt ? ` • RT ${profile.wilayah_rt}` : ''}
              {profile?.wilayah_rw ? ` / RW ${profile.wilayah_rw}` : ''}
              {profile?.wilayah_dusun ? ` • Dusun ${profile.wilayah_dusun}` : ''}
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowRekapModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 active:scale-95 shadow-2xs flex items-center gap-1.5 text-xs font-bold transition-all"
                title="Rekapitulasi dan Unduh Data Kependudukan per RT/RW dan Dusun"
              >
                <FileSpreadsheet size={14} className="text-teal-700" />
                <span className="hidden sm:inline">Rekap & Unduh</span>
                <span className="sm:hidden">Rekap</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-2.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white shadow-md shadow-teal-900/10 flex items-center gap-1 text-xs font-bold transition-all"
                title="Tambah Warga Baru"
              >
                <UserPlus size={14} />
                <span>Tambah</span>
              </button>
            </div>
          )}
        </div>

        {/* Baris 2: Indikator Realtime Terhubung */}
        <div className="px-2.5 py-1.5 rounded-xl bg-teal-50/90 border border-teal-100 flex items-center justify-between text-[10px] text-teal-800">
          <div className="flex items-center gap-1.5 font-semibold truncate">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="truncate">Database Realtime Terhubung ke Semua Role</span>
          </div>
          <button
            type="button"
            onClick={fetchWarga}
            className="flex items-center gap-1 hover:text-teal-950 font-bold flex-shrink-0 ml-2 transition-colors"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. KONTEN UTAMA YANG DAPAT DI-SCROLL */}
      <div className="px-3 sm:px-4 pt-3 space-y-3">
        {/* Alat Ekspor / Impor Data Excel */}
        {isAdmin && (
          <div className="p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-700">Ekspor / Impor Data:</span>
            <ExcelImportExport onRefresh={handleWargaSuccess} wargaList={filtered} />
          </div>
        )}

        {/* Pencarian Warga Cepat */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari No. KK, NIK, atau Nama Warga..."
            className="w-full pl-9 pr-8 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none shadow-xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* PANEL FILTER KHUSUS ADMIN (WILAYAH, KK, & KEPALA KELUARGA) */}
        {isAdmin && (
          <div className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                <Filter size={13} className="text-teal-700" />
                Filter Wilayah & Kependudukan
              </span>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[10.5px] font-bold text-rose-600 hover:text-rose-800 transition-colors"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>

            {/* Baris 1: Filter Wilayah 3 Kolom Presisi (Dusun, RW, RT) */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9.5px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">
                  Dusun
                </label>
                <select
                  value={filterDusun}
                  onChange={(e) => {
                    setFilterDusun(e.target.value);
                    setFilterRw('all');
                    setFilterRt('all');
                  }}
                  className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
                >
                  <option value="all">Semua Dusun</option>
                  {dusunList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9.5px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">
                  RW
                </label>
                <select
                  value={filterRw}
                  onChange={(e) => {
                    setFilterRw(e.target.value);
                    setFilterRt('all');
                  }}
                  className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
                >
                  <option value="all">Semua RW</option>
                  {rwList.map((rw) => (
                    <option key={rw} value={rw}>
                      RW {rw}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9.5px] text-slate-500 font-bold block mb-1 uppercase tracking-wider">
                  RT
                </label>
                <select
                  value={filterRt}
                  onChange={(e) => setFilterRt(e.target.value)}
                  className="w-full py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
                >
                  <option value="all">Semua RT</option>
                  {rtList.map((rt) => (
                    <option key={rt} value={rt}>
                      RT {rt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Baris 2: Filter Status Hubungan Keluarga (Full Width, Rapi & Anti-Wrap) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-[9.5px] text-slate-500 font-bold block mb-1.5 uppercase tracking-wider">
                Status Hubungan dalam Keluarga (SHDK):
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-center">
                <button
                  type="button"
                  onClick={() => setFilterShdk('all')}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all ${
                    filterShdk === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua Warga
                </button>
                <button
                  type="button"
                  onClick={() => setFilterShdk('Kepala Keluarga')}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                    filterShdk === 'Kepala Keluarga'
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-teal-800'
                  }`}
                >
                  <span>👑 Kepala KK</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterShdk('Bukan Kepala Keluarga')}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-lg transition-all ${
                    filterShdk === 'Bukan Kepala Keluarga'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Anggota Lain
                </button>
              </div>
            </div>

            {/* Baris 3: Filter Khusus No. Kartu Keluarga (KK) */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">
                No. Kartu Keluarga (KK):
              </label>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={filterNoKk}
                  onChange={(e) => setFilterNoKk(e.target.value)}
                  placeholder="Ketik 16 digit No. KK..."
                  className="w-full py-1.5 pl-3 pr-7 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all"
                />
                {filterNoKk && (
                  <button
                    type="button"
                    onClick={() => setFilterNoKk('')}
                    className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Badges Indicator */}
            {hasActiveFilter && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 text-[10px]">
                <span className="text-slate-400 font-bold">Filter Aktif:</span>
                {filterDusun !== 'all' && (
                  <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-teal-200">
                    Dusun: {filterDusun}
                    <button type="button" onClick={() => setFilterDusun('all')}>×</button>
                  </span>
                )}
                {filterRw !== 'all' && (
                  <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-teal-200">
                    RW {filterRw}
                    <button type="button" onClick={() => setFilterRw('all')}>×</button>
                  </span>
                )}
                {filterRt !== 'all' && (
                  <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-teal-200">
                    RT {filterRt}
                    <button type="button" onClick={() => setFilterRt('all')}>×</button>
                  </span>
                )}
                {filterShdk !== 'all' && (
                  <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-teal-200">
                    {filterShdk === 'Kepala Keluarga' ? '👑 Kepala KK Saja' : 'Anggota Saja'}
                    <button type="button" onClick={() => setFilterShdk('all')}>×</button>
                  </span>
                )}
                {filterNoKk && (
                  <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border border-teal-200 font-mono">
                    KK: {filterNoKk}
                    <button type="button" onClick={() => setFilterNoKk('')}>×</button>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

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

      {/* TABEL DATA WARGA (RINGKAS & PRESISI: NO KK, NIK, NAMA - KLIK UNTUK DETAIL LENGKAP) */}
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
                : `Belum ada data warga terdaftar untuk wilayah ${profile?.role?.toUpperCase()} ${
                    profile?.wilayah_rt ? `RT ${profile.wilayah_rt}` : ''
                  }.`}
            </p>
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[33%]" />
              <col className="w-[33%]" />
              <col className="w-[34%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-100/90 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                <th className="py-2.5 pl-3 pr-1 text-left">No. KK</th>
                <th className="py-2.5 px-1 text-left">NIK</th>
                <th className="py-2.5 pl-1 pr-3 text-left">Nama Warga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedWarga.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedDetailWarga(item)}
                  className="hover:bg-teal-50/70 active:bg-teal-100/60 cursor-pointer transition-colors group even:bg-slate-50/40"
                >
                  <td className="py-2.5 pl-3 pr-1 font-mono text-[11px] font-medium text-slate-600 whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.no_kk}
                  </td>
                  <td className="py-2.5 px-1 font-mono text-[11px] font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.nik}
                  </td>
                  <td className="py-2.5 pl-1 pr-3">
                    <div className="flex items-center justify-between gap-1">
                      <div className="min-w-0 flex-1 truncate">
                        <span className="font-extrabold text-slate-900 group-hover:text-teal-900 text-xs truncate block">
                          {item.nama}
                        </span>
                        <span className="text-[9.5px] text-slate-400 block truncate mt-0.5">
                          {item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'} • RT {item.rt}/RW {item.rw}
                        </span>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-slate-300 group-hover:text-teal-700 flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* KONTROL PAGINASI PRESISI & RAPI (2 BARIS SEIMBANG & ANTI-SQUISHING) */}
      {filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-3 space-y-2.5">
          {/* Baris 1: Info Halaman & Pilihan Baris */}
          <div className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-medium text-[11px]">
              <span className="text-slate-400">Halaman:</span>
              <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 whitespace-nowrap">
                {validCurrentPage} dari {totalPages}
              </span>
              <span className="text-slate-400 text-[10.5px] whitespace-nowrap">
                ({totalItems} warga)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-slate-400 whitespace-nowrap">Baris:</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="py-1 px-2 rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-700 text-xs outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
              >
                <option value={5}>5 baris</option>
                <option value={10}>10 baris</option>
                <option value={20}>20 baris</option>
                <option value={50}>50 baris</option>
              </select>
            </div>
          </div>

          {/* Baris 2: Tombol Navigasi Halaman Seimbang */}
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed font-bold text-xs text-slate-700 flex items-center justify-center gap-1 transition-all shadow-sm"
            >
              <ChevronLeft size={14} />
              <span>Sebelumnya</span>
            </button>

            {/* Smart Page Pills */}
            <div className="flex items-center gap-1 px-0.5">
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
                      {showEllipsis && <span className="px-0.5 text-slate-300 font-mono text-[10px]">..</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-xl font-black text-xs transition-all flex items-center justify-center ${
                          validCurrentPage === p
                            ? 'bg-teal-700 text-white shadow-md shadow-teal-900/20'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="flex-1 py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed font-bold text-xs text-slate-700 flex items-center justify-center gap-1 transition-all shadow-sm"
            >
              <span>Selanjutnya</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      </div>

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

            {/* 5 KATEGORI DETAIL IDENTITAS LENGKAP & SINKRON */}
            <div className="space-y-3.5 text-xs">
              {/* KATEGORI 1: Identitas Dasar & Dokumen Kependudukan */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} className="text-teal-600" />
                    1. Identitas Dasar & Dokumen
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100/80 text-teal-800 border border-teal-200">
                    {selectedDetailWarga.status_ktp || 'Sudah KTP-el'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Tempat, Tgl Lahir:</span>
                    <strong className="text-slate-800 font-semibold block text-[11px]">
                      {selectedDetailWarga.tempat_lahir || '-'}, {formatDate(selectedDetailWarga.tanggal_lahir)}
                    </strong>
                    {selectedDetailWarga.tanggal_lahir && (
                      <span className="text-[10px] text-teal-700 font-bold block mt-0.5">
                        Usia: {calculateAge(selectedDetailWarga.tanggal_lahir)} tahun
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Jenis Kelamin & Gol. Darah:</span>
                    <strong className="text-slate-800 font-semibold block text-[11px]">
                      {selectedDetailWarga.jenis_kelamin || '-'} • Gol. {selectedDetailWarga.golongan_darah || '-'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Agama:</span>
                    <strong className="text-slate-800 font-semibold block text-[11px]">
                      {selectedDetailWarga.agama || 'Islam'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">No. Akta Kelahiran:</span>
                    <strong className="text-slate-800 font-mono font-medium block text-[10.5px] truncate" title={selectedDetailWarga.no_akta_lahir || '-'}>
                      {selectedDetailWarga.no_akta_lahir || '-'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* KATEGORI 2: Hubungan & Status Keluarga */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                  <Users size={13} className="text-teal-600" />
                  2. Hubungan & Status Keluarga
                </span>

                <div className="grid grid-cols-2 gap-2.5 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Hubungan Keluarga (SHDK):</span>
                    <strong className="text-slate-800 font-bold block text-[11px]">
                      {selectedDetailWarga.shdk || 'Kepala Keluarga'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Status Perkawinan:</span>
                    <strong className="text-slate-800 font-semibold block text-[11px]">
                      {selectedDetailWarga.status_perkawinan || 'Belum Kawin'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Nama Ayah Kandung:</span>
                    <strong className="text-slate-800 font-medium block text-[11px]">
                      {selectedDetailWarga.nama_ayah || '-'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Nama Ibu Kandung:</span>
                    <strong className="text-slate-800 font-medium block text-[11px]">
                      {selectedDetailWarga.nama_ibu || '-'}
                    </strong>
                  </div>

                  {selectedDetailWarga.no_akta_nikah && (
                    <div className="col-span-2 pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] text-slate-400 block font-medium">No. Buku / Akta Nikah / Perceraian:</span>
                      <strong className="text-slate-800 font-mono text-[10.5px]">
                        {selectedDetailWarga.no_akta_nikah}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* KATEGORI 3: Pendidikan, Pekerjaan, & Ekonomi */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-teal-600" />
                  3. Pendidikan, Pekerjaan & Ekonomi
                </span>

                <div className="grid grid-cols-2 gap-2.5 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Pendidikan Terakhir:</span>
                    <strong className="text-slate-800 font-semibold block text-[11px]">
                      {selectedDetailWarga.pendidikan || 'SMA/Sederajat'}
                    </strong>
                    <span className="text-[9.5px] text-slate-400 block mt-0.5">
                      Status: {selectedDetailWarga.status_sekolah || 'Tidak Sekolah'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Pekerjaan Utama:</span>
                    <strong className="text-slate-800 font-semibold block text-[11px]">
                      {selectedDetailWarga.pekerjaan || '-'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Rentang Penghasilan:</span>
                    <strong className="text-slate-800 font-medium block text-[11px]">
                      {selectedDetailWarga.penghasilan || 'Rp 1.000.000 - Rp 2.500.000'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Tingkat Ekonomi:</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-bold uppercase mt-0.5 ${
                      selectedDetailWarga.status_ekonomi === 'miskin'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedDetailWarga.status_ekonomi === 'rentan'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedDetailWarga.status_ekonomi || 'Mampu'}
                    </span>
                  </div>
                </div>

                {/* Status Bantuan Sosial */}
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 font-medium block mb-1.5">
                    Kepesertaan Bantuan Sosial (Bansos):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${
                      selectedDetailWarga.bansos_pkh === 'Ya'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      PKH: {selectedDetailWarga.bansos_pkh === 'Ya' ? 'Penerima' : 'Tidak'}
                    </span>

                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${
                      selectedDetailWarga.bansos_bpnt === 'Ya'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      BPNT/Sembako: {selectedDetailWarga.bansos_bpnt === 'Ya' ? 'Penerima' : 'Tidak'}
                    </span>

                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${
                      selectedDetailWarga.bansos_blt === 'Ya'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      BLT Desa: {selectedDetailWarga.bansos_blt === 'Ya' ? 'Penerima' : 'Tidak'}
                    </span>

                    <span className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold border ${
                      selectedDetailWarga.bansos_bpjs_pbi === 'Ya'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      BPJS PBI: {selectedDetailWarga.bansos_bpjs_pbi === 'Ya' ? 'Penerima' : 'Tidak'}
                    </span>
                  </div>
                </div>
              </div>

              {/* KATEGORI 4: Lokasi & Alamat Domisili */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                  <Home size={13} className="text-teal-600" />
                  4. Lokasi & Alamat Domisili
                </span>

                <div className="grid grid-cols-3 gap-2 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Dusun:</span>
                    <strong className="text-slate-800 font-semibold block text-[11px]">
                      {selectedDetailWarga.dusun || '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">RW:</span>
                    <strong className="text-slate-800 font-mono font-bold block text-[11px]">
                      RW {selectedDetailWarga.rw || '-'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">RT:</span>
                    <strong className="text-slate-800 font-mono font-bold block text-[11px]">
                      RT {selectedDetailWarga.rt || '-'}
                    </strong>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Status Tempat Tinggal:</span>
                    <strong className="text-slate-800 font-medium block text-[11px]">
                      {selectedDetailWarga.status_tempat_tinggal || 'Milik Sendiri'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Status Domisili:</span>
                    <strong className="text-slate-800 font-medium block text-[11px]">
                      {selectedDetailWarga.status_domisili || 'Penduduk Tetap'}
                    </strong>
                  </div>
                </div>

                {selectedDetailWarga.alamat_detail && (
                  <div className="pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Alamat Lengkap / Jalan:</span>
                    <p className="text-slate-800 font-medium text-[11px] mt-0.5">
                      {selectedDetailWarga.alamat_detail}
                    </p>
                  </div>
                )}

                {/* Nomor Telepon / WhatsApp */}
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Phone size={13} className="text-teal-700" />
                    <div>
                      <span className="text-[9.5px] text-slate-400 block font-medium">No. Telepon / WhatsApp:</span>
                      <strong className="text-slate-800 font-mono text-[11px]">
                        {selectedDetailWarga.no_telepon || selectedDetailWarga.no_hp || '-'}
                      </strong>
                    </div>
                  </div>

                  {(selectedDetailWarga.no_telepon || selectedDetailWarga.no_hp) && (
                    <a
                      href={`https://wa.me/${(selectedDetailWarga.no_telepon || selectedDetailWarga.no_hp).replace(/^0/, '62').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-all"
                    >
                      <span>Chat WA</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* KATEGORI 5: Kondisi Khusus & Kerentanan */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <span className="text-[11px] font-black text-teal-800 uppercase tracking-wider block border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                  <HeartPulse size={13} className="text-teal-600" />
                  5. Kondisi Khusus & Kerentanan
                </span>

                <div className="grid grid-cols-2 gap-2.5 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Status Khusus / Posyandu:</span>
                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md font-bold mt-0.5 ${
                      selectedDetailWarga.status_khusus === 'Balita (0-59 bulan)'
                        ? 'bg-purple-100 text-purple-800'
                        : selectedDetailWarga.status_khusus === 'Ibu Hamil'
                        ? 'bg-pink-100 text-pink-800'
                        : selectedDetailWarga.status_khusus === 'Ibu Menyusui'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedDetailWarga.status_khusus === 'Lansia'
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-slate-200/80 text-slate-700'
                    }`}>
                      {selectedDetailWarga.status_khusus || 'Normal'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Penyandang Disabilitas:</span>
                    <strong className="text-slate-800 font-semibold block text-[11px]">
                      {selectedDetailWarga.disabilitas && selectedDetailWarga.disabilitas !== 'Tidak Ada'
                        ? `Ya (${selectedDetailWarga.disabilitas})`
                        : 'Tidak Ada'}
                    </strong>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Penyakit Kronis / Menahun:</span>
                    <strong className="text-slate-800 font-medium block text-[11px]">
                      {selectedDetailWarga.penyakit_kronis || 'Tidak Ada'}
                    </strong>
                  </div>
                </div>
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

      {/* Modal Rekapitulasi & Unduh Data Kependudukan (Admin) */}
      {showRekapModal && (
        <RekapDownloadModal
          isOpen={showRekapModal}
          onClose={() => setShowRekapModal(false)}
          allWarga={warga}
          filteredWarga={filtered}
          namaDesa={pengaturanDesa?.nama_desa || 'Sukamaju'}
        />
      )}
    </div>
  );
}

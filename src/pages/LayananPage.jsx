import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDesa } from '../context/DesaContext';
import {
  Gift,
  FileSpreadsheet,
  HeartPulse,
  FileText,
  ShieldCheck,
  Baby,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Filter,
  Phone,
  MapPin,
  Calendar,
  Printer,
  Activity,
  Plus,
} from 'lucide-react';
import BansosPage from './BansosPage';
import MutasiPage from './MutasiPage';
import SuratModal from '../components/surat/SuratModal';
import { supabase } from '../lib/supabaseClient';

export default function LayananPage({ defaultSubTab = 'bansos' }) {
  const { profile } = useAuth();
  const { pengaturanDesa } = useDesa();

  // Sub-tabs: 'bansos' | 'mutasi' | 'posyandu' | 'surat'
  const [activeSubTab, setActiveSubTab] = useState(defaultSubTab);

  // Posyandu & Stunting Monitoring State
  const [wargaPosyandu, setWargaPosyandu] = useState([]);
  const [loadingPosyandu, setLoadingPosyandu] = useState(true);
  const [posyanduFilter, setPosyanduFilter] = useState('all'); // 'all' | 'balita' | 'hamil' | 'menyusui' | 'disabilitas' | 'kronis'

  // Surat Pengantar Quick Generator State
  const [wargaSuratList, setWargaSuratList] = useState([]);
  const [suratSearch, setSuratSearch] = useState('');
  const [selectedWargaSurat, setSelectedWargaSurat] = useState(null);

  useEffect(() => {
    if (defaultSubTab) {
      setActiveSubTab(defaultSubTab);
    }
  }, [defaultSubTab]);

  // Load Warga untuk Posyandu & Surat
  useEffect(() => {
    const fetchWargaData = async () => {
      setLoadingPosyandu(true);
      try {
        let query = supabase.from('warga').select('*').eq('status_kependudukan', 'aktif');

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
          setWargaPosyandu(data);
          setWargaSuratList(data);
        } else {
          const cached = JSON.parse(localStorage.getItem('cached_warga_desa') || '[]');
          setWargaPosyandu(cached);
          setWargaSuratList(cached);
        }
      } catch (err) {
        console.warn('Gagal fetch data layanan:', err);
      } finally {
        setLoadingPosyandu(false);
      }
    };

    fetchWargaData();
  }, [profile]);

  // Statistik Posyandu & Stunting
  const statsPosyandu = {
    totalBalita: wargaPosyandu.filter(
      (w) =>
        w.status_kesehatan_khusus === 'Balita (0-5 Tahun)' ||
        w.status_kesehatan_khusus === 'Balita' ||
        (w.tanggal_lahir && new Date().getFullYear() - new Date(w.tanggal_lahir).getFullYear() <= 5)
    ).length,
    totalHamil: wargaPosyandu.filter((w) => w.status_kesehatan_khusus === 'Ibu Hamil').length,
    totalMenyusui: wargaPosyandu.filter((w) => w.status_kesehatan_khusus === 'Ibu Menyusui').length,
    totalDisabilitas: wargaPosyandu.filter(
      (w) => w.is_disabilitas || (w.jenis_disabilitas && w.jenis_disabilitas !== 'Tidak Ada')
    ).length,
    totalKronis: wargaPosyandu.filter(
      (w) => w.penyakit_kronis && w.penyakit_kronis !== 'Tidak Ada' && w.penyakit_kronis !== '-'
    ).length,
  };

  // Filter List Posyandu
  const filteredPosyandu = wargaPosyandu.filter((w) => {
    if (posyanduFilter === 'balita') {
      return (
        w.status_kesehatan_khusus === 'Balita (0-5 Tahun)' ||
        w.status_kesehatan_khusus === 'Balita' ||
        (w.tanggal_lahir && new Date().getFullYear() - new Date(w.tanggal_lahir).getFullYear() <= 5)
      );
    }
    if (posyanduFilter === 'hamil') {
      return w.status_kesehatan_khusus === 'Ibu Hamil';
    }
    if (posyanduFilter === 'menyusui') {
      return w.status_kesehatan_khusus === 'Ibu Menyusui';
    }
    if (posyanduFilter === 'disabilitas') {
      return w.is_disabilitas || (w.jenis_disabilitas && w.jenis_disabilitas !== 'Tidak Ada');
    }
    if (posyanduFilter === 'kronis') {
      return w.penyakit_kronis && w.penyakit_kronis !== 'Tidak Ada' && w.penyakit_kronis !== '-';
    }
    // 'all' -> warga yang memiliki salah satu indikator kerentanan/kesehatan khusus
    return (
      w.status_kesehatan_khusus === 'Ibu Hamil' ||
      w.status_kesehatan_khusus === 'Ibu Menyusui' ||
      w.status_kesehatan_khusus === 'Balita (0-5 Tahun)' ||
      w.status_kesehatan_khusus === 'Balita' ||
      w.is_disabilitas ||
      (w.jenis_disabilitas && w.jenis_disabilitas !== 'Tidak Ada') ||
      (w.penyakit_kronis && w.penyakit_kronis !== 'Tidak Ada' && w.penyakit_kronis !== '-') ||
      (w.tanggal_lahir && new Date().getFullYear() - new Date(w.tanggal_lahir).getFullYear() <= 5)
    );
  });

  // Filter List Surat Pengantar
  const filteredSuratWarga = wargaSuratList.filter((w) => {
    const q = suratSearch.toLowerCase();
    return (
      w.nama?.toLowerCase().includes(q) ||
      w.nik?.includes(q) ||
      w.no_kk?.includes(q)
    );
  });

  return (
    <div className="pb-28 pt-4 px-3 sm:px-4 max-w-4xl mx-auto animate-fade-in">
      {/* Header Hub Layanan Desa */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800">
            <HeartPulse size={16} />
          </div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Layanan Terpadu Desa</h2>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Pusat layanan kependudukan, bansos, mutasi, surat pengantar & posyandu terintegrasi
        </p>
      </div>

      {/* Navigasi Sub-Tab Horizontal (4 Layanan Utama) */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl mb-4 text-[11px] font-bold text-slate-600 gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('bansos')}
          className={`flex-1 min-w-[76px] py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeSubTab === 'bansos'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          <Gift size={13} />
          <span>Bansos</span>
        </button>

        <button
          onClick={() => setActiveSubTab('mutasi')}
          className={`flex-1 min-w-[76px] py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeSubTab === 'mutasi'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet size={13} />
          <span>Mutasi</span>
        </button>

        <button
          onClick={() => setActiveSubTab('posyandu')}
          className={`flex-1 min-w-[90px] py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeSubTab === 'posyandu'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          <Baby size={13} />
          <span>Posyandu & Stunting</span>
        </button>

        <button
          onClick={() => setActiveSubTab('surat')}
          className={`flex-1 min-w-[76px] py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
            activeSubTab === 'surat'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          <FileText size={13} />
          <span>Surat PDF</span>
        </button>
      </div>

      {/* KONTEN SUB-TAB 1: BANTUAN SOSIAL */}
      {activeSubTab === 'bansos' && (
        <div className="animate-fade-in">
          <BansosPage />
        </div>
      )}

      {/* KONTEN SUB-TAB 2: MUTASI KEPENDUDUKAN */}
      {activeSubTab === 'mutasi' && (
        <div className="animate-fade-in">
          <MutasiPage />
        </div>
      )}

      {/* KONTEN SUB-TAB 3: POSYANDU, STUNTING & KERENTANAN KHUSUS */}
      {activeSubTab === 'posyandu' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Header Info */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 via-teal-50 to-emerald-50 border border-slate-200/80">
            <div className="flex items-center gap-2 mb-1">
              <Baby size={18} className="text-rose-600" />
              <h3 className="font-extrabold text-slate-800 text-sm">
                Pemantauan Kesehatan Posyandu & Pencegahan Stunting
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Monitoring khusus untuk ibu hamil, ibu menyusui, balita (0-5 tahun), serta warga penyandang disabilitas dan penyakit kronis.
            </p>
          </div>

          {/* Grid Statistik Posyandu */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Balita (0-5 Thn)</span>
              <span className="text-xl font-black text-teal-700">{statsPosyandu.totalBalita}</span>
              <span className="text-[9.5px] text-slate-400 block mt-0.5">Sasaran Timbang</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Ibu Hamil</span>
              <span className="text-xl font-black text-rose-600">{statsPosyandu.totalHamil}</span>
              <span className="text-[9.5px] text-slate-400 block mt-0.5">Pemantauan Gizi</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Disabilitas</span>
              <span className="text-xl font-black text-indigo-700">{statsPosyandu.totalDisabilitas}</span>
              <span className="text-[9.5px] text-slate-400 block mt-0.5">Bantuan Aksesibilitas</span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Penyakit Kronis</span>
              <span className="text-xl font-black text-amber-600">{statsPosyandu.totalKronis}</span>
              <span className="text-[9.5px] text-slate-400 block mt-0.5">Perawatan Berkala</span>
            </div>
          </div>

          {/* Filter Pills Kategori Khusus */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {[
              { id: 'all', label: 'Semua Sasaran' },
              { id: 'balita', label: 'Balita (0-5 Thn)' },
              { id: 'hamil', label: 'Ibu Hamil' },
              { id: 'menyusui', label: 'Ibu Menyusui' },
              { id: 'disabilitas', label: 'Disabilitas' },
              { id: 'kronis', label: 'Penyakit Kronis' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setPosyanduFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap text-[11px] transition-all ${
                  posyanduFilter === cat.id
                    ? 'bg-teal-800 text-white shadow-sm shadow-teal-900/20'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* List Warga Sasaran Posyandu */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Daftar Warga Sasaran Khusus:</span>
              <span className="text-slate-400 text-[11px] font-medium">{filteredPosyandu.length} warga terdata</span>
            </div>

            {loadingPosyandu ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-700 border-t-transparent mx-auto mb-2" />
                <p className="text-xs text-slate-400">Memuat data sasaran posyandu...</p>
              </div>
            ) : filteredPosyandu.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-slate-400">
                Belum ada data warga terdata dalam kategori "{posyanduFilter}". Lengkapi data warga di tab Warga.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {filteredPosyandu.map((item) => (
                  <div key={item.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{item.nama}</h4>
                          <span className="text-[10px] text-slate-400">
                            ({item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'})
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10.5px] font-mono text-slate-500">
                          NIK: {item.nik} • RT {item.rt}/RW {item.rw} ({item.dusun})
                        </div>
                        {item.alamat_detail && (
                          <div className="mt-0.5 text-[10.5px] text-slate-400">{item.alamat_detail}</div>
                        )}
                      </div>

                      {/* Badges Kondisi Khusus */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {item.status_kesehatan_khusus && item.status_kesehatan_khusus !== 'Normal' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            {item.status_kesehatan_khusus}
                          </span>
                        )}
                        {item.is_disabilitas && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Disabilitas ({item.jenis_disabilitas || 'Fisik'})
                          </span>
                        )}
                        {item.penyakit_kronis && item.penyakit_kronis !== 'Tidak Ada' && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            {item.penyakit_kronis}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* KONTEN SUB-TAB 4: GENERATOR SURAT PENGANTAR PDF RESMI */}
      {activeSubTab === 'surat' && (
        <div className="space-y-3.5 animate-fade-in">
          {/* Header Info */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 border border-teal-100">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={18} className="text-teal-700" />
              <h3 className="font-extrabold text-slate-800 text-sm">
                Pembuatan Surat Pengantar Resmi Desa (PDF)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pilih warga pemohon untuk langsung mencetak Surat Pengantar resmi lengkap dengan Kop Surat Desa {pengaturanDesa?.nama_desa}, nomor surat otomatis, dan tanda tangan Kepala Desa {pengaturanDesa?.nama_kepala_desa}.
            </p>
          </div>

          {/* Pencarian Warga Pemohon */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={suratSearch}
              onChange={(e) => setSuratSearch(e.target.value)}
              placeholder="Ketik NIK, No. KK, atau Nama Warga pemohon..."
              className="w-full pl-9 pr-8 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none shadow-sm"
            />
            {suratSearch && (
              <button
                onClick={() => setSuratSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Daftar Warga Siap Cetak Surat */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Pilih Warga Pemohon Surat:</span>
              <span className="text-slate-400 text-[11px] font-medium">{filteredSuratWarga.length} warga ditemukan</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs max-h-[380px] overflow-y-auto">
              {filteredSuratWarga.map((item) => (
                <div
                  key={item.id}
                  className="p-3 hover:bg-teal-50/50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                      {item.nama}
                    </div>
                    <div className="text-[10.5px] font-mono text-slate-500 mt-0.5">
                      NIK: {item.nik} • KK: {item.no_kk}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      RT {item.rt} / RW {item.rw} • Dusun {item.dusun}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedWargaSurat(item)}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-teal-900/10 transition-all flex-shrink-0"
                  >
                    <Printer size={13} />
                    <span>Cetak Surat</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Cetak Surat Pengantar PDF */}
      {selectedWargaSurat && (
        <SuratModal
          warga={selectedWargaSurat}
          userProfile={profile}
          onClose={() => setSelectedWargaSurat(null)}
        />
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Download,
  FileSpreadsheet,
  Building,
  Home,
  Users,
  CheckCircle2,
  Filter,
  Layers,
  Baby,
  HeartPulse,
  ShieldAlert,
} from 'lucide-react';
import { normalizeWilayah } from '../../pages/WargaPage';

// Helper format row data untuk ekspor Excel lengkap
const formatWargaRow = (w, index) => ({
  No: index + 1,
  NIK: String(w.nik || ''),
  No_KK: String(w.no_kk || ''),
  Nama_Lengkap: w.nama || '',
  SHDK: w.shdk || 'Kepala Keluarga',
  Jenis_Kelamin: w.jenis_kelamin || 'Laki-laki',
  Tempat_Lahir: w.tempat_lahir || '',
  Tanggal_Lahir: w.tanggal_lahir || '',
  Golongan_Darah: w.golongan_darah || '-',
  Agama: w.agama || 'Islam',
  Status_Perkawinan: w.status_perkawinan || 'Belum Kawin',
  No_Akta_Lahir: w.no_akta_lahir || '-',
  Status_KTP: w.status_ktp || 'Sudah KTP-el',
  Nama_Ayah: w.nama_ayah || '-',
  Nama_Ibu: w.nama_ibu || '-',
  Pendidikan_Terakhir: w.pendidikan || w.pendidikan_terakhir || 'SMA/Sederajat',
  Status_Sekolah: w.status_sekolah || 'Tidak Sekolah',
  Pekerjaan: w.pekerjaan || '-',
  Penghasilan: w.penghasilan || w.rentang_penghasilan || '-',
  Ekonomi: w.status_ekonomi || 'mampu',
  Bansos_PKH: w.bansos_pkh === 'Ya' || w.bansos_pkh === true ? 'Penerima' : 'Tidak',
  Bansos_BPNT: w.bansos_bpnt === 'Ya' || w.bansos_bpnt === true ? 'Penerima' : 'Tidak',
  Bansos_BLT_Desa: w.bansos_blt === 'Ya' || w.bansos_blt_desa === true ? 'Penerima' : 'Tidak',
  BPJS_PBI: w.bansos_bpjs_pbi === 'Ya' || w.bpjs_pbi === true ? 'Penerima' : 'Tidak',
  Dusun: w.dusun || '-',
  RW: String(w.rw || '-').padStart(2, '0'),
  RT: String(w.rt || '-').padStart(2, '0'),
  Alamat_Detail: w.alamat_detail || '-',
  Status_Tempat_Tinggal: w.status_tempat_tinggal || 'Milik Sendiri',
  Status_Domisili: w.status_domisili || 'Penduduk Tetap',
  No_Telepon_WA: w.no_telepon || w.no_hp || w.telepon || '-',
  Status_Khusus_Posyandu: w.status_khusus || w.status_kesehatan_khusus || 'Normal',
  Disabilitas: w.disabilitas || w.jenis_disabilitas || 'Tidak Ada',
  Penyakit_Kronis: w.penyakit_kronis || 'Tidak Ada',
  Status_Kependudukan: w.status_kependudukan || 'aktif',
});

// Helper auto-fit column widths
const autoFitCols = (data) => {
  if (!data || data.length === 0) return [];
  return Object.keys(data[0] || {}).map((k) => ({
    wch: Math.max(k.length + 4, 14),
  }));
};

export default function RekapDownloadModal({
  isOpen,
  onClose,
  allWarga = [],
  filteredWarga = [],
  namaDesa = 'Sukamaju',
}) {
  const [activeTab, setActiveTab] = useState('dusun'); // 'dusun' | 'rt_rw'
  const [filterDusunInRt, setFilterDusunInRt] = useState('all');
  const [downloading, setDownloading] = useState(false);

  // 1. Rekapitulasi per Dusun
  const rekapDusun = useMemo(() => {
    const map = {};
    allWarga.forEach((w) => {
      const d = w.dusun ? w.dusun.trim() : 'Tanpa Dusun';
      if (!map[d]) {
        map[d] = {
          dusun: d,
          totalJiwa: 0,
          lakiLaki: 0,
          perempuan: 0,
          kkSet: new Set(),
          kepalaKeluarga: 0,
          balita: 0,
          lansia: 0,
          bansos: 0,
          disabilitas: 0,
          wargaList: [],
        };
      }
      map[d].totalJiwa++;
      map[d].wargaList.push(w);
      if (w.no_kk) map[d].kkSet.add(w.no_kk);
      if (w.shdk === 'Kepala Keluarga') map[d].kepalaKeluarga++;
      if (w.jenis_kelamin === 'Laki-laki') map[d].lakiLaki++;
      else if (w.jenis_kelamin === 'Perempuan') map[d].perempuan++;

      if (w.status_khusus === 'Balita (0-59 bulan)') map[d].balita++;
      if (w.status_khusus === 'Lansia') map[d].lansia++;
      if (
        w.status_ekonomi === 'miskin' ||
        w.bansos_pkh === 'Ya' ||
        w.bansos_bpnt === 'Ya' ||
        w.bansos_blt === 'Ya'
      ) {
        map[d].bansos++;
      }
      if (w.disabilitas && w.disabilitas !== 'Tidak Ada') map[d].disabilitas++;
    });

    return Object.values(map).sort((a, b) => a.dusun.localeCompare(b.dusun));
  }, [allWarga]);

  // 2. Rekapitulasi per RT / RW
  const rekapRtRw = useMemo(() => {
    const map = {};
    allWarga.forEach((w) => {
      const d = w.dusun ? w.dusun.trim() : 'Umum';
      const rw = String(w.rw || '00').padStart(2, '0');
      const rt = String(w.rt || '00').padStart(2, '0');
      const key = `${d}__RW${rw}__RT${rt}`;

      if (!map[key]) {
        map[key] = {
          key,
          dusun: d,
          rw,
          rt,
          label: `RT ${rt} / RW ${rw} (${d})`,
          totalJiwa: 0,
          lakiLaki: 0,
          perempuan: 0,
          kkSet: new Set(),
          kepalaKeluarga: 0,
          bansos: 0,
          balita: 0,
          wargaList: [],
        };
      }

      map[key].totalJiwa++;
      map[key].wargaList.push(w);
      if (w.no_kk) map[key].kkSet.add(w.no_kk);
      if (w.shdk === 'Kepala Keluarga') map[key].kepalaKeluarga++;
      if (w.jenis_kelamin === 'Laki-laki') map[key].lakiLaki++;
      else if (w.jenis_kelamin === 'Perempuan') map[key].perempuan++;
      if (
        w.status_ekonomi === 'miskin' ||
        w.bansos_pkh === 'Ya' ||
        w.bansos_bpnt === 'Ya' ||
        w.bansos_blt === 'Ya'
      ) {
        map[key].bansos++;
      }
      if (w.status_khusus === 'Balita (0-59 bulan)') map[key].balita++;
    });

    return Object.values(map).sort((a, b) => {
      if (a.dusun !== b.dusun) return a.dusun.localeCompare(b.dusun);
      if (a.rw !== b.rw) return a.rw.localeCompare(b.rw);
      return a.rt.localeCompare(b.rt);
    });
  }, [allWarga]);

  // Filter RT/RW berdasarkan Dusun
  const filteredRekapRtRw = useMemo(() => {
    if (filterDusunInRt === 'all') return rekapRtRw;
    return rekapRtRw.filter(
      (item) => item.dusun.toLowerCase() === filterDusunInRt.toLowerCase()
    );
  }, [rekapRtRw, filterDusunInRt]);

  // Overall totals
  const totalStats = useMemo(() => {
    const totalJiwa = allWarga.length;
    const kkSet = new Set(allWarga.map((w) => w.no_kk).filter(Boolean));
    const totalKK = kkSet.size;
    const totalBansos = allWarga.filter(
      (w) =>
        w.status_ekonomi === 'miskin' ||
        w.bansos_pkh === 'Ya' ||
        w.bansos_bpnt === 'Ya' ||
        w.bansos_blt === 'Ya'
    ).length;
    const totalBalita = allWarga.filter(
      (w) => w.status_khusus === 'Balita (0-59 bulan)'
    ).length;
    return { totalJiwa, totalKK, totalBansos, totalBalita };
  }, [allWarga]);

  // EXPORT 1: Unduh Excel khusus satu Dusun
  const handleDownloadDusun = (dusunItem) => {
    setDownloading(true);
    try {
      const rows = dusunItem.wargaList.map(formatWargaRow);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = autoFitCols(rows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Dusun_${dusunItem.dusun.slice(0, 25)}`);

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Data_Warga_Dusun_${dusunItem.dusun.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Gagal export dusun:', err);
      alert('Gagal mendownload data dusun: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // EXPORT 2: Unduh Excel khusus satu RT/RW
  const handleDownloadRtRw = (rtRwItem) => {
    setDownloading(true);
    try {
      const rows = rtRwItem.wargaList.map(formatWargaRow);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = autoFitCols(rows);

      const wb = XLSX.utils.book_new();
      const sheetName = `RT${rtRwItem.rt}_RW${rtRwItem.rw}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Data_Warga_RT${rtRwItem.rt}_RW${rtRwItem.rw}_${rtRwItem.dusun.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Gagal export RT/RW:', err);
      alert('Gagal mendownload data RT/RW: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // EXPORT 3: Unduh Master Laporan Rekapitulasi Lengkap Multi-Sheet
  const handleDownloadMasterRekap = () => {
    setDownloading(true);
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Rekap Dusun
      const dusunSummaryRows = rekapDusun.map((d, idx) => ({
        No: idx + 1,
        Nama_Dusun: d.dusun,
        Total_Jiwa: d.totalJiwa,
        Total_KK: d.kkSet.size,
        Kepala_Keluarga: d.kepalaKeluarga,
        Laki_Laki: d.lakiLaki,
        Perempuan: d.perempuan,
        Balita: d.balita,
        Lansia: d.lansia,
        Penerima_Bansos: d.bansos,
        Disabilitas: d.disabilitas,
      }));
      const wsDusun = XLSX.utils.json_to_sheet(dusunSummaryRows);
      wsDusun['!cols'] = autoFitCols(dusunSummaryRows);
      XLSX.utils.book_append_sheet(wb, wsDusun, 'Rekap_Per_Dusun');

      // Sheet 2: Rekap RT/RW
      const rtRwSummaryRows = rekapRtRw.map((r, idx) => ({
        No: idx + 1,
        Dusun: r.dusun,
        RW: r.rw,
        RT: r.rt,
        Total_Jiwa: r.totalJiwa,
        Total_KK: r.kkSet.size,
        Kepala_Keluarga: r.kepalaKeluarga,
        Laki_Laki: r.lakiLaki,
        Perempuan: r.perempuan,
        Balita: r.balita,
        Penerima_Bansos: r.bansos,
      }));
      const wsRtRw = XLSX.utils.json_to_sheet(rtRwSummaryRows);
      wsRtRw['!cols'] = autoFitCols(rtRwSummaryRows);
      XLSX.utils.book_append_sheet(wb, wsRtRw, 'Rekap_Per_RT_RW');

      // Sheet 3: Seluruh Data Warga Lengkap
      const allRows = allWarga.map(formatWargaRow);
      const wsAll = XLSX.utils.json_to_sheet(allRows);
      wsAll['!cols'] = autoFitCols(allRows);
      XLSX.utils.book_append_sheet(wb, wsAll, 'Master_Semua_Warga');

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Laporan_Rekap_Kependudukan_Desa_${namaDesa.replace(/\s+/g, '_')}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Gagal export master rekap:', err);
      alert('Gagal mendownload master rekap: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  // EXPORT 4: Unduh Data Warga yang Sedang Terfilter di Halaman
  const handleDownloadFiltered = () => {
    if (!filteredWarga || filteredWarga.length === 0) {
      alert('Tidak ada data warga yang sesuai filter.');
      return;
    }
    setDownloading(true);
    try {
      const rows = filteredWarga.map(formatWargaRow);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = autoFitCols(rows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Warga_Terfilter');

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Data_Warga_Terfilter_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Gagal export filtered warga:', err);
      alert('Gagal mendownload data terfilter: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-900 via-teal-800 to-teal-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md text-teal-200">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                Rekapitulasi & Unduh Data Kependudukan
              </h3>
              <p className="text-[11px] text-teal-200/90 mt-0.5">
                Desa {namaDesa} • Khusus Akses Administrator Desa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:bg-white/20 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Stats Grid Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200/70 grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Jiwa</span>
            <span className="text-base font-black text-slate-800">{totalStats.totalJiwa}</span>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Total KK</span>
            <span className="text-base font-black text-teal-700">{totalStats.totalKK}</span>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Balita</span>
            <span className="text-base font-black text-purple-700">{totalStats.totalBalita}</span>
          </div>
          <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Bansos</span>
            <span className="text-base font-black text-rose-700">{totalStats.totalBansos}</span>
          </div>
        </div>

        {/* Global Download Action Buttons */}
        <div className="px-4 py-2.5 bg-teal-50/60 border-b border-teal-100 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-teal-900 font-bold">
            <Download size={14} className="text-teal-700" />
            <span>Ekspor Cepat:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadMasterRekap}
              disabled={downloading}
              className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
              title="Unduh seluruh rekap per dusun, RT/RW dan master data warga"
            >
              <FileSpreadsheet size={13} />
              <span>Unduh Master Rekap (.xlsx)</span>
            </button>

            {filteredWarga.length < allWarga.length && (
              <button
                onClick={handleDownloadFiltered}
                disabled={downloading}
                className="px-3 py-1.5 rounded-xl bg-white border border-teal-300 hover:bg-teal-100/70 text-teal-800 font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all disabled:opacity-50"
                title="Unduh data warga sesuai filter aktif di halaman"
              >
                <Filter size={12} />
                <span>Unduh Hasil Filter ({filteredWarga.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation: Rekap Dusun vs Rekap RT/RW */}
        <div className="flex border-b border-slate-200 px-4 pt-2 bg-white">
          <button
            onClick={() => setActiveTab('dusun')}
            className={`flex-1 py-2 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'dusun'
                ? 'border-teal-700 text-teal-800 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building size={14} />
            <span>1. Rekapitulasi per Dusun ({rekapDusun.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rt_rw')}
            className={`flex-1 py-2 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'rt_rw'
                ? 'border-teal-700 text-teal-800 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Home size={14} />
            <span>2. Rekapitulasi per RT / RW ({rekapRtRw.length})</span>
          </button>
        </div>

        {/* Body Konten Rekap & Tabel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'dusun' ? (
            /* TAB 1: REKAPITULASI PER DUSUN */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Rincian demografis terdistribusi per wilayah dusun:</span>
                <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                  {rekapDusun.length} Dusun Terdaftar
                </span>
              </div>

              <div className="space-y-2.5">
                {rekapDusun.map((item) => (
                  <div
                    key={item.dusun}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-teal-300 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 font-black flex items-center justify-center text-xs">
                          <Building size={15} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                            Dusun {item.dusun}
                          </h4>
                          <p className="text-[10.5px] text-slate-400">
                            {item.totalJiwa} Jiwa • {item.kkSet.size} Kepala Keluarga
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownloadDusun(item)}
                        disabled={downloading}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 border border-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                        title={`Download Excel Data Warga Dusun ${item.dusun}`}
                      >
                        <Download size={13} />
                        <span>Unduh Excel</span>
                      </button>
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10.5px]">
                      <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[9px] text-slate-400 block font-bold">Laki / Perempuan</span>
                        <span className="font-bold text-slate-700">{item.lakiLaki}L / {item.perempuan}P</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-100">
                        <span className="text-[9px] text-purple-600 block font-bold">Balita</span>
                        <span className="font-black text-purple-800">{item.balita} balita</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                        <span className="text-[9px] text-indigo-600 block font-bold">Lansia</span>
                        <span className="font-black text-indigo-800">{item.lansia} lansia</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-rose-50/70 border border-rose-100">
                        <span className="text-[9px] text-rose-600 block font-bold">Bansos</span>
                        <span className="font-black text-rose-800">{item.bansos} KK/Warga</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* TAB 2: REKAPITULASI PER RT & RW */
            <div className="space-y-3">
              {/* Filter Sub-Dusun untuk RT/RW */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">
                  Filter Dusun:
                </span>
                <select
                  value={filterDusunInRt}
                  onChange={(e) => setFilterDusunInRt(e.target.value)}
                  className="py-1 px-2 text-xs rounded-lg border border-slate-200 bg-white font-bold text-slate-700 outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
                >
                  <option value="all">Semua Dusun</option>
                  {rekapDusun.map((d) => (
                    <option key={d.dusun} value={d.dusun}>
                      Dusun {d.dusun}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {filteredRekapRtRw.map((item) => (
                  <div
                    key={item.key}
                    className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-teal-300 transition-all flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 font-mono font-bold flex items-center justify-center text-xs">
                        {item.rt}
                      </div>
                      <div>
                        <h5 className="font-extrabold text-slate-800 text-xs">
                          RT {item.rt} / RW {item.rw}
                        </h5>
                        <p className="text-[10px] text-slate-400">
                          Dusun {item.dusun} • {item.totalJiwa} Jiwa • {item.kkSet.size} KK • {item.bansos} Bansos
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadRtRw(item)}
                      disabled={downloading}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 border border-slate-200 text-slate-700 font-bold text-[10.5px] flex items-center gap-1 transition-all shadow-2xs active:scale-95"
                      title={`Download Excel Data Warga RT ${item.rt} / RW ${item.rw}`}
                    >
                      <Download size={12} />
                      <span>Unduh</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Format: Microsoft Excel (.xlsx) dengan seluruh atribut kependudukan.
          </span>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

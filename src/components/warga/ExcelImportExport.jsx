import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { Download, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

export default function ExcelImportExport({ wargaList, onRefresh }) {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleExport = () => {
    if (!wargaList || wargaList.length === 0) {
      alert('Tidak ada data warga untuk diexport.');
      return;
    }

    const dataToExport = wargaList.map((w, index) => ({
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
      Alamat_Detail: w.alamat_detail || '',
      Status_Tempat_Tinggal: w.status_tempat_tinggal || 'Milik Sendiri',
      Status_Domisili: w.status_domisili || 'Penduduk Tetap',
      No_Telepon_WA: w.no_telepon || w.no_hp || w.telepon || '-',
      Status_Khusus_Posyandu: w.status_khusus || w.status_kesehatan_khusus || 'Normal',
      Disabilitas: w.disabilitas || w.jenis_disabilitas || 'Tidak Ada',
      Penyakit_Kronis: w.penyakit_kronis || 'Tidak Ada',
      Status_Kependudukan: w.status_kependudukan || 'aktif',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Auto-fit column widths
    const colWidths = Object.keys(dataToExport[0] || {}).map((k) => ({
      wch: Math.max(k.length + 4, 14),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DataWarga');

    const fileName = `Data_Warga_Desa_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        NIK: '3201011203850001',
        No_KK: '3201011203850000',
        Nama: 'Bambang Sudarmono',
        Jenis_Kelamin: 'Laki-laki',
        Tempat_Lahir: 'Bandung',
        Tanggal_Lahir: '1985-03-12',
        Agama: 'Islam',
        Pekerjaan: 'Petani',
        SHDK: 'Kepala Keluarga',
        Dusun: 'Sukamaju',
        RW: '01',
        RT: '01',
        Alamat_Detail: 'Jl. Melati No. 12',
        Ekonomi: 'miskin',
      },
      {
        NIK: '3201015506890002',
        No_KK: '3201011203850000',
        Nama: 'Siti Aminah',
        Jenis_Kelamin: 'Perempuan',
        Tempat_Lahir: 'Cianjur',
        Tanggal_Lahir: '1989-06-15',
        Agama: 'Islam',
        Pekerjaan: 'Ibu Rumah Tangga',
        SHDK: 'Istri',
        Dusun: 'Sukamaju',
        RW: '01',
        RT: '01',
        Alamat_Detail: 'Jl. Melati No. 12',
        Ekonomi: 'miskin',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TemplateWarga');
    XLSX.writeFile(workbook, 'Template_Import_Warga.xlsx');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const importedData = XLSX.utils.sheet_to_json(ws);

        if (!importedData || importedData.length === 0) {
          throw new Error('File Excel kosong atau format tidak sesuai.');
        }

        const formatted = importedData.map((item) => ({
          nik: String(item.NIK || item.nik || '').trim(),
          no_kk: String(item.No_KK || item.no_kk || item.NO_KK || '').trim(),
          nama: String(item.Nama || item.nama || '').trim(),
          jenis_kelamin: item.Jenis_Kelamin || item.jenis_kelamin || 'Laki-laki',
          tempat_lahir: item.Tempat_Lahir || item.tempat_lahir || '',
          tanggal_lahir: item.Tanggal_Lahir || item.tanggal_lahir || null,
          agama: item.Agama || item.agama || 'Islam',
          pekerjaan: item.Pekerjaan || item.pekerjaan || '',
          shdk: item.SHDK || item.shdk || 'Kepala Keluarga',
          rt: String(item.RT || item.rt || '01').padStart(2, '0'),
          rw: String(item.RW || item.rw || '01').padStart(2, '0'),
          dusun: String(item.Dusun || item.dusun || 'Sukamaju').trim(),
          alamat_detail: item.Alamat_Detail || item.alamat_detail || '',
          status_ekonomi: (item.Ekonomi || item.status_ekonomi || 'mampu').toLowerCase(),
          status_kependudukan: 'aktif',
        }));

        // Filter valid entries with NIK and Nama
        const validRecords = formatted.filter((f) => f.nik && f.nama);

        if (validRecords.length === 0) {
          throw new Error('Tidak ditemukan data warga valid dengan kolom NIK dan Nama.');
        }

        // Try upsert to Supabase
        const { error } = await supabase.from('warga').upsert(validRecords, { onConflict: 'nik' });

        if (error) {
          // If Supabase table is not yet migrated, save to localStorage fallback so testing works
          const existing = JSON.parse(localStorage.getItem('cached_warga_local') || '[]');
          const combined = [...existing];
          validRecords.forEach((rec) => {
            const idx = combined.findIndex((c) => c.nik === rec.nik);
            if (idx >= 0) combined[idx] = { ...combined[idx], ...rec };
            else combined.push({ id: 'local-' + Date.now() + Math.random(), ...rec });
          });
          localStorage.setItem('cached_warga_local', JSON.stringify(combined));
          setStatusMessage({ type: 'warning', text: `Disimpan ke cache lokal (${validRecords.length} warga). Catatan DB: ${error.message}` });
        } else {
          setStatusMessage({ type: 'success', text: `Berhasil import ${validRecords.length} data warga ke database!` });
        }

        if (onRefresh) onRefresh();
      } catch (err) {
        setStatusMessage({ type: 'error', text: `Gagal import: ${err.message}` });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setStatusMessage(null), 5000);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={handleExport}
          title="Export Data ke Excel"
          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Download size={13} className="text-slate-600" />
          <span>Export</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          title="Import Data dari Excel"
          className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-60"
        >
          <Upload size={13} />
          <span>{importing ? 'Memproses...' : 'Import'}</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          title="Unduh Format Excel"
          className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs transition-all"
        >
          <FileSpreadsheet size={15} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls, .csv"
          className="hidden"
          onChange={handleImport}
        />
      </div>

      {statusMessage && (
        <div
          className={`mt-1.5 text-[10.5px] px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check size={12} className="text-emerald-600" />
          ) : (
            <AlertCircle size={12} />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}

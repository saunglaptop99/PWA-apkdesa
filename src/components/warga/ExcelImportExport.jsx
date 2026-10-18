import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { useDesa } from '../../context/DesaContext';
import { Download, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';

const hasDisability = (warga) => Boolean(warga.is_disabilitas || (warga.jenis_disabilitas && warga.jenis_disabilitas !== 'Tidak Ada'));

export default function ExcelImportExport({ wargaList, onRefresh }) {
  const fileInputRef = useRef(null);
  const { wilayahList } = useDesa();
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
      No_Akta_Nikah_Cerai: w.no_akta_nikah_cerai || '',
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
      Bansos_BLT_Desa: w.bansos_blt_desa === true ? 'Penerima' : 'Tidak',
      BPJS_PBI: w.bansos_bpjs_pbi === 'Ya' || w.bpjs_pbi === true ? 'Penerima' : 'Tidak',
      Dusun: w.dusun || '-',
      RW: String(w.rw || '-').padStart(2, '0'),
      RT: String(w.rt || '-').padStart(2, '0'),
      Alamat_Detail: w.alamat_detail || '',
      Status_Tempat_Tinggal: w.status_tempat_tinggal || 'Milik Sendiri',
      Status_Domisili: w.status_domisili || 'Penduduk Tetap',
      No_Telepon_WA: w.no_telepon || w.no_hp || w.telepon || '-',
      Status_Khusus_Posyandu: w.status_khusus || w.status_kesehatan_khusus || 'Normal',
      Disabilitas: hasDisability(w) ? (w.jenis_disabilitas || 'Ya') : 'Tidak Ada',
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
    const headers = ['NIK', 'No_KK', 'Nama', 'Jenis_Kelamin', 'Tempat_Lahir', 'Tanggal_Lahir', 'Agama', 'Pekerjaan', 'SHDK', 'Dusun', 'RW', 'RT', 'Alamat_Detail', 'Ekonomi'];
    const worksheet = XLSX.utils.aoa_to_sheet([headers]);
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(16, header.length + 4) }));
    worksheet['!ref'] = `A1:N2`;
    for (let row = 1; row <= 2; row += 1) {
      for (const column of [0, 1, 10, 11]) {
        const address = XLSX.utils.encode_cell({ r: row, c: column });
        worksheet[address] = { t: 's', v: '', z: '@' };
      }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'TemplateWarga');
    const instructions = XLSX.utils.aoa_to_sheet([
      ['Petunjuk impor data warga'],
      ['Isi satu warga per baris. Hapus baris kosong sebelum impor.'],
      ['NIK dan No_KK wajib 16 digit. Format kolom sebagai Teks agar angka tidak berubah.'],
      ['Dusun, RW, dan RT harus sudah terdaftar di master wilayah desa.'],
      ['NIK yang sudah ada akan dilewati; impor tidak menimpa data warga yang tersimpan.'],
      ['Tanggal lahir gunakan format YYYY-MM-DD. Ekonomi: mampu, rentan, atau miskin.'],
    ]);
    XLSX.utils.book_append_sheet(workbook, instructions, 'Petunjuk');
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

        const read = (item, ...keys) => keys.map((key) => item[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== '');
        const textValue = (value) => {
          const text = String(value ?? '').trim();
          return text && text !== '-' ? text : null;
        };
        const flagValue = (value) => ['true', 'ya', 'yes', '1', 'penerima'].includes(String(value ?? '').trim().toLowerCase());
        const readIdentifier = (value, label, rowNumber) => {
          if (typeof value === 'number' && !Number.isSafeInteger(value)) {
            throw new Error(`Baris ${rowNumber}: ${label} dibaca Excel sebagai angka yang kehilangan presisi. Atur kolom menjadi Teks lalu perbaiki nilainya.`);
          }
          return String(value ?? '').trim().replace(/\.0$/, '');
        };
        const normalizeDate = (value, rowNumber) => {
          if (!value) return null;
          if (typeof value === 'number') {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (!parsed) throw new Error(`Baris ${rowNumber}: tanggal lahir tidak valid.`);
            return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
          }
          const text = String(value).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
          const date = new Date(text);
          if (Number.isNaN(date.getTime())) throw new Error(`Baris ${rowNumber}: tanggal lahir tidak valid.`);
          return date.toISOString().slice(0, 10);
        };
        const formatted = importedData.map((item, index) => {
          const rowNumber = index + 2;
          const nik = readIdentifier(read(item, 'NIK', 'nik'), 'NIK', rowNumber);
          const no_kk = readIdentifier(read(item, 'No_KK', 'no_kk', 'NO_KK'), 'No. KK', rowNumber);
          const nama = String(read(item, 'Nama', 'nama', 'Nama_Lengkap', 'nama_lengkap') || '').trim();
          const dusun = String(read(item, 'Dusun', 'dusun') || '').trim();
          const rw = readIdentifier(read(item, 'RW', 'rw'), 'RW', rowNumber).padStart(2, '0');
          const rt = readIdentifier(read(item, 'RT', 'rt'), 'RT', rowNumber).padStart(2, '0');
          const sexValue = String(read(item, 'Jenis_Kelamin', 'jenis_kelamin') || 'Laki-laki').trim().toLowerCase();
          const jenis_kelamin = ['l', 'laki-laki', 'laki laki', 'pria'].includes(sexValue) ? 'Laki-laki'
            : ['p', 'perempuan', 'wanita'].includes(sexValue) ? 'Perempuan' : null;
          const ekonomi = String(read(item, 'Ekonomi', 'status_ekonomi') || 'mampu').trim().toLowerCase();
          const statusKependudukan = String(read(item, 'Status_Kependudukan', 'status_kependudukan') || 'aktif').trim().toLowerCase();
          const disabilitasValue = read(item, 'Disabilitas');
          const disabilitasFlag = read(item, 'is_disabilitas');
          const disabilitasType = textValue(read(item, 'jenis_disabilitas')) || (
            disabilitasValue && !['true', 'false', 'ya', 'tidak', 'yes', 'no', '1', '0'].includes(String(disabilitasValue).trim().toLowerCase())
              ? textValue(disabilitasValue) : null
          );
          const is_disabilitas = disabilitasFlag !== undefined
            ? flagValue(disabilitasFlag)
            : disabilitasValue !== undefined && !['false', 'tidak', 'tidak ada', 'no', '0'].includes(String(disabilitasValue).trim().toLowerCase());

          if (!/^\d{16}$/.test(nik) || !/^\d{16}$/.test(no_kk) || !nama || !dusun || !/^\d{2}$/.test(rw) || !/^\d{2}$/.test(rt) || !jenis_kelamin || !['mampu', 'rentan', 'miskin'].includes(ekonomi) || !['aktif', 'meninggal', 'pindah'].includes(statusKependudukan)) {
            throw new Error(`Baris ${rowNumber}: NIK dan No. KK harus 16 digit, nama dan wilayah wajib diisi, serta jenis kelamin/status ekonomi harus sesuai template.`);
          }
          const areaKey = `${dusun.toLocaleLowerCase('id-ID')}|${rw}|${rt}`;
          const knownArea = wilayahList.some((area) => `${area.dusun.trim().toLocaleLowerCase('id-ID')}|${String(area.rw).padStart(2, '0')}|${String(area.rt).padStart(2, '0')}` === areaKey);
          if (!knownArea) throw new Error(`Baris ${rowNumber}: Dusun/RW/RT ${dusun} / ${rw} / ${rt} belum terdaftar di master wilayah.`);

          return {
            nik, no_kk, nama, jenis_kelamin,
            tempat_lahir: textValue(read(item, 'Tempat_Lahir', 'tempat_lahir')),
            tanggal_lahir: normalizeDate(read(item, 'Tanggal_Lahir', 'tanggal_lahir'), rowNumber),
            golongan_darah: textValue(read(item, 'Golongan_Darah', 'golongan_darah')) || 'O',
            agama: textValue(read(item, 'Agama', 'agama')) || 'Islam',
            no_akta_lahir: textValue(read(item, 'No_Akta_Lahir', 'no_akta_lahir')),
            status_ktp: textValue(read(item, 'Status_KTP', 'status_ktp')) || 'Sudah KTP-el',
            shdk: textValue(read(item, 'SHDK', 'shdk')) || 'Kepala Keluarga',
            status_perkawinan: textValue(read(item, 'Status_Perkawinan', 'status_perkawinan')) || 'Belum Kawin',
            no_akta_nikah_cerai: textValue(read(item, 'No_Akta_Nikah_Cerai', 'no_akta_nikah_cerai')),
            nama_ayah: textValue(read(item, 'Nama_Ayah', 'nama_ayah')),
            nama_ibu: textValue(read(item, 'Nama_Ibu', 'nama_ibu')),
            pendidikan_terakhir: textValue(read(item, 'Pendidikan_Terakhir', 'pendidikan_terakhir')) || 'SMA/SMK/Sederajat',
            status_sekolah: textValue(read(item, 'Status_Sekolah', 'status_sekolah')) || 'Tidak / Sudah Lulus',
            pekerjaan: textValue(read(item, 'Pekerjaan', 'pekerjaan')),
            rentang_penghasilan: textValue(read(item, 'Penghasilan', 'rentang_penghasilan')) || 'Rp 1.000.000 - Rp 2.500.000',
            rt, rw, dusun, alamat_detail: textValue(read(item, 'Alamat_Detail', 'alamat_detail')),
            status_ekonomi: ekonomi,
            bansos_pkh: flagValue(read(item, 'Bansos_PKH', 'bansos_pkh')),
            bansos_bpnt: flagValue(read(item, 'Bansos_BPNT', 'bansos_bpnt')),
            bansos_blt_desa: flagValue(read(item, 'Bansos_BLT_Desa', 'bansos_blt_desa')),
            bpjs_pbi: flagValue(read(item, 'BPJS_PBI', 'bpjs_pbi')),
            status_tempat_tinggal: textValue(read(item, 'Status_Tempat_Tinggal', 'status_tempat_tinggal')) || 'Milik Sendiri',
            status_domisili: textValue(read(item, 'Status_Domisili', 'status_domisili')) || 'Penduduk Tetap',
            telepon: textValue(read(item, 'No_Telepon_WA', 'telepon')),
            status_kesehatan_khusus: textValue(read(item, 'Status_Khusus_Posyandu', 'status_kesehatan_khusus')) || 'Normal',
            is_disabilitas,
            jenis_disabilitas: is_disabilitas ? (disabilitasType || 'Lainnya') : 'Tidak Ada',
            penyakit_kronis: textValue(read(item, 'Penyakit_Kronis', 'penyakit_kronis')) || 'Tidak Ada',
            status_kependudukan: statusKependudukan,
          };
        });

        const seenNiks = new Set();
        for (let index = 0; index < formatted.length; index += 1) {
          if (seenNiks.has(formatted[index].nik)) throw new Error(`NIK duplikat ditemukan di dalam file pada baris ${index + 2}.`);
          seenNiks.add(formatted[index].nik);
        }

        if (formatted.length === 0) throw new Error('File Excel kosong atau format tidak sesuai.');

        // Ignore existing NIKs: importing a partial template must never overwrite a full citizen profile.
        const { data: inserted, error } = await supabase.from('warga')
          .upsert(formatted, { onConflict: 'nik', ignoreDuplicates: true })
          .select('id');

        if (error) throw error;
        const addedCount = inserted?.length || 0;
        setStatusMessage({ type: 'success', text: `${addedCount} warga baru ditambahkan. ${formatted.length - addedCount} NIK yang sudah terdaftar dilewati tanpa menimpa data.` });

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

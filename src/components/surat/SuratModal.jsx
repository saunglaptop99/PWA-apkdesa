import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { useDesa } from '../../context/DesaContext';
import { Printer, X, FileCheck, CheckCircle2 } from 'lucide-react';

export default function SuratModal({ warga, onClose, userProfile, requestRecord, onIssued }) {
  const { pengaturanDesa } = useDesa();

  const [jenisSurat, setJenisSurat] = useState(requestRecord?.jenis_surat || 'Surat Keterangan Domisili');
  const [keperluan, setKeperluan] = useState(requestRecord?.keperluan || '');
  const [nomorSurat, setNomorSurat] = useState(requestRecord?.nomor_surat || '');
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordError, setRecordError] = useState('');
  const jenisSuratOptions = [
    'Surat Keterangan Domisili',
    'Surat Keterangan Tidak Mampu (SKTM)',
    'Surat Keterangan Usaha (SKU)',
    'Surat Pengantar SKCK',
    'Surat Pengantar KTP / KK',
    'Surat Keterangan Kelahiran',
    'Surat Keterangan Kematian',
    'Surat Keterangan Pindah',
    'Surat Pengantar Nikah',
    'Surat Lainnya',
  ];
  const [namaKadesOrRT, setNamaKadesOrRT] = useState(
    userProfile?.role === 'admin'
      ? pengaturanDesa?.nama_kepala_desa || userProfile?.nama_lengkap
      : userProfile?.nama_lengkap || 'Pengurus Wilayah'
  );
  const [jabatan, setJabatan] = useState(
    userProfile?.role === 'rt'
      ? `Ketua RT ${warga.rt} / RW ${warga.rw}`
      : userProfile?.role === 'rw'
      ? `Ketua RW ${warga.rw}`
      : userProfile?.role === 'dusun'
      ? `Kepala Dusun ${warga.dusun}`
      : `Kepala Desa ${pengaturanDesa?.nama_desa || 'Desa'}`
  );
  const [successNotif, setSuccessNotif] = useState(false);

  useEffect(() => {
    if (userProfile?.role === 'admin' && pengaturanDesa?.nama_kepala_desa) {
      setNamaKadesOrRT(pengaturanDesa.nama_kepala_desa);
    }
  }, [pengaturanDesa?.nama_kepala_desa, userProfile?.role]);

  const namaKabupaten = String(pengaturanDesa?.nama_kabupaten || 'Bekasi').replace(/^kabupaten\s+/i, '').trim();
  const namaKecamatan = String(pengaturanDesa?.nama_kecamatan || '').replace(/^kecamatan\s+/i, '').trim();
  const namaDesa = String(pengaturanDesa?.nama_desa || '').replace(/^desa\s+/i, '').trim();
  const namaPemerintah = `PEMERINTAH KABUPATEN ${namaKabupaten.toUpperCase()}`;
  const namaKecamatanDesa = `${namaKecamatan ? `KECAMATAN ${namaKecamatan.toUpperCase()} • ` : ''}${namaDesa ? `DESA ${namaDesa.toUpperCase()}` : 'PEMERINTAH DESA'}`;

  const quickKeperluanOptions = [
    'Pengurusan Administrasi Kependudukan',
    'Pengajuan Beasiswa Pendidikan',
    'Persyaratan Melamar Pekerjaan',
    'Buka Rekening Bank / Pengajuan KUR',
    'Pembuatan Dokumen KTP-el / Kartu Keluarga',
    'Persyaratan Surat Keterangan Catatan Kepolisian (SKCK)',
  ];

  const generatePDF = async () => {
    if (!namaDesa || !namaKecamatan) {
      alert('Lengkapi nama desa dan kecamatan pada Pengaturan Desa sebelum menerbitkan konsep surat.');
      return;
    }
    if (!nomorSurat.trim()) {
      alert('Isi nomor surat resmi yang sudah ditetapkan desa sebelum membuat PDF.');
      return;
    }
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // KOP SURAT RESMI DESA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(namaPemerintah.toUpperCase(), pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(namaKecamatanDesa.toUpperCase(), pageWidth / 2, 26, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
      `RUKUN TETANGGA ${warga.rt || '01'} / RUKUN WARGA ${warga.rw || '01'} DUSUN ${(warga.dusun || 'DESA').toUpperCase()}`,
      pageWidth / 2,
      32,
      { align: 'center' }
    );

    // Double Line Border Under Kop
    doc.setLineWidth(0.8);
    doc.line(20, 36, pageWidth - 20, 36);
    doc.setLineWidth(0.2);
    doc.line(20, 37.5, pageWidth - 20, 37.5);

    // JUDUL SURAT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const judulSuratUpper = jenisSurat.toUpperCase();
    doc.text(judulSuratUpper, pageWidth / 2, 48, { align: 'center' });

    // Underline Judul
    const titleWidth = doc.getTextWidth(judulSuratUpper);
    doc.line((pageWidth - titleWidth) / 2, 49.5, (pageWidth + titleWidth) / 2, 49.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const nomorSuratText = `Nomor: ${nomorSurat.trim()}`;
    doc.text(nomorSuratText, pageWidth / 2, 55, { align: 'center' });

    // ISI SURAT
    doc.setFontSize(10.5);
    doc.text('Yang bertanda tangan di bawah ini menerangkan dengan sesungguhnya bahwa:', 22, 68);

    const dataRows = [
      ['Nama Lengkap', `: ${warga.nama}`],
      ['NIK', `: ${warga.nik}`],
      ['Nomor Kartu Keluarga', `: ${warga.no_kk}`],
      ['Tempat, Tanggal Lahir', `: ${warga.tempat_lahir || '-'}, ${warga.tanggal_lahir || '-'}`],
      ['Jenis Kelamin', `: ${warga.jenis_kelamin || '-'}`],
      ['Agama', `: ${warga.agama || 'Islam'}`],
      ['Pekerjaan', `: ${warga.pekerjaan || '-'}`],
      ['Status Hubungan (SHDK)', `: ${warga.shdk || 'Kepala Keluarga'}`],
      ['Alamat Domisili', `: RT ${warga.rt} / RW ${warga.rw}, Dusun ${warga.dusun}, Desa ${namaDesa || '-'}`],
      ['Keperluan', `: ${keperluan}`],
    ];

    let currentY = 77;
    dataRows.forEach(([key, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(key, 25, currentY);
      doc.setFont(key === 'Nama Lengkap' || key === 'NIK' ? 'helvetica' : 'helvetica', key === 'Nama Lengkap' ? 'bold' : 'normal');
      doc.text(val, 78, currentY);
      currentY += 7.5;
    });

    // PARAGRAF PENUTUP
    currentY += 4;
    const penutup = `Orang tersebut di atas tercatat sebagai warga yang berdomisili di wilayah Desa ${namaDesa || '-'}. Surat pengantar ini dibuat untuk keperluan ${keperluan}.`;
    const splitPenutup = doc.splitTextToSize(penutup, pageWidth - 44);
    doc.setFont('helvetica', 'normal');
    doc.text(splitPenutup, 22, currentY);

    // TANDA TANGAN
    const tglSekarang = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    currentY += 24;
    const ttdX = pageWidth - 80;

    doc.text(`Dikeluarkan di: ${pengaturanDesa?.nama_desa || 'Desa'}`, ttdX, currentY);
    doc.text(`Pada tanggal: ${tglSekarang}`, ttdX, currentY + 5.5);
    doc.text(jabatan, ttdX, currentY + 11);

    // Signature Space & Stamped indicator
    doc.setDrawColor(200, 200, 200);
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 140);
    doc.text('[ Cap & Tanda Tangan ]', ttdX + 4, currentY + 25);

    doc.setTextColor(20, 20, 20);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${namaKadesOrRT} )`, ttdX, currentY + 38);

    // Footer note
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('DRAF • Perlu diperiksa dan ditandatangani pejabat berwenang sebelum digunakan.', 22, 282);

    const safeFileName = `${jenisSurat.replace(/\s+/g, '_')}_${warga.nama.replace(/\s+/g, '_')}.pdf`;
    if (onIssued) {
      setSavingRecord(true);
      setRecordError('');
      try {
        await onIssued(nomorSurat);
      } catch (error) {
        setRecordError(error.message || 'Nomor surat gagal disimpan.');
        setSavingRecord(false);
        return;
      }
      setSavingRecord(false);
    }
    doc.save(safeFileName);

    setSuccessNotif(true);
    setTimeout(() => setSuccessNotif(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <FileCheck size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">{requestRecord ? 'Proses Surat Layanan' : 'Cetak Surat Pengantar'}</h3>
              <p className="text-[11px] text-slate-500">
                Pemerintah Desa {pengaturanDesa?.nama_desa} • 1-Klik Unduh PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {successNotif && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
            <span>Dokumen PDF berhasil dibuat dan diunduh ke perangkat Anda!</span>
          </div>
        )}
        {recordError && <div role="alert" className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{recordError}</div>}

        <div className="space-y-4">
          {/* Info Warga Terpilih */}
          <div className="p-3.5 bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-2xl border border-teal-100/80">
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Warga Pemohon:</span>
            <h4 className="text-sm font-bold text-slate-900 mt-0.5">{warga.nama}</h4>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
              <span>NIK: <strong className="font-mono">{warga.nik}</strong></span>
              <span>•</span>
              <span>RT {warga.rt} / RW {warga.rw} ({warga.dusun})</span>
            </div>
          </div>

          {/* Jenis Surat */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Jenis Surat Pengantar</label>
            <select
              value={jenisSurat}
              onChange={(e) => setJenisSurat(e.target.value)}
              disabled={Boolean(requestRecord)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-teal-600 outline-none shadow-sm"
            >
              {jenisSuratOptions.map((jenis) => <option key={jenis} value={jenis}>{jenis}</option>)}
            </select>
          </div>

          <p className="-mt-2 text-[10px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">PDF ini draf keterangan umum. Admin wajib memeriksa kesesuaian isi dan format dengan ketentuan jenis surat desa sebelum ditandatangani.</p>

          {/* Keperluan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Maksud / Keperluan</label>
            <input
              type="text"
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
              readOnly={Boolean(requestRecord)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-teal-600 outline-none shadow-sm"
              placeholder="Contoh: Pengajuan Beasiswa / Buka Rekening Bank"
            />
            {/* Quick choices */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickKeperluanOptions.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setKeperluan(opt)}
                  className="text-[10px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all"
                >
                  + {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Nomor Surat Resmi *</label>
            <input
              type="text"
              required
              maxLength={80}
              value={nomorSurat}
              onChange={(e) => setNomorSurat(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-teal-600 outline-none shadow-sm"
              placeholder="Masukkan nomor dari buku agenda surat desa"
            />
            <p className="mt-1 text-[10px] text-slate-500">Nomor tidak dibuat acak dan harus mengikuti buku agenda desa.</p>
          </div>

          {/* Pengaturan Penandatangan */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Penandatangan</label>
              <input
                type="text"
                value={namaKadesOrRT}
                onChange={(e) => setNamaKadesOrRT(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jabatan Pengesah</label>
              <input
                type="text"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
          </div>

          {/* Tombol Cetak / Unduh */}
          <button
            onClick={generatePDF}
            disabled={savingRecord}
            className="w-full py-3 mt-2 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-teal-900/20 transition-all"
          >
            <Printer size={18} />
            {savingRecord ? 'Menyimpan arsip…' : requestRecord?.nomor_surat ? 'Unduh Ulang PDF' : 'Simpan Nomor & Unduh Draf PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

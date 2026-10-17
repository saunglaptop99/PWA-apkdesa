import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Printer, X, FileCheck, Info, CheckCircle2 } from 'lucide-react';

export default function SuratModal({ warga, onClose, userProfile }) {
  const [jenisSurat, setJenisSurat] = useState('Surat Pengantar Domisili');
  const [keperluan, setKeperluan] = useState('Pengurusan Administrasi Kependudukan');
  const [namaPemerintah, setNamaPemerintah] = useState('PEMERINTAH KABUPATEN / DESA');
  const [namaKadesOrRT, setNamaKadesOrRT] = useState(
    userProfile?.nama_lengkap || 'Pengurus Wilayah'
  );
  const [jabatan, setJabatan] = useState(
    userProfile?.role === 'rt'
      ? `Ketua RT ${warga.rt} / RW ${warga.rw}`
      : userProfile?.role === 'rw'
      ? `Ketua RW ${warga.rw}`
      : userProfile?.role === 'dusun'
      ? `Kepala Dusun ${warga.dusun}`
      : 'Kepala Desa / Sekretaris Desa'
  );
  const [successNotif, setSuccessNotif] = useState(false);

  const quickKeperluanOptions = [
    'Pengurusan Administrasi Kependudukan',
    'Pengajuan Beasiswa Pendidikan',
    'Persyaratan Melamar Pekerjaan',
    'Buka Rekening Bank / Pengajuan KUR',
    'Pembuatan Dokumen KTP-el / Kartu Keluarga',
    'Persyaratan Surat Keterangan Catatan Kepolisian (SKCK)',
  ];

  const generatePDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // KOP SURAT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(namaPemerintah.toUpperCase(), pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(11);
    doc.text(
      `RUKUN TETANGGA ${warga.rt || '01'} / RUKUN WARGA ${warga.rw || '01'} DUSUN ${(warga.dusun || 'DESA').toUpperCase()}`,
      pageWidth / 2,
      28,
      { align: 'center' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Kecamatan dan Wilayah Administrasi Pemerintahan Terpadu', pageWidth / 2, 33, { align: 'center' });

    // Double Line Border Under Kop
    doc.setLineWidth(0.8);
    doc.line(20, 37, pageWidth - 20, 37);
    doc.setLineWidth(0.2);
    doc.line(20, 38.5, pageWidth - 20, 38.5);

    // JUDUL SURAT
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const judulSuratUpper = jenisSurat.toUpperCase();
    doc.text(judulSuratUpper, pageWidth / 2, 50, { align: 'center' });

    // Underline Judul
    const titleWidth = doc.getTextWidth(judulSuratUpper);
    doc.line((pageWidth - titleWidth) / 2, 51.5, (pageWidth + titleWidth) / 2, 51.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const noSurat = `Nomor: 470 / ${Math.floor(100 + Math.random() * 900)} / ${warga.rt ? `RT.${warga.rt}` : 'PEM'}-${warga.rw ? `RW.${warga.rw}` : 'DESA'} / ${new Date().getFullYear()}`;
    doc.text(noSurat, pageWidth / 2, 57, { align: 'center' });

    // ISI SURAT
    doc.setFontSize(10.5);
    doc.text('Yang bertanda tangan di bawah ini menerangkan dengan sesungguhnya bahwa:', 22, 70);

    const dataRows = [
      ['Nama Lengkap', `: ${warga.nama}`],
      ['NIK', `: ${warga.nik}`],
      ['Nomor Kartu Keluarga', `: ${warga.no_kk}`],
      ['Tempat, Tanggal Lahir', `: ${warga.tempat_lahir || '-'}, ${warga.tanggal_lahir || '-'}`],
      ['Jenis Kelamin', `: ${warga.jenis_kelamin || '-'}`],
      ['Agama', `: ${warga.agama || 'Islam'}`],
      ['Pekerjaan', `: ${warga.pekerjaan || '-'}`],
      ['Status Perkawinan / SHDK', `: ${warga.shdk || 'Kepala Keluarga'}`],
      ['Alamat KTP', `: RT ${warga.rt} / RW ${warga.rw}, Dusun ${warga.dusun}`],
      ['Status Ekonomi', `: ${warga.status_ekonomi ? warga.status_ekonomi.toUpperCase() : 'MAMPU'}`],
      ['Keperluan', `: ${keperluan}`],
    ];

    let currentY = 80;
    dataRows.forEach(([key, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(key, 25, currentY);
      doc.setFont(key === 'Nama Lengkap' || key === 'NIK' ? 'helvetica' : 'helvetica', key === 'Nama Lengkap' ? 'bold' : 'normal');
      doc.text(val, 78, currentY);
      currentY += 7.5;
    });

    // PARAGRAF PENUTUP
    currentY += 4;
    const penutup = 'Orang tersebut di atas adalah benar-benar warga penduduk yang bertempat tinggal di wilayah kami dan berkelakuan baik. Surat pengantar ini dibuat untuk dipergunakan sebagaimana perlunya.';
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

    doc.text(`Dikeluarkan di Desa, ${tglSekarang}`, ttdX, currentY);
    doc.text(jabatan, ttdX, currentY + 6);

    // Signature Space & Stamped indicator
    doc.setDrawColor(200, 200, 200);
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 140);
    doc.text('[ Cap & Tanda Tangan ]', ttdX + 5, currentY + 22);

    doc.setTextColor(20, 20, 20);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${namaKadesOrRT} )`, ttdX, currentY + 36);

    // Footer note
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('* Dokumen sah diterbitkan melalui Aplikasi SIM Aparat Desa Mobile PWA.', 22, 282);

    const safeFileName = `${jenisSurat.replace(/\s+/g, '_')}_${warga.nama.replace(/\s+/g, '_')}.pdf`;
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
              <h3 className="font-bold text-slate-800 text-base">Cetak Surat Pengantar</h3>
              <p className="text-[11px] text-slate-500">Generator PDF Sekali Klik Format Resmi</p>
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
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-teal-600 outline-none shadow-sm"
            >
              <option value="Surat Pengantar Domisili">Surat Pengantar Domisili</option>
              <option value="Surat Keterangan Tidak Mampu (SKTM)">Surat Keterangan Tidak Mampu (SKTM)</option>
              <option value="Surat Pengantar Keterangan Usaha">Surat Pengantar Keterangan Usaha (SKU)</option>
              <option value="Surat Pengantar SKCK">Surat Pengantar SKCK Kepolisian</option>
              <option value="Surat Pengantar KTP / KK">Surat Pengantar Pembuatan KTP / KK</option>
              <option value="Surat Pengantar Kehilangan Dokumen">Surat Pengantar Keterangan Kehilangan</option>
            </select>
          </div>

          {/* Keperluan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Maksud / Keperluan</label>
            <input
              type="text"
              value={keperluan}
              onChange={(e) => setKeperluan(e.target.value)}
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
            className="w-full py-3 mt-2 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-teal-900/20 transition-all"
          >
            <Printer size={18} />
            Unduh Dokumen PDF
          </button>
        </div>
      </div>
    </div>
  );
}

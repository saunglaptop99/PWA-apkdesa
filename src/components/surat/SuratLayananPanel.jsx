import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, FileText, Plus, Printer, RefreshCw, Search } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows } from '../../lib/fetchAllRows';
import SuratModal from './SuratModal';

const STATUS = [
  ['diajukan', 'Diajukan'],
  ['perlu_perbaikan', 'Perlu perbaikan'],
  ['diverifikasi', 'Diverifikasi'],
  ['menunggu_ttd', 'Menunggu tanda tangan'],
  ['selesai', 'Selesai'],
  ['ditolak', 'Ditolak'],
];
const JENIS_SURAT = [
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

export default function SuratLayananPanel({ wargaList, user, profile }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [showForm, setShowForm] = useState(false);
  const [selectedWargaId, setSelectedWargaId] = useState('');
  const [jenisSurat, setJenisSurat] = useState(JENIS_SURAT[0]);
  const [keperluan, setKeperluan] = useState('');
  const [kelengkapan, setKelengkapan] = useState('');
  const [lampiranFile, setLampiranFile] = useState(null);
  const [editing, setEditing] = useState(null);
  const [nextStatus, setNextStatus] = useState('diajukan');
  const [catatanAdmin, setCatatanAdmin] = useState('');
  const [requestForPdf, setRequestForPdf] = useState(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await fetchAllRows(() =>
      supabase.from('surat_layanan').select('*').order('created_at', { ascending: false }).order('id', { ascending: false })
    );
    if (queryError) setError(queryError.message);
    else setRecords(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecords();
    const channel = supabase
      .channel(`surat-layanan-${user?.id || 'none'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surat_layanan' }, loadRecords)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadRecords, user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = statusFilter === 'semua' || record.status === statusFilter;
      const matchesSearch = !q || [record.warga_nama, record.warga_nik, record.nomor_surat, record.jenis_surat]
        .some((value) => String(value || '').toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  const resetForm = () => {
    setShowForm(false);
    setSelectedWargaId('');
    setJenisSurat(JENIS_SURAT[0]);
    setKeperluan('');
    setKelengkapan('');
    setLampiranFile(null);
  };

  const createRequest = async (event) => {
    event.preventDefault();
    const warga = wargaList.find((item) => item.id === selectedWargaId);
    if (!warga || !keperluan.trim()) {
      setError('Pilih warga dan isi keperluan surat.');
      return;
    }
    if (lampiranFile && (!['application/pdf', 'image/jpeg', 'image/png'].includes(lampiranFile.type) || lampiranFile.size > 5 * 1024 * 1024)) {
      setError('Lampiran harus berupa PDF/JPG/PNG dengan ukuran maksimal 5 MB.');
      return;
    }
    setSaving(true);
    setError('');
    const { data: created, error: insertError } = await supabase.from('surat_layanan').insert({
      warga_id: warga.id,
      warga_nama: warga.nama,
      warga_nik: warga.nik,
      warga_no_kk: warga.no_kk,
      warga_dusun: warga.dusun,
      warga_rw: warga.rw,
      warga_rt: warga.rt,
      jenis_surat: jenisSurat,
      keperluan: keperluan.trim(),
      kelengkapan: kelengkapan.trim(),
      status: 'diajukan',
      riwayat_status: [{ status: 'diajukan', catatan: 'Permohonan dicatat admin', oleh: profile?.nama_lengkap || 'Admin', waktu: new Date().toISOString() }],
      created_by: user?.id,
      updated_by: user?.id,
    }).select().single();
    if (insertError) setError(insertError.message);
    else {
      let attachmentError = '';
      if (lampiranFile) {
        const safeName = lampiranFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'lampiran';
        const storagePath = `${created.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('surat-lampiran').upload(storagePath, lampiranFile, { upsert: false, contentType: lampiranFile.type });
        if (uploadError) attachmentError = `Permohonan tercatat, tetapi lampiran gagal diunggah: ${uploadError.message}`;
        else {
          const { error: attachError } = await supabase.from('surat_layanan').update({ lampiran_path: storagePath, lampiran_nama: lampiranFile.name }).eq('id', created.id);
          if (attachError) attachmentError = `Berkas sudah terunggah tetapi belum tertaut ke arsip: ${attachError.message}`;
        }
      }
      resetForm();
      await loadRecords();
      if (attachmentError) setError(attachmentError);
    }
    setSaving(false);
  };

  const saveProgress = async (event) => {
    event.preventDefault();
    if (!editing) return;
    if (['perlu_perbaikan', 'ditolak'].includes(nextStatus) && !catatanAdmin.trim()) {
      setError('Isi alasan saat meminta perbaikan atau menolak permohonan.');
      return;
    }
    if (['menunggu_ttd', 'selesai'].includes(nextStatus) && !editing.nomor_surat) {
      setError('Masukkan nomor agenda dan buat PDF setelah permohonan diverifikasi sebelum memilih status ini.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase.from('surat_layanan').update({
      status: nextStatus,
      catatan_admin: catatanAdmin.trim(),
      riwayat_status: [...(editing.riwayat_status || []), { status: nextStatus, catatan: catatanAdmin.trim(), oleh: profile?.nama_lengkap || 'Admin', waktu: new Date().toISOString() }],
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq('id', editing.id);
    if (updateError) setError(updateError.message);
    else {
      setEditing(null);
      await loadRecords();
    }
    setSaving(false);
  };

  const saveOfficialNumber = async (nomorSurat) => {
    const request = requestForPdf;
    if (!request) return;
    if (!['diverifikasi', 'menunggu_ttd', 'selesai'].includes(request.status)) {
      const workflowError = new Error('Verifikasi permohonan terlebih dahulu sebelum membuat PDF.');
      setError(workflowError.message);
      throw workflowError;
    }
    const { error: updateError } = await supabase.from('surat_layanan').update({
      nomor_surat: nomorSurat.trim(),
      tanggal_surat: request.tanggal_surat || new Date().toISOString().slice(0, 10),
      status: request.status === 'diverifikasi' ? 'menunggu_ttd' : request.status,
      riwayat_status: request.status === 'diverifikasi'
        ? [...(request.riwayat_status || []), { status: 'menunggu_ttd', catatan: 'Nomor agenda disimpan dan draf PDF dibuat', oleh: profile?.nama_lengkap || 'Admin', waktu: new Date().toISOString() }]
        : request.riwayat_status || [],
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq('id', request.id);
    if (updateError) {
      setError(updateError.code === '23505' ? 'Nomor surat tersebut sudah digunakan. Masukkan nomor agenda yang berbeda.' : updateError.message);
      throw updateError;
    }
    await loadRecords();
  };

  const openAttachment = async (record) => {
    if (!record.lampiran_path) return;
    const { data, error: signedUrlError } = await supabase.storage.from('surat-lampiran').createSignedUrl(record.lampiran_path, 300);
    if (signedUrlError) setError(`Lampiran tidak dapat dibuka: ${signedUrlError.message}`);
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const wargaForPdf = requestForPdf && {
    id: requestForPdf.warga_id,
    nama: requestForPdf.warga_nama,
    nik: requestForPdf.warga_nik,
    no_kk: requestForPdf.warga_no_kk,
    dusun: requestForPdf.warga_dusun,
    rw: requestForPdf.warga_rw,
    rt: requestForPdf.warga_rt,
  };

  return (
    <div className="space-y-3.5">
      <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Pelayanan dan Arsip Surat</h3>
            <p className="text-xs text-slate-600 mt-1">Catat permohonan, verifikasi, masukkan nomor buku agenda, lalu arsipkan statusnya.</p>
          </div>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="shrink-0 px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5">
            <Plus size={15} /> Permohonan
          </button>
        </div>
      </div>

      {error && <div role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-start gap-2"><AlertCircle size={15} className="shrink-0 mt-0.5" /><span>{error}</span></div>}

      {showForm && <form onSubmit={createRequest} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
        <h4 className="font-bold text-slate-800 text-sm">Catat permohonan warga</h4>
        <label className="block text-xs font-semibold text-slate-700">Warga pemohon
          <select required value={selectedWargaId} onChange={(event) => setSelectedWargaId(event.target.value)} className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 bg-white">
            <option value="">Pilih berdasarkan nama dan NIK</option>
            {wargaList.map((warga) => <option key={warga.id} value={warga.id}>{warga.nama} • {warga.nik} • RT {warga.rt}/RW {warga.rw}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-700">Jenis surat
          <select value={jenisSurat} onChange={(event) => setJenisSurat(event.target.value)} className="mt-1 w-full p-2.5 rounded-xl border border-slate-200 bg-white">
            {JENIS_SURAT.map((jenis) => <option key={jenis}>{jenis}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-slate-700">Keperluan
          <input required maxLength={300} value={keperluan} onChange={(event) => setKeperluan(event.target.value)} className="mt-1 w-full p-2.5 rounded-xl border border-slate-200" placeholder="Contoh: persyaratan beasiswa" />
        </label>
        <label className="block text-xs font-semibold text-slate-700">Kelengkapan / lampiran yang diterima
          <textarea maxLength={1000} rows={2} value={kelengkapan} onChange={(event) => setKelengkapan(event.target.value)} className="mt-1 w-full p-2.5 rounded-xl border border-slate-200" placeholder="Contoh: fotokopi KK, KTP; dokumen fisik diperiksa di kantor" />
        </label>
        <label className="block text-xs font-semibold text-slate-700">Unggah lampiran (opsional)
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setLampiranFile(event.target.files?.[0] || null)} className="mt-1 w-full text-xs" />
        </label>
        <p className="text-[11px] text-slate-500">PDF/JPG/PNG, maksimal 5 MB. Berkas disimpan privat dan hanya dapat diakses admin.</p>
        <div className="flex gap-2"><button disabled={saving} className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold">{saving ? 'Menyimpan…' : 'Simpan permohonan'}</button><button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Batal</button></div>
      </form>}

      <div className="flex gap-2">
        <div className="relative flex-1"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, NIK, jenis, nomor surat" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs" /></div>
        <button type="button" onClick={loadRecords} aria-label="Refresh arsip" className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600"><RefreshCw size={16} /></button>
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">{[['semua','Semua'], ...STATUS].map(([value,label]) => <button key={value} type="button" onClick={() => setStatusFilter(value)} className={`px-3 py-2 rounded-xl whitespace-nowrap text-[11px] font-semibold ${statusFilter === value ? 'bg-teal-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{label}</button>)}</div>

      {loading ? <p className="p-5 text-center text-xs text-slate-500">Memuat arsip surat…</p> : filtered.length === 0 ? <div className="p-6 text-center bg-white border border-slate-200 rounded-2xl"><FileText size={22} className="mx-auto text-slate-400" /><p className="mt-2 text-sm font-semibold text-slate-700">Belum ada permohonan pada filter ini</p></div> :
        <div className="space-y-2">{filtered.map((record) => <article key={record.id} className="p-3.5 bg-white border border-slate-200 rounded-2xl">
          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="font-bold text-sm text-slate-800 truncate">{record.warga_nama}</h4><p className="font-mono text-[11px] text-slate-500">NIK {record.warga_nik}</p><p className="text-xs text-slate-700 mt-1">{record.jenis_surat}</p><p className="text-xs text-slate-500">Keperluan: {record.keperluan}</p></div><span className="shrink-0 px-2 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold">{STATUS.find(([value]) => value === record.status)?.[1] || record.status}</span></div>
          {record.nomor_surat && <p className="mt-2 text-xs font-semibold text-teal-800">Nomor agenda: {record.nomor_surat} {record.tanggal_surat && `• ${record.tanggal_surat}`}</p>}
          {record.kelengkapan && <p className="mt-2 text-[11px] text-slate-500">Kelengkapan: {record.kelengkapan}</p>}
          {record.lampiran_path && <button type="button" onClick={() => openAttachment(record)} className="mt-2 px-2.5 py-1.5 rounded-lg bg-cyan-50 text-cyan-800 text-[11px] font-bold inline-flex items-center gap-1"><Download size={13} /> Buka lampiran: {record.lampiran_nama || 'dokumen'}</button>}
          {record.catatan_admin && <p className="mt-2 p-2 rounded-lg bg-amber-50 text-[11px] text-amber-900">Catatan admin: {record.catatan_admin}</p>}
          {record.riwayat_status?.length > 0 && <details className="mt-2 text-[11px] text-slate-500"><summary className="cursor-pointer font-semibold">Riwayat status ({record.riwayat_status.length})</summary><ol className="mt-2 ml-4 list-decimal space-y-1">{record.riwayat_status.slice().reverse().map((entry, index) => <li key={`${entry.waktu}-${index}`}>{STATUS.find(([value]) => value === entry.status)?.[1] || entry.status} · {entry.oleh || 'Admin'} · {entry.waktu ? new Date(entry.waktu).toLocaleString('id-ID') : ''}{entry.catatan ? ` — ${entry.catatan}` : ''}</li>)}</ol></details>}
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { setEditing(record); setNextStatus(record.status); setCatatanAdmin(record.catatan_admin || ''); }} className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold">Perbarui status</button>{['diverifikasi', 'menunggu_ttd', 'selesai'].includes(record.status) && <button type="button" onClick={() => { setRequestForPdf(record); setError(''); }} className="px-3 py-2 rounded-lg bg-teal-700 text-white text-[11px] font-bold flex items-center gap-1"><Printer size={13} /> {record.nomor_surat ? 'Cetak ulang PDF' : 'Isi nomor & buat PDF'}</button>}</div>
          {editing?.id === record.id && <form onSubmit={saveProgress} className="mt-3 p-3 rounded-xl bg-slate-50 space-y-2"><label className="block text-xs font-semibold">Status
            <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} className="mt-1 w-full p-2 rounded-lg border border-slate-200 bg-white">{STATUS.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
          </label><label className="block text-xs font-semibold">Alasan perbaikan / catatan admin
            <textarea rows={2} value={catatanAdmin} onChange={(event) => setCatatanAdmin(event.target.value)} className="mt-1 w-full p-2 rounded-lg border border-slate-200" placeholder="Wajib diisi jika status perlu perbaikan atau ditolak" />
          </label><div className="flex gap-2"><button disabled={saving} className="px-3 py-2 rounded-lg bg-teal-700 text-white text-xs font-bold">Simpan</button><button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs">Batal</button></div></form>}
        </article>)}</div>}

      {requestForPdf && wargaForPdf && <SuratModal warga={wargaForPdf} userProfile={profile} requestRecord={requestForPdf} onIssued={saveOfficialNumber} onClose={() => setRequestForPdf(null)} />}
    </div>
  );
}

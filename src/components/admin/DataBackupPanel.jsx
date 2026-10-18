import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Download, FileUp, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows } from '../../lib/fetchAllRows';

const TABLES = [
  { name: 'pengaturan_desa', label: 'Profil desa', fields: 'id' },
  { name: 'wilayah_desa', label: 'Wilayah', fields: 'id,dusun,rw,rt' },
  { name: 'warga', label: 'Data warga', fields: 'id,nik' },
  { name: 'bantuan_sosial', label: 'Program bantuan', fields: 'id' },
  { name: 'mutasi_kependudukan', label: 'Riwayat mutasi', fields: 'id,warga_id,warga_pasangan_id' },
  { name: 'penerima_bansos', label: 'Penerima bantuan', fields: 'id,bansos_id,warga_id' },
  { name: 'surat_layanan', label: 'Pelayanan surat', fields: 'id,nomor_surat,warga_id' },
];
const FORMAT = 'sim-desa-backup';
const VERSION = 1;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const KDF_ITERATIONS = 310000;
const keyOf = (...values) => JSON.stringify(values.map((value) => String(value ?? '').trim().toLowerCase()));
const countPlan = (plan) => Object.fromEntries(TABLES.map(({ name }) => [name, plan[name]?.length || 0]));
const sameCounts = (a, b) => TABLES.every(({ name }) => (a?.[name] || 0) === (b?.[name] || 0));
const toBase64 = (bytes) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
const fromBase64 = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function deriveEncryptionKey(password, salt) {
  if (!window.crypto?.subtle) throw new Error('Browser belum mendukung enkripsi backup. Buka aplikasi lewat HTTPS atau browser terbaru.');
  const material = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return window.crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: KDF_ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encryptBackup(payload, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt);
  const encrypted = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return { format: FORMAT, version: VERSION, encrypted: true, kdf: 'PBKDF2-SHA-256', iterations: KDF_ITERATIONS, cipher: 'AES-256-GCM', salt: toBase64(salt), iv: toBase64(iv), data: toBase64(new Uint8Array(encrypted)) };
}

async function decryptBackup(envelope, password) {
  if (envelope?.format !== FORMAT || envelope?.version !== VERSION || envelope?.encrypted !== true || envelope?.cipher !== 'AES-256-GCM' || envelope?.kdf !== 'PBKDF2-SHA-256') throw new Error('Format backup tidak dikenali atau versinya tidak didukung.');
  try {
    const key = await deriveEncryptionKey(password, fromBase64(envelope.salt));
    const clearText = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.data));
    return JSON.parse(new TextDecoder().decode(clearText));
  } catch {
    throw new Error('Kata sandi salah atau file backup rusak.');
  }
}

async function fetchRows(table) {
  const { data, error } = await fetchAllRows(() => supabase.from(table).select('*'));
  if (error) throw new Error(`Gagal membaca ${table}: ${error.message}`);
  return data || [];
}

async function makeRestorePlan(backup) {
  const existing = {};
  await Promise.all(TABLES.map(async ({ name, fields }) => {
    const { data, error } = await fetchAllRows(() => supabase.from(name).select(fields));
    if (error) throw new Error(`Tidak dapat memeriksa ${name}: ${error.message}`);
    existing[name] = data || [];
  }));

  const sets = {
    wilayahIds: new Set(existing.wilayah_desa.map((row) => row.id)),
    wilayahKeys: new Set(existing.wilayah_desa.map((row) => keyOf(row.dusun, row.rw, row.rt))),
    wargaIds: new Set(existing.warga.map((row) => row.id)),
    wargaNiks: new Set(existing.warga.map((row) => String(row.nik))),
    bantuanIds: new Set(existing.bantuan_sosial.map((row) => row.id)),
    mutasiIds: new Set(existing.mutasi_kependudukan.map((row) => row.id)),
    penerimaIds: new Set(existing.penerima_bansos.map((row) => row.id)),
    penerimaKeys: new Set(existing.penerima_bansos.map((row) => keyOf(row.bansos_id, row.warga_id))),
    suratIds: new Set(existing.surat_layanan.map((row) => row.id)),
    suratNumbers: new Set(existing.surat_layanan.map((row) => String(row.nomor_surat || '').trim().toLowerCase()).filter(Boolean)),
  };
  const plan = Object.fromEntries(TABLES.map(({ name }) => [name, []]));
  const seen = Object.fromEntries(TABLES.map(({ name }) => [name, new Set()]));
  const add = (table, row, uniqueKey, existingIds, existingUnique) => {
    if (!row?.id || existingIds.has(row.id) || (uniqueKey && existingUnique.has(uniqueKey)) || seen[table].has(row.id) || (uniqueKey && seen[table].has(uniqueKey))) return;
    seen[table].add(row.id);
    if (uniqueKey) seen[table].add(uniqueKey);
    plan[table].push(row);
    existingIds.add(row.id);
    if (uniqueKey) existingUnique.add(uniqueKey);
  };

  for (const row of backup.tables.pengaturan_desa) {
    if (!existing.pengaturan_desa.some((item) => item.id === row.id)) plan.pengaturan_desa.push(row);
  }
  for (const row of backup.tables.wilayah_desa) add('wilayah_desa', row, keyOf(row.dusun, row.rw, row.rt), sets.wilayahIds, sets.wilayahKeys);
  for (const row of backup.tables.warga) add('warga', row, String(row.nik || ''), sets.wargaIds, sets.wargaNiks);
  for (const row of backup.tables.bantuan_sosial) add('bantuan_sosial', row, null, sets.bantuanIds, new Set());
  for (const row of backup.tables.mutasi_kependudukan) {
    if (!sets.wargaIds.has(row.warga_id)) continue;
    const restored = { ...row, warga_pasangan_id: row.warga_pasangan_id && sets.wargaIds.has(row.warga_pasangan_id) ? row.warga_pasangan_id : null };
    add('mutasi_kependudukan', restored, null, sets.mutasiIds, new Set());
  }
  for (const row of backup.tables.penerima_bansos) {
    if (!sets.wargaIds.has(row.warga_id) || !sets.bantuanIds.has(row.bansos_id)) continue;
    add('penerima_bansos', row, keyOf(row.bansos_id, row.warga_id), sets.penerimaIds, sets.penerimaKeys);
  }
  for (const row of backup.tables.surat_layanan) {
    const number = String(row.nomor_surat || '').trim().toLowerCase();
    const restored = { ...row, warga_id: row.warga_id && sets.wargaIds.has(row.warga_id) ? row.warga_id : null, created_by: null, updated_by: null };
    add('surat_layanan', restored, number, sets.suratIds, sets.suratNumbers);
  }
  return plan;
}

export default function DataBackupPanel({ profile }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);
  const [backupFile, setBackupFile] = useState(null);
  const [plan, setPlan] = useState(null);
  const [backupInfo, setBackupInfo] = useState(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [confirmBackupPassword, setConfirmBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');

  if (profile?.role !== 'admin') return null;

  const handleDownload = async () => {
    if (backupPassword.length < 12) {
      setMessage({ type: 'error', text: 'Kata sandi file backup minimal 12 karakter.' });
      return;
    }
    if (backupPassword !== confirmBackupPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi kata sandi backup belum cocok.' });
      return;
    }
    setBusy('download');
    setMessage(null);
    try {
      const results = await Promise.all(TABLES.map(async ({ name }) => [name, await fetchRows(name)]));
      const tables = Object.fromEntries(results);
      const payload = {
        format: FORMAT,
        version: VERSION,
        createdAt: new Date().toISOString(),
        village: {
          name: tables.pengaturan_desa?.[0]?.nama_desa || 'Desa',
          createdBy: profile?.nama_lengkap || 'Admin',
        },
        scope: 'data-operasional',
        tables,
        notes: [
          'File berisi data kependudukan dan bersifat rahasia. Simpan di perangkat atau media yang terlindungi.',
          'Akun aparat, kredensial PIN, audit log, dan berkas lampiran di Supabase Storage tidak disertakan.',
          'Pemulihan hanya menambahkan data yang belum ada; data saat ini tidak ditimpa atau dihapus.',
        ],
      };
      const encryptedPayload = await encryptBackup(payload, backupPassword);
      const blob = new Blob([JSON.stringify(encryptedPayload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = String(payload.village.name).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'desa';
      link.href = url;
      link.download = `backup-sim-desa-${safeName}-${new Date().toISOString().slice(0, 10)}.simdesa`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage({ type: 'success', text: `Backup berhasil diunduh. Data warga: ${tables.warga.length}; wilayah: ${tables.wilayah_desa.length}; surat: ${tables.surat_layanan.length}.` });
      setBackupPassword('');
      setConfirmBackupPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Backup gagal dibuat. Periksa koneksi dan hak akses admin.' });
    } finally {
      setBusy('');
    }
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setBackupFile(null);
    setPlan(null);
    setBackupInfo(null);
    setMessage(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setMessage({ type: 'error', text: 'Ukuran file melebihi batas 50 MB.' });
      return;
    }
    setBusy('preview');
    try {
      const envelope = JSON.parse(await file.text());
      const payload = await decryptBackup(envelope, restorePassword);
      if (!TABLES.every(({ name }) => Array.isArray(payload.tables?.[name]))) throw new Error('Isi backup tidak lengkap. Pemulihan dibatalkan.');
      setBackupFile(payload);
      setBackupInfo({ fileName: file.name, createdAt: payload.createdAt, counts: Object.fromEntries(TABLES.map(({ name }) => [name, payload.tables[name].length])) });
      setPlan(await makeRestorePlan(payload));
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'File backup tidak dapat dibaca.' });
    } finally {
      setBusy('');
    }
  };

  const handleRestore = async () => {
    if (!backupFile || !plan || !window.confirm('Pemulihan hanya menambahkan data yang belum ada. Proses dapat menambah data warga dan riwayat ke database aktif. Lanjutkan?')) return;
    setBusy('restore');
    setMessage(null);
    try {
      const freshPlan = await makeRestorePlan(backupFile);
      if (!sameCounts(countPlan(plan), countPlan(freshPlan))) {
        setPlan(freshPlan);
        setMessage({ type: 'warning', text: 'Data database berubah setelah pratinjau. Periksa jumlah terbaru, lalu tekan pulihkan lagi.' });
        return;
      }
      let inserted = 0;
      for (const { name, label } of TABLES) {
        const rows = freshPlan[name];
        for (let offset = 0; offset < rows.length; offset += 200) {
          const batch = rows.slice(offset, offset + 200).map((row) => {
            if (name === 'surat_layanan') return { ...row, created_by: null, updated_by: null };
            return row;
          });
          const { error } = await supabase.from(name).upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
          if (error) throw new Error(`Gagal memulihkan ${label}: ${error.message}`);
          inserted += batch.length;
        }
      }
      setPlan(null);
      setBackupFile(null);
      setBackupInfo(null);
      setRestorePassword('');
      setMessage({ type: 'success', text: `${inserted} baris data yang belum ada berhasil dipulihkan. Data yang sudah ada tetap dipertahankan.` });
      window.dispatchEvent(new Event('warga-updated'));
      window.dispatchEvent(new Event('mutasi-updated'));
      window.dispatchEvent(new Event('bansos-updated'));
    } catch (error) {
      setMessage({ type: 'error', text: `${error.message} Jika proses sempat berjalan sebagian, file yang sama aman dicoba ulang karena data lama tidak ditimpa.` });
    } finally {
      setBusy('');
    }
  };

  const previewCounts = plan ? countPlan(plan) : null;
  const busyLabel = busy === 'download' ? 'Mengumpulkan data…' : busy === 'preview' ? 'Memeriksa file…' : busy === 'restore' ? 'Memulihkan data…' : '';

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="rounded-xl bg-white p-2 text-teal-800"><ShieldCheck size={17} /></span>
          <div><h3 className="text-sm font-bold text-slate-800">Cadangan data operasional</h3><p className="mt-1 text-[11px] leading-relaxed text-slate-600">Unduh salinan data desa ke komputer admin. Cadangan ini bukan dump penuh database Supabase.</p></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
        <div className="flex items-start gap-2"><Database size={15} className="mt-0.5 text-teal-700" /><div><h4 className="text-xs font-bold text-slate-800">Buat file backup</h4><p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">Mencakup profil desa, wilayah, warga, program dan penerima bantuan, mutasi, serta pelayanan surat.</p></div></div>
        <label className="block text-[10px] font-semibold text-slate-600">Kata sandi file backup (minimal 12 karakter)
          <input type="password" autoComplete="new-password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} placeholder="Buat kata sandi khusus backup" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
        </label>
        <label className="block text-[10px] font-semibold text-slate-600">Ulangi kata sandi backup
          <input type="password" autoComplete="new-password" value={confirmBackupPassword} onChange={(event) => setConfirmBackupPassword(event.target.value)} placeholder="Ulangi kata sandi" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
        </label>
        <p className="text-[10px] leading-relaxed text-amber-800">Backup dienkripsi di browser. Simpan kata sandi terpisah; file tidak bisa dipulihkan jika kata sandi hilang.</p>
        <button type="button" onClick={handleDownload} disabled={Boolean(busy) || !navigator.onLine} className="w-full rounded-xl bg-teal-800 px-3 py-2.5 text-xs font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50">
          {busy === 'download' ? <LoaderCircle size={15} className="animate-spin" /> : <Download size={15} />}{busy === 'download' ? 'Menyiapkan backup…' : 'Unduh Backup ke Komputer'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5">
        <div className="flex items-start gap-2"><RefreshCw size={15} className="mt-0.5 text-blue-700" /><div><h4 className="text-xs font-bold text-slate-800">Pulihkan data dari file</h4><p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">Pemulihan bersifat tambah saja: baris yang sudah ada tidak ditimpa atau dihapus. Tinjau jumlah data sebelum melanjutkan.</p></div></div>
        <label className="block text-[10px] font-semibold text-slate-600">Kata sandi backup
          <input type="password" autoComplete="current-password" value={restorePassword} onChange={(event) => setRestorePassword(event.target.value)} placeholder="Masukkan kata sandi file backup" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
        </label>
        <input ref={fileRef} type="file" accept=".simdesa,application/json" className="hidden" onChange={handleFile} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy) || !navigator.onLine} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 disabled:opacity-50">
          {busy === 'preview' ? <LoaderCircle size={15} className="animate-spin" /> : <FileUp size={15} />}{busy === 'preview' ? 'Memeriksa file…' : 'Pilih File Backup'}
        </button>
        {backupInfo && previewCounts && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="break-all text-[10px] font-bold text-slate-700">{backupInfo.fileName}</p>
          <p className="mt-1 text-[10px] text-slate-500">Dibuat: {backupInfo.createdAt ? new Date(backupInfo.createdAt).toLocaleString('id-ID') : 'tanggal tidak tersedia'}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">{TABLES.map(({ name, label }) => <p key={name} className="text-[10px] text-slate-600">{label}: <b>{previewCounts[name]}</b> akan ditambahkan <span className="text-slate-400">/ {backupInfo.counts[name]} di file</span></p>)}</div>
          <p className="mt-2 text-[10px] leading-relaxed text-amber-800">Akun aparat, PIN, audit log, dan file lampiran tidak dipulihkan dari file ini.</p>
          <button type="button" onClick={handleRestore} disabled={Boolean(busy) || !Object.values(previewCounts).some((count) => count > 0)} className="mt-3 w-full rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy === 'restore' ? busyLabel : 'Pulihkan Data yang Belum Ada'}</button>
        </div>}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700" /><p className="text-[10px] leading-relaxed text-amber-900">File memuat identitas warga. Simpan hanya di perangkat admin yang terlindungi dan jangan unggah ke repo GitHub atau kirim ke grup. Akun/PIN aparat dan lampiran berkas tidak termasuk backup ini.</p></div>
      {busy && <p className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5"><LoaderCircle size={12} className="animate-spin" />{busyLabel}</p>}
      {message && <div role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-[11px] leading-relaxed ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : message.type === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>
        <span className="inline-flex items-center gap-1.5">{message.type === 'success' ? <CheckCircle2 size={14} /> : message.type === 'error' ? <AlertTriangle size={14} /> : <RefreshCw size={14} />}{message.text}</span>
      </div>}
    </section>
  );
}

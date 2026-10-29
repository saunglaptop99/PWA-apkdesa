import React, { useEffect, useState } from 'react';
import BrandPageHeader from '../components/common/BrandPageHeader';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { readUserCache, writeUserCache, filterByProfileScope } from '../lib/userCache';
import { fetchAllRows } from '../lib/fetchAllRows';
import {
  ShieldCheck,
  AlertCircle,
  Gift,
  CheckCircle2,
  Clock,
  Plus,
  UserCheck,
  Search,
} from 'lucide-react';

export default function BansosPage() {
  const { profile, user, isOnline } = useAuth();
  const [bansosList, setBansosList] = useState([]);
  const [unassistedPoor, setUnassistedPoor] = useState([]);
  const [penerimaList, setPenerimaList] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('flagging'); // 'flagging' | 'program' | 'penerima'
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const [programForm, setProgramForm] = useState({ nama_program: '', tahun_anggaran: String(new Date().getFullYear()), keterangan: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Bansos Programs
      const { data: bData, error: bErr } = await supabase
        .from('bantuan_sosial')
        .select('*')
        .order('tahun_anggaran', { ascending: false })
        .order('created_at', { ascending: false });

      if (bErr) throw bErr;
      setBansosList(bData || []);
      writeUserCache(user?.id, 'bansos-programs', bData || []);

      // 2. Load Unassisted Poor Citizens
      const { data: poorData, error: poorErr } = await fetchAllRows(() => {
        let poorQuery = supabase
          .from('warga')
          .select('id, nama, nik, rt, rw, dusun, no_kk, status_ekonomi')
          .eq('status_ekonomi', 'miskin')
          .eq('status_kependudukan', 'aktif');

        if (profile?.role === 'rt') {
          if (profile.wilayah_dusun) poorQuery = poorQuery.eq('dusun', profile.wilayah_dusun);
          if (profile.wilayah_rt) poorQuery = poorQuery.eq('rt', profile.wilayah_rt);
          if (profile.wilayah_rw) poorQuery = poorQuery.eq('rw', profile.wilayah_rw);
        } else if (profile?.role === 'rw') {
          if (profile.wilayah_dusun) poorQuery = poorQuery.eq('dusun', profile.wilayah_dusun);
          if (profile.wilayah_rw) poorQuery = poorQuery.eq('rw', profile.wilayah_rw);
        } else if (profile?.role === 'dusun') {
          if (profile.wilayah_dusun) poorQuery = poorQuery.eq('dusun', profile.wilayah_dusun);
        }

        return poorQuery.order('id', { ascending: true });
      });

      if (poorErr) throw poorErr;
      // 3. Load Penerima Bansos
      const { data: penData, error: penErr } = await fetchAllRows(() => supabase
        .from('penerima_bansos')
        .select(
          'id, tanggal_verifikasi, tanggal_terima, status_verifikasi, bansos_id, created_at, warga:warga_id (id, nama, nik, rt, rw, dusun), bantuan_sosial:bansos_id (nama_program)'
        )
        .order('tanggal_terima', { ascending: false })
        .order('id', { ascending: false }));

      if (penErr) throw penErr;
      const scopedRecipients = (penData || []).filter((row) =>
        filterByProfileScope([row.warga].filter(Boolean), profile).length > 0
      );
      setPenerimaList(scopedRecipients);
      writeUserCache(user?.id, 'bansos-penerima', scopedRecipients);

      // Flag warga yang belum tercatat pada program terbaru, bukan semua warga miskin.
      const activeProgramId = bData?.[0]?.id;
      const alreadyReceived = new Set(
        scopedRecipients.filter((row) => row.bansos_id === activeProgramId).map((row) => row.warga?.id).filter(Boolean)
      );
      const scopedPoor = filterByProfileScope(poorData || [], profile)
        .filter((warga) => !alreadyReceived.has(warga.id));
      setUnassistedPoor(scopedPoor);
      writeUserCache(user?.id, 'bansos-poor', scopedPoor);
    } catch (err) {
      console.warn('Error loading bansos:', err);
      setBansosList(readUserCache(user?.id, 'bansos-programs', []));
      setUnassistedPoor(filterByProfileScope(readUserCache(user?.id, 'bansos-poor', []), profile));
      setPenerimaList(readUserCache(user?.id, 'bansos-penerima', []).filter((row) => filterByProfileScope([row.warga].filter(Boolean), profile).length > 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime listeners
    const channel = supabase
      .channel('realtime-bansos-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'warga' },
        () => loadData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bantuan_sosial' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'penerima_bansos' }, () => loadData())
      .subscribe();

    const handleLocalSync = () => loadData();
    window.addEventListener('warga-updated', handleLocalSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('warga-updated', handleLocalSync);
    };
  }, [profile, user?.id, isOnline]);

  const handleVerify = async (warga) => {
    if (profile?.role !== 'admin') return;
    const program = bansosList[0];
    if (!program) {
      alert('Belum ada program bansos di database. Tambahkan program terlebih dahulu.');
      return;
    }
    setVerifyingId(warga.id);
    try {
      const { error } = await supabase.from('penerima_bansos').upsert({
        bansos_id: program.id,
        warga_id: warga.id,
        tanggal_verifikasi: new Date().toISOString().slice(0, 10),
        tanggal_terima: null,
        status_verifikasi: 'Diverifikasi',
      }, { onConflict: 'bansos_id,warga_id' });
      if (error) throw error;
      await loadData();
      window.dispatchEvent(new Event('bansos-updated'));
    } catch (error) {
      alert(`Gagal menyimpan verifikasi ke server: ${error.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleMarkDistributed = async (recipient) => {
    if (profile?.role !== 'admin' || recipient.status_verifikasi !== 'Diverifikasi') return;
    const confirmed = window.confirm(`Tandai bantuan untuk ${recipient.warga?.nama || 'warga ini'} sebagai sudah disalurkan?`);
    if (!confirmed) return;
    setVerifyingId(recipient.id);
    try {
      const { error } = await supabase.from('penerima_bansos').update({
        status_verifikasi: 'Disalurkan',
        tanggal_terima: new Date().toISOString().slice(0, 10),
      }).eq('id', recipient.id);
      if (error) throw error;
      await loadData();
      window.dispatchEvent(new Event('bansos-updated'));
    } catch (error) {
      alert(`Gagal memperbarui status penyaluran: ${error.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleCreateProgram = async (event) => {
    event.preventDefault();
    if (profile?.role !== 'admin') return;
    const nama_program = programForm.nama_program.trim();
    const tahun_anggaran = Number(programForm.tahun_anggaran);
    if (!nama_program || !Number.isInteger(tahun_anggaran) || tahun_anggaran < 2000 || tahun_anggaran > 2100) {
      alert('Nama program dan tahun anggaran yang valid wajib diisi.');
      return;
    }
    setSavingProgram(true);
    try {
      const { data, error } = await supabase.from('bantuan_sosial').insert({
        nama_program,
        tahun_anggaran,
        keterangan: programForm.keterangan.trim() || null,
      }).select('*').single();
      if (error) throw error;
      const nextPrograms = [data, ...bansosList].sort((a, b) =>
        b.tahun_anggaran - a.tahun_anggaran || new Date(b.created_at) - new Date(a.created_at)
      );
      setBansosList(nextPrograms);
      writeUserCache(user?.id, 'bansos-programs', nextPrograms);
      setProgramForm({ nama_program: '', tahun_anggaran: String(new Date().getFullYear()), keterangan: '' });
      setShowProgramForm(false);
      await loadData();
      window.dispatchEvent(new Event('bansos-updated'));
    } catch (error) {
      alert(`Gagal menambahkan program bansos: ${error.message}`);
    } finally {
      setSavingProgram(false);
    }
  };

  return (
    <div className="app-page pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <BrandPageHeader title="Penyaluran Bantuan Sosial" subtitle="Monitoring bantuan dan prioritas kesejahteraan warga" className="bansos-topbar" />

      {/* Segmented Control Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl mb-4 text-xs font-bold text-slate-600">
        <button
          onClick={() => setActiveSubTab('flagging')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeSubTab === 'flagging'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          Flagging Miskin ({unassistedPoor.length})
        </button>
        <button
          onClick={() => setActiveSubTab('program')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeSubTab === 'program'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          Program ({bansosList.length})
        </button>
        <button
          onClick={() => setActiveSubTab('penerima')}
          className={`flex-1 py-2 rounded-xl transition-all ${
            activeSubTab === 'penerima'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          Penerima ({penerimaList.length})
        </button>
      </div>

      {/* TAB 1: FLAGGING PRIORITAS MISKIN */}
      {activeSubTab === 'flagging' && (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
              <AlertCircle size={16} className="text-amber-600" />
              <span>Flagging Anomali Kemiskinan</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Daftar warga berstatus <strong>Miskin</strong> yang belum tercatat pada program terbaru di wilayah Anda.
            </p>
            {bansosList[0] && <p className="mt-1 text-[10px] font-semibold text-amber-900">Program pemeriksaan: {bansosList[0].nama_program} · T.A {bansosList[0].tahun_anggaran}</p>}
            {profile?.role === 'admin' && !bansosList.length && (
              <button type="button" onClick={() => setActiveSubTab('program')} className="mt-2 text-[11px] font-bold text-teal-800 underline underline-offset-2">
                Tambahkan program bantuan terlebih dahulu
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Memuat data bansos wilayah…</div>
            ) : !bansosList.length ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Belum ada program bantuan yang dapat digunakan.</div>
            ) : unassistedPoor.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Semua Warga Terlayani</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tidak ditemukan warga miskin tanpa bantuan di wilayah ini.
                </p>
              </div>
            ) : (
              unassistedPoor.map((w) => (
                <div
                  key={w.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-3 transition-all hover:shadow-md"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{w.nama}</h4>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Prasejahtera
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">NIK: {w.nik}</p>
                    <p className="text-[10.5px] text-slate-500">
                      RT {w.rt} / RW {w.rw} • Dusun {w.dusun}
                    </p>
                  </div>

                  {profile?.role === 'admin' && <button
                    onClick={() => handleVerify(w)}
                    disabled={verifyingId === w.id}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-sm shadow-amber-900/10 flex items-center gap-1 transition-all disabled:opacity-60 flex-shrink-0"
                  >
                    <UserCheck size={13} />
                    <span>{verifyingId === w.id ? 'Memproses...' : 'Verifikasi'}</span>
                  </button>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR PROGRAM BANSOS */}
      {activeSubTab === 'program' && (
        <div className="space-y-3">
          {profile?.role === 'admin' && (
            <div className="space-y-3">
              {!showProgramForm ? (
                <button type="button" onClick={() => setShowProgramForm(true)} className="w-full rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs font-bold text-teal-800 flex items-center justify-center gap-2">
                  <Plus size={15} /> Tambah Program Bantuan
                </button>
              ) : (
                <form onSubmit={handleCreateProgram} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Program Bantuan Baru</h3>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Nama Program
                    <input required maxLength={120} value={programForm.nama_program} onChange={(e) => setProgramForm((prev) => ({ ...prev, nama_program: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-normal" placeholder="Contoh: Bantuan Pangan Desa" />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Tahun Anggaran
                    <input required type="number" min="2000" max="2100" value={programForm.tahun_anggaran} onChange={(e) => setProgramForm((prev) => ({ ...prev, tahun_anggaran: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-normal" />
                  </label>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Keterangan (opsional)
                    <textarea maxLength={1000} rows={3} value={programForm.keterangan} onChange={(e) => setProgramForm((prev) => ({ ...prev, keterangan: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-normal" placeholder="Keterangan singkat program" />
                  </label>
                  <div className="flex gap-2">
                    <button type="button" disabled={savingProgram} onClick={() => setShowProgramForm(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-slate-600">Batal</button>
                    <button type="submit" disabled={savingProgram} className="flex-1 rounded-lg bg-teal-800 py-2 text-xs font-bold text-white disabled:opacity-60">{savingProgram ? 'Menyimpan…' : 'Simpan Program'}</button>
                  </div>
                </form>
              )}
            </div>
          )}
          {bansosList.length === 0 && !loading && <p className="rounded-xl border border-slate-200 bg-white p-5 text-center text-xs text-slate-500">Belum ada program bantuan yang tersimpan.</p>}
          {bansosList.map((b) => (
            <div
              key={b.id}
              className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm relative overflow-hidden"
            >
              <div className="flex justify-between items-start gap-2 mb-1.5">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-bold border border-teal-100">
                    T.A {b.tahun_anggaran}
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-1.5">{b.nama_program}</h4>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <ShieldCheck size={20} />
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">{b.keterangan}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: PENERIMA BANSOS */}
      {activeSubTab === 'penerima' && (
        <div className="space-y-2.5">
          {!loading && penerimaList.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
              Belum ada warga yang tercatat sebagai penerima program bantuan.
            </div>
          )}
          {penerimaList.map((pen) => {
            const isDistributed = pen.status_verifikasi === 'Disalurkan';
            const isVerified = pen.status_verifikasi === 'Diverifikasi';
            const statusDate = isDistributed
              ? pen.tanggal_terima
              : isVerified
                ? pen.tanggal_verifikasi || pen.created_at?.slice(0, 10)
                : pen.tanggal_terima;
            return (
              <div
                key={pen.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      {pen.warga?.nama || 'Warga Penerima'}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400">NIK: {pen.warga?.nik || '-'}</p>
                    <p className="text-[10.5px] text-teal-700 font-semibold mt-1">
                      {pen.bantuan_sosial?.nama_program || 'Program Bantuan Sosial'}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${isDistributed ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                    {isDistributed && <CheckCircle2 size={11} />}
                    <span>{pen.status_verifikasi || 'Status belum ditentukan'}</span>
                  </span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                  <span>{isDistributed ? 'Tanggal disalurkan' : isVerified ? 'Tanggal diverifikasi' : 'Tanggal'}: {statusDate || '-'}</span>
                  <span>
                    RT {pen.warga?.rt || '01'} / RW {pen.warga?.rw || '01'} ({pen.warga?.dusun || 'Desa'})
                  </span>
                </div>
                {profile?.role === 'admin' && isVerified && (
                  <button
                    type="button"
                    onClick={() => handleMarkDistributed(pen)}
                    disabled={verifyingId === pen.id}
                    className="mt-3 w-full rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    {verifyingId === pen.id ? 'Menyimpan…' : 'Tandai sudah disalurkan'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

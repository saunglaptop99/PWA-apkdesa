import React, { useEffect, useState } from 'react';
import BrandPageHeader from '../components/common/BrandPageHeader';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useDesa } from '../context/DesaContext';
import { readUserCache, writeUserCache, filterByProfileScope } from '../lib/userCache';
import { fetchAllRows } from '../lib/fetchAllRows';
import {
  FileSpreadsheet,
  Plus,
  ArrowRightLeft,
  Calendar,
  X,
  Check,
  AlertCircle,
  FileCheck,
  Users,
} from 'lucide-react';

export default function MutasiPage() {
  const { profile, user, isOnline } = useAuth();
  const { getDusunOptions, getRwOptions, getRtOptions } = useDesa();
  const [mutasiList, setMutasiList] = useState([]);
  const [wargaList, setWargaList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    warga_id: '',
    warga_pasangan_id: '',
    jenis: 'kematian',
    tanggal_peristiwa: new Date().toISOString().slice(0, 10),
    nomor_surat: '',
    jenis_dokumen: '',
    nomor_dokumen: '',
    dusun_tujuan: '',
    rw_tujuan: '',
    rt_tujuan: '',
    alamat_tujuan: '',
    keterangan: '',
  });
  const dusunOptions = getDusunOptions?.() || [];
  const rwOptions = getRwOptions?.(form.dusun_tujuan) || [];
  const rtOptions = getRtOptions?.(form.dusun_tujuan, form.rw_tujuan) || [];

  const loadMutasi = async () => {
    setLoading(true);
    try {
      const { data: mData, error: mErr } = await fetchAllRows(() => supabase
        .from('mutasi_kependudukan')
        .select('*, warga:warga_id (id, nama, nik, rt, rw, dusun), warga_pasangan:warga_pasangan_id (id, nama, nik, rt, rw, dusun)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }));

      if (mErr) throw mErr;
      setMutasiList((mData || []).filter((row) => filterByProfileScope([row.warga].filter(Boolean), profile).length > 0));
      writeUserCache(user?.id, 'mutasi', mData || []);

      // Load warga options for dropdown
      const { data: wData, error: wErr } = await fetchAllRows(() => supabase
        .from('warga')
        .select('id, nama, nik, rt, rw, dusun, status_kependudukan, status_perkawinan')
        .order('nama', { ascending: true })
        .order('id', { ascending: true }));
      if (wErr) throw wErr;
      setWargaList(filterByProfileScope(wData || [], profile));
    } catch (err) {
      console.warn('Error load mutasi:', err);
      setMutasiList(readUserCache(user?.id, 'mutasi', []).filter((row) => filterByProfileScope([row.warga].filter(Boolean), profile).length > 0));
      setWargaList(filterByProfileScope(readUserCache(user?.id, 'warga', []), profile));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMutasi();
    const channel = supabase
      .channel(`mutasi-sync-${user?.id || 'none'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mutasi_kependudukan' }, loadMutasi)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warga' }, loadMutasi)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id, profile?.id, isOnline]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (profile?.role !== 'admin') return;
    if (!form.warga_id) {
      alert('Silakan pilih warga terkait mutasi.');
      return;
    }
    const perubahanPerkawinan = ['menikah', 'bercerai'].includes(form.jenis);
    if (perubahanPerkawinan && !form.warga_pasangan_id) {
      alert('Silakan pilih pasangan/warga kedua yang terkait.');
      return;
    }
    const pindahDenganTujuan = ['pindah_datang', 'pindah_dalam_desa'].includes(form.jenis);
    if (pindahDenganTujuan && (!form.dusun_tujuan || !form.rw_tujuan || !form.rt_tujuan)) {
      alert('Dusun, RW, dan RT tujuan harus dilengkapi.');
      return;
    }

    try {
      const { error } = await supabase.from('mutasi_kependudukan').insert([{
        ...form,
        warga_pasangan_id: perubahanPerkawinan ? form.warga_pasangan_id : null,
        jenis_dokumen: perubahanPerkawinan ? form.jenis_dokumen : null,
        nomor_dokumen: perubahanPerkawinan ? form.nomor_dokumen.trim() || null : null,
        dusun_tujuan: pindahDenganTujuan ? form.dusun_tujuan : null,
        rw_tujuan: pindahDenganTujuan ? form.rw_tujuan : null,
        rt_tujuan: pindahDenganTujuan ? form.rt_tujuan : null,
        alamat_tujuan: form.alamat_tujuan.trim() || null,
      }]);
      if (error) throw error;

      // Database trigger updates the resident status in the same transaction.
      await loadMutasi();

      alert(`Mutasi (${form.jenis}) berhasil dicatat! Status kependudukan warga telah diperbarui.`);
      setShowModal(false);
      setForm({
        warga_id: '',
        warga_pasangan_id: '',
        jenis: 'kematian',
        tanggal_peristiwa: new Date().toISOString().slice(0, 10),
        nomor_surat: '',
        jenis_dokumen: '',
        nomor_dokumen: '',
        dusun_tujuan: '',
        rw_tujuan: '',
        rt_tujuan: '',
        alamat_tujuan: '',
        keterangan: '',
      });
    } catch (err) {
      alert(`Gagal mencatat mutasi: ${err.message}`);
    }
  };

  const getJenisBadge = (jenis) => {
    switch (jenis) {
      case 'kematian':
        return 'bg-zinc-800 text-white';
      case 'kelahiran':
        return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'pindah_keluar':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'pindah_datang':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'pindah_dalam_desa':
        return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'menikah':
        return 'bg-pink-100 text-pink-800 border border-pink-200';
      case 'bercerai':
        return 'bg-violet-100 text-violet-800 border border-violet-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="app-page pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mutasi-heading-row mb-4">
        <BrandPageHeader title="Mutasi Kependudukan" subtitle="Pencatatan peristiwa warga; aparat melihat sesuai wilayah" className="mutasi-titlebar" sticky={false} />

        {profile?.role === 'admin' && <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-teal-900/15 transition-all"
        >
          <Plus size={14} />
          <span>Catat Mutasi</span>
        </button>}
      </div>

      {/* Mutasi List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <p className="text-xs text-slate-400">Memuat catatan mutasi desa...</p>
          </div>
        ) : mutasiList.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Mutasi</p>
            <p className="text-[11px] text-slate-400 mt-1">
              {profile?.role === 'admin'
                ? 'Gunakan tombol "Catat Mutasi" di atas untuk menambahkan peristiwa kependudukan baru.'
                : 'Belum ada catatan untuk wilayah ini. Perubahan data dicatat oleh admin desa.'}
            </p>
          </div>
        ) : (
          mutasiList.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start gap-2 mb-1.5">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {m.warga?.nama || 'Warga Terkait'}{m.warga_pasangan?.nama ? ` & ${m.warga_pasangan.nama}` : ''}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-400">NIK: {m.warga?.nik || '-'}</p>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${getJenisBadge(
                    m.jenis
                  )}`}
                >
                  {m.jenis.replace('_', ' ')}
                </span>
              </div>

              {(m.nomor_dokumen || m.nomor_surat) && (
                <p className="text-[11px] text-teal-800 font-medium mt-1">
                  {m.jenis_dokumen ? `${m.jenis_dokumen}: ` : 'No. Surat: '}{m.nomor_dokumen || m.nomor_surat}
                </p>
              )}

              {m.keterangan && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl mt-2 leading-relaxed">
                  {m.keterangan}
                </p>
              )}
              {(m.dusun_tujuan || m.alamat_tujuan) && (
                <p className="text-[11px] text-slate-600 mt-2">
                  Tujuan: {m.alamat_tujuan ? `${m.alamat_tujuan} · ` : ''}{m.dusun_tujuan ? `Dusun ${m.dusun_tujuan}, RW ${m.rw_tujuan}, RT ${m.rt_tujuan}` : ''}
                </p>
              )}

              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  <span>Tanggal: {m.tanggal_peristiwa}</span>
                </span>
                <span>
                  RT {m.warga?.rt || '01'} / RW {m.warga?.rw || '01'} • Dusun {m.warga?.dusun || 'Desa'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Pencatatan Mutasi */}
      {showModal && profile?.role === 'admin' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Catat Mutasi Warga</h3>
                  <p className="text-[11px] text-slate-500">Perubahan data kependudukan resmi</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Warga *</label>
                <select
                  value={form.warga_id}
                  onChange={(e) => setForm({ ...form, warga_id: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                >
                  <option value="">-- Pilih Warga Terdaftar --</option>
                  {wargaList.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama} ({w.nik}) - RT {w.rt}/RW {w.rw}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Mutasi *</label>
                <select
                  value={form.jenis}
                  onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                >
                  <option value="kematian">Kematian (Meninggal Dunia)</option>
                  <option value="pindah_keluar">Pindah Keluar Wilayah</option>
                  <option value="pindah_datang">Pindah Datang (Masuk)</option>
                  <option value="pindah_dalam_desa">Pindah dalam Desa</option>
                  <option value="kelahiran">Kelahiran Baru</option>
                  <option value="menikah">Menikah</option>
                  <option value="bercerai">Bercerai</option>
                </select>
              </div>

              {form.jenis === 'kelahiran' && (
                <p className="rounded-xl bg-blue-50 p-2.5 text-[11px] leading-relaxed text-blue-800">
                  Daftarkan bayi lebih dulu melalui tab Warga setelah NIK dan KK resminya tersedia. Lengkapi data orang tua dan wilayah, lalu pilih bayi tersebut untuk mencatat peristiwa kelahirannya.
                </p>
              )}

              {['pindah_datang', 'pindah_dalam_desa'].includes(form.jenis) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700">Wilayah Domisili Tujuan *</p>
                  <div className="grid grid-cols-3 gap-2">
                    <select required value={form.dusun_tujuan} onChange={(e) => setForm({ ...form, dusun_tujuan: e.target.value, rw_tujuan: '', rt_tujuan: '' })} className="min-w-0 p-2 rounded-lg border border-slate-200 bg-white text-xs">
                      <option value="">Dusun</option>{dusunOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select required value={form.rw_tujuan} onChange={(e) => setForm({ ...form, rw_tujuan: e.target.value, rt_tujuan: '' })} className="min-w-0 p-2 rounded-lg border border-slate-200 bg-white text-xs">
                      <option value="">RW</option>{rwOptions.map((rw) => <option key={rw} value={rw}>{rw}</option>)}
                    </select>
                    <select required value={form.rt_tujuan} onChange={(e) => setForm({ ...form, rt_tujuan: e.target.value })} className="min-w-0 p-2 rounded-lg border border-slate-200 bg-white text-xs">
                      <option value="">RT</option>{rtOptions.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
                    </select>
                  </div>
                  <input type="text" value={form.alamat_tujuan} onChange={(e) => setForm({ ...form, alamat_tujuan: e.target.value })} placeholder="Alamat detail (opsional)" className="w-full p-2.5 rounded-lg border border-slate-200 bg-white text-xs" />
                </div>
              )}

              {form.jenis === 'pindah_keluar' && (
                <input type="text" value={form.alamat_tujuan} onChange={(e) => setForm({ ...form, alamat_tujuan: e.target.value })} placeholder="Alamat/wilayah tujuan pindah (opsional)" className="w-full p-2.5 rounded-xl border border-slate-200 text-xs" />
              )}

              {['menikah', 'bercerai'].includes(form.jenis) && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pasangan / Warga Kedua *</label>
                    <select
                      value={form.warga_pasangan_id}
                      onChange={(e) => setForm({ ...form, warga_pasangan_id: e.target.value })}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                    >
                      <option value="">-- Pilih Warga --</option>
                      {wargaList.filter((w) => w.id !== form.warga_id && w.status_kependudukan === 'aktif').map((w) => (
                        <option key={w.id} value={w.id}>{w.nama} ({w.nik}) · RT {w.rt}/RW {w.rw}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Dokumen</label>
                    <select
                      value={form.jenis_dokumen}
                      onChange={(e) => setForm({ ...form, jenis_dokumen: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                    >
                      <option value="">Belum ada / belum dicatat</option>
                      {(form.jenis === 'menikah'
                        ? ['Buku Nikah', 'Akta Perkawinan', 'Surat Keterangan Perkawinan']
                        : ['Akta Cerai', 'Putusan Pengadilan', 'Surat Keterangan Perceraian']
                      ).map((jenis) => <option key={jenis} value={jenis}>{jenis}</option>)}
                    </select>
                    <input
                      type="text"
                      value={form.nomor_dokumen}
                      onChange={(e) => setForm({ ...form, nomor_dokumen: e.target.value })}
                      placeholder="Nomor dokumen (jika ada)"
                      className="mt-2 w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Peristiwa *</label>
                <input
                  type="date"
                  value={form.tanggal_peristiwa}
                  onChange={(e) => setForm({ ...form, tanggal_peristiwa: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Surat Keterangan</label>
                <input
                  type="text"
                  value={form.nomor_surat}
                  onChange={(e) => setForm({ ...form, nomor_surat: e.target.value })}
                  placeholder="Contoh: 472.12/05/DS/2026"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Alasan</label>
                <textarea
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  rows={2}
                  placeholder="Catatan tambahan peristiwa..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl font-bold text-xs shadow-lg shadow-teal-900/15 transition-all mt-2"
              >
                Simpan Catatan Mutasi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

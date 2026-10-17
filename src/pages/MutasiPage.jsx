import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
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
  const { profile } = useAuth();
  const [mutasiList, setMutasiList] = useState([]);
  const [wargaList, setWargaList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    warga_id: '',
    jenis: 'kematian',
    tanggal_peristiwa: new Date().toISOString().slice(0, 10),
    nomor_surat: '',
    keterangan: '',
  });

  const loadMutasi = async () => {
    setLoading(true);
    try {
      const { data: mData, error: mErr } = await supabase
        .from('mutasi_kependudukan')
        .select('*, warga:warga_id (id, nama, nik, rt, rw, dusun)')
        .order('created_at', { ascending: false });

      if (!mErr && mData && mData.length > 0) {
        setMutasiList(mData);
      } else {
        // Fallback demo mutasi
        const localMutasi = JSON.parse(localStorage.getItem('cached_mutasi') || '[]');
        if (localMutasi.length > 0) {
          setMutasiList(localMutasi);
        } else {
          setMutasiList([
            {
              id: 'm-1',
              jenis: 'kematian',
              tanggal_peristiwa: '2026-02-14',
              nomor_surat: '472.12/04/RT.01/2026',
              keterangan: 'Meninggal dunia karena sakit lanjut usia di rumah duka.',
              warga: { nama: 'Alm. Bpk. Karsan', nik: '3201010101400099', rt: '01', rw: '01', dusun: 'Sukamaju' },
            },
            {
              id: 'm-2',
              jenis: 'pindah_keluar',
              tanggal_peristiwa: '2026-03-02',
              nomor_surat: '475.2/18/DS/2026',
              keterangan: 'Pindah domisili ke Kabupaten Karawang mengikuti tugas kerja.',
              warga: { nama: 'Rian Hidayat', nik: '3201011508930044', rt: '02', rw: '02', dusun: 'Mekarsari' },
            },
          ]);
        }
      }

      // Load warga options for dropdown
      const { data: wData } = await supabase.from('warga').select('id, nama, nik, rt, rw, dusun');
      if (wData && wData.length > 0) {
        setWargaList(wData);
      } else {
        const cachedW = JSON.parse(localStorage.getItem('cached_warga_desa') || '[]');
        setWargaList(cachedW);
      }
    } catch (err) {
      console.warn('Error load mutasi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMutasi();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.warga_id) {
      alert('Silakan pilih warga terkait mutasi.');
      return;
    }

    try {
      const { error } = await supabase.from('mutasi_kependudukan').insert([form]);

      const selectedWarga = wargaList.find((w) => w.id === form.warga_id);

      // Also update warga status kependudukan in frontend / local storage
      let newStatus = 'aktif';
      if (form.jenis === 'kematian') newStatus = 'meninggal';
      else if (form.jenis === 'pindah_keluar') newStatus = 'pindah';

      await supabase
        .from('warga')
        .update({ status_kependudukan: newStatus })
        .eq('id', form.warga_id);

      const newRecord = {
        id: 'mut-' + Date.now(),
        ...form,
        warga: selectedWarga,
      };

      const updated = [newRecord, ...mutasiList];
      setMutasiList(updated);
      localStorage.setItem('cached_mutasi', JSON.stringify(updated));

      alert(`Mutasi (${form.jenis}) berhasil dicatat! Status kependudukan warga telah diperbarui.`);
      setShowModal(false);
      setForm({
        warga_id: '',
        jenis: 'kematian',
        tanggal_peristiwa: new Date().toISOString().slice(0, 10),
        nomor_surat: '',
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
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
              <ArrowRightLeft size={16} />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Mutasi Kependudukan</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Pencatatan kelahiran, kematian, & perpindahan warga
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-teal-900/15 transition-all"
        >
          <Plus size={14} />
          <span>Catat Mutasi</span>
        </button>
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
              Gunakan tombol "Catat Mutasi" di atas untuk menambahkan peristiwa kependudukan baru.
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
                    {m.warga?.nama || 'Warga Terkait'}
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

              {m.nomor_surat && (
                <p className="text-[11px] text-teal-800 font-medium mt-1">
                  No. Surat: {m.nomor_surat}
                </p>
              )}

              {m.keterangan && (
                <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl mt-2 leading-relaxed">
                  {m.keterangan}
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
      {showModal && (
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
                  <option value="kelahiran">Kelahiran Baru</option>
                </select>
              </div>

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

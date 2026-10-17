import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { X, UserPlus, Save, AlertCircle, Check } from 'lucide-react';

export default function WargaFormModal({ wargaToEdit, onClose, onSuccess }) {
  const isEdit = Boolean(wargaToEdit);

  const [form, setForm] = useState({
    nik: wargaToEdit?.nik || '',
    no_kk: wargaToEdit?.no_kk || '',
    nama: wargaToEdit?.nama || '',
    tempat_lahir: wargaToEdit?.tempat_lahir || '',
    tanggal_lahir: wargaToEdit?.tanggal_lahir || '',
    jenis_kelamin: wargaToEdit?.jenis_kelamin || 'Laki-laki',
    agama: wargaToEdit?.agama || 'Islam',
    pekerjaan: wargaToEdit?.pekerjaan || '',
    shdk: wargaToEdit?.shdk || 'Kepala Keluarga',
    dusun: wargaToEdit?.dusun || 'Sukamaju',
    rw: wargaToEdit?.rw || '01',
    rt: wargaToEdit?.rt || '01',
    alamat_detail: wargaToEdit?.alamat_detail || '',
    status_ekonomi: wargaToEdit?.status_ekonomi || 'mampu',
    status_kependudukan: wargaToEdit?.status_kependudukan || 'aktif',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.nik || form.nik.length < 16) {
      setErrorMsg('NIK harus 16 digit angka.');
      return;
    }
    if (!form.no_kk || form.no_kk.length < 16) {
      setErrorMsg('Nomor KK harus 16 digit angka.');
      return;
    }
    if (!form.nama) {
      setErrorMsg('Nama lengkap warga wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('warga')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', wargaToEdit.id);

        if (error) {
          // If offline or table error, update local cache
          const localList = JSON.parse(localStorage.getItem('cached_warga_local') || '[]');
          const idx = localList.findIndex((w) => w.id === wargaToEdit.id || w.nik === form.nik);
          if (idx >= 0) {
            localList[idx] = { ...localList[idx], ...form };
            localStorage.setItem('cached_warga_local', JSON.stringify(localList));
          }
        }
      } else {
        const { error } = await supabase.from('warga').insert([form]);
        if (error) {
          // If offline or table error, save to local cache
          const localList = JSON.parse(localStorage.getItem('cached_warga_local') || '[]');
          localList.unshift({ id: 'local-' + Date.now(), ...form });
          localStorage.setItem('cached_warga_local', JSON.stringify(localList));
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan data warga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">
                {isEdit ? 'Ubah Data Warga' : 'Tambah Warga Baru'}
              </h3>
              <p className="text-[11px] text-slate-500">Administrasi Data Master Kependudukan Desa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                NIK (Nomor Induk Kependudukan) *
              </label>
              <input
                type="text"
                name="nik"
                maxLength={16}
                value={form.nik}
                onChange={handleChange}
                required
                placeholder="320101xxxxxxxxxx"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Nomor Kartu Keluarga (KK) *
              </label>
              <input
                type="text"
                name="no_kk"
                maxLength={16}
                value={form.no_kk}
                onChange={handleChange}
                required
                placeholder="320101xxxxxxxxxx"
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap Sesuai KTP *</label>
            <input
              type="text"
              name="nama"
              value={form.nama}
              onChange={handleChange}
              required
              placeholder="Contoh: Bambang Sudarmono"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-teal-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tempat Lahir</label>
              <input
                type="text"
                name="tempat_lahir"
                value={form.tempat_lahir}
                onChange={handleChange}
                placeholder="Bandung"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                name="tanggal_lahir"
                value={form.tanggal_lahir}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                name="jenis_kelamin"
                value={form.jenis_kelamin}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Hubungan Keluarga (SHDK)</label>
              <select
                name="shdk"
                value={form.shdk}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
              >
                <option value="Kepala Keluarga">Kepala Keluarga</option>
                <option value="Suami">Suami</option>
                <option value="Istri">Istri</option>
                <option value="Anak">Anak</option>
                <option value="Mertua">Mertua</option>
                <option value="Orang Tua">Orang Tua</option>
                <option value="Famili Lain">Famili Lain</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Dusun</label>
              <input
                type="text"
                name="dusun"
                value={form.dusun}
                onChange={handleChange}
                required
                placeholder="Sukamaju"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">RW</label>
              <input
                type="text"
                name="rw"
                maxLength={2}
                value={form.rw}
                onChange={handleChange}
                required
                placeholder="01"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">RT</label>
              <input
                type="text"
                name="rt"
                maxLength={2}
                value={form.rt}
                onChange={handleChange}
                required
                placeholder="01"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Ekonomi</label>
              <select
                name="status_ekonomi"
                value={form.status_ekonomi}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
              >
                <option value="miskin">Miskin (Prasejahtera)</option>
                <option value="rentan">Rentan</option>
                <option value="mampu">Mampu</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Kependudukan</label>
              <select
                name="status_kependudukan"
                value={form.status_kependudukan}
                onChange={handleChange}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
              >
                <option value="aktif">Aktif</option>
                <option value="pindah">Pindah</option>
                <option value="meninggal">Meninggal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Detail / Jalan</label>
            <input
              type="text"
              name="alamat_detail"
              value={form.alamat_detail}
              onChange={handleChange}
              placeholder="Contoh: Jl. Melati No. 14 Kp. Babakan"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-teal-900/20 transition-all disabled:opacity-60"
            >
              <Save size={18} />
              <span>{loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Warga Sekarang'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

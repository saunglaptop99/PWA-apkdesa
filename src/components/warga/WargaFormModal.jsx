import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useDesa } from '../../context/DesaContext';
import {
  X,
  UserPlus,
  Save,
  AlertCircle,
  MapPin,
  Plus,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  User,
  Users,
  Briefcase,
  Home,
  HeartPulse,
  Baby,
} from 'lucide-react';

export default function WargaFormModal({ wargaToEdit, onClose, onSuccess }) {
  const isEdit = Boolean(wargaToEdit);
  const { getDusunOptions, getRwOptions, getRtOptions } = useDesa();

  // Active category step/tab: 1 | 2 | 3 | 4 | 5
  const [activeStep, setActiveStep] = useState(1);

  const [form, setForm] = useState({
    // Kategori 1: Identitas Dasar & Dokumen
    nik: wargaToEdit?.nik || '',
    no_kk: wargaToEdit?.no_kk || '',
    nama: wargaToEdit?.nama || '',
    tempat_lahir: wargaToEdit?.tempat_lahir || '',
    tanggal_lahir: wargaToEdit?.tanggal_lahir || '',
    jenis_kelamin: wargaToEdit?.jenis_kelamin || 'Laki-laki',
    golongan_darah: wargaToEdit?.golongan_darah || 'O',
    agama: wargaToEdit?.agama || 'Islam',
    no_akta_lahir: wargaToEdit?.no_akta_lahir || '',
    status_ktp: wargaToEdit?.status_ktp || 'Sudah KTP-el',

    // Kategori 2: Hubungan & Status Keluarga
    shdk: wargaToEdit?.shdk || 'Kepala Keluarga',
    status_perkawinan: wargaToEdit?.status_perkawinan || 'Kawin',
    no_akta_nikah_cerai: wargaToEdit?.no_akta_nikah_cerai || '',
    nama_ayah: wargaToEdit?.nama_ayah || '',
    nama_ibu: wargaToEdit?.nama_ibu || '',

    // Kategori 3: Pendidikan, Pekerjaan & Ekonomi
    pendidikan_terakhir: wargaToEdit?.pendidikan_terakhir || 'SMA/SMK/Sederajat',
    status_sekolah: wargaToEdit?.status_sekolah || 'Tidak / Sudah Lulus',
    pekerjaan: wargaToEdit?.pekerjaan || '',
    rentang_penghasilan: wargaToEdit?.rentang_penghasilan || 'Rp 1.000.000 - Rp 2.500.000',
    status_ekonomi: wargaToEdit?.status_ekonomi || 'mampu',
    bansos_pkh: wargaToEdit?.bansos_pkh || false,
    bansos_bpnt: wargaToEdit?.bansos_bpnt || false,
    bansos_blt_desa: wargaToEdit?.bansos_blt_desa || false,
    bpjs_pbi: wargaToEdit?.bpjs_pbi || false,

    // Kategori 4: Lokasi & Alamat Domisili
    dusun: wargaToEdit?.dusun || getDusunOptions()[0] || 'Sukamaju',
    rw: wargaToEdit?.rw ? String(wargaToEdit.rw).padStart(2, '0') : '01',
    rt: wargaToEdit?.rt ? String(wargaToEdit.rt).padStart(2, '0') : '01',
    alamat_detail: wargaToEdit?.alamat_detail || '',
    status_tempat_tinggal: wargaToEdit?.status_tempat_tinggal || 'Milik Sendiri',
    telepon: wargaToEdit?.telepon || '',
    status_domisili: wargaToEdit?.status_domisili || 'Penduduk Tetap',
    status_kependudukan: wargaToEdit?.status_kependudukan || 'aktif',

    // Kategori 5: Kondisi Khusus & Posyandu (Stunting)
    is_disabilitas: wargaToEdit?.is_disabilitas || false,
    jenis_disabilitas: wargaToEdit?.jenis_disabilitas || 'Tidak Ada',
    penyakit_kronis: wargaToEdit?.penyakit_kronis || 'Tidak Ada',
    status_kesehatan_khusus: wargaToEdit?.status_kesehatan_khusus || 'Normal',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [customWilayah, setCustomWilayah] = useState(false);

  const dusunOptions = getDusunOptions();
  const rwOptions = getRwOptions(form.dusun);
  const rtOptions = getRtOptions(form.dusun, form.rw);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDusunChange = (e) => {
    const newDusun = e.target.value;
    if (newDusun === '__custom__') {
      setCustomWilayah(true);
      return;
    }
    const availableRws = getRwOptions(newDusun);
    const newRw = availableRws[0] || '01';
    const availableRts = getRtOptions(newDusun, newRw);
    const newRt = availableRts[0] || '01';

    setForm((prev) => ({
      ...prev,
      dusun: newDusun,
      rw: newRw,
      rt: newRt,
    }));
  };

  const handleRwChange = (e) => {
    const newRw = e.target.value;
    const availableRts = getRtOptions(form.dusun, newRw);
    const newRt = availableRts[0] || '01';

    setForm((prev) => ({
      ...prev,
      rw: newRw,
      rt: newRt,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.nik || form.nik.length < 16) {
      setErrorMsg('NIK harus tepat 16 digit angka.');
      setActiveStep(1);
      return;
    }
    if (!form.no_kk || form.no_kk.length < 16) {
      setErrorMsg('Nomor KK harus tepat 16 digit angka.');
      setActiveStep(1);
      return;
    }
    if (!form.nama) {
      setErrorMsg('Nama lengkap warga wajib diisi.');
      setActiveStep(1);
      return;
    }

    setLoading(true);

    const payload = {
      ...form,
      rt: String(form.rt).padStart(2, '0'),
      rw: String(form.rw).padStart(2, '0'),
      updated_at: new Date().toISOString(),
    };

    try {
      if (isEdit) {
        // Coba simpan payload lengkap ke Supabase
        const { error } = await supabase
          .from('warga')
          .update(payload)
          .eq('id', wargaToEdit.id);

        if (error) {
          // Jika Supabase schema cache belum diperbarui (misal kolom baru belum dijalankan di SQL)
          // kirim kolom dasar terlebih dahulu agar Supabase tetap tersinkronisasi
          console.warn('DB update note:', error.message);
          const basePayload = {
            nik: payload.nik,
            no_kk: payload.no_kk,
            nama: payload.nama,
            tempat_lahir: payload.tempat_lahir,
            tanggal_lahir: payload.tanggal_lahir,
            jenis_kelamin: payload.jenis_kelamin,
            agama: payload.agama,
            pekerjaan: payload.pekerjaan,
            shdk: payload.shdk,
            dusun: payload.dusun,
            rw: payload.rw,
            rt: payload.rt,
            alamat_detail: payload.alamat_detail,
            status_kependudukan: payload.status_kependudukan,
            status_ekonomi: payload.status_ekonomi,
            updated_at: payload.updated_at,
          };
          await supabase.from('warga').update(basePayload).eq('id', wargaToEdit.id);
        }

        // Simpan selalu seluruh data 32 kolom ke local cache agar langsung tampil di UI
        const localList = JSON.parse(localStorage.getItem('cached_warga_desa') || '[]');
        const idx = localList.findIndex((w) => w.id === wargaToEdit.id || w.nik === form.nik);
        if (idx >= 0) {
          localList[idx] = { ...localList[idx], ...payload };
          localStorage.setItem('cached_warga_desa', JSON.stringify(localList));
        }
      } else {
        // Mode Tambah Baru
        const { error } = await supabase.from('warga').insert([payload]);
        if (error) {
          console.warn('DB insert note:', error.message);
          const basePayload = {
            nik: payload.nik,
            no_kk: payload.no_kk,
            nama: payload.nama,
            tempat_lahir: payload.tempat_lahir,
            tanggal_lahir: payload.tanggal_lahir,
            jenis_kelamin: payload.jenis_kelamin,
            agama: payload.agama,
            pekerjaan: payload.pekerjaan,
            shdk: payload.shdk,
            dusun: payload.dusun,
            rw: payload.rw,
            rt: payload.rt,
            alamat_detail: payload.alamat_detail,
            status_kependudukan: payload.status_kependudukan,
            status_ekonomi: payload.status_ekonomi,
            updated_at: payload.updated_at,
          };
          await supabase.from('warga').insert([basePayload]);
        }

        const localList = JSON.parse(localStorage.getItem('cached_warga_desa') || '[]');
        localList.unshift({ id: 'w-' + Date.now(), ...payload });
        localStorage.setItem('cached_warga_desa', JSON.stringify(localList));
      }

      // Beritahu seluruh tab / role via broadcast
      window.dispatchEvent(new Event('warga-updated'));
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
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                {isEdit ? 'Ubah Data Warga' : 'Pendaftaran Warga Baru'}
              </h3>
              <p className="text-[11px] text-slate-500">Standar SIAK & Sensus Kependudukan Desa</p>
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
          <div className="my-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 flex-shrink-0">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 5 Kategori Navigasi Tabs / Steps */}
        <div className="flex bg-slate-100 p-1 rounded-2xl my-3 text-[10px] font-bold text-slate-600 gap-1 overflow-x-auto no-scrollbar flex-shrink-0">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeStep === 1 ? 'bg-white text-teal-800 shadow-sm' : 'hover:text-slate-800'
            }`}
          >
            <User size={12} />
            <span>1. Identitas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeStep === 2 ? 'bg-white text-teal-800 shadow-sm' : 'hover:text-slate-800'
            }`}
          >
            <Users size={12} />
            <span>2. Keluarga</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(3)}
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeStep === 3 ? 'bg-white text-teal-800 shadow-sm' : 'hover:text-slate-800'
            }`}
          >
            <Briefcase size={12} />
            <span>3. Ekonomi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(4)}
            className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeStep === 4 ? 'bg-white text-teal-800 shadow-sm' : 'hover:text-slate-800'
            }`}
          >
            <Home size={12} />
            <span>4. Domisili</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(5)}
            className={`flex-1 min-w-[85px] py-1.5 px-2 rounded-xl flex items-center justify-center gap-1 transition-all whitespace-nowrap ${
              activeStep === 5 ? 'bg-white text-teal-800 shadow-sm' : 'hover:text-slate-800'
            }`}
          >
            <HeartPulse size={12} />
            <span>5. Khusus / Gizi</span>
          </button>
        </div>

        {/* Form Body Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs">
          {/* STEP 1: IDENTITAS DASAR & DOKUMEN KEPENDUDUKAN */}
          {activeStep === 1 && (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    placeholder="16 digit angka NIK"
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
                    placeholder="16 digit angka No. KK"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap Sesuai KTP/Akta *
                </label>
                <input
                  type="text"
                  name="nama"
                  value={form.nama}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: Bambang Sudarmono"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    name="tempat_lahir"
                    value={form.tempat_lahir}
                    onChange={handleChange}
                    placeholder="Contoh: Bandung"
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    name="tanggal_lahir"
                    value={form.tanggal_lahir}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    name="jenis_kelamin"
                    value={form.jenis_kelamin}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Gol. Darah</label>
                  <select
                    name="golongan_darah"
                    value={form.golongan_darah}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="O">O</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="Tidak Tahu">Tidak Tahu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Agama</label>
                  <select
                    name="agama"
                    value={form.agama}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen Protestan">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nomor Akta Kelahiran
                  </label>
                  <input
                    type="text"
                    name="no_akta_lahir"
                    value={form.no_akta_lahir}
                    onChange={handleChange}
                    placeholder="Contoh: 3201-LT-12031985-001"
                    className="w-full p-2 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Status Kepemilikan KTP-el
                  </label>
                  <select
                    name="status_ktp"
                    value={form.status_ktp}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Sudah KTP-el">Sudah Memiliki KTP-el</option>
                    <option value="Belum KTP-el">Belum Rekam KTP-el</option>
                    <option value="Belum Wajib KTP">Belum Wajib KTP (&lt; 17 Tahun)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: HUBUNGAN & STATUS KELUARGA */}
          {activeStep === 2 && (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Hubungan (SHDK)</label>
                  <select
                    name="shdk"
                    value={form.shdk}
                    onChange={handleChange}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Kepala Keluarga">Kepala Keluarga</option>
                    <option value="Istri">Istri</option>
                    <option value="Anak">Anak</option>
                    <option value="Famili Lain">Famili Lain</option>
                    <option value="Orang Tua">Orang Tua</option>
                    <option value="Mertua">Mertua</option>
                    <option value="Menantu">Menantu</option>
                    <option value="Cucu">Cucu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Perkawinan</label>
                  <select
                    name="status_perkawinan"
                    value={form.status_perkawinan}
                    onChange={handleChange}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Belum Kawin">Belum Kawin</option>
                    <option value="Kawin">Kawin Tercatat</option>
                    <option value="Kawin Belum Tercatat">Kawin Belum Tercatat (Siri)</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor Akta Nikah / Buku Nikah / Cerai (Jika Ada)
                </label>
                <input
                  type="text"
                  name="no_akta_nikah_cerai"
                  value={form.no_akta_nikah_cerai}
                  onChange={handleChange}
                  placeholder="Contoh: KUA.10.01/PW.01/123/2012"
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Lengkap Ayah Kandung
                  </label>
                  <input
                    type="text"
                    name="nama_ayah"
                    value={form.nama_ayah}
                    onChange={handleChange}
                    placeholder="Nama ayah kandung"
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Lengkap Ibu Kandung
                  </label>
                  <input
                    type="text"
                    name="nama_ibu"
                    value={form.nama_ibu}
                    onChange={handleChange}
                    placeholder="Nama ibu kandung"
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PENDIDIKAN, PEKERJAAN & EKONOMI */}
          {activeStep === 3 && (
            <div className="space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Pendidikan Terakhir</label>
                  <select
                    name="pendidikan_terakhir"
                    value={form.pendidikan_terakhir}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Tidak / Belum Sekolah">Tidak / Belum Sekolah</option>
                    <option value="SD / Sederajat">SD / Sederajat</option>
                    <option value="SMP / Sederajat">SMP / Sederajat</option>
                    <option value="SMA / SMK / Sederajat">SMA / SMK / Sederajat</option>
                    <option value="Diploma (D1 - D3)">Diploma (D1 - D3)</option>
                    <option value="Sarjana (S1 / D4)">Sarjana (S1 / D4)</option>
                    <option value="Magister (S2)">Magister (S2)</option>
                    <option value="Doktor (S3)">Doktor (S3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Sekolah Saat Ini</label>
                  <select
                    name="status_sekolah"
                    value={form.status_sekolah}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Tidak / Sudah Lulus">Tidak / Sudah Lulus</option>
                    <option value="Sedang Sekolah / Kuliah">Sedang Sekolah / Kuliah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Pekerjaan Utama</label>
                <input
                  type="text"
                  name="pekerjaan"
                  value={form.pekerjaan}
                  onChange={handleChange}
                  placeholder="Contoh: Petani, Pedagang, Wiraswasta, Buruh"
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Rentang Penghasilan</label>
                  <select
                    name="rentang_penghasilan"
                    value={form.rentang_penghasilan}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="< Rp 1.000.000">&lt; Rp 1.000.000</option>
                    <option value="Rp 1.000.000 - Rp 2.500.000">Rp 1.000.000 - Rp 2.500.000</option>
                    <option value="Rp 2.500.000 - Rp 5.000.000">Rp 2.500.000 - Rp 5.000.000</option>
                    <option value="> Rp 5.000.000">&gt; Rp 5.000.000</option>
                    <option value="Belum Berpenghasilan">Belum Berpenghasilan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Status Ekonomi Umum</label>
                  <select
                    name="status_ekonomi"
                    value={form.status_ekonomi}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="mampu">Mampu (Mandiri)</option>
                    <option value="rentan">Rentan (Prioritas Bantuan)</option>
                    <option value="miskin">Prasejahtera (Miskin)</option>
                  </select>
                </div>
              </div>

              {/* Checkboxes Kepesertaan Bansos */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-[10.5px] font-bold text-slate-700 block">
                  Kepesertaan Program Bantuan Sosial (Bansos Aktif)
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="bansos_pkh"
                      checked={form.bansos_pkh}
                      onChange={handleChange}
                      className="rounded text-teal-700 focus:ring-teal-600"
                    />
                    <span>PKH (Keluarga Harapan)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="bansos_bpnt"
                      checked={form.bansos_bpnt}
                      onChange={handleChange}
                      className="rounded text-teal-700 focus:ring-teal-600"
                    />
                    <span>BPNT (Sembako)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="bansos_blt_desa"
                      checked={form.bansos_blt_desa}
                      onChange={handleChange}
                      className="rounded text-teal-700 focus:ring-teal-600"
                    />
                    <span>BLT Dana Desa</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="bpjs_pbi"
                      checked={form.bpjs_pbi}
                      onChange={handleChange}
                      className="rounded text-teal-700 focus:ring-teal-600"
                    />
                    <span>BPJS Kesehatan PBI</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: LOKASI & ALAMAT DOMISILI */}
          {activeStep === 4 && (
            <div className="space-y-3 animate-fade-in">
              {/* DROPDOWN WILAYAH DUSUN, RW, RT (TARIK DARI DATABASE) */}
              <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-100/90 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1">
                    <MapPin size={13} className="text-teal-600" />
                    <span>Pilih Wilayah Domisili (Dropdown Database)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomWilayah(!customWilayah)}
                    className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold"
                  >
                    {customWilayah ? 'Pilih dari Dropdown' : '+ Input Manual'}
                  </button>
                </div>

                {!customWilayah ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Dusun *</label>
                      <select
                        name="dusun"
                        value={form.dusun}
                        onChange={handleDusunChange}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-600 outline-none"
                      >
                        {dusunOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">RW *</label>
                      <select
                        name="rw"
                        value={String(form.rw).padStart(2, '0')}
                        onChange={handleRwChange}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-center text-teal-800 focus:ring-2 focus:ring-teal-600 outline-none"
                      >
                        {rwOptions.map((r) => (
                          <option key={r} value={r}>
                            RW {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">RT *</label>
                      <select
                        name="rt"
                        value={String(form.rt).padStart(2, '0')}
                        onChange={handleChange}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-center text-teal-800 focus:ring-2 focus:ring-teal-600 outline-none"
                      >
                        {rtOptions.map((t) => (
                          <option key={t} value={t}>
                            RT {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 animate-fade-in">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Nama Dusun</label>
                      <input
                        type="text"
                        name="dusun"
                        value={form.dusun}
                        onChange={handleChange}
                        placeholder="Sukamaju"
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">No. RW</label>
                      <input
                        type="text"
                        name="rw"
                        value={form.rw}
                        onChange={handleChange}
                        placeholder="01"
                        maxLength={2}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs text-center font-bold text-teal-800 bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 mb-0.5">No. RT</label>
                      <input
                        type="text"
                        name="rt"
                        value={form.rt}
                        onChange={handleChange}
                        placeholder="01"
                        maxLength={2}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs text-center font-bold text-teal-800 bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Alamat Lengkap / Nama Jalan / No. Rumah
                </label>
                <textarea
                  name="alamat_detail"
                  rows={2}
                  value={form.alamat_detail}
                  onChange={handleChange}
                  placeholder="Contoh: Jl. Melati No. 12, Kp. Babakan RT 01"
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Status Rumah</label>
                  <select
                    name="status_tempat_tinggal"
                    value={form.status_tempat_tinggal}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Milik Sendiri">Milik Sendiri</option>
                    <option value="Sewa / Kontrak">Sewa / Kontrak</option>
                    <option value="Menumpang">Menumpang</option>
                    <option value="Rumah Dinas">Rumah Dinas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">No. WhatsApp</label>
                  <input
                    type="text"
                    name="telepon"
                    value={form.telepon}
                    onChange={handleChange}
                    placeholder="0812xxxxxxxx"
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Status Domisili</label>
                  <select
                    name="status_domisili"
                    value={form.status_domisili}
                    onChange={handleChange}
                    className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Penduduk Tetap">Penduduk Tetap</option>
                    <option value="Penduduk Sementara">Pendatang / Sementara</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: KONDISI KHUSUS, KERENTANAN & POSYANDU (STUNTING) */}
          {activeStep === 5 && (
            <div className="space-y-3 animate-fade-in">
              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                  <Baby size={14} className="text-rose-600" />
                  <span>Program Posyandu & Pencegahan Stunting</span>
                </span>

                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                    Status Kesehatan Khusus
                  </label>
                  <select
                    name="status_kesehatan_khusus"
                    value={form.status_kesehatan_khusus}
                    onChange={handleChange}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="Normal">Normal (Tidak Ada Kondisi Khusus)</option>
                    <option value="Balita (0-5 Tahun)">Balita / Baduta (0-5 Tahun) - Sasaran Timbang</option>
                    <option value="Ibu Hamil">Ibu Hamil (Bumil) - Sasaran Gizi</option>
                    <option value="Ibu Menyusui">Ibu Menyusui (Busui)</option>
                    <option value="Lansia Risti">Lansia Risiko Tinggi (&gt; 60 Tahun)</option>
                  </select>
                </div>
              </div>

              {/* Disabilitas */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-indigo-900 block">Penyandang Disabilitas</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Status Disabilitas</label>
                    <select
                      name="is_disabilitas"
                      value={form.is_disabilitas ? 'true' : 'false'}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          is_disabilitas: e.target.value === 'true',
                          jenis_disabilitas: e.target.value === 'true' ? form.jenis_disabilitas : 'Tidak Ada',
                        })
                      }
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                    >
                      <option value="false">Tidak Ada Disabilitas</option>
                      <option value="true">Penyandang Disabilitas</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Jenis Disabilitas</label>
                    <select
                      name="jenis_disabilitas"
                      disabled={!form.is_disabilitas}
                      value={form.jenis_disabilitas}
                      onChange={handleChange}
                      className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-teal-600 outline-none"
                    >
                      <option value="Tidak Ada">Tidak Ada</option>
                      <option value="Fisik">Disabilitas Fisik (Daksa)</option>
                      <option value="Sensorik">Sensorik (Netra / Rungu / Wicara)</option>
                      <option value="Intelektual">Disabilitas Intelektual</option>
                      <option value="Mental">Disabilitas Mental / Psikososial</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Penyakit Kronis */}
              <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-2xl space-y-1.5">
                <label className="block text-[11px] font-bold text-amber-900 mb-0.5">
                  Penyakit Kronis / Menahun
                </label>
                <select
                  name="penyakit_kronis"
                  value={form.penyakit_kronis}
                  onChange={handleChange}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-600 outline-none"
                >
                  <option value="Tidak Ada">Tidak Ada (Sehat)</option>
                  <option value="Hipertensi">Hipertensi (Darah Tinggi)</option>
                  <option value="Diabetes">Diabetes Melitus (Gula)</option>
                  <option value="Jantung">Penyakit Jantung</option>
                  <option value="TBC">Tuberkulosis (TBC)</option>
                  <option value="Asma">Asma / Saluran Pernafasan Kronis</option>
                  <option value="Stroke">Pasca Stroke</option>
                  <option value="Gagal Ginjal">Gagal Ginjal Kronis</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>
          )}

          {/* Navigasi Step & Tombol Simpan Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-shrink-0">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep((s) => s - 1)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1 transition-all"
              >
                <ChevronLeft size={14} />
                <span>Sebelumnya</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-xs"
              >
                Batal
              </button>
            )}

            <div className="flex items-center gap-1.5">
              {activeStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep((s) => s + 1)}
                  className="py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-md shadow-teal-900/15"
                >
                  <span>Lanjut (Tahap {activeStep + 1})</span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/20 disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{loading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Daftarkan Warga Sekarang'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDesa } from '../context/DesaContext';
import {
  Settings,
  Users,
  Building2,
  KeyRound,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Save,
  X,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminPanelPage() {
  const { aparatList, addAparat, updateAparat, deleteAparat, resetPinAparat } = useAuth();
  const { pengaturanDesa, updatePengaturanDesa, loading: desaLoading } = useDesa();

  const [activeTab, setActiveTab] = useState('desa'); // 'desa' | 'aparat'

  // Form Pengaturan Desa
  const [desaForm, setDesaForm] = useState({
    nama_desa: pengaturanDesa?.nama_desa || 'Sukamaju',
    nama_kecamatan: pengaturanDesa?.nama_kecamatan || 'Sukaraja',
    nama_kabupaten: pengaturanDesa?.nama_kabupaten || 'Bogor',
    nama_kepala_desa: pengaturanDesa?.nama_kepala_desa || 'H. Ahmad Dahlan, S.E.',
    alamat_kantor: pengaturanDesa?.alamat_kantor || 'Jl. Raya Desa Sukamaju No. 01',
    kontak_desa: pengaturanDesa?.kontak_desa || '0812-3456-7890',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modal Aparat Form
  const [showAparatModal, setShowAparatModal] = useState(false);
  const [editingAparat, setEditingAparat] = useState(null);
  const [aparatForm, setAparatForm] = useState({
    nama_lengkap: '',
    username: '',
    pin: '123456',
    role: 'rt',
    jabatan: '',
    wilayah_dusun: 'Sukamaju',
    wilayah_rw: '01',
    wilayah_rt: '01',
    telepon: '',
  });

  const [revealedPins, setRevealedPins] = useState({});

  const toggleRevealPin = (id) => {
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaveDesa = async (e) => {
    e.preventDefault();
    await updatePengaturanDesa(desaForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const openAddAparat = () => {
    setEditingAparat(null);
    setAparatForm({
      nama_lengkap: '',
      username: '',
      pin: '123456',
      role: 'rt',
      jabatan: '',
      wilayah_dusun: desaForm.nama_desa ? desaForm.nama_desa : 'Sukamaju',
      wilayah_rw: '01',
      wilayah_rt: '01',
      telepon: '',
    });
    setShowAparatModal(true);
  };

  const openEditAparat = (aparat) => {
    setEditingAparat(aparat);
    setAparatForm({
      nama_lengkap: aparat.nama_lengkap,
      username: aparat.username || '',
      pin: aparat.pin || '123456',
      role: aparat.role || 'rt',
      jabatan: aparat.jabatan || '',
      wilayah_dusun: aparat.wilayah_dusun || '',
      wilayah_rw: aparat.wilayah_rw || '',
      wilayah_rt: aparat.wilayah_rt || '',
      telepon: aparat.telepon || '',
    });
    setShowAparatModal(true);
  };

  const handleSaveAparat = async (e) => {
    e.preventDefault();
    if (!aparatForm.nama_lengkap) {
      alert('Nama lengkap aparat wajib diisi.');
      return;
    }

    if (editingAparat) {
      await updateAparat(editingAparat.id, aparatForm);
      alert('Data aparat berhasil diperbarui!');
    } else {
      const generatedUsername =
        aparatForm.username ||
        `${aparatForm.role}_${(aparatForm.wilayah_rt || aparatForm.wilayah_rw || 'desa')}`.toLowerCase();
      await addAparat({
        ...aparatForm,
        username: generatedUsername,
      });
      alert('Aparat baru berhasil ditambahkan! PIN login: ' + aparatForm.pin);
    }

    setShowAparatModal(false);
  };

  const handleDeleteAparat = async (id, nama) => {
    if (confirm(`Yakin ingin menghapus aparat "${nama}"? Akun ini tidak akan dapat login lagi.`)) {
      await deleteAparat(id);
    }
  };

  const handleQuickResetPin = async (id, nama) => {
    const newPin = prompt(`Masukkan 6 digit PIN baru untuk ${nama}:`, '123456');
    if (newPin && newPin.length === 6) {
      await resetPinAparat(id, newPin);
      alert(`PIN untuk ${nama} berhasil direset menjadi: ${newPin}`);
    } else if (newPin) {
      alert('PIN harus tepat 6 digit angka.');
    }
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800">
            <Settings size={16} />
          </div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Kelola Desa & Hak Akses</h2>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Pengaturan identitas desa & manajemen login PIN aparat kewilayahan
        </p>
      </div>

      {/* Tab Navigasi */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl mb-4 text-xs font-bold text-slate-600">
        <button
          onClick={() => setActiveTab('desa')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'desa'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          <Building2 size={14} />
          <span>Profil Desa</span>
        </button>
        <button
          onClick={() => setActiveTab('aparat')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'aparat'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          <KeyRound size={14} />
          <span>Aparat & PIN ({aparatList.length})</span>
        </button>
      </div>

      {/* TAB 1: PENGATURAN IDENTITAS DESA & KEPALA DESA */}
      {activeTab === 'desa' && (
        <div className="space-y-4">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <span>Pengaturan identitas desa dan kepala desa berhasil disimpan!</span>
            </div>
          )}

          <form onSubmit={handleSaveDesa} className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-sm space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Desa *</label>
              <input
                type="text"
                value={desaForm.nama_desa}
                onChange={(e) => setDesaForm({ ...desaForm, nama_desa: e.target.value })}
                required
                placeholder="Contoh: Sukamaju"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Kepala Desa *</label>
              <input
                type="text"
                value={desaForm.nama_kepala_desa}
                onChange={(e) => setDesaForm({ ...desaForm, nama_kepala_desa: e.target.value })}
                required
                placeholder="Contoh: H. Ahmad Dahlan, S.E."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-teal-800 focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kecamatan</label>
                <input
                  type="text"
                  value={desaForm.nama_kecamatan}
                  onChange={(e) => setDesaForm({ ...desaForm, nama_kecamatan: e.target.value })}
                  placeholder="Sukaraja"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kabupaten</label>
                <input
                  type="text"
                  value={desaForm.nama_kabupaten}
                  onChange={(e) => setDesaForm({ ...desaForm, nama_kabupaten: e.target.value })}
                  placeholder="Bogor"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Kantor Desa</label>
              <input
                type="text"
                value={desaForm.alamat_kantor}
                onChange={(e) => setDesaForm({ ...desaForm, alamat_kantor: e.target.value })}
                placeholder="Jl. Raya Desa No. 01"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Kontak Resmi Desa / WhatsApp</label>
              <input
                type="text"
                value={desaForm.kontak_desa}
                onChange={(e) => setDesaForm({ ...desaForm, kontak_desa: e.target.value })}
                placeholder="0812-3456-7890"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={desaLoading}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs sm:text-sm shadow-lg shadow-teal-900/15 transition-all disabled:opacity-60"
            >
              <Save size={16} />
              <span>Simpan Perubahan Identitas Desa</span>
            </button>
          </form>

          {/* Pratinjau Kop Surat Resmi */}
          <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Pratinjau Kop Dokumen Resmi:
            </span>
            <div className="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm text-center">
              <p className="text-[11px] font-bold uppercase text-slate-800">
                PEMERINTAH KABUPATEN {desaForm.nama_kabupaten || 'BOGOR'}
              </p>
              <p className="text-[10px] font-bold uppercase text-slate-700">
                KECAMATAN {desaForm.nama_kecamatan || 'SUKARAJA'} • DESA {desaForm.nama_desa || 'SUKAMAJU'}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">{desaForm.alamat_kantor || 'Alamat Kantor Desa'}</p>
              <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                Kepala Desa: <strong>{desaForm.nama_kepala_desa}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAJEMEN APARAT & LOGIN PIN */}
      {activeTab === 'aparat' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-slate-500">
              Hak login aparatur menggunakan <strong>6-Digit PIN</strong>
            </p>
            <button
              onClick={openAddAparat}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-teal-900/10 transition-all"
            >
              <Plus size={14} />
              <span>Tambah Aparat</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {aparatList.map((a) => {
              const isRevealed = Boolean(revealedPins[a.id]);
              return (
                <div
                  key={a.id}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{a.nama_lengkap}</h4>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                          {a.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{a.jabatan || 'Aparat Wilayah'}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10.5px] text-slate-600">
                        <MapPin size={11} className="text-teal-600 flex-shrink-0" />
                        <span>
                          {a.role === 'admin'
                            ? 'Akses Seluruh Desa'
                            : a.role === 'dusun'
                            ? `Dusun ${a.wilayah_dusun}`
                            : a.role === 'rw'
                            ? `RW ${a.wilayah_rw} (${a.wilayah_dusun})`
                            : `RT ${a.wilayah_rt} / RW ${a.wilayah_rw} (${a.wilayah_dusun})`}
                        </span>
                      </div>
                    </div>

                    {/* PIN Indicator */}
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
                        <Lock size={11} className="text-slate-400" />
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {isRevealed ? a.pin : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRevealPin(a.id)}
                          className="text-slate-400 hover:text-slate-600 ml-0.5"
                          title="Lihat PIN"
                        >
                          {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-400 font-mono">
                      User: <strong>{a.username}</strong>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickResetPin(a.id, a.nama_lengkap)}
                        className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10.5px] font-semibold flex items-center gap-1 transition-all"
                      >
                        <KeyRound size={11} />
                        <span>Ganti PIN</span>
                      </button>

                      <button
                        onClick={() => openEditAparat(a)}
                        className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-all"
                        title="Ubah Data"
                      >
                        <Edit2 size={13} />
                      </button>

                      {a.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteAparat(a.id, a.nama_lengkap)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Hapus Aparat"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / UBAH APARAT */}
      {showAparatModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    {editingAparat ? 'Ubah Akun Aparat' : 'Tambah Aparat & Hak Login PIN'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Konfigurasi wilayah & kode PIN login</p>
                </div>
              </div>
              <button
                onClick={() => setShowAparatModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAparat} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  value={aparatForm.nama_lengkap}
                  onChange={(e) => setAparatForm({ ...aparatForm, nama_lengkap: e.target.value })}
                  required
                  placeholder="Contoh: Bpk. Mulyadi"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Peran / Role *</label>
                  <select
                    value={aparatForm.role}
                    onChange={(e) => setAparatForm({ ...aparatForm, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="rt">Ketua RT</option>
                    <option value="rw">Ketua RW</option>
                    <option value="dusun">Kepala Dusun</option>
                    <option value="admin">Admin Desa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">PIN 6-Digit *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={aparatForm.pin}
                    onChange={(e) => setAparatForm({ ...aparatForm, pin: e.target.value.replace(/\D/g, '') })}
                    required
                    placeholder="123456"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-center tracking-widest text-xs sm:text-sm font-bold text-teal-800 focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Jabatan</label>
                <input
                  type="text"
                  value={aparatForm.jabatan}
                  onChange={(e) => setAparatForm({ ...aparatForm, jabatan: e.target.value })}
                  placeholder={
                    aparatForm.role === 'rt'
                      ? 'Ketua RT 02 / RW 01'
                      : aparatForm.role === 'rw'
                      ? 'Ketua RW 01'
                      : 'Kepala Dusun'
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Dusun</label>
                  <input
                    type="text"
                    value={aparatForm.wilayah_dusun}
                    onChange={(e) => setAparatForm({ ...aparatForm, wilayah_dusun: e.target.value })}
                    placeholder="Sukamaju"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">RW</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={aparatForm.wilayah_rw}
                    onChange={(e) => setAparatForm({ ...aparatForm, wilayah_rw: e.target.value })}
                    placeholder="01"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-center focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">RT</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={aparatForm.wilayah_rt}
                    onChange={(e) => setAparatForm({ ...aparatForm, wilayah_rt: e.target.value })}
                    placeholder="02"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-center focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Username / Kode Login</label>
                <input
                  type="text"
                  value={aparatForm.username}
                  onChange={(e) => setAparatForm({ ...aparatForm, username: e.target.value })}
                  placeholder="Contoh: rt02_01"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-teal-900/15 transition-all mt-2"
              >
                {editingAparat ? 'Simpan Perubahan' : 'Tambahkan Aparat Sekarang'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

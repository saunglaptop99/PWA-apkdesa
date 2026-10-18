import React, { useEffect, useState } from 'react';
import BrandPageHeader from '../components/common/BrandPageHeader';
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
  FolderTree,
  ChevronRight,
  Layers,
  Activity,
  RefreshCw,
  Clock3,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const wilayahSlug = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const makeAparatUsername = (role, wilayah) => {
  const dusun = wilayahSlug(wilayah.dusun);
  const rw = String(wilayah.rw || '').padStart(2, '0');
  const rt = String(wilayah.rt || '').padStart(2, '0');
  if (role === 'rt') return dusun && rw && rt ? `rt_${dusun}_${rw}_${rt}` : '';
  if (role === 'rw') return dusun && rw ? `rw_${dusun}_${rw}` : '';
  if (role === 'dusun') return dusun ? `kadus_${dusun}` : '';
  return '';
};

const auditActionLabel = (action) => ({
  INSERT: 'Data ditambahkan', UPDATE: 'Data diperbarui', DELETE: 'Data dihapus',
  APARAT_CREATE: 'Akun aparat dibuat', APARAT_UPDATE: 'Profil aparat diperbarui',
  APARAT_DELETE: 'Akun aparat dihapus', PIN_RESET: 'PIN aparat direset',
}[action] || action);

export default function AdminPanelPage() {
  const { aparatList, addAparat, updateAparat, deleteAparat } = useAuth();
  const {
    pengaturanDesa,
    updatePengaturanDesa,
    wilayahList,
    addWilayah,
    updateDusun,
    deleteDusun,
    deleteWilayah,
    getDusunOptions,
    getRwOptions,
    getRtOptions,
    loading: desaLoading,
  } = useDesa();

  const [activeTab, setActiveTab] = useState('aparat'); // 'aparat' | 'wilayah' | 'desa'

  // Form Pengaturan Desa
  const [desaForm, setDesaForm] = useState({
    nama_desa: pengaturanDesa?.nama_desa || '',
    nama_kecamatan: pengaturanDesa?.nama_kecamatan || '',
    nama_kabupaten: pengaturanDesa?.nama_kabupaten || '',
    nama_kepala_desa: pengaturanDesa?.nama_kepala_desa || '',
    alamat_kantor: pengaturanDesa?.alamat_kantor || '',
    kontak_desa: pengaturanDesa?.kontak_desa || '',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  useEffect(() => {
    if (activeTab !== 'aktivitas') return undefined;
    let mounted = true;
    const loadAuditLogs = async () => {
      setAuditLoading(true);
      const { data, error } = await supabase.from('audit_logs').select('id,actor_name,actor_role,action,entity,record_id,changed_fields,created_at').order('created_at', { ascending: false }).limit(100);
      if (!mounted) return;
      if (error) setAuditError(error.message);
      else { setAuditError(''); setAuditLogs(data || []); }
      setAuditLoading(false);
    };
    loadAuditLogs();
    const channel = supabase.channel('admin-audit-logs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, loadAuditLogs).subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [activeTab, auditRefreshKey]);

  // Modal Aparat Form
  const [showAparatModal, setShowAparatModal] = useState(false);
  const [editingAparat, setEditingAparat] = useState(null);

  const dusunList = getDusunOptions();
  const initialDusun = dusunList[0] || '';
  const initialRw = getRwOptions(initialDusun)[0] || '';
  const initialRt = getRtOptions(initialDusun, initialRw)[0] || '';

  const [aparatForm, setAparatForm] = useState({
    nama_lengkap: '',
    username: '',
    pin: '',
    role: 'rt',
    jabatan: '',
    wilayah_dusun: initialDusun,
    wilayah_rw: initialRw,
    wilayah_rt: initialRt,
    telepon: '',
  });


  // Modal Tambah Wilayah (Dusun / RW / RT)
  const [showWilayahModal, setShowWilayahModal] = useState(false);
  const [wilayahMode, setWilayahMode] = useState('dusun'); // 'dusun' | 'rw' | 'rt'
  const [newWilayahForm, setNewWilayahForm] = useState({
    dusun: '',
    rw: '01',
    rt: '01',
  });

  const rwList = getRwOptions(aparatForm.wilayah_dusun);
  const rtList = getRtOptions(aparatForm.wilayah_dusun, aparatForm.wilayah_rw);

  useEffect(() => {
    setDesaForm({
      nama_desa: pengaturanDesa?.nama_desa || '',
      nama_kecamatan: pengaturanDesa?.nama_kecamatan || '',
      nama_kabupaten: pengaturanDesa?.nama_kabupaten || '',
      nama_kepala_desa: pengaturanDesa?.nama_kepala_desa || '',
      alamat_kantor: pengaturanDesa?.alamat_kantor || '',
      kontak_desa: pengaturanDesa?.kontak_desa || '',
    });
  }, [pengaturanDesa]);

  const handleSaveDesa = async (e) => {
    e.preventDefault();
    try {
      await updatePengaturanDesa(desaForm);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      alert(error.message);
    }
  };

  const openAddAparat = () => {
    setEditingAparat(null);
    const d = dusunList[0] || '';
    const r = getRwOptions(d)[0] || '';
    const t = getRtOptions(d, r)[0] || '';
    setAparatForm({
      nama_lengkap: '',
      username: makeAparatUsername('rt', { dusun: d, rw: r, rt: t }),
      pin: '',
      role: 'rt',
      jabatan: `Ketua RT ${t} / RW ${r}`,
      wilayah_dusun: d,
      wilayah_rw: r,
      wilayah_rt: t,
      telepon: '',
    });
    setShowAparatModal(true);
  };

  const openEditAparat = (aparat) => {
    setEditingAparat(aparat);
    setAparatForm({
      nama_lengkap: aparat.nama_lengkap,
      username: aparat.username || '',
      pin: '',
      role: aparat.role || 'rt',
      jabatan: aparat.jabatan || '',
      wilayah_dusun: aparat.wilayah_dusun || initialDusun,
      wilayah_rw: aparat.wilayah_rw ? String(aparat.wilayah_rw).padStart(2, '0') : initialRw,
      wilayah_rt: aparat.wilayah_rt ? String(aparat.wilayah_rt).padStart(2, '0') : initialRt,
      telepon: aparat.telepon || '',
    });
    setShowAparatModal(true);
  };

  const handleRoleChange = (newRole) => {
    let newJabatan = aparatForm.jabatan;
    let newUsername = aparatForm.username;

    if (newRole === 'rt') {
      newJabatan = `Ketua RT ${aparatForm.wilayah_rt} / RW ${aparatForm.wilayah_rw}`;
      newUsername = makeAparatUsername('rt', { dusun: aparatForm.wilayah_dusun, rw: aparatForm.wilayah_rw, rt: aparatForm.wilayah_rt });
    } else if (newRole === 'rw') {
      newJabatan = `Ketua RW ${aparatForm.wilayah_rw}`;
      newUsername = makeAparatUsername('rw', { dusun: aparatForm.wilayah_dusun, rw: aparatForm.wilayah_rw });
    } else if (newRole === 'dusun') {
      newJabatan = `Kepala Dusun ${aparatForm.wilayah_dusun}`;
      newUsername = makeAparatUsername('dusun', { dusun: aparatForm.wilayah_dusun });
    } else if (newRole === 'admin') {
      newJabatan = `Administrator / Sekretaris Desa`;
      newUsername = `admin_${Math.floor(10 + Math.random() * 90)}`;
    }

    setAparatForm((prev) => ({
      ...prev,
      role: newRole,
      jabatan: newJabatan,
      username: newUsername,
    }));
  };

  const handleDusunChange = (newDusun) => {
    const rws = getRwOptions(newDusun);
    const newRw = rws[0] || '01';
    const rts = getRtOptions(newDusun, newRw);
    const newRt = rts[0] || '01';

    let newJabatan = aparatForm.jabatan;
    let newUsername = aparatForm.username;

    if (aparatForm.role === 'rt') {
      newJabatan = `Ketua RT ${newRt} / RW ${newRw}`;
      newUsername = makeAparatUsername('rt', { dusun: newDusun, rw: newRw, rt: newRt });
    } else if (aparatForm.role === 'rw') {
      newJabatan = `Ketua RW ${newRw}`;
      newUsername = makeAparatUsername('rw', { dusun: newDusun, rw: newRw });
    } else if (aparatForm.role === 'dusun') {
      newJabatan = `Kepala Dusun ${newDusun}`;
      newUsername = makeAparatUsername('dusun', { dusun: newDusun });
    }

    setAparatForm((prev) => ({
      ...prev,
      wilayah_dusun: newDusun,
      wilayah_rw: newRw,
      wilayah_rt: newRt,
      jabatan: newJabatan,
      username: newUsername,
    }));
  };

  const handleRwChange = (newRw) => {
    const rts = getRtOptions(aparatForm.wilayah_dusun, newRw);
    const newRt = rts[0] || '01';

    let newJabatan = aparatForm.jabatan;
    let newUsername = aparatForm.username;

    if (aparatForm.role === 'rt') {
      newJabatan = `Ketua RT ${newRt} / RW ${newRw}`;
      newUsername = makeAparatUsername('rt', { dusun: aparatForm.wilayah_dusun, rw: newRw, rt: newRt });
    } else if (aparatForm.role === 'rw') {
      newJabatan = `Ketua RW ${newRw}`;
      newUsername = makeAparatUsername('rw', { dusun: aparatForm.wilayah_dusun, rw: newRw });
    }

    setAparatForm((prev) => ({
      ...prev,
      wilayah_rw: newRw,
      wilayah_rt: newRt,
      jabatan: newJabatan,
      username: newUsername,
    }));
  };

  const handleRtChange = (newRt) => {
    let newJabatan = aparatForm.jabatan;
    let newUsername = aparatForm.username;

    if (aparatForm.role === 'rt') {
      newJabatan = `Ketua RT ${newRt} / RW ${aparatForm.wilayah_rw}`;
      newUsername = makeAparatUsername('rt', { dusun: aparatForm.wilayah_dusun, rw: aparatForm.wilayah_rw, rt: newRt });
    }

    setAparatForm((prev) => ({
      ...prev,
      wilayah_rt: newRt,
      jabatan: newJabatan,
      username: newUsername,
    }));
  };

  const handleSaveAparat = async (e) => {
    e.preventDefault();
    if (!aparatForm.nama_lengkap) {
      alert('Nama lengkap aparat wajib diisi.');
      return;
    }
    if ((!editingAparat || !editingAparat.user_id) && !/^\d{6}$/.test(aparatForm.pin)) {
      alert('Profil ini memerlukan PIN baru tepat 6 angka untuk diaktifkan.');
      return;
    }
    if (aparatForm.pin && !/^\d{6}$/.test(aparatForm.pin)) {
      alert('PIN harus tepat 6 angka.');
      return;
    }
    if (editingAparat && aparatForm.pin && !confirm(`Reset PIN untuk ${editingAparat.nama_lengkap}? PIN lama langsung tidak berlaku. Sampaikan PIN baru secara pribadi kepada aparat.`)) return;
    if (aparatForm.role !== 'admin' && (!aparatForm.wilayah_dusun || !aparatForm.wilayah_rw || (aparatForm.role === 'rt' && !aparatForm.wilayah_rt))) {
      alert('Atur master wilayah terlebih dahulu, lalu pilih dusun/RW/RT untuk aparat ini.');
      return;
    }

    const payload = {
      ...aparatForm,
      wilayah_rt: aparatForm.role === 'rt' ? String(aparatForm.wilayah_rt).padStart(2, '0') : null,
      wilayah_rw:
        aparatForm.role === 'rt' || aparatForm.role === 'rw'
          ? String(aparatForm.wilayah_rw).padStart(2, '0')
          : null,
      wilayah_dusun: aparatForm.role !== 'admin' ? aparatForm.wilayah_dusun : null,
    };

    try {
      if (editingAparat) await updateAparat(editingAparat.id, payload, aparatForm.pin);
      else await addAparat(payload, aparatForm.pin);
      alert(aparatForm.pin && editingAparat ? 'PIN aparat berhasil direset. PIN lama sudah diganti; sampaikan PIN baru secara pribadi.' : 'Akun aparat berhasil disimpan. Sampaikan PIN secara langsung kepada aparat tersebut.');
      setShowAparatModal(false);
    } catch (error) {
      alert(`Gagal menyimpan profil aparat: ${error.message}`);
    }
  };

  const handleDeleteAparat = async (id, nama) => {
    if (confirm(`Yakin ingin menghapus aparat "${nama}"? Akun ini tidak akan dapat login lagi.`)) {
      try { await deleteAparat(id); } catch (error) { alert(`Gagal menghapus profil aparat: ${error.message}`); }
    }
  };


  // Modal Edit Dusun
  const [showEditDusunModal, setShowEditDusunModal] = useState(false);
  const [editingDusunData, setEditingDusunData] = useState({ oldName: '', newName: '' });

  const openEditDusunModal = (dusunName) => {
    setEditingDusunData({ oldName: dusunName, newName: dusunName });
    setShowEditDusunModal(true);
  };

  const handleSaveEditDusun = async (e) => {
    e.preventDefault();
    if (!editingDusunData.newName.trim()) {
      alert('Nama Dusun tidak boleh kosong.');
      return;
    }
    try {
      await updateDusun(editingDusunData.oldName, editingDusunData.newName);
      alert(`Nama Dusun berhasil diubah dari "${editingDusunData.oldName}" menjadi "${editingDusunData.newName.trim()}".`);
      setShowEditDusunModal(false);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteDusun = async (dusunName) => {
    if (confirm(`Yakin ingin menghapus seluruh Dusun "${dusunName}" beserta seluruh RW dan RT di dalamnya?`)) {
      try { await deleteDusun(dusunName); } catch (error) { alert(error.message); }
    }
  };

  // Handler Tambah Wilayah Baru (Dusun / RW / RT)
  const openAddWilayahModal = (mode, defaultDusun = '', defaultRw = '') => {
    setWilayahMode(mode);
    setNewWilayahForm({
      dusun: defaultDusun || dusunList[0] || '',
      rw: defaultRw || '01',
      rt: '01',
    });
    setShowWilayahModal(true);
  };

  const handleSaveWilayah = async (e) => {
    e.preventDefault();
    if (!newWilayahForm.dusun) {
      alert('Nama Dusun wajib diisi.');
      return;
    }

    const formattedRw = String(newWilayahForm.rw).padStart(2, '0');
    const formattedRt = String(newWilayahForm.rt).padStart(2, '0');

    try {
      await addWilayah(newWilayahForm.dusun, formattedRw, formattedRt);
    } catch (error) {
      alert(error.message);
      return;
    }
    alert(`Wilayah Dusun ${newWilayahForm.dusun} - RW ${formattedRw} / RT ${formattedRt} berhasil disimpan!`);

    // Jika modal aparat sedang aktif, otomatis arahkan pilihan wilayah ke wilayah yang baru dibuat
    if (showAparatModal) {
      setAparatForm((prev) => ({
        ...prev,
        wilayah_dusun: newWilayahForm.dusun,
        wilayah_rw: formattedRw,
        wilayah_rt: formattedRt,
      }));
    }

    setShowWilayahModal(false);
  };

  const handleDeleteWilayahItem = async (dusun, rw, rt) => {
    if (confirm(`Hapus RT ${rt} / RW ${rw} di Dusun ${dusun}?`)) {
      try { await deleteWilayah(dusun, rw, rt); } catch (error) { alert(error.message); }
    }
  };

  // Group wilayahList by Dusun -> RW -> RT
  const groupedWilayah = {};
  wilayahList.forEach((item) => {
    if (!groupedWilayah[item.dusun]) {
      groupedWilayah[item.dusun] = {};
    }
    const rwKey = String(item.rw).padStart(2, '0');
    if (!groupedWilayah[item.dusun][rwKey]) {
      groupedWilayah[item.dusun][rwKey] = [];
    }
    const rtVal = String(item.rt).padStart(2, '0');
    if (!groupedWilayah[item.dusun][rwKey].includes(rtVal)) {
      groupedWilayah[item.dusun][rwKey].push(rtVal);
    }
  });

  return (
    <div className="app-page pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <BrandPageHeader title="Kelola Desa & Hak Akses" subtitle="Pengaturan desa, wilayah tugas, dan akun aparat" className="admin-topbar" />

      {/* Tab Navigasi 3 Pilihan */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl mb-3 text-[10px] sm:text-[11px] font-bold text-slate-600">
        <button
          onClick={() => setActiveTab('aparat')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1 transition-all ${
            activeTab === 'aparat'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          <KeyRound size={13} />
          <span>Aparat ({aparatList.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('wilayah')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1 transition-all ${
            activeTab === 'wilayah'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          <FolderTree size={13} />
          <span>Wilayah (RT/RW)</span>
        </button>
        <button
          onClick={() => setActiveTab('desa')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1 transition-all ${
            activeTab === 'desa'
              ? 'bg-white text-teal-800 shadow-sm'
              : 'hover:text-slate-800'
          }`}
        >
          <Building2 size={13} />
          <span>Profil Desa</span>
        </button>
        <button
          onClick={() => setActiveTab('aktivitas')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1 transition-all ${activeTab === 'aktivitas' ? 'bg-white text-teal-800 shadow-sm' : 'hover:text-slate-800'}`}
        >
          <Activity size={13} />
          <span>Aktivitas</span>
        </button>
      </div>

      {/* TAB 1: MANAJEMEN PROFIL APARAT */}
      {activeTab === 'aparat' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center gap-2 mb-1">
            <p className="text-[11px] text-slate-500 leading-snug">
              Akun dan wilayah akses aparat
            </p>
            <button
              onClick={openAddAparat}
              className="px-3 py-2 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all shrink-0"
            >
              <Plus size={14} />
              <span>Tambah Aparat</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {aparatList.map((a) => {
              return (
                <div
                  key={a.id}
                  className="bg-white px-3 py-2.5 rounded-xl border border-slate-200/90 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{a.nama_lengkap}</h4>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                          {a.role}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500 min-w-0">
                        <MapPin size={10} className="text-teal-600 flex-shrink-0" />
                        <span className="truncate">
                          {a.role === 'admin'
                            ? 'Akses Seluruh Desa'
                            : a.role === 'dusun'
                            ? `Dusun ${a.wilayah_dusun}`
                            : a.role === 'rw'
                            ? `RW ${a.wilayah_rw} (${a.wilayah_dusun})`
                            : `RT ${a.wilayah_rt} / RW ${a.wilayah_rw} · ${a.wilayah_dusun}`}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[9px] font-bold px-2 py-1 rounded-lg shrink-0 ${a.user_id ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {a.user_id ? 'Aktif' : 'Belum aktif'}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      <strong>{a.username || 'Aparat'}</strong>
                    </span>

                    <div className="flex items-center gap-1">
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

      {/* TAB 2: KELOLA WILAYAH (TAMBAH / EDIT DUSUN, RW, RT) */}
      {activeTab === 'wilayah' && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800">Struktur Wilayah</h3>
              <p className="text-[10px] text-slate-400">{Object.keys(groupedWilayah).length} dusun · pilih untuk melihat RW/RT</p>
            </div>
            <button
              onClick={() => openAddWilayahModal('dusun')}
              className="px-3 py-2 bg-teal-700 hover:bg-teal-800 active:scale-95 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all shrink-0"
            >
              <Plus size={14} />
              <span>Tambah Dusun</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {Object.keys(groupedWilayah).map((dusunName) => {
              const rwsInDusun = groupedWilayah[dusunName];
              return (
                <details key={dusunName} className="group bg-white rounded-xl border border-slate-200/90 shadow-sm">
                  <summary className="list-none cursor-pointer px-3 py-2.5 flex items-center gap-2 [&::-webkit-details-marker]:hidden">
                    <div className="p-1.5 rounded-lg bg-teal-50 text-teal-800 shrink-0"><MapPin size={14} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs truncate">Dusun {dusunName}</h4>
                        <span className="text-[9px] text-slate-400 shrink-0">{Object.keys(rwsInDusun).length} RW</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Ketuk untuk mengelola RT</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(event) => { event.preventDefault(); event.stopPropagation(); openAddWilayahModal('rw', dusunName); }}
                        className="px-2 py-1 rounded-lg bg-teal-50 text-teal-800 text-[10px] font-bold"
                      ><Plus size={11} className="inline" /> RW</button>
                      <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openEditDusunModal(dusunName); }} className="p-1 text-slate-400 hover:text-teal-700" title="Ubah nama dusun"><Edit2 size={13} /></button>
                      <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleDeleteDusun(dusunName); }} className="p-1 text-slate-400 hover:text-rose-600" title="Hapus dusun"><Trash2 size={13} /></button>
                    </div>
                  </summary>

                  <div className="px-3 pb-2.5 space-y-1.5">
                    {Object.keys(rwsInDusun).map((rwNumber) => {
                      const rtsInRw = rwsInDusun[rwNumber].sort();
                      return (
                        <div key={rwNumber} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700 font-mono shrink-0">RW {rwNumber}</span>
                          <div className="flex-1 flex flex-wrap gap-1">
                            {rtsInRw.map((rtNumber) => (
                              <span key={rtNumber} className="group/chip inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg text-[10px] font-mono text-slate-700">
                                RT {rtNumber}
                                <button type="button" onClick={() => handleDeleteWilayahItem(dusunName, rwNumber, rtNumber)} className="text-slate-300 hover:text-rose-600" title={`Hapus RT ${rtNumber}`}>×</button>
                              </span>
                            ))}
                          </div>
                          <button type="button" onClick={() => openAddWilayahModal('rt', dusunName, rwNumber)} className="text-[10px] text-teal-700 font-bold shrink-0"><Plus size={11} className="inline" /> RT</button>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'aktivitas' && (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div><h3 className="text-sm font-bold text-slate-800">Riwayat aktivitas admin</h3><p className="text-[10px] text-slate-500">Maksimal 100 aktivitas terbaru; perubahan nilai sensitif tidak dicatat.</p></div>
            <button type="button" onClick={() => setAuditRefreshKey((value) => value + 1)} aria-label="Muat ulang aktivitas" className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600"><RefreshCw size={14} /></button>
          </div>
          {auditError && <p role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">Gagal memuat audit log: {auditError}</p>}
          {auditLoading && auditLogs.length === 0 ? <p className="p-5 text-center text-xs text-slate-500">Memuat riwayat…</p> : auditLogs.length === 0 ? <div className="p-5 text-center rounded-xl border border-slate-200 bg-white text-xs text-slate-500">Belum ada aktivitas yang tercatat.</div> : auditLogs.map((entry) => (
            <article key={entry.id} className="px-3 py-2.5 rounded-xl bg-white border border-slate-200">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{auditActionLabel(entry.action)}</p><p className="mt-0.5 text-[10px] text-slate-500">{entry.actor_name} · {entry.actor_role || 'admin'} · {entry.entity}{entry.record_id ? ` · ${entry.record_id}` : ''}</p>{entry.changed_fields?.length > 0 && <p className="mt-1 text-[10px] text-slate-500">Kolom: {entry.changed_fields.join(', ')}</p>}</div><time className="shrink-0 text-[9px] text-slate-400 flex items-center gap-1"><Clock3 size={10} />{new Date(entry.created_at).toLocaleString('id-ID')}</time></div>
            </article>
          ))}
        </section>
      )}

      {/* TAB 3: PENGATURAN IDENTITAS DESA & KEPALA DESA */}
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
                  placeholder="Nama Kecamatan"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kabupaten</label>
                <input
                  type="text"
                  value={desaForm.nama_kabupaten}
                  onChange={(e) => setDesaForm({ ...desaForm, nama_kabupaten: e.target.value })}
                  placeholder="Bekasi"
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
                PEMERINTAH KABUPATEN {desaForm.nama_kabupaten?.replace(/^kabupaten\s+/i, '') || 'BEKASI'}
              </p>
              <p className="text-[10px] font-bold uppercase text-slate-700">
                KECAMATAN {desaForm.nama_kecamatan?.replace(/^kecamatan\s+/i, '') || '—'} • DESA {desaForm.nama_desa?.replace(/^desa\s+/i, '') || '—'}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">{desaForm.alamat_kantor || 'Alamat Kantor Desa'}</p>
              <div className="mt-2 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                Kepala Desa: <strong>{desaForm.nama_kepala_desa}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / UBAH APARAT (GAMBAR 1 DENGAN DROPDOWN DUSUN, RW, RT) */}
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
                    {editingAparat ? 'Ubah Akun Aparat' : 'Tambah Akun Aparat'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Akun login otomatis dibuat dan PIN diverifikasi server</p>
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

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">{editingAparat?.user_id ? 'Reset PIN (opsional)' : 'PIN Awal *'}</label>
                  <input type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" maxLength={6} value={aparatForm.pin} onChange={(e) => setAparatForm({ ...aparatForm, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })} required={!editingAparat?.user_id} placeholder="6 angka" className="w-full p-2.5 rounded-xl border border-slate-200 font-mono tracking-[0.4em] text-sm focus:ring-2 focus:ring-teal-600 outline-none" />
                  <p className="mt-1 text-[10px] text-slate-500">{editingAparat?.user_id ? 'Isi hanya jika aparat lupa atau perlu mengganti PIN. PIN lama tidak dapat dilihat dan akan langsung diganti.' : 'PIN harus unik untuk tiap aparat. Berikan secara pribadi.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Peran / Role *</label>
                  <select
                    value={aparatForm.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-600 outline-none"
                  >
                    <option value="rt">Ketua RT</option>
                    <option value="rw">Ketua RW</option>
                    <option value="dusun">Kepala Dusun</option>
                    <option value="admin">Admin Desa</option>
                  </select>
                </div>

              </div>

              {/* DROPDOWN WILAYAH DUSUN, RW, RT (TARIK DARI DATABASE) */}
              {aparatForm.role !== 'admin' ? (
                <div className="p-3 bg-teal-50/70 rounded-2xl border border-teal-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10.5px] font-bold text-teal-800 flex items-center gap-1">
                      <MapPin size={12} className="text-teal-600" />
                      <span>Pilih Wilayah Kewenangan</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddWilayahModal('dusun')}
                      className="text-[10px] font-bold text-teal-800 bg-teal-200/70 hover:bg-teal-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all"
                      title="Tambah Dusun, RW, atau RT Baru ke Database"
                    >
                      <Plus size={11} />
                      <span>+ Tambah Wilayah</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Dusun</label>
                      <select
                        value={aparatForm.wilayah_dusun}
                        onChange={(e) => handleDusunChange(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-600 outline-none"
                      >
                        <option value="">Pilih Dusun</option>
                        {dusunList.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">RW</label>
                      {aparatForm.role === 'dusun' ? (
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-400 text-xs text-center font-bold">Semua</div>
                      ) : (
                        <select
                          value={String(aparatForm.wilayah_rw).padStart(2, '0')}
                          onChange={(e) => handleRwChange(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-center text-teal-800 focus:ring-2 focus:ring-teal-600 outline-none"
                        >
                          <option value="">Pilih RW</option>
                          {rwList.map((r) => (
                            <option key={r} value={r}>
                              RW {r}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">RT</label>
                      {aparatForm.role === 'rt' ? (
                        <select
                          value={String(aparatForm.wilayah_rt).padStart(2, '0')}
                          onChange={(e) => handleRtChange(e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-200 text-xs bg-white font-bold text-center text-teal-800 focus:ring-2 focus:ring-teal-600 outline-none"
                        >
                          <option value="">Pilih RT</option>
                          {rtList.map((t) => (
                            <option key={t} value={t}>
                              RT {t}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-100 text-slate-400 text-xs text-center font-bold">Semua</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center font-medium">
                  Administrator memiliki hak akses ke seluruh wilayah Dusun, RW, dan RT.
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Jabatan</label>
                <input
                  type="text"
                  value={aparatForm.jabatan}
                  onChange={(e) => setAparatForm({ ...aparatForm, jabatan: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Username internal (opsional)</label>
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

      {/* MODAL TAMBAH WILAYAH BARU (DUSUN / RW / RT) */}
      {showWilayahModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    {wilayahMode === 'dusun'
                      ? 'Tambah Dusun Baru'
                      : wilayahMode === 'rw'
                      ? `Tambah RW Baru di Dusun ${newWilayahForm.dusun}`
                      : `Tambah RT Baru di RW ${newWilayahForm.rw} (${newWilayahForm.dusun})`}
                  </h3>
                  <p className="text-[11px] text-slate-500">Tersinkronisasi otomatis ke seluruh dropdown</p>
                </div>
              </div>
              <button
                onClick={() => setShowWilayahModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveWilayah} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Dusun *</label>
                <input
                  type="text"
                  value={newWilayahForm.dusun}
                  onChange={(e) => setNewWilayahForm({ ...newWilayahForm, dusun: e.target.value })}
                  required
                  placeholder="Contoh: Dusun Cempaka"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor RW *</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={newWilayahForm.rw}
                    onChange={(e) => setNewWilayahForm({ ...newWilayahForm, rw: e.target.value })}
                    required
                    placeholder="01"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-center font-bold text-teal-800 focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor RT *</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={newWilayahForm.rt}
                    onChange={(e) => setNewWilayahForm({ ...newWilayahForm, rt: e.target.value })}
                    required
                    placeholder="01"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-center font-bold text-teal-800 focus:ring-2 focus:ring-teal-600 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-teal-900/15 transition-all mt-2"
              >
                Simpan Wilayah ke Database
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UBAH / EDIT NAMA DUSUN */}
      {showEditDusunModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    Ubah Nama Dusun
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Mengubah nama Dusun "{editingDusunData.oldName}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditDusunModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditDusun} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Dusun Baru *
                </label>
                <input
                  type="text"
                  value={editingDusunData.newName}
                  onChange={(e) =>
                    setEditingDusunData({ ...editingDusunData, newName: e.target.value })
                  }
                  required
                  placeholder="Contoh: Dusun Sukamaju Baru"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-teal-600 outline-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                Perubahan nama Dusun ini akan otomatis disinkronkan ke seluruh data RW, RT, data warga, dan hak login aparat terkait.
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-teal-900/15 transition-all mt-2"
              >
                Simpan Perubahan Nama Dusun
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

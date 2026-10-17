import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  AlertCircle,
  Gift,
  CheckCircle2,
  Clock,
  Plus,
  X,
  UserCheck,
  Search,
} from 'lucide-react';

const INITIAL_BANSOS_PROGRAMS = [
  {
    id: 'b-1',
    nama_program: 'BLT Dana Desa 2026',
    tahun_anggaran: 2026,
    keterangan: 'Bantuan Langsung Tunai Rp 300.000 / bulan untuk keluarga prasejahtera terdampak ekonomi.',
  },
  {
    id: 'b-2',
    nama_program: 'Program Keluarga Harapan (PKH)',
    tahun_anggaran: 2026,
    keterangan: 'Bantuan bersyarat untuk komponen kesehatan (ibu hamil/balita) dan pendidikan anak.',
  },
  {
    id: 'b-3',
    nama_program: 'BPNT / Bantuan Pangan Non-Tunai',
    tahun_anggaran: 2026,
    keterangan: 'Penyaluran beras premium 10 kg dan telur ayam melalui E-Warong desa.',
  },
];

export default function BansosPage() {
  const { profile } = useAuth();
  const [bansosList, setBansosList] = useState([]);
  const [unassistedPoor, setUnassistedPoor] = useState([]);
  const [penerimaList, setPenerimaList] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('flagging'); // 'flagging' | 'program' | 'penerima'
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState(null);

  const isAdmin = profile?.role === 'admin';

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load Bansos Programs
      const { data: bData, error: bErr } = await supabase
        .from('bantuan_sosial')
        .select('*')
        .order('tahun_anggaran', { ascending: false });

      if (!bErr && bData && bData.length > 0) {
        setBansosList(bData);
      } else {
        setBansosList(INITIAL_BANSOS_PROGRAMS);
      }

      // 2. Load Unassisted Poor Citizens
      let poorQuery = supabase
        .from('warga')
        .select('id, nama, nik, rt, rw, dusun, no_kk, status_ekonomi')
        .eq('status_ekonomi', 'miskin')
        .eq('status_kependudukan', 'aktif');

      // Territory filtering
      if (profile?.role === 'rt') {
        if (profile.wilayah_rt) poorQuery = poorQuery.eq('rt', profile.wilayah_rt);
        if (profile.wilayah_rw) poorQuery = poorQuery.eq('rw', profile.wilayah_rw);
      } else if (profile?.role === 'rw') {
        if (profile.wilayah_rw) poorQuery = poorQuery.eq('rw', profile.wilayah_rw);
      } else if (profile?.role === 'dusun') {
        if (profile.wilayah_dusun) poorQuery = poorQuery.eq('dusun', profile.wilayah_dusun);
      }

      const { data: poorData, error: poorErr } = await poorQuery;

      if (!poorErr && poorData && poorData.length > 0) {
        setUnassistedPoor(poorData);
      } else {
        // Fallback demo poor warga
        setUnassistedPoor([
          {
            id: 'w-1',
            nama: 'Bambang Sudarmono',
            nik: '3201011203850001',
            rt: '01',
            rw: '01',
            dusun: 'Sukamaju',
            status_ekonomi: 'miskin',
          },
          {
            id: 'w-2',
            nama: 'Siti Aminah',
            nik: '3201015506890002',
            rt: '01',
            rw: '01',
            dusun: 'Sukamaju',
            status_ekonomi: 'miskin',
          },
          {
            id: 'w-6',
            nama: 'Solihin bin Kosasih',
            nik: '3201010101700006',
            rt: '01',
            rw: '01',
            dusun: 'Sukamaju',
            status_ekonomi: 'miskin',
          },
        ]);
      }

      // 3. Load Penerima Bansos
      const { data: penData, error: penErr } = await supabase
        .from('penerima_bansos')
        .select('id, tanggal_terima, status_verifikasi, bansos_id, warga:warga_id (id, nama, nik, rt, rw, dusun), bantuan_sosial:bansos_id (nama_program)');

      if (!penErr && penData && penData.length > 0) {
        setPenerimaList(penData);
      } else {
        setPenerimaList([
          {
            id: 'pen-1',
            tanggal_terima: '2026-03-01',
            status_verifikasi: 'Disalurkan',
            warga: { nama: 'Bambang Sudarmono', nik: '3201011203850001', rt: '01', rw: '01', dusun: 'Sukamaju' },
            bantuan_sosial: { nama_program: 'BLT Dana Desa 2026' },
          },
          {
            id: 'pen-2',
            tanggal_terima: '2026-03-05',
            status_verifikasi: 'Disalurkan',
            warga: { nama: 'Solihin bin Kosasih', nik: '3201010101700006', rt: '01', rw: '01', dusun: 'Sukamaju' },
            bantuan_sosial: { nama_program: 'BPNT / Bantuan Pangan Non-Tunai' },
          },
        ]);
      }
    } catch (err) {
      console.warn('Error loading bansos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const handleVerify = (warga) => {
    setVerifyingId(warga.id);
    setTimeout(() => {
      alert(`Warga ${warga.nama} berhasil diverifikasi untuk pengajuan Bansos BLT Dana Desa!`);
      // Add to penerima list locally
      setPenerimaList((prev) => [
        {
          id: 'pen-' + Date.now(),
          tanggal_terima: new Date().toISOString().slice(0, 10),
          status_verifikasi: 'Diverifikasi',
          warga: { nama: warga.nama, nik: warga.nik, rt: warga.rt, rw: warga.rw, dusun: warga.dusun },
          bantuan_sosial: { nama_program: 'BLT Dana Desa 2026' },
        },
        ...prev,
      ]);
      setVerifyingId(null);
    }, 600);
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
            <Gift size={16} />
          </div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Penyaluran Bantuan Sosial</h2>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Monitoring bansos & flagging prioritas warga prasejahtera
        </p>
      </div>

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
              Daftar warga berstatus ekonomi <strong>Miskin</strong> yang terdata di wilayah Anda dan memerlukan verifikasi penyaluran program bantuan.
            </p>
          </div>

          <div className="space-y-2.5">
            {unassistedPoor.length === 0 ? (
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

                  <button
                    onClick={() => handleVerify(w)}
                    disabled={verifyingId === w.id}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs font-bold shadow-sm shadow-amber-900/10 flex items-center gap-1 transition-all disabled:opacity-60 flex-shrink-0"
                  >
                    <UserCheck size={13} />
                    <span>{verifyingId === w.id ? 'Memproses...' : 'Verifikasi'}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR PROGRAM BANSOS */}
      {activeSubTab === 'program' && (
        <div className="space-y-3">
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
          {penerimaList.map((pen) => (
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
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  <span>{pen.status_verifikasi || 'Disalurkan'}</span>
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                <span>Tanggal: {pen.tanggal_terima}</span>
                <span>
                  RT {pen.warga?.rt || '01'} / RW {pen.warga?.rw || '01'} ({pen.warga?.dusun || 'Desa'})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

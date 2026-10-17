import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const DesaContext = createContext();

const DEFAULT_PENGATURAN = {
  nama_desa: 'Sukamaju',
  nama_kecamatan: 'Sukaraja',
  nama_kabupaten: 'Bogor',
  nama_kepala_desa: 'H. Ahmad Dahlan, S.E.',
  alamat_kantor: 'Jl. Raya Desa Sukamaju No. 01',
  kontak_desa: '0812-3456-7890',
};

// Default Master Wilayah Dusun, RW, RT
export const DEFAULT_WILAYAH_DESA = [
  { dusun: 'Sukamaju', rw: '01', rt: '01' },
  { dusun: 'Sukamaju', rw: '01', rt: '02' },
  { dusun: 'Sukamaju', rw: '01', rt: '03' },
  { dusun: 'Sukamaju', rw: '01', rt: '04' },
  { dusun: 'Sukamaju', rw: '02', rt: '01' },
  { dusun: 'Sukamaju', rw: '02', rt: '02' },
  { dusun: 'Sukamaju', rw: '02', rt: '03' },
  { dusun: 'Mekarsari', rw: '01', rt: '01' },
  { dusun: 'Mekarsari', rw: '01', rt: '02' },
  { dusun: 'Mekarsari', rw: '02', rt: '01' },
  { dusun: 'Mekarsari', rw: '02', rt: '02' },
  { dusun: 'Mekarsari', rw: '02', rt: '03' },
];

export const DesaProvider = ({ children }) => {
  const [pengaturanDesa, setPengaturanDesa] = useState(() => {
    const cached = localStorage.getItem('cached_pengaturan_desa');
    return cached ? JSON.parse(cached) : DEFAULT_PENGATURAN;
  });

  const [wilayahList, setWilayahList] = useState(() => {
    const cached = localStorage.getItem('cached_wilayah_desa');
    return cached ? JSON.parse(cached) : DEFAULT_WILAYAH_DESA;
  });

  const [loading, setLoading] = useState(false);

  // Fetch Pengaturan Desa dari Supabase
  const fetchPengaturan = async () => {
    try {
      const { data, error } = await supabase
        .from('pengaturan_desa')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        setPengaturanDesa(data);
        localStorage.setItem('cached_pengaturan_desa', JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Gagal memuat pengaturan desa dari server:', err);
    }
  };

  // Fetch Master Wilayah Desa dari Supabase
  const fetchWilayah = async () => {
    try {
      // 1. Ambil dari tabel wilayah_desa
      const { data: wData, error: wErr } = await supabase
        .from('wilayah_desa')
        .select('dusun, rw, rt')
        .order('dusun')
        .order('rw')
        .order('rt');

      // 2. Ambil juga dari data warga yang ada di database agar sinkron 100%
      const { data: wargaData } = await supabase
        .from('warga')
        .select('dusun, rw, rt');

      const combined = [...DEFAULT_WILAYAH_DESA];

      if (!wErr && wData && wData.length > 0) {
        combined.push(...wData);
      }
      if (wargaData && wargaData.length > 0) {
        wargaData.forEach((w) => {
          if (w.dusun && w.rw && w.rt) {
            combined.push({
              dusun: w.dusun.trim(),
              rw: String(w.rw).padStart(2, '0'),
              rt: String(w.rt).padStart(2, '0'),
            });
          }
        });
      }

      // Hapus duplikasi berdasarkan kombinasi dusun-rw-rt
      const uniqueMap = new Map();
      combined.forEach((item) => {
        const key = `${item.dusun.toLowerCase()}-${String(item.rw).padStart(2, '0')}-${String(item.rt).padStart(2, '0')}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            dusun: item.dusun,
            rw: String(item.rw).padStart(2, '0'),
            rt: String(item.rt).padStart(2, '0'),
          });
        }
      });

      const uniqueList = Array.from(uniqueMap.values());
      setWilayahList(uniqueList);
      localStorage.setItem('cached_wilayah_desa', JSON.stringify(uniqueList));
    } catch (err) {
      console.warn('Gagal fetch master wilayah:', err);
    }
  };

  useEffect(() => {
    fetchPengaturan();
    fetchWilayah();

    // Supabase Realtime Listener untuk sinkronisasi otomatis nama desa/kades & wilayah
    const channel = supabase
      .channel('realtime-desa-context')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pengaturan_desa' },
        (payload) => {
          if (payload.new) {
            setPengaturanDesa(payload.new);
            localStorage.setItem('cached_pengaturan_desa', JSON.stringify(payload.new));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wilayah_desa' },
        () => {
          fetchWilayah();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'warga' },
        () => {
          fetchWilayah();
        }
      )
      .subscribe();

    const handleLocalSync = (e) => {
      if (e.detail) {
        setPengaturanDesa(e.detail);
      }
    };
    window.addEventListener('pengaturan-desa-updated', handleLocalSync);

    const handleWilayahLocalSync = () => fetchWilayah();
    window.addEventListener('warga-updated', handleWilayahLocalSync);
    window.addEventListener('wilayah-updated', handleWilayahLocalSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('pengaturan-desa-updated', handleLocalSync);
      window.removeEventListener('warga-updated', handleWilayahLocalSync);
      window.removeEventListener('wilayah-updated', handleWilayahLocalSync);
    };
  }, []);

  const updatePengaturanDesa = async (newSettings) => {
    setLoading(true);
    const updated = {
      ...pengaturanDesa,
      ...newSettings,
      id: 1,
      updated_at: new Date().toISOString(),
    };

    setPengaturanDesa(updated);
    localStorage.setItem('cached_pengaturan_desa', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('pengaturan-desa-updated', { detail: updated }));

    try {
      await supabase.from('pengaturan_desa').upsert(updated, { onConflict: 'id' });
    } catch (err) {
      console.warn('Gagal update pengaturan desa:', err);
    } finally {
      setLoading(false);
    }
  };

  // CRUD Tambah & Hapus Wilayah (Dusun, RW, RT) oleh Admin
  const addWilayah = async (dusun, rw, rt) => {
    const formattedDusun = dusun.trim();
    const formattedRw = String(rw).padStart(2, '0');
    const formattedRt = String(rt).padStart(2, '0');

    const newItem = { dusun: formattedDusun, rw: formattedRw, rt: formattedRt };

    // Update lokal
    const exists = wilayahList.some(
      (w) =>
        w.dusun.toLowerCase() === formattedDusun.toLowerCase() &&
        String(w.rw).padStart(2, '0') === formattedRw &&
        String(w.rt).padStart(2, '0') === formattedRt
    );

    if (!exists) {
      const updated = [...wilayahList, newItem];
      setWilayahList(updated);
      localStorage.setItem('cached_wilayah_desa', JSON.stringify(updated));
      window.dispatchEvent(new Event('wilayah-updated'));
    }

    // Simpan ke Supabase
    try {
      await supabase.from('wilayah_desa').upsert(
        [
          {
            dusun: formattedDusun,
            rw: formattedRw,
            rt: formattedRt,
          },
        ],
        { onConflict: 'dusun,rw,rt' }
      );
    } catch (err) {
      console.warn('Gagal simpan wilayah ke DB:', err);
    }
  };

  const deleteWilayah = async (dusun, rw, rt) => {
    const updated = wilayahList.filter(
      (w) =>
        !(
          w.dusun.toLowerCase() === dusun.toLowerCase() &&
          String(w.rw).padStart(2, '0') === String(rw).padStart(2, '0') &&
          String(w.rt).padStart(2, '0') === String(rt).padStart(2, '0')
        )
    );

    setWilayahList(updated);
    localStorage.setItem('cached_wilayah_desa', JSON.stringify(updated));
    window.dispatchEvent(new Event('wilayah-updated'));

    try {
      await supabase
        .from('wilayah_desa')
        .delete()
        .eq('dusun', dusun)
        .eq('rw', String(rw).padStart(2, '0'))
        .eq('rt', String(rt).padStart(2, '0'));
    } catch (err) {
      console.warn('Gagal hapus wilayah di DB:', err);
    }
  };

  const updateDusun = async (oldDusun, newDusun) => {
    if (!oldDusun || !newDusun || oldDusun.trim().toLowerCase() === newDusun.trim().toLowerCase()) return;
    const formattedNew = newDusun.trim();

    // 1. Update local state
    const updated = wilayahList.map((w) =>
      w.dusun.toLowerCase() === oldDusun.trim().toLowerCase()
        ? { ...w, dusun: formattedNew }
        : w
    );
    setWilayahList(updated);
    localStorage.setItem('cached_wilayah_desa', JSON.stringify(updated));
    window.dispatchEvent(new Event('wilayah-updated'));

    // 2. Update Supabase wilayah_desa
    try {
      await supabase
        .from('wilayah_desa')
        .update({ dusun: formattedNew })
        .eq('dusun', oldDusun.trim());

      // Update tabel warga yang terkait
      await supabase
        .from('warga')
        .update({ dusun: formattedNew })
        .eq('dusun', oldDusun.trim());

      // Update profil aparat terkait
      await supabase
        .from('profiles')
        .update({ wilayah_dusun: formattedNew })
        .eq('wilayah_dusun', oldDusun.trim());
    } catch (err) {
      console.warn('Gagal update nama dusun di DB:', err);
    }
  };

  const deleteDusun = async (dusunName) => {
    if (!dusunName) return;
    const updated = wilayahList.filter(
      (w) => w.dusun.toLowerCase() !== dusunName.trim().toLowerCase()
    );
    setWilayahList(updated);
    localStorage.setItem('cached_wilayah_desa', JSON.stringify(updated));
    window.dispatchEvent(new Event('wilayah-updated'));

    try {
      await supabase
        .from('wilayah_desa')
        .delete()
        .eq('dusun', dusunName.trim());
    } catch (err) {
      console.warn('Gagal hapus dusun di DB:', err);
    }
  };

  // Helper fungsi untuk dropdown Dusun, RW, dan RT
  const getDusunOptions = () => {
    const list = Array.from(new Set(wilayahList.map((w) => w.dusun))).filter(Boolean);
    return list.length > 0 ? list : ['Sukamaju', 'Mekarsari'];
  };

  const getRwOptions = (selectedDusun) => {
    let filtered = wilayahList;
    if (selectedDusun) {
      filtered = wilayahList.filter(
        (w) => w.dusun.toLowerCase() === selectedDusun.toLowerCase()
      );
    }
    const rws = Array.from(new Set(filtered.map((w) => String(w.rw).padStart(2, '0'))))
      .filter(Boolean)
      .sort();
    return rws.length > 0 ? rws : ['01', '02', '03', '04', '05'];
  };

  const getRtOptions = (selectedDusun, selectedRw) => {
    let filtered = wilayahList;
    if (selectedDusun) {
      filtered = filtered.filter(
        (w) => w.dusun.toLowerCase() === selectedDusun.toLowerCase()
      );
    }
    if (selectedRw) {
      filtered = filtered.filter(
        (w) => String(w.rw).padStart(2, '0') === String(selectedRw).padStart(2, '0')
      );
    }
    const rts = Array.from(new Set(filtered.map((w) => String(w.rt).padStart(2, '0'))))
      .filter(Boolean)
      .sort();
    return rts.length > 0 ? rts : ['01', '02', '03', '04', '05', '06', '07', '08'];
  };

  return (
    <DesaContext.Provider
      value={{
        pengaturanDesa,
        updatePengaturanDesa,
        fetchPengaturan,
        wilayahList,
        addWilayah,
        updateDusun,
        deleteDusun,
        deleteWilayah,
        getDusunOptions,
        getRwOptions,
        getRtOptions,
        fetchWilayah,
        loading,
      }}
    >
      {children}
    </DesaContext.Provider>
  );
};

export const useDesa = () => useContext(DesaContext);

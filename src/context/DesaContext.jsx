import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const DesaContext = createContext();

const DEFAULT_PENGATURAN = {
  nama_desa: '',
  nama_kecamatan: '',
  nama_kabupaten: '',
  nama_kepala_desa: '',
  alamat_kantor: '',
  kontak_desa: '',
};

export const DEFAULT_WILAYAH_DESA = [];

const readLocalJson = (key, fallback) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return fallback;
    const parsed = JSON.parse(cached);
    if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : fallback;
    if (fallback && typeof fallback === 'object') return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
    return parsed;
  } catch {
    return fallback;
  }
};

const writeLocalJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Cache lokal tidak dapat diperbarui:', error);
  }
};

export const DesaProvider = ({ children }) => {
  const [pengaturanDesa, setPengaturanDesa] = useState(() => {
    return readLocalJson('cached_pengaturan_desa', DEFAULT_PENGATURAN);
  });

  const [wilayahList, setWilayahList] = useState(() => {
    return readLocalJson('cached_wilayah_desa', DEFAULT_WILAYAH_DESA);
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
        writeLocalJson('cached_pengaturan_desa', data);
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
      const { data: wargaData, error: wargaError } = await supabase
        .from('warga')
        .select('dusun, rw, rt');

      // Keep the last known list when both server sources are unavailable. This
      // prevents a transient/network or RLS error from erasing cached dropdowns.
      if (wErr && wargaError) {
        console.warn('Gagal memuat master wilayah dan data warga:', wErr.message, wargaError.message);
        return;
      }

      const combined = [];

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
        if (!item.dusun || !item.rw || !item.rt) return;
        const dusun = String(item.dusun).trim();
        const rw = String(item.rw).padStart(2, '0');
        const rt = String(item.rt).padStart(2, '0');
        const key = `${dusun.toLowerCase()}-${rw}-${rt}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            dusun,
            rw,
            rt,
          });
        }
      });

      const uniqueList = Array.from(uniqueMap.values()).sort((a, b) =>
        a.dusun.localeCompare(b.dusun, 'id') || a.rw.localeCompare(b.rw, 'id') || a.rt.localeCompare(b.rt, 'id')
      );
      setWilayahList(uniqueList);
      writeLocalJson('cached_wilayah_desa', uniqueList);
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
            writeLocalJson('cached_pengaturan_desa', payload.new);
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

    try {
      const { error } = await supabase.from('pengaturan_desa').upsert(updated, { onConflict: 'id' });
      if (error) throw error;
      setPengaturanDesa(updated);
      writeLocalJson('cached_pengaturan_desa', updated);
      window.dispatchEvent(new CustomEvent('pengaturan-desa-updated', { detail: updated }));
    } catch (err) {
      throw new Error(`Gagal menyimpan pengaturan desa ke server: ${err.message}`);
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

    const exists = wilayahList.some(
      (w) =>
        w.dusun.toLowerCase() === formattedDusun.toLowerCase() &&
        String(w.rw).padStart(2, '0') === formattedRw &&
        String(w.rt).padStart(2, '0') === formattedRt
    );

    try {
      const { error } = await supabase.from('wilayah_desa').upsert(
        [
          {
            dusun: formattedDusun,
            rw: formattedRw,
            rt: formattedRt,
          },
        ],
        { onConflict: 'dusun,rw,rt' }
      );
      if (error) throw error;
      if (!exists) {
        const updated = [...wilayahList, newItem];
        setWilayahList(updated);
        writeLocalJson('cached_wilayah_desa', updated);
      }
      // Notify all forms in this tab immediately; the database change also
      // propagates to other sessions through the Realtime subscription.
      window.dispatchEvent(new Event('wilayah-updated'));
    } catch (err) {
      throw new Error(`Gagal menyimpan wilayah ke server: ${err.message}`);
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

    try {
      const { error } = await supabase.rpc('delete_wilayah', {
        p_dusun: dusun.trim(),
        p_rw: String(rw).padStart(2, '0'),
        p_rt: String(rt).padStart(2, '0'),
      });
      if (error) throw error;
      setWilayahList(updated);
      writeLocalJson('cached_wilayah_desa', updated);
      window.dispatchEvent(new Event('wilayah-updated'));
    } catch (err) {
      throw new Error(`Gagal menghapus wilayah dari server: ${err.message}`);
    }
  };

  const updateDusun = async (oldDusun, newDusun) => {
    if (!oldDusun || !newDusun || oldDusun.trim().toLowerCase() === newDusun.trim().toLowerCase()) return;
    const formattedNew = newDusun.trim();

    try {
      const { error } = await supabase.rpc('rename_dusun', {
        p_old_dusun: oldDusun.trim(),
        p_new_dusun: formattedNew,
      });
      if (error) throw error;

      const updated = wilayahList.map((w) =>
        w.dusun.toLowerCase() === oldDusun.trim().toLowerCase()
          ? { ...w, dusun: formattedNew }
          : w
      );
      setWilayahList(updated);
      writeLocalJson('cached_wilayah_desa', updated);
      window.dispatchEvent(new Event('wilayah-updated'));
    } catch (err) {
      throw new Error(`Gagal mengganti nama dusun di server: ${err.message}`);
    }
  };

  const deleteDusun = async (dusunName) => {
    if (!dusunName) return;
    const updated = wilayahList.filter(
      (w) => w.dusun.toLowerCase() !== dusunName.trim().toLowerCase()
    );

    try {
      const { error } = await supabase.rpc('delete_dusun', { p_dusun: dusunName.trim() });
      if (error) throw error;
      setWilayahList(updated);
      writeLocalJson('cached_wilayah_desa', updated);
      window.dispatchEvent(new Event('wilayah-updated'));
    } catch (err) {
      throw new Error(`Gagal menghapus dusun dari server: ${err.message}`);
    }
  };

  // Helper fungsi untuk dropdown Dusun, RW, dan RT
  const getDusunOptions = () => {
    const list = Array.from(new Set(wilayahList.map((w) => w.dusun))).filter(Boolean);
    return list;
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
    return rws;
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
    return rts;
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

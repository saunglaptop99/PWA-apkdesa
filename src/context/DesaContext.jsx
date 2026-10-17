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

export const DesaProvider = ({ children }) => {
  const [pengaturanDesa, setPengaturanDesa] = useState(() => {
    const cached = localStorage.getItem('cached_pengaturan_desa');
    return cached ? JSON.parse(cached) : DEFAULT_PENGATURAN;
  });
  const [loading, setLoading] = useState(false);

  // Fetch from Supabase
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
      console.warn('Gagal memuat pengaturan desa dari server, menggunakan cache:', err);
    }
  };

  useEffect(() => {
    fetchPengaturan();

    // Setup Supabase Realtime Listener untuk sinkronisasi otomatis nama desa/kades
    const channel = supabase
      .channel('realtime-pengaturan-desa')
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
      .subscribe();

    // Local broadcast listener untuk multi-tab instant sync
    const handleLocalSync = (e) => {
      if (e.detail) {
        setPengaturanDesa(e.detail);
      }
    };
    window.addEventListener('pengaturan-desa-updated', handleLocalSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('pengaturan-desa-updated', handleLocalSync);
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

    // Update state & cache seketika
    setPengaturanDesa(updated);
    localStorage.setItem('cached_pengaturan_desa', JSON.stringify(updated));

    // Broadcast lokal
    window.dispatchEvent(new CustomEvent('pengaturan-desa-updated', { detail: updated }));

    try {
      // Upsert ke Supabase
      const { error } = await supabase
        .from('pengaturan_desa')
        .upsert(updated, { onConflict: 'id' });

      if (error) {
        console.warn('Catatan DB (offline/belum migrasi):', error.message);
      }
    } catch (err) {
      console.warn('Gagal sync ke server Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DesaContext.Provider
      value={{
        pengaturanDesa,
        updatePengaturanDesa,
        fetchPengaturan,
        loading,
      }}
    >
      {children}
    </DesaContext.Provider>
  );
};

export const useDesa = () => useContext(DesaContext);

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

// Pre-seeded aparat accounts with 6-digit PIN (Default: 123456)
export const DEFAULT_APARAT_LIST = [
  {
    id: 'aparat-admin',
    username: 'admin',
    pin: '123456',
    nama_lengkap: 'Bpk. Suryanto, S.Sos',
    jabatan: 'Sekretaris Desa / Admin',
    role: 'admin',
    wilayah_dusun: null,
    wilayah_rw: null,
    wilayah_rt: null,
    telepon: '0812-3456-7800',
  },
  {
    id: 'aparat-kadus-1',
    username: 'kadus1',
    pin: '123456',
    nama_lengkap: 'Bpk. Ahmad Fauzi',
    jabatan: 'Kepala Dusun Sukamaju',
    role: 'dusun',
    wilayah_dusun: 'Sukamaju',
    wilayah_rw: null,
    wilayah_rt: null,
    telepon: '0812-3456-7801',
  },
  {
    id: 'aparat-rw-01',
    username: 'rw01',
    pin: '123456',
    nama_lengkap: 'Bpk. Dedi Supardi',
    jabatan: 'Ketua RW 01',
    role: 'rw',
    wilayah_dusun: 'Sukamaju',
    wilayah_rw: '01',
    wilayah_rt: null,
    telepon: '0812-3456-7802',
  },
  {
    id: 'aparat-rt-01-01',
    username: 'rt01_01',
    pin: '123456',
    nama_lengkap: 'Bpk. Mulyadi',
    jabatan: 'Ketua RT 01 / RW 01',
    role: 'rt',
    wilayah_dusun: 'Sukamaju',
    wilayah_rw: '01',
    wilayah_rt: '01',
    telepon: '0812-3456-7803',
  },
  {
    id: 'aparat-rt-02-01',
    username: 'rt02_01',
    pin: '123456',
    nama_lengkap: 'Bpk. Ridwan Kamiludin',
    jabatan: 'Ketua RT 02 / RW 01',
    role: 'rt',
    wilayah_dusun: 'Sukamaju',
    wilayah_rw: '01',
    wilayah_rt: '02',
    telepon: '0812-3456-7804',
  },
  {
    id: 'aparat-rt-01-02',
    username: 'rt01_02',
    pin: '123456',
    nama_lengkap: 'Bpk. Cecep Hidayat',
    jabatan: 'Ketua RT 01 / RW 02',
    role: 'rt',
    wilayah_dusun: 'Mekarsari',
    wilayah_rw: '02',
    wilayah_rt: '01',
    telepon: '0812-3456-7805',
  },
];

export const DEMO_PROFILES = DEFAULT_APARAT_LIST;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [aparatList, setAparatList] = useState(() => {
    const cached = localStorage.getItem('cached_aparat_list');
    return cached ? JSON.parse(cached) : DEFAULT_APARAT_LIST;
  });
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Sync aparat list from Supabase
  const fetchAparatList = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true });

      if (!error && data && data.length > 0) {
        setAparatList(data);
        localStorage.setItem('cached_aparat_list', JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Gagal fetch profiles dari Supabase, pakai cache:', e);
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial load
    fetchAparatList();

    // Check saved session in localStorage
    const savedSession = localStorage.getItem('sim_aparat_active_profile');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setUser({ id: parsed.id, username: parsed.username });
        setProfile(parsed);
        setIsDemoMode(true);
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('sim_aparat_active_profile');
      }
    } else {
      // Check Supabase session if using email
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      });
    }

    // Realtime listener for profiles changes
    const profilesChannel = supabase
      .channel('realtime-profiles-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          fetchAparatList();
        }
      )
      .subscribe();

    const handleAparatLocalSync = () => {
      const cached = localStorage.getItem('cached_aparat_list');
      if (cached) setAparatList(JSON.parse(cached));
    };
    window.addEventListener('aparat-list-updated', handleAparatLocalSync);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('aparat-list-updated', handleAparatLocalSync);
      supabase.removeChannel(profilesChannel);
    };
  }, []);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
        localStorage.setItem('cached_profile', JSON.stringify(data));
      } else {
        const cached = localStorage.getItem('cached_profile');
        if (cached) setProfile(JSON.parse(cached));
      }
    } catch {
      const cached = localStorage.getItem('cached_profile');
      if (cached) setProfile(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  // Login Cepat Menggunakan 6 Digit PIN
  const loginWithPin = async (aparatIdOrUsername, pin) => {
    setLoading(true);
    try {
      // 1. Cek di daftar aparat lokal/cache terlebih dahulu
      const target = aparatList.find(
        (a) =>
          (a.id === aparatIdOrUsername || a.username === aparatIdOrUsername) &&
          String(a.pin) === String(pin)
      );

      if (target) {
        setProfile(target);
        setUser({ id: target.id, username: target.username });
        setIsDemoMode(true);
        localStorage.setItem('sim_aparat_active_profile', JSON.stringify(target));
        setLoading(false);
        return { success: true, profile: target };
      }

      // 2. Cek ke Supabase jika ada di cloud
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${aparatIdOrUsername},username.eq.${aparatIdOrUsername}`)
        .eq('pin', pin)
        .single();

      if (!error && data) {
        setProfile(data);
        setUser({ id: data.id, username: data.username });
        setIsDemoMode(true);
        localStorage.setItem('sim_aparat_active_profile', JSON.stringify(data));
        setLoading(false);
        return { success: true, profile: data };
      }

      setLoading(false);
      return { success: false, message: 'PIN salah atau akun aparat tidak ditemukan!' };
    } catch (err) {
      setLoading(false);
      return { success: false, message: err.message || 'Gagal memverifikasi PIN.' };
    }
  };

  // CRUD Aparat Desa (Khusus Admin)
  const addAparat = async (newAparat) => {
    const formatted = {
      id: 'aparat-' + Date.now(),
      username: newAparat.username.toLowerCase().replace(/\s+/g, '_'),
      pin: newAparat.pin || '123456',
      nama_lengkap: newAparat.nama_lengkap,
      jabatan: newAparat.jabatan || `Aparat ${newAparat.role.toUpperCase()}`,
      role: newAparat.role,
      wilayah_dusun: newAparat.wilayah_dusun || null,
      wilayah_rw: newAparat.wilayah_rw || null,
      wilayah_rt: newAparat.wilayah_rt || null,
      telepon: newAparat.telepon || '',
      created_at: new Date().toISOString(),
    };

    const updated = [...aparatList, formatted];
    setAparatList(updated);
    localStorage.setItem('cached_aparat_list', JSON.stringify(updated));
    window.dispatchEvent(new Event('aparat-list-updated'));

    try {
      await supabase.from('profiles').insert([formatted]);
    } catch (e) {
      console.warn('Gagal simpan aparat ke server Supabase:', e);
    }
    return formatted;
  };

  const updateAparat = async (id, updatedFields) => {
    const updated = aparatList.map((a) => {
      if (a.id === id) {
        return { ...a, ...updatedFields, updated_at: new Date().toISOString() };
      }
      return a;
    });

    setAparatList(updated);
    localStorage.setItem('cached_aparat_list', JSON.stringify(updated));
    window.dispatchEvent(new Event('aparat-list-updated'));

    // Jika yang diupdate adalah profil yang sedang login
    if (profile?.id === id) {
      const activeProf = { ...profile, ...updatedFields };
      setProfile(activeProf);
      localStorage.setItem('sim_aparat_active_profile', JSON.stringify(activeProf));
    }

    try {
      await supabase.from('profiles').update(updatedFields).eq('id', id);
    } catch (e) {
      console.warn('Gagal update aparat di server:', e);
    }
  };

  const deleteAparat = async (id) => {
    const updated = aparatList.filter((a) => a.id !== id);
    setAparatList(updated);
    localStorage.setItem('cached_aparat_list', JSON.stringify(updated));
    window.dispatchEvent(new Event('aparat-list-updated'));

    try {
      await supabase.from('profiles').delete().eq('id', id);
    } catch (e) {
      console.warn('Gagal hapus aparat di server:', e);
    }
  };

  const resetPinAparat = async (id, newPin = '123456') => {
    await updateAparat(id, { pin: newPin });
  };

  const loginDemo = (demoProf) => {
    localStorage.setItem('sim_aparat_active_profile', JSON.stringify(demoProf));
    setUser({ id: demoProf.id, username: demoProf.username });
    setProfile(demoProf);
    setIsDemoMode(true);
  };

  const logout = async () => {
    localStorage.removeItem('cached_profile');
    localStorage.removeItem('sim_aparat_active_profile');
    setIsDemoMode(false);
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        aparatList,
        loading,
        isOnline,
        isDemoMode,
        loginWithPin,
        addAparat,
        updateAparat,
        deleteAparat,
        resetPinAparat,
        fetchProfile,
        fetchAparatList,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

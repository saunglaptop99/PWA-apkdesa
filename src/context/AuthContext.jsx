import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

// Default demo profiles for rapid testing & offline previews
export const DEMO_PROFILES = [
  {
    id: 'demo-admin-uuid',
    email: 'admin@desa.id',
    nama_lengkap: 'Bpk. Suryanto, S.Sos (Sekretaris Desa)',
    role: 'admin',
    wilayah_dusun: null,
    wilayah_rw: null,
    wilayah_rt: null,
  },
  {
    id: 'demo-dusun-uuid',
    email: 'kadus1@desa.id',
    nama_lengkap: 'Bpk. Ahmad Fauzi (Kepala Dusun Sukamaju)',
    role: 'dusun',
    wilayah_dusun: 'Sukamaju',
    wilayah_rw: null,
    wilayah_rt: null,
  },
  {
    id: 'demo-rw-uuid',
    email: 'rw01@desa.id',
    nama_lengkap: 'Bpk. Dedi Supardi (Ketua RW 01)',
    role: 'rw',
    wilayah_dusun: 'Sukamaju',
    wilayah_rw: '01',
    wilayah_rt: null,
  },
  {
    id: 'demo-rt-uuid',
    email: 'rt01@desa.id',
    nama_lengkap: 'Bpk. Mulyadi (Ketua RT 01 / RW 01)',
    role: 'rt',
    wilayah_dusun: 'Sukamaju',
    wilayah_rw: '01',
    wilayah_rt: '01',
  },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check demo session first
    const savedDemo = localStorage.getItem('sim_aparat_demo_profile');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setUser({ id: parsed.id, email: parsed.email });
        setProfile(parsed);
        setIsDemoMode(true);
        setLoading(false);
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      } catch (e) {
        localStorage.removeItem('sim_aparat_demo_profile');
      }
    }

    // Get current Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else if (!localStorage.getItem('sim_aparat_demo_profile')) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      authListener?.subscription?.unsubscribe();
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
        // Fallback to cache if network fails or table offline
        const cached = localStorage.getItem('cached_profile');
        if (cached) {
          setProfile(JSON.parse(cached));
        } else {
          // If profile table doesn't have the record yet, synthesize a default profile
          const defaultProf = {
            id: userId,
            nama_lengkap: user?.email ? user.email.split('@')[0] : 'Aparat Desa',
            role: 'rt',
            wilayah_dusun: 'Sukamaju',
            wilayah_rw: '01',
            wilayah_rt: '01',
          };
          setProfile(defaultProf);
          localStorage.setItem('cached_profile', JSON.stringify(defaultProf));
        }
      }
    } catch {
      const cached = localStorage.getItem('cached_profile');
      if (cached) setProfile(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  const loginDemo = (demoProf) => {
    localStorage.setItem('sim_aparat_demo_profile', JSON.stringify(demoProf));
    setUser({ id: demoProf.id, email: demoProf.email });
    setProfile(demoProf);
    setIsDemoMode(true);
  };

  const logout = async () => {
    localStorage.removeItem('cached_profile');
    localStorage.removeItem('sim_aparat_demo_profile');
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
        loading,
        isOnline,
        isDemoMode,
        fetchProfile,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { clearUserCache } from '../lib/userCache';

const AuthContext = createContext();
const PROFILE_FIELDS = 'id,user_id,username,nama_lengkap,role,jabatan,telepon,wilayah_dusun,wilayah_rw,wilayah_rt';
const cacheKey = (name, userId) => `${name}:${userId}`;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [aparatList, setAparatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const logout = useCallback(async () => {
    const userId = user?.id;
    try { await supabase.auth.signOut({ scope: 'local' }); } catch (error) { console.warn('Sesi lokal tidak dapat dicabut dari server:', error); }
    setUser(null);
    setProfile(null);
    setAparatList([]);
    if (userId) {
      try {
        localStorage.removeItem(cacheKey('profile', userId));
        localStorage.removeItem(`sim-last-active:${userId}`);
        localStorage.removeItem(`sim-session-start:${userId}`);
      } catch { /* Browser storage may be disabled. */ }
      clearUserCache(userId);
    }
    for (const key of ['cached_warga_desa', 'cached_warga_local', 'cached_mutasi', 'cached_aparat_list', 'cached_profile', 'sim_aparat_active_profile']) {
      try { localStorage.removeItem(key); } catch { /* Browser storage may be disabled. */ }
    }
  }, [user?.id]);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setAparatList([]);
      setLoading(false);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .eq('user_id', userId)
        .single();
      if (error) throw error;
      setProfile(data);
      try {
        localStorage.setItem(cacheKey('profile', userId), JSON.stringify(data));
      } catch (cacheError) {
        console.warn('Profil berhasil dimuat, tetapi cache lokal tidak dapat diperbarui:', cacheError);
      }

      if (data.role === 'admin') {
        const { data: people, error: listError } = await supabase
          .from('profiles')
          .select(PROFILE_FIELDS)
          .order('nama_lengkap');
        if (listError) throw listError;
        setAparatList(people || []);
      } else {
        setAparatList([data]);
      }
      return data;
    } catch (error) {
      // Offline access is limited to the signed-in user's own last known role.
      let ownProfile = null;
      try {
        const cached = localStorage.getItem(cacheKey('profile', userId));
        ownProfile = cached ? JSON.parse(cached) : null;
      } catch {
        try { localStorage.removeItem(cacheKey('profile', userId)); } catch { /* Local storage may be disabled by the browser. */ }
      }
      const safeProfile = navigator.onLine ? null : ownProfile;
      setProfile(safeProfile);
      setAparatList(safeProfile ? [safeProfile] : []);
      if (navigator.onLine) console.error('Gagal memuat profil aparat:', error.message);
      return safeProfile;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAparatList = useCallback(async () => {
    if (!user || profile?.role !== 'admin') return [];
    const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).order('nama_lengkap');
    if (error) throw error;
    setAparatList(data || []);
    return data || [];
  }, [user, profile?.role]);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);

    let active = true;
    const applySession = async (session) => {
      if (!active) return;
      setUser(session?.user || null);
      if (session?.user) {
        const currentProfile = await fetchProfile(session.user.id);
        if (!currentProfile) {
          setUser(null);
          await supabase.auth.signOut();
        }
      }
      else {
        setProfile(null);
        setAparatList([]);
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session));
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        const timestamp = String(Date.now());
        try {
          localStorage.setItem(`sim-session-start:${session.user.id}`, timestamp);
          localStorage.setItem(`sim-last-active:${session.user.id}`, timestamp);
        } catch { /* Session setup can continue without browser storage. */ }
      }
      // Defer database work so Supabase's auth callback can finish first.
      setTimeout(() => applySession(session), 0);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [fetchProfile]);

  useEffect(() => {
    if (!user || !profile) return undefined;
    const channel = supabase
      .channel(`profile-sync-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async (payload) => {
        if (profile.role === 'admin' || payload.new?.user_id === user.id || payload.old?.user_id === user.id) {
          await fetchProfile(user.id);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id, profile?.id, profile?.role, fetchProfile]);

  useEffect(() => {
    if (!user?.id || !profile) return undefined;
    const id = user.id;
    const activeKey = `sim-last-active:${id}`;
    const startedKey = `sim-session-start:${id}`;
    const now = Date.now();
    try {
      if (!localStorage.getItem(startedKey)) localStorage.setItem(startedKey, String(now));
      if (!localStorage.getItem(activeKey)) localStorage.setItem(activeKey, String(now));
    } catch { /* Session still expires in memory if storage is unavailable. */ }
    let lastWrite = 0;
    let memoryStartedAt = now;
    let memoryLastActiveAt = now;
    let expiring = false;
    const readTime = (key, fallback) => {
      try {
        const value = Number(localStorage.getItem(key));
        return Number.isFinite(value) && value > 0 ? value : fallback;
      } catch { return fallback; }
    };
    const expireIfNeeded = () => {
      const current = Date.now();
      const started = readTime(startedKey, memoryStartedAt);
      const lastActive = readTime(activeKey, memoryLastActiveAt);
      if (current - started >= SESSION_MAX_AGE_MS || current - lastActive >= IDLE_TIMEOUT_MS) {
        if (expiring) return true;
        expiring = true;
        try { sessionStorage.setItem('sim-session-expired', '1'); } catch { /* Optional UX notice only. */ }
        void logout();
        return true;
      }
      return false;
    };
    const markActivity = () => {
      const current = Date.now();
      if (expireIfNeeded()) return;
      if (current - lastWrite < 15000) return;
      lastWrite = current;
      memoryLastActiveAt = current;
      try { localStorage.setItem(activeKey, String(current)); } catch { /* Ignore local storage failures. */ }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !expireIfNeeded()) markActivity();
    };
    const timer = window.setInterval(expireIfNeeded, 15000);
    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    window.addEventListener('storage', expireIfNeeded);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      window.removeEventListener('storage', expireIfNeeded);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id, profile?.id, logout]);

  const loginWithPin = async (pin) => {
    const { data, error } = await supabase.functions.invoke('pin-login', { body: { pin } });
    if (error) {
      // FunctionsHttpError keeps the Edge Function response on `context`.
      // Surface its safe, user-facing message instead of masking every 4xx/5xx
      // response as an invalid PIN. Never include the submitted PIN in logs/UI.
      try {
        const response = error.context;
        const body = response && typeof response.clone === 'function'
          ? await response.clone().json()
          : null;
        if (typeof body?.message === 'string' && body.message.trim()) {
          return { success: false, message: body.message };
        }
      } catch { /* Fall back to a generic connectivity/service message. */ }
      return { success: false, message: 'Layanan login tidak dapat dihubungi. Periksa koneksi atau coba lagi beberapa saat.' };
    }
    if (!data?.token_hash) return { success: false, message: data?.message || 'Layanan login memberi respons yang tidak lengkap. Hubungi admin desa.' };
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
    if (authError) return { success: false, message: 'Login gagal diselesaikan. Coba lagi atau hubungi admin.' };
    const accountProfile = await fetchProfile(authData.user.id);
    if (!accountProfile) {
      await supabase.auth.signOut();
      return { success: false, message: 'Akun ini belum ditautkan ke profil aparat. Hubungi admin desa.' };
    }
    return { success: true, profile: accountProfile };
  };

  const saveAparat = async (newProfile, pin, id) => {
    const { data, error } = await supabase.functions.invoke('manage-aparat', {
      body: { profile: newProfile, pin: pin || undefined, id: id || undefined },
    });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Gagal menyimpan aparat.');
    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_user_id: user?.id,
      actor_name: profile?.nama_lengkap || 'Admin',
      actor_role: profile?.role || 'admin',
      action: !id ? 'APARAT_CREATE' : pin ? 'PIN_RESET' : 'APARAT_UPDATE',
      entity: 'profiles',
      record_id: String(id || newProfile.username || 'akun-baru'),
      changed_fields: !id ? ['akun_aparat'] : pin ? ['pin'] : ['profil_aparat'],
    });
    if (auditError) console.warn('Akun tersimpan, tetapi audit log gagal dicatat:', auditError.message);
    await fetchAparatList();
    if (id && profile?.id === id) await fetchProfile(user.id);
    return data;
  };

  const updateAparat = (id, fields, pin) => saveAparat(fields, pin, id);
  const addAparat = (newProfile, pin) => saveAparat(newProfile, pin);

  const deleteAparat = async (id) => {
    const { data, error } = await supabase.functions.invoke('manage-aparat', { body: { action: 'delete', id } });
    if (error || data?.error) throw new Error(data?.error || error?.message || 'Gagal menghapus aparat.');
    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_user_id: user?.id,
      actor_name: profile?.nama_lengkap || 'Admin',
      actor_role: profile?.role || 'admin',
      action: 'APARAT_DELETE',
      entity: 'profiles',
      record_id: String(id),
      changed_fields: ['akun_aparat'],
    });
    if (auditError) console.warn('Akun terhapus, tetapi audit log gagal dicatat:', auditError.message);
    await fetchAparatList();
  };

  return (
    <AuthContext.Provider value={{ user, profile, aparatList, loading, isOnline, loginWithPin, updateAparat, addAparat, saveAparat, deleteAparat, fetchProfile, fetchAparatList, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const readUserCache = (userId, name, fallback = []) => {
  if (!userId) return fallback;
  try {
    const value = localStorage.getItem(`sim-cache:${userId}:${name}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const writeUserCache = (userId, name, value) => {
  if (!userId) return;
  try {
    localStorage.setItem(`sim-cache:${userId}:${name}`, JSON.stringify(value));
  } catch (error) {
    console.warn('Penyimpanan offline penuh atau tidak tersedia:', error);
  }
};

const norm = (value) => String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
export const filterByProfileScope = (rows, profile) => {
  if (!profile?.role) return [];
  if (profile.role === 'admin') return rows;
  if (!['dusun', 'rw', 'rt'].includes(profile.role)) return [];
  return rows.filter((row) => {
    if (norm(row.dusun) !== norm(profile.wilayah_dusun)) return false;
    if (['rw', 'rt'].includes(profile.role) && norm(row.rw) !== norm(profile.wilayah_rw)) return false;
    if (profile.role === 'rt' && norm(row.rt) !== norm(profile.wilayah_rt)) return false;
    return true;
  });
};

export const clearUserCache = (userId) => {
  if (!userId) return;
  const prefix = `sim-cache:${userId}:`;
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(prefix)) localStorage.removeItem(key);
  }
  localStorage.removeItem(`profile:${userId}`);
};

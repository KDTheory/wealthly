// Tiny localStorage wrapper used for client-side UI prefs only (theme,
// active-member selection, recurring overrides, column mappings). Real data
// lives on the server. Keep this dependency-free so it can be used from
// hooks, utils, or React components without circular imports.

export const storage = {
  async get(key, defaultValue = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : defaultValue;
    } catch { return defaultValue; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error('Storage error:', e); return false; }
  },
  async delete(key) {
    try { localStorage.removeItem(key); return true; }
    catch { return false; }
  },
};

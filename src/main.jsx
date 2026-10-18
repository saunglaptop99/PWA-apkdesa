import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Remove caches created by earlier builds before authenticated pages load.
if (typeof window !== 'undefined') {
  for (const legacyKey of ['cached_warga_desa', 'cached_warga_local', 'cached_mutasi', 'cached_aparat_list', 'cached_profile', 'sim_aparat_active_profile']) {
    localStorage.removeItem(legacyKey);
  }
  if ('caches' in window) caches.delete('supabase-api-cache');
}

// Register Service Worker for PWA auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Versi baru aplikasi tersedia. Muat ulang sekarang?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('SIM Aparat Desa PWA siap digunakan secara offline!');
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

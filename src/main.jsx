import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

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

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DesaProvider } from './context/DesaContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WargaPage from './pages/WargaPage';
import BansosPage from './pages/BansosPage';
import MutasiPage from './pages/MutasiPage';
import AdminPanelPage from './pages/AdminPanelPage';
import ProfilPage from './pages/ProfilPage';
import BottomNav from './components/common/BottomNav';
import { WifiOff, ShieldCheck } from 'lucide-react';

function MainLayout() {
  const { user, profile, loading, isOnline } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-teal-950 text-white">
        <div className="relative flex items-center justify-center mb-4">
          <div className="animate-ping absolute h-14 w-14 rounded-full bg-teal-400 opacity-20"></div>
          <div className="p-3.5 rounded-2xl bg-teal-600/30 border border-teal-500/30 text-teal-300">
            <ShieldCheck size={36} />
          </div>
        </div>
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-400 border-t-transparent mb-3"></div>
        <p className="text-xs font-semibold tracking-wider text-teal-200 uppercase">Memuat SIM Aparat Desa...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center">
      {/* Mobile-first Container Frame (Max 448px width like native mobile app) */}
      <div className="w-full max-w-md bg-slate-50 min-h-screen shadow-2xl relative flex flex-col border-x border-slate-200/60">
        {/* Offline Banner Indicator if disconnected */}
        {!isOnline && (
          <div className="sticky top-0 z-50 bg-rose-600 text-white text-[11px] font-bold px-3 py-1.5 flex items-center justify-center gap-1.5 shadow-md">
            <WifiOff size={13} />
            <span>Mode Offline Aktif • Menggunakan Data Cache PWA</span>
          </div>
        )}

        {/* Tab Pages */}
        <main className="flex-1 overflow-x-hidden">
          {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
          {activeTab === 'warga' && <WargaPage />}
          {activeTab === 'mutasi' && profile?.role === 'admin' && <MutasiPage />}
          {activeTab === 'kelola' && profile?.role === 'admin' && <AdminPanelPage />}
          {activeTab === 'bansos' && <BansosPage />}
          {activeTab === 'profil' && <ProfilPage />}
        </main>

        {/* Shopee-style Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          role={profile?.role}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DesaProvider>
        <MainLayout />
      </DesaProvider>
    </AuthProvider>
  );
}

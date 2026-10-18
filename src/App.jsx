import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DesaProvider, useDesa } from './context/DesaContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WargaPage from './pages/WargaPage';
import LayananPage from './pages/LayananPage';
import BansosPage from './pages/BansosPage';
import MutasiPage from './pages/MutasiPage';
import AdminPanelPage from './pages/AdminPanelPage';
import ProfilPage from './pages/ProfilPage';
import BottomNav from './components/common/BottomNav';
import { WifiOff, ShieldCheck } from 'lucide-react';

function MainLayout() {
  const { user, profile, loading, isOnline } = useAuth();
  const { pengaturanDesa } = useDesa();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [layananSubTab, setLayananSubTab] = useState('bansos');

  useEffect(() => {
    const namaDesa = pengaturanDesa?.nama_desa?.trim();
    document.title = namaDesa ? `SIM Desa ${namaDesa}` : 'SIM Desa';
  }, [pengaturanDesa?.nama_desa]);

  const navigateToLayanan = (subTab = 'bansos') => {
    setLayananSubTab(subTab);
    setActiveTab('layanan');
  };

  if (loading) {
    return (
      <div className="app-loading min-h-screen flex flex-col items-center justify-center text-slate-800">
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

  if (!user || !profile) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell min-h-screen flex justify-center">
      {/* Mobile-first Container Frame (Max 448px width like native mobile app) */}
      <div className="app-frame w-full max-w-lg bg-slate-50 min-h-screen relative flex flex-col border-x border-slate-200/60">
        {/* Offline Banner Indicator if disconnected */}
        {!isOnline && (
          <div className="sticky top-0 z-50 bg-rose-600 text-white text-[11px] font-bold px-3 py-1.5 flex items-center justify-center gap-1.5 shadow-md">
            <WifiOff size={13} />
            <span>Mode Offline • Data lokal akun ini ditampilkan jika tersedia</span>
          </div>
        )}

        {/* Tab Pages (Tersusun Rapi dalam 4 Pilar Layanan) */}
        <main className="flex-1 overflow-x-clip">
          {activeTab === 'dashboard' && (
            <DashboardPage
              setActiveTab={setActiveTab}
              navigateToLayanan={navigateToLayanan}
            />
          )}
          {activeTab === 'warga' && <WargaPage navigateToLayanan={navigateToLayanan} />}
          {activeTab === 'layanan' && <LayananPage defaultSubTab={layananSubTab} />}
          {activeTab === 'bansos' && <LayananPage defaultSubTab="bansos" />}
          {activeTab === 'mutasi' && <LayananPage defaultSubTab="mutasi" />}
          {activeTab === 'kelola' && profile?.role === 'admin' && <AdminPanelPage />}
          {activeTab === 'profil' && <ProfilPage setActiveTab={setActiveTab} />}
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

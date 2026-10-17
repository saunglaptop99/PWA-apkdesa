import React from 'react';
import { Home, Users, HeartPulse, User, Settings, Layers } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, role }) {
  const tabs = [
    { id: 'dashboard', label: 'Beranda', icon: Home, match: ['dashboard'] },
    { id: 'warga', label: 'Warga', icon: Users, match: ['warga'] },
    { id: 'layanan', label: 'Layanan', icon: HeartPulse, match: ['layanan', 'bansos', 'mutasi'] },
    {
      id: 'profil',
      label: role === 'admin' ? 'Akun & Kelola' : 'Akun',
      icon: role === 'admin' ? Settings : User,
      match: ['profil', 'kelola'],
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-1.5 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-bottom">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match ? tab.match.includes(activeTab) : activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative group active:scale-95 ${
                isActive ? 'text-teal-700 font-semibold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 scale-105 shadow-sm shadow-teal-700/10'
                    : 'group-hover:bg-slate-50'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={`text-[9.5px] mt-0.5 tracking-tight transition-all truncate max-w-[54px] ${
                  isActive ? 'font-bold text-teal-800' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-teal-600 rounded-full animate-fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

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
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-40 px-2 py-2 safe-bottom">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.match ? tab.match.includes(activeTab) : activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors duration-150 relative group ${
                isActive ? 'text-orange-800 font-semibold' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div
                className={`p-1 transition-colors duration-150 ${
                  isActive
                    ? 'text-orange-800'
                    : 'group-hover:text-slate-800'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={`text-[10px] mt-0.5 tracking-tight transition-all truncate max-w-[80px] ${
                  isActive ? 'font-bold text-orange-900' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-7 h-0.5 bg-orange-700" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

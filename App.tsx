
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DoctorList from './pages/DoctorList';
import DoctorProfile from './pages/DoctorProfile';
import ExecutiveCalendar from './pages/ExecutiveCalendar';
import ProceduresManager from './pages/ProceduresManager';
import Login from './components/Login';
import { Doctor, User, Procedure } from './types';
import { parseData } from './constants';
import { Menu, Database, RefreshCcw } from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  
  // Hidratación desde caché local o datos maestros
  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    const cached = localStorage.getItem('rc_cache_doctors');
    return cached ? JSON.parse(cached) : parseData();
  });
  
  const [procedures, setProcedures] = useState<Procedure[]>(() => {
    const cached = localStorage.getItem('rc_cache_procedures');
    return cached ? JSON.parse(cached) : [];
  });

  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'local'>('local');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');

  const syncData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [docsRes, procsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/doctors`).catch(() => null),
        fetch(`${API_BASE_URL}/procedures`).catch(() => null)
      ]);

      if (docsRes?.ok && procsRes?.ok) {
        const docsData = await docsRes.json();
        const procsData = await procsRes.json();
        
        setDoctors(docsData);
        setProcedures(procsData);
        setConnectionStatus('online');
        
        localStorage.setItem('rc_cache_doctors', JSON.stringify(docsData));
        localStorage.setItem('rc_cache_procedures', JSON.stringify(procsData));
      }
    } catch (error) {
      console.warn("Operando en modo local (API no disponible).");
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('rc_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    // Sincronización en segundo plano para no bloquear el UI
    syncData();
    
    // Timeout de seguridad para ocultar splash
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [syncData]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('rc_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rc_user');
  };

  const updateDoctor = (updated: Doctor) => {
    setDoctors(prev => {
        const newState = prev.map(d => d.id === updated.id ? updated : d);
        localStorage.setItem('rc_cache_doctors', JSON.stringify(newState));
        return newState;
    });
    
    fetch(`${API_BASE_URL}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  if (loading && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0f172a] text-white">
        <div className="flex items-baseline leading-none animate-pulse">
            <span className="text-5xl font-black text-blue-400">RC</span>
            <span className="text-5xl font-bold text-slate-200 ml-1">Medi</span>
            <span className="text-5xl font-bold text-blue-400">Call</span>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
            <RefreshCcw className="w-6 h-6 text-blue-400 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cargando ecosistema...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <HashRouter>
      <div className="flex h-screen bg-[#f8fafc]">
        {/* Header para móviles */}
        <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 text-white z-50 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-black text-blue-400 text-xl">RC</span>
            <span className="font-bold text-lg">MediCall</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-800 rounded-lg">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <Sidebar 
          user={user} 
          onLogout={handleLogout} 
          isMobileOpen={isMobileMenuOpen} 
          closeMobileMenu={() => setIsMobileMenuOpen(false)} 
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => {
            const next = !isSidebarCollapsed;
            setIsSidebarCollapsed(next);
            localStorage.setItem('sidebar_collapsed', String(next));
          }}
        />
        
        <div className={`flex-1 flex flex-col h-full relative pt-16 md:pt-0 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          {isSyncing && (
             <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-slate-100 animate-fadeIn">
                <RefreshCcw className="w-3 h-3 text-blue-500 animate-spin" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sincronizando...</span>
             </div>
          )}

          <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard doctors={doctors} user={user} procedures={procedures} />} />
                <Route path="/doctors" element={<DoctorList doctors={doctors} user={user} onAddDoctor={(d) => setDoctors(prev => [d, ...prev])} />} />
                <Route path="/doctors/:id" element={<DoctorProfile doctors={doctors} onUpdate={updateDoctor} onDeleteVisit={(did, vid) => {
                   const doc = doctors.find(d => d.id === did);
                   if (doc) updateDoctor({ ...doc, visits: doc.visits.filter(v => v.id !== vid) });
                }} user={user} />} />
                <Route path="/calendar" element={<ExecutiveCalendar doctors={doctors} onUpdateDoctors={setDoctors} onDeleteVisit={(did, vid) => {
                   const doc = doctors.find(d => d.id === did);
                   if (doc) updateDoctor({ ...doc, visits: doc.visits.filter(v => v.id !== vid) });
                }} user={user} />} />
                <Route path="/procedures" element={<ProceduresManager procedures={procedures} doctors={doctors} onAddProcedure={p => setProcedures(prev => [...prev, p])} onUpdateProcedure={p => setProcedures(prev => prev.map(old => old.id === p.id ? p : old))} onDeleteProcedure={id => setProcedures(prev => prev.filter(p => p.id !== id))} user={user} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;

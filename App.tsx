
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
import { Menu, RefreshCw, Database, AlertCircle, CloudOff } from 'lucide-react';

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground && doctors.length === 0) setLoading(true);
    setSyncing(true);
    
    try {
      const docsRes = await fetch(`${API_BASE_URL}/doctors`);
      const procsRes = await fetch(`${API_BASE_URL}/procedures`);

      if (docsRes.ok && procsRes.ok) {
        const docsData = await docsRes.json();
        const procsData = await procsRes.json();
        setDoctors(docsData);
        setProcedures(procsData);
        setConnectionError(null);
      } else {
        throw new Error("API Offline");
      }
    } catch (error) {
      console.warn("⚠️ API no disponible, usando base de datos local maestra.");
      setConnectionError("Modo Local: Base de datos integrada cargada.");
      
      if (doctors.length === 0) {
        const masterData = parseData();
        setDoctors(masterData);
      }
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [doctors.length]);

  useEffect(() => {
    const savedUser = localStorage.getItem('rc_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    fetchData();
  }, [fetchData]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('rc_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('rc_user');
  };

  const updateDoctor = (updated: Doctor) => {
    setDoctors(prev => prev.map(d => d.id === updated.id ? updated : d));
    fetch(`${API_BASE_URL}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  const addDoctor = (newDoc: Doctor) => {
    setDoctors(prev => [newDoc, ...prev]);
    fetch(`${API_BASE_URL}/doctors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDoc)
    }).catch(() => {});
  };

  if (loading && doctors.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold tracking-widest uppercase text-xs">Cargando RC MediCall...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <HashRouter>
      <div className="flex h-screen bg-[#f8fafc]">
        <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 text-white z-50 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-black text-blue-400">RC</span>
            <span className="font-bold">MediCall</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-800 rounded-lg">
            <Menu className="w-6 h-6 text-white" />
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
          <main className="flex-1 overflow-auto p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {connectionError && (
                <div className="mb-6 bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-2 text-blue-800 text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <Database className="w-4 h-4" /> {connectionError}
                </div>
              )}
              <Routes>
                <Route path="/" element={<Dashboard doctors={doctors} user={user} procedures={procedures} />} />
                <Route path="/doctors" element={<DoctorList doctors={doctors} onAddDoctor={addDoctor} user={user} />} />
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

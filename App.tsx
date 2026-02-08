
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DoctorList from './pages/DoctorList';
import DoctorProfile from './pages/DoctorProfile';
import ExecutiveCalendar from './pages/ExecutiveCalendar';
import ProceduresManager from './pages/ProceduresManager';
import Login from './components/Login';
import { Doctor, User, Procedure } from './types';
import { Menu, RefreshCw, Database, AlertCircle, CloudOff } from 'lucide-react';

// En producción Cloud Run, el API vive en el mismo dominio
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';
const CACHE_KEY_DOCTORS = 'rc_medicall_cache_doctors_v5';
const CACHE_KEY_PROCEDURES = 'rc_medicall_cache_procedures_v5';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
      const savedState = localStorage.getItem('rc_medicall_sidebar_collapsed');
      return savedState === 'true';
  });

  // --- SISTEMA DE CACHÉ ---
  const saveToCache = (docs: Doctor[], procs: Procedure[]) => {
      localStorage.setItem(CACHE_KEY_DOCTORS, JSON.stringify(docs));
      localStorage.setItem(CACHE_KEY_PROCEDURES, JSON.stringify(procs));
  };

  const loadFromCache = () => {
      const cachedDocs = localStorage.getItem(CACHE_KEY_DOCTORS);
      const cachedProcs = localStorage.getItem(CACHE_KEY_PROCEDURES);
      if (cachedDocs) setDoctors(JSON.parse(cachedDocs));
      if (cachedProcs) setProcedures(JSON.parse(cachedProcs));
      return !!cachedDocs;
  };

  // --- FETCH DATA CON RETRY Y TIMEOUT ---
  const fetchData = useCallback(async (isBackground = false) => {
      if (!isBackground && doctors.length === 0) setLoading(true);
      setSyncing(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seg para Cloud Run cold starts

      try {
          const [docsRes, procsRes] = await Promise.all([
              fetch(`${API_BASE_URL}/doctors`, { signal: controller.signal }),
              fetch(`${API_BASE_URL}/procedures`, { signal: controller.signal })
          ]);

          if (docsRes.ok && procsRes.ok) {
              const docsData = await docsRes.json();
              const procsData = await procsRes.json();
              setDoctors(docsData);
              setProcedures(procsData);
              saveToCache(docsData, procsData);
              setConnectionError(null);
          } else {
              throw new Error("Error en respuesta del servidor");
          }
      } catch (error) {
          console.warn("⚠️ Error de conexión MySQL:", error);
          setConnectionError("Modo Local: El servidor no responde o MySQL está fuera de línea.");
          loadFromCache();
      } finally {
          clearTimeout(timeoutId);
          setLoading(false);
          setSyncing(false);
      }
  }, [doctors.length]);

  // --- AUTENTICACIÓN ---
  useEffect(() => {
    const savedUser = localStorage.getItem('rc_medicall_user_v5');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    fetchData();

    // Polling cada 60s en producción para ahorrar recursos en Cloud Run
    const syncInterval = setInterval(() => {
        fetchData(true);
    }, 60000);

    return () => clearInterval(syncInterval);
  }, [fetchData]);

  const handleLogin = (loggedInUser: User) => {
      setUser(loggedInUser);
      localStorage.setItem('rc_medicall_user_v5', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('rc_medicall_user_v5');
  };

  const toggleSidebar = () => {
      const newState = !isSidebarCollapsed;
      setIsSidebarCollapsed(newState);
      localStorage.setItem('rc_medicall_sidebar_collapsed', String(newState));
  };

  // --- HANDLERS CRUD (OPTIMISTIC) ---
  const syncDoctor = async (doctor: Doctor) => {
      setSyncing(true);
      try {
          await fetch(`${API_BASE_URL}/doctors`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(doctor)
          });
          setConnectionError(null);
      } catch (err) {
          setConnectionError("Error de sincronización: Cambios guardados localmente.");
      } finally {
          setSyncing(false);
          saveToCache(doctors, procedures);
      }
  };

  const updateDoctor = (updatedDoctor: Doctor) => {
      setDoctors(prev => prev.map(d => d.id === updatedDoctor.id ? updatedDoctor : d));
      syncDoctor(updatedDoctor);
  };

  const addDoctor = (newDoctor: Doctor) => {
      setDoctors(prev => [newDoctor, ...prev]);
      syncDoctor(newDoctor);
  };

  const deleteDoctor = async (id: string) => {
      setDoctors(prev => prev.filter(d => d.id !== id));
      try {
          await fetch(`${API_BASE_URL}/doctors/${id}`, { method: 'DELETE' });
      } catch (err) {}
  };

  const updateDoctorsList = (newList: Doctor[]) => {
      setDoctors(newList);
  };

  const addProcedure = async (newProc: Procedure) => {
      setProcedures(prev => [...prev, newProc]);
      try {
          await fetch(`${API_BASE_URL}/procedures`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newProc)
          });
      } catch (err) {}
  };

  if (loading && doctors.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="flex flex-col items-center">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <Database className="absolute inset-0 m-auto w-6 h-6 text-blue-500" />
            </div>
            <div className="mt-8 text-center animate-pulse">
                <p className="text-white font-black uppercase tracking-[0.2em] text-sm">RC MediCall CRM</p>
                <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-widest">Iniciando en la Nube...</p>
            </div>
        </div>
      </div>
    );
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <Router>
      <div className="flex h-screen bg-[#f8fafc]">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 text-white z-50 p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
                <span className="font-black text-cyan-400">RC</span>
                <span className="font-bold">MediCall</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-800 rounded-lg">
                <Menu className="w-6 h-6 text-white" />
            </button>
        </div>

        {/* Status Indicator */}
        <div 
            onClick={() => fetchData()}
            className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-500 cursor-pointer hover:scale-105 active:scale-95 ${connectionError ? 'bg-amber-500 border-amber-400' : 'bg-white/90 border-slate-200'}`}
        >
            <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-blue-500 animate-pulse' : (connectionError ? 'bg-white animate-pulse' : 'bg-emerald-500')}`}></div>
            <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${connectionError ? 'text-white' : 'text-slate-600'}`}>
                {connectionError ? <CloudOff className="w-4 h-4" /> : (syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />)}
                {connectionError ? 'MODO LOCAL' : (syncing ? 'Sincronizando...' : 'Online')}
            </span>
        </div>

        <Sidebar 
            user={user} 
            onLogout={handleLogout} 
            isMobileOpen={isMobileMenuOpen} 
            closeMobileMenu={() => setIsMobileMenuOpen(false)} 
            isCollapsed={isSidebarCollapsed}
            toggleCollapse={toggleSidebar}
        />
        
        <div className={`flex-1 flex flex-col h-full relative pt-16 md:pt-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <main className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-8 relative z-10 w-full">
            <div className="max-w-7xl mx-auto min-w-[320px]">
                {connectionError && (
                    <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-amber-800 animate-fadeIn shadow-sm">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-[10px] font-black uppercase tracking-wide">
                                {connectionError}
                            </p>
                        </div>
                        <button onClick={() => fetchData()} className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase hover:bg-amber-700 transition-colors">
                            Reintentar
                        </button>
                    </div>
                )}
                <Routes>
                    <Route path="/" element={<Dashboard doctors={doctors} user={user} procedures={procedures} />} />
                    <Route path="/doctors" element={<DoctorList doctors={doctors} onAddDoctor={addDoctor} onDeleteDoctor={deleteDoctor} user={user} />} />
                    <Route path="/doctors/:id" element={<DoctorProfile doctors={doctors} onUpdate={updateDoctor} onDeleteVisit={(docId, visitId) => {
                        const doc = doctors.find(d => d.id === docId);
                        if (doc) {
                            const updatedDoc = { ...doc, visits: doc.visits.filter(v => v.id !== visitId) };
                            updateDoctor(updatedDoc);
                        }
                    }} user={user} />} />
                    <Route path="/calendar" element={<ExecutiveCalendar doctors={doctors} onUpdateDoctors={updateDoctorsList} onDeleteVisit={(docId, visitId) => {
                        const doc = doctors.find(d => d.id === docId);
                        if (doc) {
                            const updatedDoc = { ...doc, visits: doc.visits.filter(v => v.id !== visitId) };
                            updateDoctor(updatedDoc);
                        }
                    }} user={user} />} />
                    <Route path="/procedures" element={<ProceduresManager procedures={procedures} doctors={doctors} onAddProcedure={addProcedure} onUpdateProcedure={(p) => {}} onDeleteProcedure={(id) => {}} user={user} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;

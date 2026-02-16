import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DoctorList from './pages/DoctorList';
import DoctorProfile from './pages/DoctorProfile';
import ExecutiveCalendar from './pages/ExecutiveCalendar';
import ProceduresManager from './pages/ProceduresManager';
import Login from './components/Login';
import { Doctor, User, Procedure, TimeOffEvent } from './types';
import { Menu } from 'lucide-react';
import { parseData } from './constants';

// Ajuste de puerto a 8080 para coincidir con server.js
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:8080/api' : '/api';
const SYNC_INTERVAL = 30000;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>(parseData()); // Carga inicial desde constantes
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [timeOffEvents, setTimeOffEvents] = useState<TimeOffEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  
  const syncTimerRef = useRef<any>(null);

  const seedDatabase = async (initialData: Doctor[]) => {
    try {
        await fetch(`${API_BASE_URL}/doctors/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialData)
        });
    } catch (error) {
        console.warn("Seeding omitido: Servidor no disponible o DB ya poblada.");
    }
  };

  const syncData = useCallback(async (silent = true) => {
    if (!silent) setIsSyncing(true);
    try {
      const [docsRes, toffRes, procRes] = await Promise.all([
        fetch(`${API_BASE_URL}/doctors`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/timeoff`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/procedures`, { cache: 'no-store' })
      ]);

      if (docsRes.ok && toffRes.ok && procRes.ok) {
        let docsFromServer = await docsRes.json();
        const toffs = await toffRes.json();
        const procs = await procRes.json();

        // Si el servidor está vacío, intentamos poblarlo con nuestros datos locales
        if (docsFromServer.length === 0) {
            const localData = parseData();
            await seedDatabase(localData);
            // Mantenemos los datos locales en el estado
        } else {
            setDoctors(docsFromServer);
        }
        
        setTimeOffEvents(toffs);
        setProcedures(procs);
        setIsOnline(true);
      }
    } catch (error) {
      console.log("Modo Offline: Usando base de datos interna.");
      setIsOnline(false);
    } finally {
      if (!silent) setIsSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('rc_user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    // Ejecutar sincronización inicial
    syncData(false);

    syncTimerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') syncData(true);
    }, SYNC_INTERVAL);

    return () => clearInterval(syncTimerRef.current);
  }, [syncData]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('rc_user', JSON.stringify(loggedInUser));
  };

  const updateDoctor = async (updated: Doctor) => {
    setDoctors(prev => {
        const index = prev.findIndex(d => d.id === updated.id);
        if (index !== -1) {
            const newDocs = [...prev];
            newDocs[index] = updated;
            return newDocs;
        }
        return [...prev, updated];
    });
    
    try {
        await fetch(`${API_BASE_URL}/doctors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
    } catch (e) { 
        console.error("Error al persistir cambios en servidor, guardado localmente."); 
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    setDoctors(prev => prev.filter(d => d.id !== id));
    try {
        await fetch(`${API_BASE_URL}/doctors/${id}`, { method: 'DELETE' });
    } catch (e) {
        console.error("Error al eliminar doctor", e);
    }
  };

  const handleClearCategory = async (category: string) => {
      if (!window.confirm(`⚠️ ADVERTENCIA DE SEGURIDAD ⚠️\n\nEstás a punto de ELIMINAR TODOS los registros de la categoría: ${category}.\n\nEsta acción borrará permanentemente todos los contactos y sus historiales de visitas asociados a esta categoría.\n\n¿Estás absolutamente seguro de continuar?`)) return;
      
      setDoctors(prev => prev.filter(d => d.category !== category));
      try {
          await fetch(`${API_BASE_URL}/doctors/clear/${category}`, { method: 'DELETE' });
      } catch (e) {
          console.error("Error al limpiar categoría", e);
      }
  };

  const handleBulkAddDoctors = async (newDocs: Doctor[]) => {
      setDoctors(prev => [...prev, ...newDocs]);
      try {
          await fetch(`${API_BASE_URL}/doctors/bulk`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newDocs)
          });
      } catch (e) { 
          console.error("Error al importar masivamente", e); 
      }
  };

  const handleSaveTimeOff = async (toff: TimeOffEvent) => {
    setTimeOffEvents(prev => [...prev.filter(t => t.id !== toff.id), toff]);
    try {
        await fetch(`${API_BASE_URL}/timeoff`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toff)
        });
    } catch (e) {}
  };

  const handleDeleteTimeOff = async (id: string) => {
    setTimeOffEvents(prev => prev.filter(t => t.id !== id));
    try {
        await fetch(`${API_BASE_URL}/timeoff/${id}`, { method: 'DELETE' });
    } catch (e) {}
  };

  // Manejadores de Procedimientos
  const handleAddProcedure = async (proc: Procedure) => {
      setProcedures(prev => [...prev, proc]);
      try {
          await fetch(`${API_BASE_URL}/procedures`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(proc)
          });
      } catch (e) { console.error(e); }
  };

  const handleUpdateProcedure = async (proc: Procedure) => {
      setProcedures(prev => prev.map(p => p.id === proc.id ? proc : p));
      try {
          await fetch(`${API_BASE_URL}/procedures`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(proc)
          });
      } catch (e) { console.error(e); }
  };

  const handleDeleteProcedure = async (id: string) => {
      setProcedures(prev => prev.filter(p => p.id !== id));
      try {
          await fetch(`${API_BASE_URL}/procedures/${id}`, { method: 'DELETE' });
      } catch (e) { console.error(e); }
  };

  if (loading && !user) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white font-black animate-pulse uppercase tracking-[0.5em] text-[10px]">RC MediCall • Sincronizando Directorio...</div>;
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <HashRouter>
      <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
        <Sidebar 
          user={user} 
          onLogout={() => { setUser(null); localStorage.removeItem('rc_user'); }} 
          isMobileOpen={isMobileMenuOpen} 
          closeMobileMenu={() => setIsMobileMenuOpen(false)} 
          isCollapsed={isSidebarCollapsed}
          isOnline={isOnline}
          isSyncing={isSyncing}
          toggleCollapse={() => { setIsSidebarCollapsed(!isSidebarCollapsed); localStorage.setItem('sidebar_collapsed', String(!isSidebarCollapsed)); }}
        />
        
        <div className={`flex-1 flex flex-col h-full relative transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <div className="md:hidden p-4 bg-slate-900 text-white flex justify-between items-center">
             <span className="font-black tracking-tighter text-cyan-400">RC MediCall</span>
             <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-800 rounded-lg"><Menu /></button>
          </div>
          <main className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
            <Routes>
              <Route path="/" element={<Dashboard doctors={doctors} user={user} procedures={procedures} isOnline={isOnline} />} />
              <Route path="/doctors" element={
                <DoctorList 
                    doctors={doctors} 
                    user={user} 
                    onAddDoctor={updateDoctor} 
                    onBulkAddDoctors={handleBulkAddDoctors} 
                    onDeleteDoctor={handleDeleteDoctor}
                    onClearCategory={handleClearCategory}
                />} 
              />
              <Route path="/doctors/:id" element={<DoctorProfile doctors={doctors} onUpdate={updateDoctor} onDeleteVisit={(did, vid) => {
                 const doc = doctors.find(d => d.id === did);
                 if (doc) updateDoctor({ ...doc, visits: doc.visits.filter(v => v.id !== vid) });
              }} user={user} />} />
              <Route path="/calendar" element={
                <ExecutiveCalendar 
                  doctors={doctors} 
                  timeOffEvents={timeOffEvents}
                  onUpdateDoctor={updateDoctor}
                  onSaveTimeOff={handleSaveTimeOff}
                  onDeleteTimeOff={handleDeleteTimeOff}
                  onDeleteVisit={(did, vid) => {
                    const doc = doctors.find(d => d.id === did);
                    if (doc) updateDoctor({ ...doc, visits: doc.visits.filter(v => v.id !== vid) });
                  }} 
                  user={user} 
                />
              } />
              <Route path="/procedures" element={
                  <ProceduresManager 
                    procedures={procedures} 
                    doctors={doctors} 
                    onAddProcedure={handleAddProcedure} 
                    onUpdateProcedure={handleUpdateProcedure} 
                    onDeleteProcedure={handleDeleteProcedure} 
                    user={user} 
                  />
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doctor, ScheduleSlot, User } from '../types';
import { Search, MapPin, Stethoscope, Building2, Briefcase, Plus, X, ArrowRight, Trash2, Loader2, Sparkles } from 'lucide-react';

type TabType = 'MEDICO' | 'ADMINISTRATIVO' | 'HOSPITAL';

interface DoctorListProps {
  doctors: Doctor[];
  onAddDoctor?: (doc: Doctor) => void;
  onDeleteDoctor?: (id: string) => void;
  user: User;
}

const DoctorList: React.FC<DoctorListProps> = ({ doctors, onAddDoctor, onDeleteDoctor, user }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState(user.role === 'executive' ? user.name : 'TODOS');
  const [activeTab, setActiveTab] = useState<TabType>('MEDICO');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12); // Paginación inicial
  const [isFiltering, setIsFiltering] = useState(false);
  
  const observerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<Doctor>>({
      name: '',
      executive: user.role === 'executive' ? user.name : 'SIN ASIGNAR',
      specialty: '',
      address: '',
      hospital: '',
      phone: '',
      email: ''
  });

  // Efecto para simular carga al filtrar (da feedback visual y evita lag)
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
        setIsFiltering(false);
        setVisibleCount(12); // Resetear paginación al cambiar filtros
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedExecutive, activeTab]);

  // Infinite Scroll Logic
  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && !isFiltering) {
                setVisibleCount(prev => prev + 12);
            }
        },
        { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [isFiltering]);

  const executives = useMemo(() => {
    const execs = new Set(doctors.map(d => d.executive));
    return ['TODOS', ...Array.from(execs).sort()];
  }, [doctors]);

  const filteredItems = useMemo(() => {
    return doctors.filter(doc => {
      const category = doc.category || 'MEDICO';
      const term = searchTerm.toLowerCase();
      const matchesSearch = doc.name.toLowerCase().includes(term) || 
                            doc.address.toLowerCase().includes(term) ||
                            (doc.specialty || '').toLowerCase().includes(term);
      const matchesExec = selectedExecutive === 'TODOS' || doc.executive === selectedExecutive;
      const matchesTab = category === activeTab;
      return matchesSearch && matchesExec && matchesTab;
    });
  }, [doctors, searchTerm, selectedExecutive, activeTab]);

  const itemsToShow = filteredItems.slice(0, visibleCount);

  const resetForm = () => {
      setIsAddModalOpen(false);
      setFormData({
          name: '',
          executive: user.role === 'executive' ? user.name : 'SIN ASIGNAR',
          specialty: '',
          address: '',
          hospital: '',
          phone: '',
          email: ''
      });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name?.trim()) return;
      if (!onAddDoctor) return;

      const newDoctor: Doctor = {
          id: `${activeTab.substring(0,3).toLowerCase()}-${Date.now()}`,
          category: activeTab,
          name: formData.name.toUpperCase(),
          executive: formData.executive?.toUpperCase() || 'SIN ASIGNAR',
          specialty: formData.specialty?.toUpperCase() || (activeTab === 'HOSPITAL' ? 'HOSPITAL' : ''),
          address: formData.address?.toUpperCase() || '',
          hospital: formData.hospital?.toUpperCase() || '',
          phone: formData.phone || '',
          email: formData.email || '',
          visits: [],
          schedule: Array(7).fill(null).map((_, i) => ({ day: 'LUNES', time: '', active: false })),
          isInsuranceDoctor: false
      };
      
      onAddDoctor(newDoctor);
      resetForm();
  };

  return (
    <div className="space-y-6 relative pb-20 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-blue-600" />
                Directorio Inteligente
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 ml-11">
                {filteredItems.length} registros encontrados en base de datos.
            </p>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center px-8 py-3.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition shadow-xl shadow-slate-200 font-black text-xs uppercase tracking-widest active:scale-95"
            >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Nuevo
            </button>
        </div>
      </div>

      <div className="flex space-x-2 bg-slate-200/50 p-1.5 rounded-2xl w-fit">
          {(['MEDICO', 'ADMINISTRATIVO', 'HOSPITAL'] as TabType[]).map(tab => (
              <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  {tab === 'MEDICO' ? 'MÉDICOS' : (tab === 'ADMINISTRATIVO' ? 'ADMINISTRATIVOS' : 'HOSPITALES')}
              </button>
          ))}
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-14 pr-4 py-4.5 border border-slate-200 rounded-2xl bg-slate-50 text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all uppercase text-sm shadow-inner"
            placeholder={`ESCRIBA EL NOMBRE O DIRECCIÓN PARA FILTRAR EN ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Filtrar por Ejecutivo Asignado</label>
            <select
                className="block w-full pl-5 pr-10 py-3.5 text-sm font-black border border-slate-200 bg-slate-50 text-slate-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer uppercase shadow-sm"
                value={selectedExecutive}
                onChange={(e) => setSelectedExecutive(e.target.value)}
                disabled={user.role === 'executive'}
            >
            {executives.map(exec => (
                <option key={exec} value={exec}>{exec}</option>
            ))}
            </select>
          </div>
        </div>
      </div>

      {isFiltering ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Optimizando directorio...</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[400px]">
            {itemsToShow.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/doctors/${item.id}`)}
                className="block bg-white rounded-[2rem] shadow-lg border border-slate-100 p-8 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className={`rounded-2xl p-4 text-white shadow-xl ${activeTab === 'MEDICO' ? 'bg-blue-600 shadow-blue-500/30' : activeTab === 'ADMINISTRATIVO' ? 'bg-purple-600 shadow-purple-500/30' : 'bg-emerald-600 shadow-emerald-500/30'}`}>
                        {activeTab === 'MEDICO' ? <Stethoscope className="h-7 w-7" /> : activeTab === 'ADMINISTRATIVO' ? <Briefcase className="h-7 w-7" /> : <Building2 className="h-7 w-7" />}
                    </div>
                    {user.role === 'admin' && (
                        <button onClick={(e) => { e.stopPropagation(); onDeleteDoctor?.(item.id); }} className="p-3 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="h-5 w-5" />
                        </button>
                    )}
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors relative z-10">{item.name}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase mt-3 tracking-wider relative z-10">{item.specialty || item.area || 'GENERAL'}</p>
                <div className="mt-6 flex items-start text-[11px] text-slate-500 font-bold uppercase leading-relaxed border-t border-slate-50 pt-6 relative z-10">
                    <MapPin className="h-4 w-4 mr-2 text-slate-300 flex-shrink-0" />
                    <span className="line-clamp-2">{item.address}</span>
                </div>
                <div className="mt-8 flex justify-between items-center relative z-10">
                    <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-blue-100/50 shadow-sm">{item.executive}</span>
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 shadow-xl shadow-slate-300">
                        <ArrowRight className="h-5 w-5" />
                    </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {/* Sensor para Infinite Scroll */}
      {!isFiltering && filteredItems.length > visibleCount && (
          <div ref={observerRef} className="py-20 flex justify-center">
              <div className="flex items-center gap-3 px-8 py-3 bg-white border border-slate-100 rounded-full shadow-lg">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cargando más contactos...</p>
              </div>
          </div>
      )}

      {itemsToShow.length === 0 && !isFiltering && (
          <div className="text-center py-40 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
               <Search className="w-20 h-20 text-slate-200 mx-auto mb-8" />
               <p className="text-2xl font-black text-slate-300 uppercase tracking-widest">Sin resultados encontrados</p>
               <button onClick={() => setSearchTerm('')} className="mt-6 text-blue-600 font-black uppercase text-xs hover:underline">Limpiar Filtros</button>
          </div>
      )}

      {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-fadeIn border border-white/20">
                  <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo Registro</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Categoría: {activeTab}</p>
                      </div>
                      <button onClick={resetForm} className="p-3 bg-slate-200/50 rounded-2xl text-slate-500 hover:text-slate-800 transition-all"><X className="h-6 w-6" /></button>
                  </div>
                  <form onSubmit={handleAddSubmit} className="p-10 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Nombre Completo</label>
                          <input type="text" placeholder="ESCRIBA EL NOMBRE..." required className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-4.5 font-bold uppercase text-sm focus:ring-4 focus:ring-blue-500/10 shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Especialidad o Área</label>
                          <input type="text" placeholder="EJ: GINECOLOGÍA / COMPRAS" className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-4.5 font-bold uppercase text-sm focus:ring-4 focus:ring-blue-500/10 shadow-inner" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Dirección de Consultorio / Oficina</label>
                          <textarea rows={2} placeholder="CALLE, NÚMERO, COLONIA..." className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-4.5 font-bold uppercase text-sm focus:ring-4 focus:ring-blue-500/10 shadow-inner resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} />
                      </div>
                      <div className="flex justify-end gap-4 mt-10">
                          <button type="button" onClick={resetForm} className="px-8 py-3.5 font-black text-slate-400 uppercase text-xs tracking-widest hover:text-slate-600 transition-all">Cancelar</button>
                          <button type="submit" className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all">Crear Registro</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default DoctorList;

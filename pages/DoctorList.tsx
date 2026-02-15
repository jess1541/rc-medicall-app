
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doctor, User } from '../types';
import { Search, MapPin, Stethoscope, Building2, Briefcase, Plus, X, ArrowRight, Loader2, Filter, Database } from 'lucide-react';

type TabType = 'MEDICO' | 'ADMINISTRATIVO' | 'HOSPITAL';

interface DoctorListProps {
  doctors: Doctor[];
  onAddDoctor?: (doc: Doctor) => void;
  user: User;
}

const DoctorList: React.FC<DoctorListProps> = ({ doctors, onAddDoctor, user }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState(user.role === 'executive' ? user.name : 'TODOS');
  const [activeTab, setActiveTab] = useState<TabType>('MEDICO');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20); // Aumentado para mejor visualización inicial
  const [isFiltering, setIsFiltering] = useState(false);
  
  const observerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<Doctor>>({
      name: '',
      executive: user.role === 'executive' ? user.name : 'SIN ASIGNAR',
      specialty: '',
      address: '',
      category: 'MEDICO'
  });

  // Efecto de filtrado optimizado
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
        setIsFiltering(false);
        setVisibleCount(20);
    }, 100);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedExecutive, activeTab]);

  // Scroll infinito
  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && !isFiltering) {
                setVisibleCount(prev => prev + 20);
            }
        },
        { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [isFiltering]);

  const executivesList = useMemo(() => {
    const execs = new Set(doctors.map(d => d.executive));
    return ['TODOS', ...Array.from(execs).sort()];
  }, [doctors]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return doctors.filter(doc => {
      const category = doc.category || 'MEDICO';
      const matchesSearch = !term || 
                            doc.name.toLowerCase().includes(term) || 
                            doc.address.toLowerCase().includes(term) ||
                            (doc.specialty || '').toLowerCase().includes(term);
      const matchesExec = selectedExecutive === 'TODOS' || doc.executive === selectedExecutive;
      const matchesTab = category === activeTab;
      return matchesSearch && matchesExec && matchesTab;
    });
  }, [doctors, searchTerm, selectedExecutive, activeTab]);

  const itemsToShow = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);

  const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name?.trim()) return;
      if (!onAddDoctor) return;

      const newDoctor: Doctor = {
          id: `new-${Date.now()}`,
          category: activeTab,
          name: formData.name.toUpperCase(),
          executive: formData.executive?.toUpperCase() || 'SIN ASIGNAR',
          specialty: formData.specialty?.toUpperCase() || (activeTab === 'HOSPITAL' ? 'HOSPITAL' : 'GENERAL'),
          address: formData.address?.toUpperCase() || '',
          visits: [],
          schedule: Array(7).fill(null).map((_, i) => ({ 
              day: ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'][i], 
              time: '', 
              active: false 
          })),
          isInsuranceDoctor: false
      };
      
      onAddDoctor(newDoctor);
      setIsAddModalOpen(false);
      setFormData({ name: '', specialty: '', address: '', executive: user.name, category: activeTab });
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-black tracking-tight flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600" />
                Directorio Central
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] ml-11">
                {filteredItems.length} registros cargados correctamente.
            </p>
        </div>
        
        <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-8 py-3.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition shadow-xl font-black text-xs uppercase tracking-widest active:scale-95"
        >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Registro
        </button>
      </div>

      {/* FILTROS INTEGRADOS */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
            {(['MEDICO', 'ADMINISTRATIVO', 'HOSPITAL'] as TabType[]).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {tab === 'MEDICO' ? 'Médicos' : (tab === 'ADMINISTRATIVO' ? 'Admin' : 'Hospitales')}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 relative">
                <Search className="absolute left-5 top-5 h-5 w-5 text-slate-300" />
                <input
                    type="text"
                    className="block w-full pl-14 pr-4 py-5 border border-slate-200 rounded-[1.5rem] bg-slate-50 text-black font-black placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase text-sm"
                    placeholder="Buscar por nombre, dirección o especialidad..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="relative">
                <Filter className="absolute left-5 top-5 h-5 w-5 text-slate-300" />
                <select
                    className="block w-full pl-14 pr-4 py-5 border border-slate-200 rounded-[1.5rem] bg-slate-50 text-black font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase text-sm appearance-none cursor-pointer"
                    value={selectedExecutive}
                    onChange={(e) => setSelectedExecutive(e.target.value)}
                    disabled={user.role === 'executive'}
                >
                    {executivesList.map(exec => <option key={exec} value={exec}>{exec}</option>)}
                </select>
            </div>
        </div>
      </div>

      {isFiltering ? (
          <div className="flex flex-col items-center justify-center py-40 animate-pulse">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Cargando resultados...</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {itemsToShow.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/doctors/${item.id}`)}
                className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 p-8 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${activeTab === 'MEDICO' ? 'bg-blue-600' : 'bg-emerald-600'}`}></div>
                
                <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl text-white shadow-lg ${activeTab === 'MEDICO' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : activeTab === 'ADMINISTRATIVO' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'}`}>
                        {activeTab === 'MEDICO' ? <Stethoscope className="h-6 w-6" /> : activeTab === 'ADMINISTRATIVO' ? <Briefcase className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                    </div>
                    <span className="text-[10px] font-black bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-slate-100">{item.executive}</span>
                </div>
                
                <h3 className="text-base font-black text-black uppercase leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">{item.name}</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-6">{item.specialty || 'GENERAL'}</p>
                
                <div className="mt-auto flex items-start text-[11px] text-black font-bold uppercase border-t border-slate-50 pt-6">
                    <MapPin className="h-4 w-4 mr-2 text-slate-300 flex-shrink-0" />
                    <span className="line-clamp-2 leading-relaxed">{item.address}</span>
                </div>
                
                <div className="mt-6 flex justify-end">
                    <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center transform translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all shadow-xl">
                        <ArrowRight className="h-5 w-5" />
                    </div>
                </div>
              </div>
            ))}
          </div>
      )}

      {filteredItems.length === 0 && !isFiltering && (
          <div className="py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <Database className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No se encontraron registros</p>
          </div>
      )}

      <div ref={observerRef} className="h-10"></div>

      {/* MODAL NUEVO REGISTRO */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn border border-white/20">
                  <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <div>
                        <h3 className="text-2xl font-black text-black uppercase tracking-tight">Nuevo Registro</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Categoría: {activeTab}</p>
                      </div>
                      <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-red-500 transition-all shadow-sm"><X className="h-6 w-6" /></button>
                  </div>
                  <form onSubmit={handleAddSubmit} className="p-10 space-y-6">
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Nombre Completo</label>
                          <input type="text" required className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-4.5 font-black uppercase text-sm text-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Especialidad</label>
                          <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-4.5 font-black uppercase text-sm text-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-inner" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Dirección</label>
                          <textarea required rows={3} className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-4.5 font-black uppercase text-sm text-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-inner resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-4 mt-8">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-8 py-4 font-black text-slate-400 uppercase text-xs tracking-widest">Cancelar</button>
                          <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/30 active:scale-95 transition-all">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default DoctorList;

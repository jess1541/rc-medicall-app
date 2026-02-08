
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doctor, User } from '../types';
import { Search, MapPin, Stethoscope, Building2, Briefcase, Plus, X, ArrowRight, Trash2, Loader2, Sparkles, Filter } from 'lucide-react';

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
  const [visibleCount, setVisibleCount] = useState(12);
  const [isFiltering, setIsFiltering] = useState(false);
  
  const observerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<Doctor>>({
      name: '',
      executive: user.role === 'executive' ? user.name : 'SIN ASIGNAR',
      specialty: '',
      address: '',
      category: 'MEDICO'
  });

  // Debounce visual para filtros
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
        setIsFiltering(false);
        setVisibleCount(12);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedExecutive, activeTab]);

  // Infinite Scroll para performance masivo
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
          schedule: Array(7).fill(null).map((_, i) => ({ day: 'LUNES', time: '', active: false })),
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
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-blue-600" />
                Directorio
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] ml-11">
                {filteredItems.length} registros en esta categoría.
            </p>
        </div>
        
        <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition shadow-xl font-black text-xs uppercase tracking-widest"
        >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Registro
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
            {(['MEDICO', 'ADMINISTRATIVO', 'HOSPITAL'] as TabType[]).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    {tab === 'MEDICO' ? 'Médicos' : (tab === 'ADMINISTRATIVO' ? 'Admin' : 'Hospitales')}
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 relative">
                <Search className="absolute left-4 top-4 h-5 w-5 text-slate-300" />
                <input
                    type="text"
                    className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-slate-50 text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase text-sm"
                    placeholder="Buscar por nombre, especialidad o dirección..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="relative">
                <Filter className="absolute left-4 top-4 h-5 w-5 text-slate-300" />
                <select
                    className="block w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl bg-slate-50 text-slate-800 font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase text-sm appearance-none"
                    value={selectedExecutive}
                    onChange={(e) => setSelectedExecutive(e.target.value)}
                    disabled={user.role === 'executive'}
                >
                    {executives.map(exec => <option key={exec} value={exec}>{exec}</option>)}
                </select>
            </div>
        </div>
      </div>

      {isFiltering ? (
          <div className="flex flex-col items-center justify-center py-32 animate-pulse">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrando base de datos...</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {itemsToShow.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/doctors/${item.id}`)}
                className="bg-white rounded-[2rem] shadow-lg border border-slate-100 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl text-white ${activeTab === 'MEDICO' ? 'bg-blue-600' : activeTab === 'ADMINISTRATIVO' ? 'bg-purple-600' : 'bg-emerald-600'}`}>
                        {activeTab === 'MEDICO' ? <Stethoscope className="h-6 w-6" /> : activeTab === 'ADMINISTRATIVO' ? <Briefcase className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                    </div>
                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-widest">{item.executive}</span>
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">{item.name}</h3>
                <p className="text-[9px] text-slate-400 font-black uppercase mt-2 tracking-wider">{item.specialty || 'GENERAL'}</p>
                <div className="mt-4 flex items-start text-[10px] text-slate-500 font-bold uppercase border-t border-slate-50 pt-4 flex-1">
                    <MapPin className="h-3 w-3 mr-2 text-slate-300 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.address}</span>
                </div>
                <div className="mt-4 flex justify-end">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <ArrowRight className="h-4 w-4" />
                    </div>
                </div>
              </div>
            ))}
          </div>
      )}

      <div ref={observerRef} className="h-10"></div>

      {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nuevo Registro</h3>
                      <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all"><X className="h-6 w-6 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleAddSubmit} className="p-8 space-y-4">
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre</label>
                          <input type="text" required className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5 font-bold uppercase text-xs" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Especialidad / Área</label>
                          <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5 font-bold uppercase text-xs" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Dirección</label>
                          <textarea rows={2} className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5 font-bold uppercase text-xs resize-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 font-black text-slate-400 uppercase text-xs">Cancelar</button>
                          <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs shadow-lg shadow-blue-500/30">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default DoctorList;

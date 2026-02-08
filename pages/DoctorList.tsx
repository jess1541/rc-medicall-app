
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doctor, ScheduleSlot, User } from '../types';
import { Search, MapPin, Stethoscope, Building2, Briefcase, Plus, X, ArrowRight, Trash2 } from 'lucide-react';

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
  
  const [formData, setFormData] = useState<Partial<Doctor>>({
      name: '',
      executive: user.role === 'executive' ? user.name : 'SIN ASIGNAR',
      specialty: '',
      address: '',
      hospital: '',
      phone: '',
      email: ''
  });

  const executives = useMemo(() => {
    const execs = new Set(doctors.map(d => d.executive));
    return ['TODOS', ...Array.from(execs).sort()];
  }, [doctors]);

  const filteredItems = useMemo(() => {
    return doctors.filter(doc => {
      const category = doc.category || 'MEDICO';
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            doc.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesExec = selectedExecutive === 'TODOS' || doc.executive === selectedExecutive;
      const matchesTab = category === activeTab;
      return matchesSearch && matchesExec && matchesTab;
    });
  }, [doctors, searchTerm, selectedExecutive, activeTab]);

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
    <div className="space-y-6 relative pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Directorio</h1>
            <p className="text-slate-500 font-medium">Gestión centralizada de contactos.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-lg font-bold text-sm active:scale-95"
            >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Nuevo
            </button>
        </div>
      </div>

      <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl w-fit">
          {(['MEDICO', 'ADMINISTRATIVO', 'HOSPITAL'] as TabType[]).map(tab => (
              <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  {tab === 'MEDICO' ? 'MÉDICOS' : (tab === 'ADMINISTRATIVO' ? 'ADMINISTRATIVOS' : 'HOSPITALES')}
              </button>
          ))}
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
            placeholder={`BUSCAR EN ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Filtro Ejecutivo</label>
            <select
                className="block w-full pl-4 pr-10 py-3 text-sm font-bold border border-slate-200 bg-slate-50 text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => navigate(`/doctors/${item.id}`)}
            className="block bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative"
          >
            <div className="flex justify-between items-start mb-4">
                <div className={`rounded-2xl p-3 text-white ${activeTab === 'MEDICO' ? 'bg-blue-500' : activeTab === 'ADMINISTRATIVO' ? 'bg-purple-500' : 'bg-emerald-500'}`}>
                    {activeTab === 'MEDICO' ? <Stethoscope className="h-6 w-6" /> : activeTab === 'ADMINISTRATIVO' ? <Briefcase className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                </div>
                {user.role === 'admin' && (
                    <button onClick={(e) => { e.stopPropagation(); onDeleteDoctor?.(item.id); }} className="p-2 text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase truncate">{item.name}</h3>
            <p className="text-xs text-slate-500 font-bold uppercase mt-2 truncate">{item.specialty || item.area || 'GENERAL'}</p>
            <div className="mt-4 flex items-start text-[10px] text-slate-400 uppercase">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="line-clamp-1">{item.address}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500">{item.executive}</span>
                <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
          </div>
        ))}
      </div>

      {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-slate-800 uppercase">Nuevo {activeTab}</h3>
                      <button onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
                  </div>
                  <form onSubmit={handleAddSubmit} className="space-y-4">
                      <input type="text" placeholder="NOMBRE COMPLETO" required className="w-full border p-3 rounded-xl uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
                      <input type="text" placeholder="ESPECIALIDAD / ÁREA" className="w-full border p-3 rounded-xl uppercase" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value.toUpperCase()})} />
                      <input type="text" placeholder="DIRECCIÓN" className="w-full border p-3 rounded-xl uppercase" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value.toUpperCase()})} />
                      <div className="flex justify-end gap-3 mt-6">
                          <button type="button" onClick={resetForm} className="px-5 py-2 font-bold text-slate-500">Cancelar</button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold uppercase">Guardar Registro</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default DoctorList;

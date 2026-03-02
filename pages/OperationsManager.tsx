import React, { useState, useMemo, useEffect } from 'react';
import { Doctor, Operation, User } from '../types';
import { ChevronLeft, ChevronRight, Plus, Check, Search, Activity, X, Trash2, DollarSign, User as UserIcon, Building2, Clock, CreditCard, LayoutList, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';

registerLocale('es', es);

interface OperationsManagerProps {
  operations: Operation[];
  doctors: Doctor[];
  onAddOperation: (op: Operation) => void;
  onUpdateOperation: (op: Operation) => void;
  onDeleteOperation: (id: string) => void;
  user: User;
}

type ViewMode = 'month' | 'week' | 'day';

const OperationsManager: React.FC<OperationsManagerProps> = ({ operations, doctors, onAddOperation, onUpdateOperation, onDeleteOperation, user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isListView, setIsListView] = useState(true); // Default to list view for mobile
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState<Partial<Operation>>({
      date: new Date().toISOString().split('T')[0],
      time: '',
      remissionNumber: '',
      hospital: '',
      doctorId: '',
      doctorName: '',
      executive: '',
      operationType: '',
      paymentType: 'DIRECTO',
      cost: 0,
      commission: 0,
      technician: '',
      notes: '',
      status: 'scheduled'
  });
  
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [displayCost, setDisplayCost] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDoctors = useMemo(() => {
      if (!searchTerm) return [];
      return doctors.filter(d => {
          const isNotArchived = d.status !== 'archived';
          const matchesCategory = d.category === 'MEDICO' || !d.category;
          const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesProfile = user.role === 'admin' || d.executive === user.name;
          return isNotArchived && matchesCategory && matchesSearch && matchesProfile;
      });
  }, [doctors, searchTerm, user]);

  useEffect(() => {
      if (formData.cost) {
          const comm = formData.cost * 0.05; 
          setFormData(prev => ({ ...prev, commission: comm }));
      } else {
          setFormData(prev => ({ ...prev, commission: 0 }));
      }
  }, [formData.cost]);

  // Sync formData when selectedOperationId changes
  useEffect(() => {
    if (selectedOperationId) {
        const op = operations.find(o => o.id === selectedOperationId);
        if (op) {
            setFormData(op);
            setDisplayCost(op.cost ? new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(op.cost) : '');
            setSearchTerm(op.doctorName);
            setIsCreating(false);
        }
    } else if (isCreating) {
        // Reset form for new operation
        setFormData({
            date: new Date().toISOString().split('T')[0],
            time: '',
            remissionNumber: '',
            hospital: '',
            doctorId: '',
            doctorName: '',
            executive: '',
            operationType: '',
            paymentType: 'DIRECTO',
            cost: 0,
            commission: 0,
            technician: '',
            notes: '',
            status: 'scheduled'
        });
        setDisplayCost('');
        setSearchTerm('');
    }
  }, [selectedOperationId, isCreating, operations]);

  // --- HELPERS ---
  const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  const parseCurrencyInput = (val: string) => {
      const cleanVal = val.replace(/[^0-9.]/g, '');
      const num = parseFloat(cleanVal);
      return isNaN(num) ? 0 : num;
  };

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const numericValue = parseCurrencyInput(rawValue);
      setFormData(prev => ({...prev, cost: numericValue}));
      setDisplayCost(rawValue); 
  };

  const handleCostBlur = () => {
      if (formData.cost) {
          setDisplayCost(new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(formData.cost));
      } else {
          setDisplayCost('');
      }
  };

  const getOperationExecutive = (doctorId: string) => {
      const doc = doctors.find(d => d.id === doctorId);
      return doc ? doc.executive : 'Desconocido';
  }

  const visibleOperations = useMemo(() => {
      let filtered = operations;
      if (user.role !== 'admin' && user.role !== 'admin_restricted') {
          filtered = operations.filter(op => {
              const doc = doctors.find(d => d.id === op.doctorId);
              return doc && doc.executive === user.name;
          });
      }
      // Sort by date descending
      return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [operations, doctors, user]);

  const handleSave = () => {
      if (!formData.doctorId || !formData.operationType) {
          alert("Seleccione un médico y el tipo de operativo.");
          return;
      }

      if (selectedOperationId && !isCreating) {
          onUpdateOperation({ ...formData, id: selectedOperationId } as Operation);
      } else {
          onAddOperation({ 
              ...formData, 
              id: `op-${Date.now()}`,
              status: 'scheduled' 
          } as Operation);
          setIsCreating(false);
          setSelectedOperationId(null); // Go back to list
      }
  };

  const handleDelete = () => {
      if (selectedOperationId && confirm("¿Está seguro de eliminar este operativo agendado permanentemente?")) {
          onDeleteOperation(selectedOperationId);
          setSelectedOperationId(null);
      }
  };

  // Master-Detail Layout
  return (
    <div className="flex h-[calc(100dvh-80px)] md:h-[calc(100dvh-40px)] overflow-hidden bg-slate-950 text-slate-200">
        
        {/* LIST PANE (Left) */}
        <div className={`flex-1 flex flex-col border-r border-slate-800 bg-slate-900/50 ${selectedOperationId || isCreating ? 'hidden md:flex md:w-1/3 lg:w-1/4 max-w-md' : 'w-full'}`}>
            {/* List Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight">Operativos</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {visibleOperations.length} Registros
                    </p>
                </div>
                <button 
                    onClick={() => { setIsCreating(true); setSelectedOperationId(null); }}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {visibleOperations.map(op => (
                    <div 
                        key={op.id}
                        onClick={() => { setSelectedOperationId(op.id); setIsCreating(false); }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] ${
                            selectedOperationId === op.id 
                            ? 'bg-indigo-600/10 border-indigo-500/50 shadow-md' 
                            : 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{op.date}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                op.status === 'performed' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                            }`}>
                                {op.status === 'performed' ? 'Realizado' : 'Programado'}
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-white uppercase mb-1">{op.doctorName}</h3>
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-400 font-medium uppercase truncate max-w-[60%]">{op.operationType}</span>
                            {op.cost && op.cost > 0 && (
                                <span className="text-xs font-black text-indigo-400">{formatCurrency(op.cost)}</span>
                            )}
                        </div>
                    </div>
                ))}
                {visibleOperations.length === 0 && (
                    <div className="p-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
                        No hay operativos registrados
                    </div>
                )}
            </div>
        </div>

        {/* DETAIL PANE (Right) */}
        <div className={`flex-1 flex flex-col bg-slate-950 ${!selectedOperationId && !isCreating ? 'hidden md:flex items-center justify-center' : 'fixed inset-0 z-50 md:static md:z-auto'}`}>
            
            {(!selectedOperationId && !isCreating) ? (
                <div className="text-center p-8 opacity-50">
                    <Activity className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Selecciona un operativo para ver detalles</p>
                </div>
            ) : (
                <div className="flex flex-col h-full bg-slate-950 md:bg-transparent animate-fadeIn">
                    {/* Detail Header */}
                    <div className="p-4 border-b border-slate-800 flex items-center gap-4 bg-slate-900 md:bg-transparent">
                        <button 
                            onClick={() => { setSelectedOperationId(null); setIsCreating(false); }}
                            className="p-2 text-slate-400 hover:text-white md:hidden"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight flex-1">
                            {isCreating ? 'Nuevo Operativo' : 'Detalles del Operativo'}
                        </h2>
                        {!isCreating && (
                            <button 
                                onClick={handleDelete}
                                className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Detail Form */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                        {/* Status Toggle */}
                        <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Estado:</span>
                            <button 
                                onClick={() => setFormData(prev => ({...prev, status: prev.status === 'scheduled' ? 'performed' : 'scheduled'}))}
                                className={`px-6 py-3 rounded-xl text-xs font-black uppercase transition-all shadow-lg ${
                                    formData.status === 'scheduled' 
                                    ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                                    : 'bg-emerald-600 text-white shadow-emerald-500/20'
                                }`}
                            >
                                {formData.status === 'scheduled' ? 'PENDIENTE' : 'REALIZADO'}
                            </button>
                        </div>

                        {/* Date & Remission */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Fecha</label>
                                <input 
                                    type="date" 
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2"># Remisión</label>
                                <div className="relative">
                                    <LayoutList className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                                    <input 
                                        type="text" 
                                        value={formData.remissionNumber || ''}
                                        onChange={e => setFormData({...formData, remissionNumber: e.target.value.toUpperCase()})}
                                        className="w-full pl-12 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase placeholder-slate-600"
                                        placeholder="REM-0000"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Doctor Search */}
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase mb-2">Médico Responsable</label>
                            <div className="relative group">
                               <Search className="absolute left-4 top-4 w-5 h-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                               <input 
                                   type="text" 
                                   placeholder="BUSCAR MÉDICO..." 
                                   value={searchTerm}
                                   onChange={e => { setSearchTerm(e.target.value.toUpperCase()); setFormData(prev => ({...prev, doctorId: ''})) }}
                                   className="w-full pl-12 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600"
                               />
                            </div>
                            {searchTerm && !formData.doctorId && (
                                <div className="mt-2 max-h-40 overflow-y-auto border border-slate-700 rounded-xl bg-slate-800 shadow-xl w-full z-20">
                                    {filteredDoctors.map(doc => (
                                        <div 
                                            key={doc.id} 
                                            onClick={() => { setFormData(prev => ({...prev, doctorId: doc.id, doctorName: doc.name, executive: doc.executive || ''})); setSearchTerm(doc.name); }}
                                            className="p-4 text-xs font-bold text-slate-300 hover:bg-indigo-600 hover:text-white cursor-pointer uppercase border-b last:border-0 border-slate-700 transition-colors"
                                        >
                                            {doc.name}
                                        </div>
                                    ))}
                                    {filteredDoctors.length === 0 && <div className="p-4 text-xs text-slate-500 text-center font-medium">No se encontraron resultados</div>}
                                </div>
                            )}
                        </div>

                        {/* Hospital & Technician */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Hospital</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                                    <input 
                                        type="text" 
                                        value={formData.hospital || ''}
                                        onChange={e => setFormData({...formData, hospital: e.target.value.toUpperCase()})}
                                        className="w-full pl-12 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600"
                                        placeholder="HOSPITAL..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Técnico</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                                    <input 
                                        type="text" 
                                        value={formData.technician || ''}
                                        onChange={e => setFormData({...formData, technician: e.target.value.toUpperCase()})}
                                        className="w-full pl-12 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600"
                                        placeholder="TÉCNICO..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Operation Type & Payment */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Tipo de Operativo</label>
                                <input 
                                    type="text" 
                                    value={formData.operationType}
                                    onChange={e => setFormData({...formData, operationType: e.target.value.toUpperCase()})}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600"
                                    placeholder="EJ: INSTRUMENTAL"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Pago</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                                    <select 
                                        value={formData.paymentType || 'DIRECTO'}
                                        onChange={e => setFormData({...formData, paymentType: e.target.value as any})}
                                        className="w-full pl-12 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white uppercase focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="DIRECTO">DIRECTO</option>
                                        <option value="ASEGURADORA">ASEGURADORA</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Costo</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                                    <input 
                                        type="text"
                                        value={displayCost}
                                        onChange={handleCostChange}
                                        onBlur={handleCostBlur}
                                        className="w-full pl-12 bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Comisión (5%)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-4 w-5 h-5 text-emerald-500" />
                                    <input 
                                        type="text"
                                        readOnly
                                        value={formData.commission ? new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(formData.commission) : '0.00'}
                                        className="w-full pl-12 bg-emerald-900/20 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-sm font-bold outline-none cursor-default"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase mb-2">Notas</label>
                            <textarea 
                                rows={3}
                                value={formData.notes}
                                onChange={e => setFormData({...formData, notes: e.target.value.toUpperCase()})}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm font-medium text-white uppercase focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-slate-600"
                                placeholder="DETALLES ADICIONALES..."
                            />
                        </div>
                        
                        {/* Spacer for mobile safe area */}
                        <div className="h-20 md:h-0"></div>
                    </div>

                    {/* Detail Footer */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-4 sticky bottom-0 z-10">
                        <button 
                            onClick={handleSave} 
                            className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" />
                            GUARDAR
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default OperationsManager;

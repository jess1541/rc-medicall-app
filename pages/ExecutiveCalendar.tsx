
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Doctor, Visit, User, TimeOffEvent } from '../types';
import { 
  ChevronLeft, ChevronRight, Plus, Search, X, 
  Clock, Coffee, CheckCircle2, 
  CalendarDays, MapPin, Edit3, CalendarClock, 
  CheckSquare, CheckCircle, Target, Users, Stethoscope, Building2, Trash2
} from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addDays, isSameDay } from 'date-fns';

registerLocale('es', es);

interface ExecutiveCalendarProps {
  doctors: Doctor[];
  timeOffEvents: TimeOffEvent[];
  onUpdateSingleDoctor: (doctor: Doctor) => void;
  onSaveTimeOff: (event: TimeOffEvent) => void;
  onDeleteTimeOff: (id: string) => void;
  onDeleteVisit: (doctorId: string, visitId: string) => void;
  user: User;
}

type ActivityType = 'VISITA' | 'CITA' | 'AUSENCIA';
type ViewMode = 'month' | 'week' | 'day';

const ExecutiveCalendar: React.FC<ExecutiveCalendarProps> = ({ 
    doctors, timeOffEvents, onUpdateSingleDoctor, onSaveTimeOff, onDeleteTimeOff, onDeleteVisit, user 
}) => {
  const location = useLocation();
  const [selectedExecutive, setSelectedExecutive] = useState(user.role === 'executive' ? user.name : 'TODOS');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  
  // Modales
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  
  // Actividad
  const [planType, setPlanType] = useState<ActivityType>('VISITA');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [searchDoctorTerm, setSearchDoctorTerm] = useState('');
  const [planObjective, setPlanObjective] = useState('');
  const [planTime, setPlanTime] = useState('09:00');
  const [planPriority, setPlanPriority] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA');

  // Reporte
  const [selectedVisitToReport, setSelectedVisitToReport] = useState<{docId: string, docName: string, visit: Visit, doctor: Doctor} | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reportOutcome, setReportOutcome] = useState('SEGUIMIENTO');
  const [reportFollowUp, setReportFollowUp] = useState('');
  const [isCompleted, setIsCompleted] = useState(true);
  
  // Seguimiento Proactivo
  const [commitmentDate, setCommitmentDate] = useState<Date | null>(null);
  const [commitmentTime, setCommitmentTime] = useState('09:00');

  useEffect(() => {
    if (planType === 'CITA') {
        setPlanObjective('CITA DE CONTACTO');
        if (planTime !== '09:00' && planTime !== '16:00') setPlanTime('09:00');
    } else if (planType === 'VISITA' && planObjective === 'CITA DE CONTACTO') {
        setPlanObjective('');
    }
  }, [planType]);

  const visitTimeSlots = useMemo(() => {
    const slots = [];
    for (let i = 8; i <= 20; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const appointmentTimeSlots = ['09:00', '16:00'];

  const listExecutives = useMemo(() => {
    const execs = new Set(doctors.map(d => d.executive));
    return ['TODOS', ...Array.from(execs).sort()];
  }, [doctors]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const execParam = params.get('exec');
    if (user.role === 'executive') setSelectedExecutive(user.name);
    else if (execParam) setSelectedExecutive(execParam);
  }, [location, user]);

  const filteredDoctorsByExecutive = useMemo(() => {
    if (selectedExecutive === 'TODOS') return doctors;
    return doctors.filter(d => d.executive === selectedExecutive);
  }, [doctors, selectedExecutive]);

  const filteredTimeOffs = useMemo(() => {
    if (selectedExecutive === 'TODOS') return timeOffEvents;
    return timeOffEvents.filter(t => t.executive === selectedExecutive);
  }, [timeOffEvents, selectedExecutive]);

  const toDateStr = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const prevPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = () => {
    if (planType === 'AUSENCIA') {
        const newToff: TimeOffEvent = {
            id: `toff-${Date.now()}`,
            executive: user.role === 'executive' ? user.name : (selectedExecutive === 'TODOS' ? 'ADMIN' : selectedExecutive),
            startDate: toDateStr(currentDate),
            endDate: toDateStr(currentDate),
            duration: 'TODO EL DÍA',
            reason: 'JUNTA',
            notes: planObjective.toUpperCase()
        };
        onSaveTimeOff(newToff);
    } else {
        if (!selectedDoctorId) return alert("Selecciona un contacto del directorio.");
        
        const doc = doctors.find(d => d.id === selectedDoctorId);
        if (!doc) return;

        const objectiveFinal = planType === 'CITA' ? 'CITA DE CONTACTO' : planObjective;
        if (!objectiveFinal.trim()) return alert("Describe un objetivo claro.");

        const newVisit: Visit = {
            id: `v-${Date.now()}`,
            date: toDateStr(currentDate),
            time: planTime,
            objective: objectiveFinal.toUpperCase(),
            outcome: planType === 'CITA' ? 'CITA' : 'PLANEADA',
            note: planType === 'CITA' ? 'CITA PROGRAMADA' : 'VISITA PLANEADA',
            status: 'planned',
            priority: planPriority
        };

        onUpdateSingleDoctor({ ...doc, visits: [...(doc.visits || []), newVisit] });
    }
    setIsPlanModalOpen(false);
    resetForms();
  };

  const resetForms = () => {
    setPlanObjective('');
    setSelectedDoctorId('');
    setSearchDoctorTerm('');
    setCommitmentDate(null);
    setPlanPriority('MEDIA');
    setPlanType('VISITA');
  };

  const openReportModal = (docId: string, docName: string, visit: Visit, doctor: Doctor) => {
    setSelectedVisitToReport({ docId, docName, visit, doctor });
    setReportNote(visit.note === 'VISITA PLANEADA' || visit.note === 'CITA PROGRAMADA' ? '' : visit.note);
    setReportOutcome(visit.outcome === 'PLANEADA' || visit.outcome === 'CITA' ? 'SEGUIMIENTO' : visit.outcome);
    setReportFollowUp(visit.followUp || '');
    // Al reportar, asumimos que se quiere marcar como completada por defecto
    setIsCompleted(true);
    setReportModalOpen(true);
  };

  const confirmDeleteVisit = () => {
    if (!selectedVisitToReport) return;
    if (window.confirm("¿Está seguro de eliminar esta visita?")) {
      onDeleteVisit(selectedVisitToReport.docId, selectedVisitToReport.visit.id);
      setReportModalOpen(false);
    }
  };

  const saveReport = () => {
    if (!selectedVisitToReport) return;
    const doc = doctors.find(d => d.id === selectedVisitToReport.docId);
    if (!doc) return;

    let updatedVisits = (doc.visits || []).map(v => {
      if (v.id === selectedVisitToReport.visit.id) {
        return {
          ...v,
          note: reportNote.toUpperCase(),
          outcome: reportOutcome as any,
          followUp: reportFollowUp.toUpperCase(),
          status: isCompleted ? 'completed' : 'planned' as any
        };
      }
      return v;
    });

    if (commitmentDate) {
        updatedVisits = [...updatedVisits, {
            id: `cv-${Date.now()}`,
            date: toDateStr(commitmentDate),
            time: commitmentTime,
            objective: reportFollowUp.toUpperCase(),
            note: `COMPROMISO: ${reportNote.substring(0, 30)}...`,
            outcome: 'COMPROMISO' as any,
            status: 'planned',
            priority: 'ALTA'
        }];
    }

    onUpdateSingleDoctor({ ...doc, visits: updatedVisits });
    setReportModalOpen(false);
  };

  const getEventsForDate = (date: Date) => {
    const dStr = toDateStr(date);
    const events: any[] = [];
    filteredDoctorsByExecutive.forEach(doc => {
      (doc.visits || []).forEach(v => {
        if (v.date === dStr) events.push({ type: 'visit', data: { docId: doc.id, docName: doc.name, visit: v, doctor: doc } });
      });
    });
    filteredTimeOffs.forEach(toff => {
        if (dStr >= toff.startDate && dStr <= toff.endDate) {
            events.push({ type: 'timeoff', data: toff });
        }
    });
    return events.sort((a, b) => (a.data.visit?.time || '00:00').localeCompare(b.data.visit?.time || '00:00'));
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50/40 border border-slate-100"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const events = getEventsForDate(date);
      const isToday = isSameDay(date, new Date());
      days.push(
        <div key={d} onClick={() => handleDayClick(date)} className={`h-32 p-2 border border-slate-100 bg-white hover:bg-blue-50/50 transition-all cursor-pointer flex flex-col group ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}>
          <div className="flex justify-between items-start mb-1">
            <span className={`text-xs font-black ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{d}</span>
            <Plus className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100" />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            {events.slice(0, 4).map((e, idx) => (
                <div key={idx} onClick={(evt) => { evt.stopPropagation(); setCurrentDate(date); setViewMode('day'); }} className={`text-[8px] p-1 rounded font-black truncate border shadow-sm ${e.type === 'timeoff' ? 'bg-orange-100 border-orange-200 text-orange-700' : (e.data.visit.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700')}`}>
                    {e.type === 'timeoff' ? e.data.reason : e.data.docName}
                </div>
            ))}
          </div>
        </div>
      );
    }
    return <div className="grid grid-cols-7 border-l border-t border-slate-100">{days}</div>;
  };

  const renderWeekView = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end: addDays(start, 6) });
    return (
      <div className="grid grid-cols-7 border-l border-t border-slate-100 min-h-[600px]">
        {days.map((day, idx) => {
          const events = getEventsForDate(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={idx} onClick={() => handleDayClick(day)} className={`p-4 border-r border-slate-100 bg-white hover:bg-slate-50/50 transition-all cursor-pointer flex flex-col group ${isToday ? 'bg-blue-50/20' : ''}`}>
               <div className="text-center mb-6 pb-4 border-b border-slate-100 relative">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{format(day, 'EEEE', { locale: es })}</p>
                 <p className={`text-2xl font-black ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>{format(day, 'd')}</p>
                 <Plus className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 text-blue-500 bg-white border border-slate-100 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm" />
               </div>
               <div className="flex-1 space-y-3">
                 {events.map((e, ei) => (
                   <div key={ei} onClick={(evt) => { evt.stopPropagation(); openReportModal(e.data.docId, e.data.docName, e.data.visit, e.data.doctor); }} className={`p-3 rounded-2xl border-l-4 shadow-sm transition-all hover:scale-105 ${e.type === 'timeoff' ? 'bg-orange-50 border-orange-500 text-orange-800' : (e.data.visit.status === 'completed' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-700')}`}>
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black opacity-60">{e.data.visit?.time || '--:--'}</span>
                        {e.data.visit?.status === 'completed' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                     </div>
                     <p className="text-[10px] font-black uppercase leading-tight truncate">{e.type === 'timeoff' ? e.data.reason : e.data.docName}</p>
                   </div>
                 ))}
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => (
    <div className="flex h-full min-h-[700px] bg-white">
        <div className="w-24 border-r border-slate-100 flex flex-col pt-6 bg-slate-50/50 flex-shrink-0">
            {visitTimeSlots.map(t => (
                <div key={t} className="h-28 text-[11px] font-black text-slate-400 text-center border-b border-slate-100/30 flex items-center justify-center">{t}</div>
            ))}
        </div>
        <div className="flex-1 relative overflow-y-auto">
            {visitTimeSlots.map((t, idx) => {
                const events = getEventsForDate(currentDate).filter(e => e.type === 'visit' && e.data.visit.time === t);
                return (
                    <div key={idx} className="h-28 border-b border-slate-100 relative group hover:bg-blue-50/10 transition-colors">
                        <button onClick={() => { setPlanTime(t); handleDayClick(currentDate); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2.5 bg-blue-600 text-white rounded-xl shadow-lg z-20 transition-all hover:scale-110 active:scale-95"><Plus className="w-4 h-4" /></button>
                        <div className="flex gap-4 p-3 h-full overflow-x-auto no-scrollbar">
                            {events.map((e, ei) => (
                                <div key={ei} onClick={() => openReportModal(e.data.docId, e.data.docName, e.data.visit, e.data.doctor)} className={`flex-shrink-0 w-80 rounded-3xl p-5 border-l-[12px] shadow-lg cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between relative overflow-hidden ${e.data.visit.status === 'completed' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : (e.data.visit.outcome === 'CITA' ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-blue-50 border-blue-500 text-blue-900')}`}>
                                    {e.data.visit.priority === 'ALTA' && <div className="absolute top-0 right-0 p-1.5 bg-red-500 text-white text-[9px] font-black uppercase rounded-bl-xl shadow-sm">Urgente</div>}
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-black text-sm uppercase truncate pr-4">{e.data.docName}</p>
                                            <div className="bg-white/40 p-1 rounded-lg">{e.data.doctor.category === 'MEDICO' ? <Stethoscope className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}</div>
                                        </div>
                                        <div className="mt-3 bg-black/5 p-2 rounded-xl border border-black/5">
                                            <p className="text-[9px] font-black uppercase text-slate-500 mb-0.5">Objetivo:</p>
                                            <p className="text-[11px] font-bold uppercase truncate">{e.data.visit.objective}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3 h-3 opacity-40" />
                                            <p className="text-[9px] font-black truncate uppercase opacity-50">{e.data.doctor.address.substring(0, 30)}...</p>
                                        </div>
                                        {e.data.visit.status === 'completed' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 gap-6">
        <div className="flex items-center gap-5">
          <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] text-white shadow-2xl shadow-blue-200"><CalendarDays className="w-10 h-10" /></div>
          <div>
            <h1 className="text-4xl font-black text-black tracking-tighter">Planificación</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 ml-1">Rutas Comerciales RC</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
            {user.role === 'admin' && (
                <div className="flex items-center bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200 shadow-inner group">
                    <Users className="w-5 h-5 text-slate-400 mr-3 group-hover:text-blue-500 transition-colors" />
                    <select value={selectedExecutive} onChange={(e) => setSelectedExecutive(e.target.value)} className="bg-transparent text-xs font-black uppercase text-slate-700 border-0 focus:ring-0 cursor-pointer">
                        {listExecutives.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                    </select>
                </div>
            )}

            <div className="bg-slate-100 p-1.5 rounded-2xl flex shadow-inner border border-slate-200/50">
                {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
                    <button key={mode} onClick={() => setViewMode(mode)} className={`px-6 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${viewMode === mode ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
                        {mode === 'month' ? 'Mensual' : mode === 'week' ? 'Semanal' : 'Diario'}
                    </button>
                ))}
            </div>

            <button onClick={() => { setPlanType('VISITA'); setIsPlanModalOpen(true); }} className="bg-slate-950 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-800 transition-all flex items-center gap-3">
                <Plus className="w-5 h-5" /> Agendar Actividad
            </button>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-sm">
              <button onClick={prevPeriod} className="p-4 bg-white hover:bg-blue-50 rounded-2xl border border-slate-100 shadow-sm transition-all active:scale-90"><ChevronLeft className="w-6 h-6 text-black"/></button>
              <div className="text-center">
                  <h2 className="text-3xl font-black text-black uppercase tracking-tight">
                      {viewMode === 'month' ? format(currentDate, 'MMMM yyyy', { locale: es }) : viewMode === 'week' ? `Semana ${format(currentDate, 'w')} - ${format(currentDate, 'MMMM', { locale: es })}` : format(currentDate, 'EEEE d MMMM', { locale: es })}
                  </h2>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Hoy: {format(new Date(), 'd MMMM yyyy', { locale: es })}</p>
              </div>
              <button onClick={nextPeriod} className="p-4 bg-white hover:bg-blue-50 rounded-2xl border border-slate-100 shadow-sm transition-all active:scale-90"><ChevronRight className="w-6 h-6 text-black"/></button>
          </div>

          <div className="flex-1 overflow-x-auto">
              {viewMode === 'month' ? (
                <>
                    <div className="grid grid-cols-7 bg-slate-100/50 border-b border-slate-100">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                        ))}
                    </div>
                    {renderMonthView()}
                </>
              ) : viewMode === 'week' ? renderWeekView() : renderDayView()}
          </div>
      </div>

      {/* MODAL PLANIFICACIÓN */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-4"><Target className="w-8 h-8 text-blue-600" /> Agendar Nueva Actividad</h3>
              </div>
              <button onClick={() => setIsPlanModalOpen(false)} className="p-4 bg-white rounded-2xl text-slate-400 hover:text-red-500 transition-all shadow-sm"><X className="w-7 h-7" /></button>
            </div>

            <div className="p-10 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
               <div className="flex p-2 bg-slate-100 rounded-3xl gap-2 shadow-inner">
                   {(['VISITA', 'CITA', 'AUSENCIA'] as ActivityType[]).map(type => (
                       <button key={type} onClick={() => setPlanType(type)} className={`flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${planType === type ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800'}`}>
                           {type}
                       </button>
                   ))}
               </div>

               {planType !== 'AUSENCIA' ? (
                   <div className="space-y-8">
                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Seleccionar Contacto del Directorio</label>
                            <div className="relative group">
                                <Search className="absolute left-6 top-5.5 h-6 w-6 text-slate-300" />
                                <input 
                                    type="text" 
                                    placeholder="BUSCAR MÉDICO POR NOMBRE..." 
                                    value={searchDoctorTerm} 
                                    onChange={(e) => { setSearchDoctorTerm(e.target.value.toUpperCase()); setSelectedDoctorId(''); }} 
                                    className="w-full pl-16 pr-6 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-black uppercase text-base text-black focus:ring-8 focus:ring-blue-500/5 outline-none shadow-inner transition-all" 
                                />
                            </div>
                            {searchDoctorTerm && !selectedDoctorId && (
                                <div className="mt-3 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 divide-y divide-slate-100">
                                    {filteredDoctorsByExecutive.filter(d => d.name.includes(searchDoctorTerm)).map(d => (
                                        <div key={d.id} onClick={() => { setSelectedDoctorId(d.id); setSearchDoctorTerm(d.name); }} className="p-6 hover:bg-blue-50 cursor-pointer transition-all flex items-center justify-between">
                                            <div>
                                                <p className="font-black text-black uppercase text-sm">{d.name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{d.specialty || 'GENERAL'} • {d.hospital || 'UBICACIÓN LIBRE'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Horario de Actividad</label>
                                <select value={planTime} onChange={(e) => setPlanTime(e.target.value)} className="w-full pl-6 pr-4 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-black text-base shadow-inner appearance-none outline-none">
                                    {(planType === 'CITA' ? appointmentTimeSlots : visitTimeSlots).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Prioridad del Negocio</label>
                                <div className="flex gap-2">
                                    {(['BAJA', 'MEDIA', 'ALTA'] as const).map(p => (
                                        <button key={p} onClick={() => setPlanPriority(p)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${planPriority === p ? (p === 'ALTA' ? 'bg-red-500 text-white border-red-500' : 'bg-blue-600 text-white border-blue-600') : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{p}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Objetivo Estratégico</label>
                            <textarea 
                                rows={3} 
                                value={planType === 'CITA' ? 'CITA DE CONTACTO' : planObjective} 
                                onChange={(e) => setPlanObjective(e.target.value.toUpperCase())} 
                                readOnly={planType === 'CITA'}
                                className={`w-full border border-slate-200 rounded-3xl p-6 font-black text-black text-sm outline-none shadow-inner uppercase resize-none ${planType === 'CITA' ? 'bg-slate-100 italic' : 'bg-white'}`} 
                                placeholder="DESCRIBA EL PROPÓSITO..." 
                            />
                        </div>
                   </div>
               ) : (
                   <div className="space-y-8 animate-fadeIn">
                       <div>
                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Motivo de la Ausencia</label>
                            <div className="grid grid-cols-2 gap-4">
                                {['VACACIONES', 'JUNTA', 'CAPACITACIÓN', 'PERMISO'].map(r => (
                                    <button key={r} onClick={() => setPlanObjective(r)} className={`p-6 rounded-[2rem] border text-xs font-black uppercase tracking-widest transition-all ${planObjective === r ? 'bg-orange-500 text-white border-orange-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{r}</button>
                                ))}
                            </div>
                       </div>
                   </div>
               )}
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-6 items-center">
              <button onClick={() => setIsPlanModalOpen(false)} className="px-10 py-5 font-black text-slate-400 uppercase text-[11px] tracking-[0.3em]">Descartar</button>
              <button onClick={handleSavePlan} className="bg-blue-600 text-white px-14 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-blue-700 transition-all flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5" /> Guardar Cita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REPORTE */}
      {reportModalOpen && selectedVisitToReport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-fadeIn border border-white/20">
            <div className="p-10 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black text-black tracking-tighter uppercase flex items-center gap-4"><CheckCircle className="w-8 h-8 text-emerald-600" /> Reportar Visita</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1 ml-12">{selectedVisitToReport.docName}</p>
              </div>
              <button onClick={() => setReportModalOpen(false)} className="p-4 bg-white rounded-2xl text-slate-400 hover:text-red-500 shadow-sm transition-all"><X className="w-7 h-7" /></button>
            </div>
            
            <div className="p-10 space-y-8 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 shadow-inner">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}><CheckSquare className="w-6 h-6"/></div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest">¿Visita Realizada?</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer scale-125">
                    <input type="checkbox" checked={isCompleted} onChange={(e) => setIsCompleted(e.target.checked)} className="sr-only peer" />
                    <div className="w-14 h-7 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1">Estatus de la Gestión</label>
                <select value={reportOutcome} onChange={(e) => setReportOutcome(e.target.value)} className="w-full border border-slate-200 rounded-[1.5rem] p-5 font-black text-black text-base bg-slate-50 shadow-inner focus:ring-4 focus:ring-blue-500/5 outline-none">
                    <option value="SEGUIMIENTO">EN SEGUIMIENTO COMERCIAL</option>
                    <option value="COTIZACIÓN">COTIZACIÓN / PRESUPUESTO ENTREGADO</option>
                    <option value="INTERESADO">MÉDICO MUY INTERESADO (PROSPECTO A)</option>
                    <option value="PROGRAMAR PROCEDIMIENTO">PENDIENTE DEFINIR FECHA QUIRÚRGICA</option>
                    <option value="AUSENTE">MÉDICO AUSENTE / NO ENCONTRADO</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2"><Edit3 className="w-4 h-4 text-blue-500" />Reporte Detallado</label>
                <textarea rows={4} value={reportNote} onChange={(e) => setReportNote(e.target.value.toUpperCase())} className="w-full bg-white border border-slate-200 rounded-[2rem] p-6 font-black text-black text-sm uppercase resize-none shadow-inner" placeholder="DESCRIBA LOS PUNTOS CLAVE..." />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-1 flex items-center gap-2"><Target className="w-4 h-4 text-rose-500" />Próximo Paso</label>
                <textarea rows={2} value={reportFollowUp} onChange={(e) => setReportFollowUp(e.target.value.toUpperCase())} className="w-full bg-white border border-slate-200 rounded-2xl p-6 font-black text-black text-sm uppercase resize-none shadow-inner" placeholder="¿QUÉ SIGUE?" />
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-6">
              <button onClick={confirmDeleteVisit} className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase hover:bg-red-50 px-4 py-2 rounded-xl transition-all"><Trash2 className="w-4 h-4"/> Eliminar</button>
              <div className="flex gap-4">
                <button onClick={() => setReportModalOpen(false)} className="px-10 py-5 font-black text-slate-400 uppercase text-[11px] tracking-[0.3em]">Cerrar</button>
                <button onClick={saveReport} className="bg-emerald-600 text-white px-14 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5" /> Finalizar Reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveCalendar;

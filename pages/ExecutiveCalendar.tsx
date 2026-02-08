
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Doctor, Visit, User, TimeOffEvent } from '../types';
import { 
  ChevronLeft, ChevronRight, Plus, Search, Calendar, X, 
  Clock, Coffee, CheckCircle2, User as UserIcon, Trash2, 
  Building, Briefcase, CalendarDays, Star, MapPin, Lock, AlertTriangle,
  Stethoscope 
} from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import es from 'date-fns/locale/es';

registerLocale('es', es);

interface ExecutiveCalendarProps {
  doctors: Doctor[];
  onUpdateDoctors: (doctors: Doctor[]) => void;
  onDeleteVisit: (doctorId: string, visitId: string) => void;
  user: User;
}

type ViewMode = 'month' | 'week' | 'day';
type EventType = 'visita' | 'cita' | 'ausencia';

const ExecutiveCalendar: React.FC<ExecutiveCalendarProps> = ({ doctors, onUpdateDoctors, onDeleteVisit, user }) => {
  const location = useLocation();
  const [selectedExecutive, setSelectedExecutive] = useState(user.role === 'executive' ? user.name : '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isDragging, setIsDragging] = useState(false);

  // Modales
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // Formulario de Agendado
  const [eventType, setEventType] = useState<EventType>('visita');
  const [planDate, setPlanDate] = useState(new Date());
  const [planTime, setPlanTime] = useState('09:00');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [searchDoctorTerm, setSearchDoctorTerm] = useState('');
  const [planObjective, setPlanObjective] = useState('');
  const [absenceReason, setAbsenceReason] = useState('VACACIONES');

  const TIMEOFF_STORAGE_KEY = 'rc_medicall_timeoff_v5';
  const [timeOffEvents, setTimeOffEvents] = useState<TimeOffEvent[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const execParam = params.get('exec');
    if (user.role === 'executive') setSelectedExecutive(user.name);
    else if (execParam) setSelectedExecutive(execParam);
    else if (executives.length > 0 && !selectedExecutive) setSelectedExecutive(executives[0]);
    
    const stored = localStorage.getItem(TIMEOFF_STORAGE_KEY);
    if (stored) setTimeOffEvents(JSON.parse(stored));
  }, [location, user]);

  const executives = useMemo(() => Array.from(new Set(doctors.map(d => d.executive))).sort(), [doctors]);
  const myDoctors = useMemo(() => doctors.filter(d => d.executive === selectedExecutive), [doctors, selectedExecutive]);
  
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 8; i <= 20; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const filteredDoctors = useMemo(() => {
    if (!searchDoctorTerm) return [];
    return myDoctors.filter(d => 
      d.name.toLowerCase().includes(searchDoctorTerm.toLowerCase()) ||
      (d.specialty || '').toLowerCase().includes(searchDoctorTerm.toLowerCase())
    );
  }, [myDoctors, searchDoctorTerm]);

  const toDateStr = (date: Date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const allEvents = useMemo(() => {
    const events: any[] = [];
    myDoctors.forEach(doc => {
      (doc.visits || []).forEach(v => {
        events.push({ 
          type: 'visit', 
          data: v, 
          docName: doc.name, 
          docId: doc.id, 
          doctor: doc,
          isLocked: v.outcome === 'CITA' 
        });
      });
    });
    timeOffEvents.filter(t => t.executive === selectedExecutive).forEach(toff => {
      events.push({ 
        type: 'absence', 
        data: toff, 
        isLocked: false 
      });
    });
    return events;
  }, [myDoctors, timeOffEvents, selectedExecutive]);

  const getEventsForDay = (date: Date) => {
    const dStr = toDateStr(date);
    return allEvents.filter(e => {
      if (e.type === 'absence') return dStr >= e.data.startDate && dStr <= e.data.endDate;
      return e.data.date === dStr;
    }).sort((a, b) => (a.data.time || '00:00').localeCompare(b.data.time || '00:00'));
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

  const handleSaveEvent = () => {
    if (eventType === 'ausencia') {
      const newToff: TimeOffEvent = {
        id: `toff-${Date.now()}`,
        executive: selectedExecutive,
        startDate: toDateStr(planDate),
        endDate: toDateStr(planDate),
        duration: 'TODO EL DÍA',
        reason: (absenceReason as any) || 'PERMISO',
        notes: planObjective
      };
      const updated = [...timeOffEvents, newToff];
      setTimeOffEvents(updated);
      localStorage.setItem(TIMEOFF_STORAGE_KEY, JSON.stringify(updated));
    } else {
      if (!selectedDoctorId || !planObjective) return alert("Médico y Objetivo son obligatorios");
      const newVisit: Visit = {
        id: `v-${Date.now()}`,
        date: toDateStr(planDate),
        time: planTime,
        objective: planObjective.toUpperCase(),
        outcome: eventType === 'cita' ? 'CITA' : 'PLANEADA',
        note: eventType === 'cita' ? 'CITA PROGRAMADA' : 'VISITA PLANEADA',
        status: 'planned'
      };
      const updatedDocs = doctors.map(d => d.id === selectedDoctorId ? { ...d, visits: [...(d.visits || []), newVisit] } : d);
      onUpdateDoctors(updatedDocs);
    }
    setIsPlanModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedDoctorId('');
    setSearchDoctorTerm('');
    setPlanObjective('');
    setPlanTime('09:00');
    setEventType('visita');
  };

  const handleDragStart = (e: React.DragEvent, eventObj: any) => {
    if (eventObj.isLocked) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", JSON.stringify(eventObj));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => setIsDragging(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setIsDragging(false);
    try {
      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;
      const eventObj = JSON.parse(data);
      const newDateStr = toDateStr(targetDate);

      if (eventObj.type === 'absence') {
        const updated = timeOffEvents.map(t => 
          t.id === eventObj.data.id ? { ...t, startDate: newDateStr, endDate: newDateStr } : t
        );
        setTimeOffEvents(updated);
        localStorage.setItem(TIMEOFF_STORAGE_KEY, JSON.stringify(updated));
      } else {
        const updatedDocs = doctors.map(doc => {
          if (doc.id === eventObj.docId) {
            const updatedVisits = doc.visits.map(v => 
              v.id === eventObj.data.id ? { ...v, date: newDateStr } : v
            );
            return { ...doc, visits: updatedVisits };
          }
          return doc;
        });
        onUpdateDoctors(updatedDocs);
      }
    } catch (err) {
      console.error("Drop error", err);
    }
  };

  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    try {
      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;
      const eventObj = JSON.parse(data);
      
      if (eventObj.isLocked) {
        alert("Las CITAS no pueden ser eliminadas una vez programadas.");
        return;
      }

      if (window.confirm("¿Seguro que deseas eliminar este evento del calendario?")) {
        if (eventObj.type === 'absence') {
          const updated = timeOffEvents.filter(t => t.id !== eventObj.data.id);
          setTimeOffEvents(updated);
          localStorage.setItem(TIMEOFF_STORAGE_KEY, JSON.stringify(updated));
        } else {
          onDeleteVisit(eventObj.docId, eventObj.data.id);
        }
      }
    } catch (err) {}
  };

  const renderEventChip = (e: any, idx: number) => {
    const isCita = e.type === 'visit' && e.data.outcome === 'CITA';
    const isAbsence = e.type === 'absence';
    const isCompleted = e.type === 'visit' && e.data.status === 'completed';

    return (
      <div 
        key={idx} 
        draggable={!e.isLocked}
        onDragStart={(ev) => handleDragStart(ev, e)}
        onDragEnd={handleDragEnd}
        onClick={(ev) => { ev.stopPropagation(); setSelectedEvent(e); setIsDetailModalOpen(true); }} 
        className={`text-[8px] p-1.5 rounded-lg font-black truncate border shadow-sm transition-all group flex items-center gap-1 mb-1 ${
          isAbsence ? 'bg-orange-100 text-orange-700 border-orange-200 cursor-grab active:cursor-grabbing' : 
          isCita ? 'bg-pink-600 text-white border-transparent cursor-default' :
          isCompleted ? 'bg-emerald-500 text-white border-transparent cursor-grab active:cursor-grabbing' : 
          'bg-blue-600 text-white border-transparent cursor-grab active:cursor-grabbing'
        } ${!e.isLocked ? 'hover:scale-[1.02] hover:brightness-110' : ''}`}
      >
        {e.isLocked ? <Lock className="w-2 h-2" /> : (isAbsence ? <Coffee className="w-2 h-2" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>)}
        <span className="flex-1 truncate">
          {isAbsence ? `[ABS] ${e.data.reason}` : `${e.data.time || ''} ${e.docName}`}
        </span>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50/30 border border-slate-100"></div>);
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const dayEvents = getEventsForDay(dayDate);
      const isToday = dayDate.toDateString() === new Date().toDateString();
      
      days.push(
        <div 
          key={i} 
          onDragOver={handleDragOver}
          onDrop={(ev) => handleDrop(ev, dayDate)}
          onClick={() => { setPlanDate(dayDate); setIsPlanModalOpen(true); }} 
          className={`h-32 bg-white border border-slate-100 p-1 hover:bg-blue-50/20 transition-colors cursor-pointer group flex flex-col ${isToday ? 'ring-1 ring-inset ring-blue-500 bg-blue-50/10' : ''}`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className={`text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{i}</span>
            <Plus className="w-3 h-3 text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-0.5">
            {dayEvents.map((e, idx) => renderEventChip(e, idx))}
          </div>
        </div>
      );
    }
    return <div className="grid grid-cols-7 border-l border-t border-slate-100">{days}</div>;
  };

  const renderWeekView = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    const days = Array.from({length: 7}).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    return (
      <div className="grid grid-cols-7 h-full overflow-y-auto border-l border-slate-100 bg-slate-50/20">
        {days.map((day, idx) => (
          <div 
            key={idx} 
            onDragOver={handleDragOver}
            onDrop={(ev) => handleDrop(ev, day)}
            className="border-r border-slate-100 min-h-[500px] flex flex-col"
          >
            <div className="p-3 border-b border-slate-100 text-center bg-white sticky top-0 z-10 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day.toLocaleDateString('es-ES', { weekday: 'short' })}</p>
              <p className={`text-sm font-black mt-0.5 ${day.toDateString() === new Date().toDateString() ? 'text-blue-600' : 'text-slate-800'}`}>{day.getDate()}</p>
            </div>
            <div className="p-1.5 space-y-1 flex-1">
              {getEventsForDay(day).map((e, idx) => (
                <div 
                  key={idx} 
                  draggable={!e.isLocked}
                  onDragStart={(ev) => handleDragStart(ev, e)}
                  onDragEnd={handleDragEnd}
                  onClick={() => { setSelectedEvent(e); setIsDetailModalOpen(true); }} 
                  className={`p-2.5 rounded-xl text-[9px] font-bold border cursor-pointer shadow-sm transition-all group ${
                    e.type === 'absence' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                    e.data.outcome === 'CITA' ? 'bg-pink-100 text-pink-700 border-pink-200' :
                    e.data.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                    'bg-blue-50 text-blue-700 border-blue-200'
                  } ${!e.isLocked ? 'hover:scale-[1.02] hover:bg-white' : ''}`}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="opacity-70">{e.data.time || '8:00'}</span>
                    {e.isLocked ? <Lock className="w-3 h-3 text-pink-400" /> : (e.data.outcome === 'CITA' && <Star className="w-3 h-3 fill-pink-500" />)}
                  </div>
                  <p className="truncate uppercase font-black">{e.type === 'absence' ? e.data.reason : e.docName}</p>
                  {e.type !== 'absence' && <p className="text-[8px] text-slate-400 truncate mt-1 italic">"{e.data.objective}"</p>}
                </div>
              ))}
              <button onClick={() => { setPlanDate(day); setIsPlanModalOpen(true); }} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-300 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-400 transition-all flex flex-col items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                <span className="text-[9px] font-black uppercase tracking-tighter">Programar</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Header Toolbar */}
      <div className="flex flex-col xl:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-600" />
            Agenda RC
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
            {selectedExecutive} • {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <div 
            onDragOver={handleDragOver}
            onDrop={handleTrashDrop}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-dashed transition-all ${isDragging ? 'bg-red-50 border-red-500 text-red-500 scale-110 shadow-lg shadow-red-200' : 'bg-slate-50 border-slate-200 text-slate-300 hover:border-red-300 hover:text-red-300'}`}
            title="Arrastra aquí para eliminar visitas o ausencias"
          >
            <Trash2 className="w-6 h-6" />
          </div>

          <div className="bg-slate-100 p-1.5 rounded-2xl flex shadow-inner border border-slate-200/50">
            {(['month', 'week', 'day'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)} className={`px-6 py-2.5 text-xs font-black uppercase rounded-xl transition-all ${viewMode === v ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>{v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}</button>
            ))}
          </div>
          
          <button onClick={() => { setPlanDate(new Date()); setIsPlanModalOpen(true); }} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Agendar Evento
          </button>
        </div>
      </div>

      {/* Main Calendar Body */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[650px] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/40 backdrop-blur-sm">
          <button onClick={prevPeriod} className="p-3 bg-white hover:bg-blue-50 rounded-2xl shadow-sm transition-all border border-slate-100"><ChevronLeft className="w-6 h-6 text-slate-600" /></button>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-500" />
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', day: viewMode === 'day' ? 'numeric' : undefined })}
          </h2>
          <button onClick={nextPeriod} className="p-3 bg-white hover:bg-blue-50 rounded-2xl shadow-sm transition-all border border-slate-100"><ChevronRight className="w-6 h-6 text-slate-600" /></button>
        </div>

        <div className="flex-1">
          {viewMode === 'month' ? (
            <>
              <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                  <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{d}</div>
                ))}
              </div>
              {renderMonthView()}
            </>
          ) : viewMode === 'week' ? renderWeekView() : (
            <div className="p-8 space-y-6 max-w-4xl mx-auto h-full overflow-y-auto">
              {getEventsForDay(currentDate).length > 0 ? getEventsForDay(currentDate).map((e, i) => (
                <div key={i} onClick={() => { setSelectedEvent(e); setIsDetailModalOpen(true); }} className={`flex items-center gap-8 p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-lg hover:shadow-2xl transition-all group cursor-pointer border-l-[12px] ${
                  e.type === 'absence' ? 'border-l-orange-500' : 
                  e.data.outcome === 'CITA' ? 'border-l-pink-600' : 
                  e.data.status === 'completed' ? 'border-l-emerald-500' : 'border-l-blue-600'
                }`}>
                  <div className="text-center min-w-[100px] border-r border-slate-100 pr-8">
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{e.data.time || 'TODO EL DÍA'}</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${e.data.status === 'completed' ? 'text-emerald-500' : 'text-slate-400'}`}>{e.data.status === 'completed' ? 'Realizado' : 'Pendiente'}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                       <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{e.type === 'absence' ? e.data.reason : e.docName}</h3>
                       {e.isLocked && <Lock className="w-4 h-4 text-pink-500" />}
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-2 flex items-center gap-2">
                      {e.type === 'absence' ? <Briefcase className="w-4 h-4 text-orange-400" /> : <Building className="w-4 h-4 text-blue-400" />}
                      {e.type === 'absence' ? e.data.duration : e.doctor?.hospital || e.doctor?.address}
                    </p>
                    {e.data.objective && <p className="mt-3 text-sm text-slate-600 font-medium italic">"{e.data.objective}"</p>}
                  </div>
                  <div className={`p-5 rounded-2xl transition-transform group-hover:scale-110 ${e.type === 'absence' ? 'bg-orange-100 text-orange-600' : e.data.outcome === 'CITA' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                    {e.type === 'absence' ? <Coffee className="w-8 h-8" /> : e.data.outcome === 'CITA' ? <Star className="w-8 h-8 fill-pink-600" /> : <UserIcon className="w-8 h-8" />}
                  </div>
                </div>
              )) : (
                <div className="text-center py-48 bg-slate-50/50 rounded-[4rem] border-4 border-dashed border-slate-100">
                  <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl border border-slate-100 text-slate-200">
                    <Calendar className="w-12 h-12" />
                  </div>
                  <p className="text-2xl font-black text-slate-300 uppercase tracking-widest">Día sin eventos</p>
                  <button onClick={() => setIsPlanModalOpen(true)} className="mt-8 bg-white border border-slate-200 px-10 py-4 rounded-2xl text-blue-600 font-black uppercase text-xs shadow-sm hover:shadow-md transition-all active:scale-95">+ Agendar Nuevo Evento</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PLAN MODAL */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-fadeIn border border-white/20">
            <div className={`p-8 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r ${eventType === 'cita' ? 'from-pink-50 to-white' : eventType === 'ausencia' ? 'from-orange-50 to-white' : 'from-blue-50 to-white'}`}>
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  {eventType === 'cita' ? <Star className="w-6 h-6 text-pink-600 fill-pink-600" /> : eventType === 'ausencia' ? <Coffee className="w-6 h-6 text-orange-600" /> : <CalendarDays className="w-6 h-6 text-blue-600" />}
                  Agendar Nuevo Evento
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 ml-9">Defina los detalles del evento</p>
              </div>
              <button onClick={() => setIsPlanModalOpen(false)} className="p-3 bg-slate-200/40 rounded-2xl text-slate-500 hover:text-slate-800 transition-all"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                {(['visita', 'cita', 'ausencia'] as EventType[]).map(t => (
                  <button key={t} onClick={() => setEventType(t)} className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${eventType === t ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {eventType !== 'ausencia' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Seleccionar Médico o Contacto</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-4 h-5 w-5 text-slate-300" />
                      <input 
                        type="text" 
                        placeholder="BUSCAR POR NOMBRE O ESPECIALIDAD..." 
                        value={searchDoctorTerm} 
                        onChange={(e) => { setSearchDoctorTerm(e.target.value); setSelectedDoctorId(''); }} 
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold uppercase text-sm focus:ring-2 focus:ring-blue-500 transition-all shadow-inner outline-none" 
                      />
                    </div>
                    {searchDoctorTerm && !selectedDoctorId && (
                      <div className="mt-3 max-h-52 overflow-y-auto bg-white border border-slate-100 rounded-2xl shadow-2xl z-30 divide-y divide-slate-50">
                        {filteredDoctors.map(d => (
                          <div key={d.id} onClick={() => { setSelectedDoctorId(d.id); setSearchDoctorTerm(d.name); }} className="p-4 hover:bg-blue-50 cursor-pointer transition-colors group">
                            <div className="flex justify-between items-center">
                              <p className="font-black text-slate-800 uppercase text-xs group-hover:text-blue-600">{d.name}</p>
                              <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded text-slate-400 uppercase">{d.category}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold mt-1 flex items-center gap-1"><Stethoscope className="w-3 h-3"/>{d.specialty || 'General'} • {d.hospital || d.address}</p>
                          </div>
                        ))}
                        {filteredDoctors.length === 0 && <p className="p-6 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">Sin resultados</p>}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Fecha del Evento</label>
                      <DatePicker selected={planDate} onChange={(d) => d && setPlanDate(d)} dateFormat="dd/MM/yyyy" locale="es" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-700 outline-none shadow-inner" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Horario Estimado</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-4 h-4 w-4 text-slate-300 pointer-events-none" />
                        <select value={planTime} onChange={(e) => setPlanTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pl-11 font-black text-slate-700 outline-none shadow-inner appearance-none">
                          {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Motivo de Ausencia</label>
                      <select value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-700 outline-none shadow-inner appearance-none">
                        <option value="VACACIONES">VACACIONES</option>
                        <option value="JUNTA">JUNTA DE EQUIPO</option>
                        <option value="CAPACITACIÓN">CAPACITACIÓN</option>
                        <option value="PERMISO">PERMISO ESPECIAL</option>
                        <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Día Solicitado</label>
                      <DatePicker selected={planDate} onChange={(d) => d && setPlanDate(d)} dateFormat="dd/MM/yyyy" locale="es" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-slate-700 outline-none shadow-inner" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Objetivo del Evento</label>
                <textarea rows={3} value={planObjective} onChange={(e) => setPlanObjective(e.target.value.toUpperCase())} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 font-bold text-slate-700 outline-none shadow-inner uppercase text-sm resize-none" placeholder="DESCRIBA QUÉ ESPERA LOGRAR EN ESTA ACTIVIDAD..." />
              </div>

              {eventType === 'cita' && (
                <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100 flex gap-4">
                  <div className="p-2 bg-pink-100 rounded-xl flex-shrink-0 h-fit">
                    <AlertTriangle className="w-5 h-5 text-pink-600" />
                  </div>
                  <p className="text-[10px] font-bold text-pink-700 leading-relaxed uppercase">
                    Aviso: Las CITAS programadas se consideran compromisos inamovibles. No podrán ser movidas ni eliminadas del calendario una vez confirmadas.
                  </p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <button onClick={() => setIsPlanModalOpen(false)} className="px-8 py-3.5 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-600 transition-all">Descartar</button>
              <button onClick={handleSaveEvent} className={`px-10 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 ${eventType === 'cita' ? 'bg-pink-600 text-white shadow-pink-500/20' : 'bg-blue-600 text-white shadow-blue-500/20'}`}>Confirmar Evento</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn border border-white/10">
            <div className={`p-10 ${selectedEvent.type === 'absence' ? 'bg-orange-500' : selectedEvent.data.outcome === 'CITA' ? 'bg-pink-600' : 'bg-blue-600'} text-white relative`}>
              <div className="flex justify-between items-start">
                <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md">
                  {selectedEvent.type === 'absence' ? <Coffee className="w-10 h-10" /> : selectedEvent.data.outcome === 'CITA' ? <Star className="w-10 h-10 fill-white" /> : <CalendarDays className="w-10 h-10" />}
                </div>
                <button onClick={() => setIsDetailModalOpen(false)} className="p-3 bg-black/10 rounded-2xl text-white/80 hover:text-white hover:bg-black/20 transition-all"><X className="w-6 h-6" /></button>
              </div>
              <div className="mt-8">
                 <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedEvent.type === 'absence' ? selectedEvent.data.reason : selectedEvent.docName}</h3>
                 <div className="flex items-center gap-3 mt-4">
                    <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{selectedEvent.data.date || selectedEvent.data.startDate}</span>
                    <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Clock className="w-3 h-3"/>{selectedEvent.data.time || 'TODO EL DÍA'}</span>
                 </div>
              </div>
            </div>
            
            <div className="p-10 space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Objetivo del Evento</p>
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                   <p className="text-slate-800 font-bold uppercase leading-relaxed text-sm">"{selectedEvent.type === 'absence' ? (selectedEvent.data.notes || 'REGISTRO DE AUSENCIA LABORAL') : (selectedEvent.data.objective || 'VISITA DE SEGUIMIENTO ESTÁNDAR')}"</p>
                </div>
              </div>
              
              {selectedEvent.doctor && (
                <div className="flex items-start gap-5 pt-6 border-t border-slate-50">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-500">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ubicación / Dirección</p>
                    <p className="text-slate-700 font-black text-xs uppercase leading-tight">{selectedEvent.doctor.hospital || 'Consultorio Privado'}</p>
                    <p className="text-slate-400 font-medium text-[10px] uppercase mt-1">{selectedEvent.doctor.address}</p>
                  </div>
                </div>
              )}

              {selectedEvent.isLocked && (
                <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100 flex items-center gap-3">
                   <Lock className="w-5 h-5 text-pink-500" />
                   <span className="text-[10px] font-black text-pink-700 uppercase tracking-widest">Este evento está bloqueado y no puede ser movido</span>
                </div>
              )}
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
              {(!selectedEvent.isLocked && selectedEvent.type !== 'absence') && (
                <button 
                  onClick={() => {
                    if (window.confirm("¿Seguro que deseas eliminar esta visita?")) {
                      onDeleteVisit(selectedEvent.docId, selectedEvent.data.id);
                      setIsDetailModalOpen(false);
                    }
                  }}
                  className="flex-1 py-4 bg-white border border-red-100 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              )}
              <button onClick={() => setIsDetailModalOpen(false)} className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm transition-all active:scale-95 ${selectedEvent.isLocked ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveCalendar;

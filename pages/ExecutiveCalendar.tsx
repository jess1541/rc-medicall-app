
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Doctor, Visit, User, TimeOffEvent } from '../types';
import { ChevronLeft, ChevronRight, Plus, Search, Calendar, X, Lock, Clock, Coffee, CheckCircle2, Trash2, Building } from 'lucide-react';
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

const ExecutiveCalendar: React.FC<ExecutiveCalendarProps> = ({ doctors, onUpdateDoctors, onDeleteVisit, user }) => {
  const location = useLocation();
  const [selectedExecutive, setSelectedExecutive] = useState(user.role === 'executive' ? user.name : '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [isDragging, setIsDragging] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAppointmentMode, setIsAppointmentMode] = useState(false); 
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [searchDoctorTerm, setSearchDoctorTerm] = useState('');
  const [planObjective, setPlanObjective] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('09:00');

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedVisitToReport, setSelectedVisitToReport] = useState<{docId: string, visit: Visit} | null>(null);
  
  // Reporting fields
  const [reportNote, setReportNote] = useState('');
  const [reportOutcome, setReportOutcome] = useState('SEGUIMIENTO');
  const [reportFollowUp, setReportFollowUp] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportTime, setReportTime] = useState('');
  const [nextVisitDate, setNextVisitDate] = useState<Date | null>(null);
  const [nextVisitTime, setNextVisitTime] = useState('09:00');

  const [timeOffEvents, setTimeOffEvents] = useState<TimeOffEvent[]>([]);
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [newTimeOff, setNewTimeOff] = useState<Partial<TimeOffEvent>>({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      duration: 'TODO EL DÍA',
      reason: 'JUNTA',
      notes: ''
  });

  const TIMEOFF_STORAGE_KEY = 'rc_medicall_timeoff_v5';

  const visitTimeSlots = useMemo(() => {
      const slots = [];
      for (let hour = 9; hour <= 20; hour++) {
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
          if (hour !== 20) slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      return slots;
  }, []);
  
  const appointmentTimeSlots = ['09:00', '16:00'];

  const executives = useMemo(() => {
    const execs = new Set(doctors.map(d => d.executive));
    return Array.from(execs).sort();
  }, [doctors]);

  useEffect(() => {
      if (user.role === 'executive') {
          setSelectedExecutive(user.name);
      } else {
          const params = new URLSearchParams(location.search);
          const execParam = params.get('exec');
          if (execParam) setSelectedExecutive(execParam);
          else if (!selectedExecutive && executives.length > 0) setSelectedExecutive(executives[0]);
      }
  }, [location, executives, selectedExecutive, user]);

  useEffect(() => {
      const storedTimeOff = localStorage.getItem(TIMEOFF_STORAGE_KEY);
      if (storedTimeOff) setTimeOffEvents(JSON.parse(storedTimeOff));
  }, []);

  const myDoctors = useMemo(() => doctors.filter(d => d.executive === selectedExecutive), [doctors, selectedExecutive]);
  const myTimeOffs = useMemo(() => timeOffEvents.filter(t => t.executive === selectedExecutive), [timeOffEvents, selectedExecutive]);

  const filteredDoctorsForModal = useMemo(() => {
      if (!searchDoctorTerm) return [];
      return myDoctors.filter(d => d.name.toLowerCase().includes(searchDoctorTerm.toLowerCase()));
  }, [myDoctors, searchDoctorTerm]);

  const toLocalDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const getEventsForDate = (date: Date) => {
      const dateStr = toLocalDateString(date);
      const events: { type: 'visit' | 'timeoff', data: any }[] = [];
      
      myDoctors.forEach(doc => {
          (doc.visits || []).forEach(visit => {
              if (visit.date === dateStr) {
                  events.push({ type: 'visit', data: { docId: doc.id, docName: doc.name, docCategory: doc.category, visit, address: doc.address } });
              }
          });
      });

      myTimeOffs.forEach(toff => {
          if (dateStr >= toff.startDate && dateStr <= toff.endDate) {
              events.push({ type: 'timeoff', data: toff });
          }
      });

      return events.sort((a, b) => {
          if (a.type === 'visit' && b.type === 'visit') {
              return (a.data.visit.time || '23:59').localeCompare(b.data.visit.time || '23:59');
          }
          return 0;
      });
  };

  const handleDayClick = (date: Date, asAppointment = false) => {
      setPlanDate(toLocalDateString(date));
      setIsAppointmentMode(asAppointment);
      setIsModalOpen(true); 
      setSelectedDoctorId('');
      setSearchDoctorTerm('');
      setPlanObjective(asAppointment ? 'CITA DE CONTACTO' : '');
      setAppointmentTime('09:00');
  };

  const handleOpenTimeOffModal = () => {
    setNewTimeOff({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      duration: 'TODO EL DÍA',
      reason: 'JUNTA',
      notes: ''
    });
    setIsTimeOffModalOpen(true);
  };

  const savePlan = () => {
      if (!selectedDoctorId || !planObjective.trim()) {
          alert("Doctor y Objetivo son obligatorios.");
          return;
      }
      
      const updatedDoctors = doctors.map(doc => {
          if (doc.id === selectedDoctorId) {
              const newVisit: Visit = {
                  id: Date.now().toString(),
                  date: planDate,
                  time: appointmentTime,
                  note: isAppointmentMode ? 'CITA PROGRAMADA' : 'VISITA PLANEADA',
                  objective: planObjective.toUpperCase(),
                  outcome: isAppointmentMode ? 'CITA' : 'PLANEADA',
                  status: 'planned'
              };
              return { ...doc, visits: [newVisit, ...(doc.visits || [])] };
          }
          return doc;
      });

      onUpdateDoctors(updatedDoctors);
      setIsModalOpen(false);
  };

  const openReportModal = (docId: string, visit: Visit) => {
      if (visit.outcome === 'CITA') return;
      setSelectedVisitToReport({ docId, visit });
      setReportNote(visit.note || '');
      setReportOutcome('SEGUIMIENTO');
      setReportFollowUp(visit.followUp || '');
      setReportDate(visit.date);
      setReportTime(visit.time || '');
      setReportModalOpen(true);
  };

  const handleSaveTimeOff = () => {
    const event: TimeOffEvent = {
        id: `toff-${Date.now()}`,
        executive: selectedExecutive,
        startDate: newTimeOff.startDate || toLocalDateString(new Date()),
        endDate: newTimeOff.endDate || toLocalDateString(new Date()),
        duration: newTimeOff.duration as any || 'TODO EL DÍA',
        reason: newTimeOff.reason as any || 'JUNTA',
        notes: newTimeOff.notes || ''
    };
    const updated = [...timeOffEvents, event];
    setTimeOffEvents(updated);
    localStorage.setItem(TIMEOFF_STORAGE_KEY, JSON.stringify(updated));
    setIsTimeOffModalOpen(false);
  };

  const calendarDays = useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      if (viewMode === 'month') {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const firstDay = new Date(year, month, 1).getDay();
          const days: (Date | null)[] = [];
          for (let i = 0; i < firstDay; i++) days.push(null);
          for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
          return days;
      }
      if (viewMode === 'week') {
          const start = new Date(currentDate);
          start.setDate(currentDate.getDate() - currentDate.getDay());
          return Array.from({length: 7}).map((_, i) => {
              const d = new Date(start);
              d.setDate(start.getDate() + i);
              return d;
          });
      }
      return [new Date(currentDate)];
  }, [currentDate, viewMode]);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
           <div>
               <h1 className="text-2xl font-black text-slate-800">Calendario</h1>
               <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedExecutive}</p>
           </div>
           <div className="flex gap-2">
               <button onClick={() => handleDayClick(new Date(), true)} className="bg-pink-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">Cita VIP</button>
               <button onClick={handleOpenTimeOffModal} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">Ausencia</button>
               <div className="bg-slate-100 p-1 rounded-xl flex">
                   {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                       <button key={v} onClick={() => setViewMode(v)} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === v ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{v}</button>
                   ))}
               </div>
           </div>
       </div>

       <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
           <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
               <button onClick={() => {
                   const d = new Date(currentDate);
                   if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
                   else if (viewMode === 'week') d.setDate(d.getDate() - 7);
                   else d.setDate(d.getDate() - 1);
                   setCurrentDate(d);
               }} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-400"/></button>
               <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                   {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', day: viewMode === 'day' ? 'numeric' : undefined })}
               </h2>
               <button onClick={() => {
                   const d = new Date(currentDate);
                   if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
                   else if (viewMode === 'week') d.setDate(d.getDate() + 7);
                   else d.setDate(d.getDate() + 1);
                   setCurrentDate(d);
               }} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-400"/></button>
           </div>

           <div className={`flex-1 overflow-auto ${viewMode === 'day' ? '' : 'grid grid-cols-7 auto-rows-fr'}`}>
               {calendarDays.map((day, idx) => {
                   if (!day) return <div key={idx} className="bg-slate-50/20 border-b border-r border-slate-100"></div>;
                   const events = getEventsForDate(day);
                   const isToday = day.toDateString() === new Date().toDateString();

                   return (
                       <div key={idx} onClick={() => handleDayClick(day)} className={`min-h-[120px] p-2 border-b border-r border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer group ${isToday ? 'bg-blue-50/20' : ''}`}>
                           <div className="flex justify-between mb-2">
                               <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>{day.getDate()}</span>
                           </div>
                           <div className="space-y-1">
                               {events.map((evt, i) => (
                                   <div 
                                       key={i} 
                                       onClick={(e) => { e.stopPropagation(); openReportModal(evt.data.docId, evt.data.visit); }}
                                       className={`text-[9px] font-bold p-1 rounded-lg border shadow-sm truncate ${
                                           evt.type === 'timeoff' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                           evt.data.visit.outcome === 'CITA' ? 'bg-pink-500 text-white border-transparent' :
                                           evt.data.visit.status === 'completed' ? 'bg-emerald-500 text-white border-transparent' : 'bg-blue-500 text-white border-transparent'
                                       }`}
                                   >
                                       {evt.type === 'timeoff' ? evt.data.reason : `${evt.data.visit.time || '00:00'} ${evt.data.docName}`}
                                   </div>
                               ))}
                           </div>
                       </div>
                   );
               })}
           </div>
       </div>

       {/* Simple modals implementation logic follows similar to previous versions but ensures cleanup of state */}
       {isModalOpen && (
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
               <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                       <h3 className="text-lg font-black text-slate-800">{isAppointmentMode ? 'Programar Cita VIP' : 'Planear Visita'}</h3>
                       <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                   </div>
                   <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Doctor / Contacto</label>
                            <input 
                                type="text" 
                                placeholder="BUSCAR MÉDICO..." 
                                value={searchDoctorTerm} 
                                onChange={(e) => setSearchDoctorTerm(e.target.value.toUpperCase())}
                                className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {searchDoctorTerm && (
                                <div className="mt-2 max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-white shadow-lg">
                                    {filteredDoctorsForModal.map(doc => (
                                        <div 
                                            key={doc.id} 
                                            onClick={() => { setSelectedDoctorId(doc.id); setSearchDoctorTerm(doc.name); }}
                                            className={`p-3 text-xs font-bold border-b last:border-0 cursor-pointer ${selectedDoctorId === doc.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {doc.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Fecha</label>
                                <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hora</label>
                                <select value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold">
                                    {(isAppointmentMode ? appointmentTimeSlots : visitTimeSlots).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Objetivo</label>
                            <textarea value={planObjective} onChange={e => setPlanObjective(e.target.value.toUpperCase())} className="w-full border border-slate-200 rounded-xl p-3 text-sm" rows={2} />
                        </div>
                   </div>
                   <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                       <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancelar</button>
                       <button onClick={savePlan} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Guardar Plan</button>
                   </div>
               </div>
           </div>
       )}

       {isTimeOffModalOpen && (
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
               <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50">
                       <h3 className="text-lg font-black text-orange-800">Registrar Ausencia</h3>
                       <button onClick={() => setIsTimeOffModalOpen(false)}><X className="w-6 h-6 text-orange-400" /></button>
                   </div>
                   <div className="p-6 space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Desde</label>
                               <input type="date" value={newTimeOff.startDate} onChange={(e) => setNewTimeOff({...newTimeOff, startDate: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2 text-sm font-bold" />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasta</label>
                               <input type="date" value={newTimeOff.endDate} onChange={(e) => setNewTimeOff({...newTimeOff, endDate: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2 text-sm font-bold" />
                           </div>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motivo</label>
                           <select value={newTimeOff.reason} onChange={(e) => setNewTimeOff({...newTimeOff, reason: e.target.value as any})} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold">
                               <option value="JUNTA">JUNTA</option>
                               <option value="CAPACITACIÓN">CAPACITACIÓN</option>
                               <option value="PERMISO">PERMISO</option>
                               <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                           </select>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Notas</label>
                           <textarea rows={2} value={newTimeOff.notes} onChange={(e) => setNewTimeOff({...newTimeOff, notes: e.target.value.toUpperCase()})} className="w-full border border-slate-200 rounded-xl p-3 text-sm uppercase" />
                       </div>
                   </div>
                   <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                       <button onClick={() => setIsTimeOffModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancelar</button>
                       <button onClick={handleSaveTimeOff} className="px-6 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold">Guardar</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default ExecutiveCalendar;

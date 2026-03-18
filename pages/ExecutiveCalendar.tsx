
import React, { useState, useMemo, useEffect } from 'react';
// Explicit import from react-router-dom
import { useLocation } from 'react-router-dom';
import { Doctor, Visit, User, TimeOffEvent } from '../types';
import { ChevronLeft, ChevronRight, Plus, Search, Calendar, X, Lock, Clock, Coffee, CalendarClock, CheckCircle2, User as UserIcon, Trash2, Building, Stethoscope } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
// Fix: Use named import for the locale to avoid type mismatch with react-datepicker's registerLocale
import { es } from 'date-fns/locale';

registerLocale('es', es);

interface ExecutiveCalendarProps {
  doctors: Doctor[];
  timeOffEvents: TimeOffEvent[];
  onUpdateDoctor: (doctor: Doctor) => void;
  onSaveTimeOff: (toff: TimeOffEvent) => void;
  onDeleteTimeOff: (id: string) => void;
  onDeleteVisit: (doctorId: string, visitId: string) => void;
  user: User;
}

type ViewMode = 'month' | 'week' | 'day';

const ExecutiveCalendar: React.FC<ExecutiveCalendarProps> = ({ doctors, timeOffEvents, onUpdateDoctor, onSaveTimeOff, onDeleteTimeOff, onDeleteVisit, user }) => {
  const location = useLocation();
  const [selectedExecutive, setSelectedExecutive] = useState(user.role === 'executive' ? user.name : '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [isDragging, setIsDragging] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAppointmentMode, setIsAppointmentMode] = useState(false); 
  const [selectedDayForPlan, setSelectedDayForPlan] = useState<number | null>(null);
  
  // Nuevo estado para la fecha dentro del modal
  const [planDate, setPlanDate] = useState<Date>(new Date());

  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [searchDoctorTerm, setSearchDoctorTerm] = useState('');
  const [planObjective, setPlanObjective] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('09:00');

  // Edit Appointment State (Stores the original state before editing)
  const [editingAppointment, setEditingAppointment] = useState<{docId: string, visit: Visit} | null>(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedVisitToReport, setSelectedVisitToReport] = useState<{docId: string, visit: Visit} | null>(null);
  const [reportNote, setReportNote] = useState('');
  const [reportOutcome, setReportOutcome] = useState('SEGUIMIENTO');
  const [reportFollowUp, setReportFollowUp] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportTime, setReportTime] = useState('');
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [editObjective, setEditObjective] = useState('');
  
  // Next Visit Planning State
  const [nextVisitDate, setNextVisitDate] = useState<Date | null>(null);
  const [nextVisitTime, setNextVisitTime] = useState('09:00');

  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [newTimeOff, setNewTimeOff] = useState<Partial<TimeOffEvent>>({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      duration: 'TODO EL DÍA',
      reason: 'JUNTA',
      notes: ''
  });
  const [selectedTimeOff, setSelectedTimeOff] = useState<TimeOffEvent | null>(null);

  // Updated Time Slots: 09:00 - 20:00 every 30 mins
  const generateTimeSlots = () => {
      const slots = [];
      for (let hour = 9; hour <= 20; hour++) {
          slots.push(`${hour.toString().padStart(2, '0')}:00`);
          if (hour !== 20) {
              slots.push(`${hour.toString().padStart(2, '0')}:30`);
          }
      }
      return slots;
  };
  const visitTimeSlots = useMemo(() => generateTimeSlots(), []);
  
  // Restricted slots for Appointments (Citas)
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

  const myDoctors = useMemo(() => {
      return doctors.filter(d => d.executive === selectedExecutive);
  }, [doctors, selectedExecutive]);

  const myTimeOffs = useMemo(() => {
      return timeOffEvents.filter(t => t.executive === selectedExecutive);
  }, [timeOffEvents, selectedExecutive]);

  const filteredDoctorsForModal = useMemo(() => {
      if (!searchDoctorTerm) return [];
      return myDoctors.filter(d => d.name.toLowerCase().includes(searchDoctorTerm.toLowerCase()));
  }, [myDoctors, searchDoctorTerm]);

  const getDaysForView = (): (Date | null)[] => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      if (viewMode === 'month') {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const firstDayOfMonth = new Date(year, month, 1).getDay(); 
          const days: (Date | null)[] = [];
          for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
          for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
          return days;
      } else if (viewMode === 'week') {
          const startOfWeek = new Date(currentDate);
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
          const days: Date[] = [];
          for (let i = 0; i < 7; i++) {
              const d = new Date(startOfWeek);
              d.setDate(startOfWeek.getDate() + i);
              days.push(d);
          }
          return days;
      } else { 
          return [new Date(currentDate)];
      }
  };

  const calendarDays = getDaysForView();

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

  const toLocalDateString = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const isDateInRange = (checkDate: string, start: string, end: string) => {
      return checkDate >= start && checkDate <= end;
  };

  const parseDateString = (dateStr: string) => {
      if (!dateStr) return new Date();
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
  };

  const formatDateToString = (date: Date | null) => {
      if (!date) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const getEventsForDate = (date: Date) => {
      const dateStr = toLocalDateString(date);
      const events: { type: 'visit' | 'timeoff', data: any }[] = [];
      
      myDoctors.forEach(doc => {
          const visits = doc.visits || [];
          visits.forEach(visit => {
              if (visit.date === dateStr) {
                  events.push({ type: 'visit', data: { docId: doc.id, docName: doc.name, docCategory: doc.category, visit, address: doc.address } });
              }
          });
      });

      myTimeOffs.forEach(toff => {
          if (isDateInRange(dateStr, toff.startDate, toff.endDate)) {
              events.push({ type: 'timeoff', data: toff });
          }
      });

      return events.sort((a, b) => {
          if (a.type === 'timeoff' && b.type !== 'timeoff') return -1;
          if (a.type !== 'timeoff' && b.type === 'timeoff') return 1;

          if (a.type === 'visit' && b.type === 'visit') {
              const timeA = a.data.visit.time || '23:59';
              const timeB = b.data.visit.time || '23:59';
              if (timeA !== timeB) return timeA.localeCompare(timeB);
              if (a.data.visit.status === 'completed' && b.data.visit.status !== 'completed') return 1;
              if (a.data.visit.status !== 'completed' && b.data.visit.status === 'completed') return -1;
          }
          return 0;
      });
  };

  const handleDayClick = (date: Date, asAppointment = false, initialTime?: string) => {
      setSelectedDayForPlan(date.getDate());
      setCurrentDate(new Date(date));
      setPlanDate(new Date(date)); // Sincronizar fecha del modal
      setIsAppointmentMode(asAppointment);
      setIsModalOpen(true); 
      setSelectedDoctorId('');
      setSearchDoctorTerm('');
      setEditingAppointment(null); // Reset editing state
      
      if (asAppointment) {
          setPlanObjective('CITA DE CONTACTO');
          setAppointmentTime(initialTime || '09:00'); // Default to allowed slot
      } else {
          setPlanObjective('');
          setAppointmentTime(initialTime || '09:00');
      }
  };

  const handleTimeSlotClick = (time: string) => {
      handleDayClick(currentDate, false, time);
  };

  const handleEditAppointment = (docId: string, visit: Visit) => {
      const doc = doctors.find(d => d.id === docId);
      
      const dateOfVisit = parseDateString(visit.date);
      setSelectedDayForPlan(dateOfVisit.getDate());
      setCurrentDate(dateOfVisit);
      setPlanDate(dateOfVisit);

      setIsAppointmentMode(true);
      setIsModalOpen(true);
      
      setSelectedDoctorId(docId);
      setSearchDoctorTerm(doc ? doc.name : '');
      setAppointmentTime(visit.time || '09:00');
      setPlanObjective(visit.objective || 'CITA DE CONTACTO');
      
      setEditingAppointment({ docId, visit });
  };

  const savePlan = () => {
      if (!selectedDayForPlan || !selectedDoctorId) {
          alert("Seleccione un contacto.");
          return;
      }
      if (!planObjective.trim()) {
          alert("El objetivo es obligatorio.");
          return;
      }
      
      // Usar la fecha seleccionada en el modal (planDate)
      const dateStr = formatDateToString(planDate);
      
      if (editingAppointment) {
          const oldDoc = doctors.find(d => d.id === editingAppointment.docId);
          const newDoc = doctors.find(d => d.id === selectedDoctorId);

          // Si el doctor cambió
          if (editingAppointment.docId !== selectedDoctorId) {
             if (oldDoc) {
                 const updatedOld = { ...oldDoc, visits: oldDoc.visits.filter(v => v.id !== editingAppointment.visit.id) };
                 onUpdateDoctor(updatedOld);
             }
             if (newDoc) {
                 const updatedVisit: Visit = {
                     ...editingAppointment.visit,
                     date: dateStr,
                     time: appointmentTime, 
                     objective: planObjective.toUpperCase(), 
                     outcome: 'CITA',
                     status: 'planned'
                 };
                 onUpdateDoctor({ ...newDoc, visits: [...newDoc.visits, updatedVisit] });
             }
          } else {
             // Mismo doctor
             if (newDoc) {
                 const updatedVisits = newDoc.visits.map(v => 
                     v.id === editingAppointment.visit.id 
                     ? { ...editingAppointment.visit, date: dateStr, time: appointmentTime, objective: planObjective.toUpperCase(), outcome: 'CITA' as const, status: 'planned' as const }
                     : v
                 );
                 onUpdateDoctor({ ...newDoc, visits: updatedVisits });
             }
          }

          setIsModalOpen(false);
          alert("Cita actualizada correctamente.");

      } else {
          const doc = doctors.find(d => d.id === selectedDoctorId);
          if (doc) {
              const newVisit: Visit = {
                  id: Date.now().toString(),
                  date: dateStr, 
                  time: appointmentTime,
                  note: isAppointmentMode ? 'CITA PROGRAMADA' : 'Visita Planeada',
                  objective: planObjective.toUpperCase(),
                  outcome: isAppointmentMode ? 'CITA' : 'PLANEADA',
                  status: 'planned'
              };
              const currentVisits = doc.visits || [];
              onUpdateDoctor({ ...doc, visits: [...currentVisits, newVisit] });
          }

          setIsModalOpen(false);
          alert(isAppointmentMode ? "Cita programada correctamente." : "Visita agendada correctamente.");
      }
  };

  const openReportModal = (docId: string, visit: Visit) => {
      if ((visit.outcome as string) === 'CITA') return; 

      setSelectedVisitToReport({ docId, visit });
      setReportNote(visit.note === 'Visita Planeada' || visit.note === 'CITA PROGRAMADA' ? '' : visit.note);
      
      const outcome = visit.outcome as string;
      setReportOutcome(outcome === 'PLANEADA' || outcome === 'CITA' ? 'SEGUIMIENTO' : outcome);
      
      setReportFollowUp(visit.followUp || '');
      setReportDate(visit.date);
      setReportTime(visit.time || '');
      setIsEditingPlan(false);
      setEditObjective(visit.objective || '');
      setNextVisitDate(null); // User must select a date
      setNextVisitTime('09:00'); 
      setReportModalOpen(true);
  };

  const confirmDeleteVisit = () => {
      if (!selectedVisitToReport) return;
      const { docId, visit } = selectedVisitToReport;
      if (window.confirm("¿Eliminar este registro permanentemente del calendario y sistema?")) {
          onDeleteVisit(docId, visit.id);
          setReportModalOpen(false);
          setSelectedVisitToReport(null);
      }
  }

  const savePlanChanges = () => {
      if (!selectedVisitToReport) return;
      if (!editObjective.trim()) {
          alert("El objetivo es obligatorio.");
          return;
      }

      const doc = doctors.find(d => d.id === selectedVisitToReport.docId);
      if (doc) {
          const updatedVisits = (doc.visits || []).map(v => {
              if (v.id === selectedVisitToReport.visit.id) {
                  return { ...v, date: reportDate, time: reportTime, objective: editObjective.toUpperCase() };
              }
              return v;
          });
          onUpdateDoctor({ ...doc, visits: updatedVisits });
      }
      setReportModalOpen(false);
  }

  const saveReport = () => {
      if (!selectedVisitToReport) return;
      if (!reportNote.trim() || !reportFollowUp.trim()) {
          alert("Reporte y Siguiente Paso son obligatorios.");
          return;
      }
      if (!nextVisitDate) {
          alert("Es obligatorio agendar la fecha de la próxima visita.");
          return;
      }

      // Validación de tiempo: No sea mayor a 24 horas una vez realizada la visita
      const visitDateTime = new Date(`${reportDate}T${reportTime || '00:00'}`);
      const now = new Date();
      const diffInHours = (now.getTime() - visitDateTime.getTime()) / (1000 * 60 * 60);

      if (user.role !== 'admin' && user.role !== 'admin_restricted') {
          if (diffInHours > 24) {
              alert("⚠️ RESTRICCIÓN: Han pasado más de 24 horas desde la fecha/hora de la visita. El reporte ha quedado restringido.");
              return;
          }

          if (diffInHours < -2) { // Pequeño margen para zonas horarias o errores de reloj, pero bloquea futuro lejano
              alert("⚠️ RESTRICCIÓN: No puedes reportar visitas futuras.");
              return;
          }
      }
      
      const doc = doctors.find(d => d.id === selectedVisitToReport.docId);
      if (doc) {
          let updatedVisits = (doc.visits || []).map(v => {
              if (v.id === selectedVisitToReport.visit.id) {
                  return {
                      ...v,
                      date: reportDate,
                      time: reportTime, 
                      note: reportNote.toUpperCase(),
                      outcome: reportOutcome as any,
                      followUp: reportFollowUp.toUpperCase(),
                      status: 'completed' as const
                  };
              }
              return v;
          });

          // Create Next Visit (Mandatory)
          const newVisit: Visit = {
              id: `nv-${Date.now()}`,
              date: formatDateToString(nextVisitDate),
              time: nextVisitTime, 
              note: 'Visita Planeada',
              objective: reportFollowUp.toUpperCase(), 
              outcome: 'PLANEADA',
              status: 'planned'
          };
          updatedVisits = [...updatedVisits, newVisit];

          onUpdateDoctor({ ...doc, visits: updatedVisits });
      }

      setReportModalOpen(false);
      alert("Reporte guardado y próxima visita agendada.");
  };

  const handleDragStart = (e: React.DragEvent, docId: string, visit: Visit) => {
      setIsDragging(true);
      const data = JSON.stringify({ docId, visitId: visit.id });
      e.dataTransfer.setData("text/plain", data);
      e.dataTransfer.effectAllowed = "move";
  };
  
  const handleDragEnd = () => setIsDragging(false);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  
  const handleDrop = (e: React.DragEvent, targetDate: Date, targetTime?: string) => {
      e.preventDefault();
      setIsDragging(false);
      try {
          const data = e.dataTransfer.getData("text/plain");
          if (!data) return;
          const { docId, visitId } = JSON.parse(data);
          const newDateStr = toLocalDateString(targetDate);
          
          const doc = doctors.find(d => d.id === docId);
          if (doc) {
              const updatedVisits = (doc.visits || []).map(v => {
                  if (v.id === visitId) {
                      return { ...v, date: newDateStr, time: targetTime || v.time };
                  }
                  return v;
              });
              onUpdateDoctor({ ...doc, visits: updatedVisits });
          }
      } catch (error) { console.error("Drop error:", error); }
  };

  const handleTrashDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const data = e.dataTransfer.getData("text/plain");
      if (!data) return;
      
      try {
          const parsed = JSON.parse(data);
          const { docId, visitId } = parsed;
          
          if (docId && visitId) {
              if (window.confirm("¿Confirmas que deseas eliminar este elemento permanentemente del sistema?")) {
                  onDeleteVisit(docId, visitId);
              }
          }
      } catch (error) {
          console.error("Error al eliminar elemento:", error);
      }
  };

  // --- HELPER FUNCTIONS ---

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

  const handleSaveTimeOff = () => {
      const event: TimeOffEvent = {
          id: `toff-${Date.now()}`,
          executive: selectedExecutive,
          startDate: newTimeOff.startDate || new Date().toISOString().split('T')[0],
          endDate: newTimeOff.endDate || new Date().toISOString().split('T')[0],
          duration: newTimeOff.duration as any || 'TODO EL DÍA',
          reason: newTimeOff.reason as any || 'JUNTA',
          notes: newTimeOff.notes || ''
      };
      onSaveTimeOff(event);
      setIsTimeOffModalOpen(false);
  };

  const handleDeleteTimeOff = (id: string) => {
      if (window.confirm("¿Eliminar este registro?")) {
          onDeleteTimeOff(id);
          setSelectedTimeOff(null);
      }
  };

  const getHeaderTitle = () => {
      if (viewMode === 'day') return currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  const isCita = (visit: Visit) => (visit.outcome as string) === 'CITA';

  const renderEventChip = (evt: any, i: number, isSlot: boolean = false) => {
      const isTimeOff = evt.type === 'timeoff';
      const isCompleted = !isTimeOff && evt.data.visit.status === 'completed';
      const isAppointment = !isTimeOff && isCita(evt.data.visit);
      
      const chipClasses = isSlot 
        ? `absolute left-0 right-0 mx-2 p-2 rounded shadow-sm cursor-pointer transition-colors z-10 border-l-4 ${
            isAppointment 
            ? 'bg-pink-100 border-pink-500 hover:bg-pink-200 cursor-default' 
            : (isCompleted 
                ? 'bg-green-100 border-green-500 hover:bg-green-200' 
                : 'bg-blue-100 border-blue-500 hover:bg-blue-200')
          }`
        : `px-2 py-1 rounded text-[8px] font-bold border shadow-sm flex items-center gap-1 transition-all hover:scale-[1.02] relative pr-1 cursor-grab active:cursor-grabbing w-full mb-1 ${
            isTimeOff 
            ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 text-orange-800'
            : (isAppointment 
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-transparent shadow-pink-300' 
                : (isCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-emerald-300' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-blue-200'))
        }`;

      return (
        <div 
            key={i}
            draggable
            onDragStart={(e) => handleDragStart(e, evt.data.docId, evt.data.visit)}
            onDragEnd={handleDragEnd}
            onClick={(e) => { 
                e.stopPropagation(); 
                if (isTimeOff) setSelectedTimeOff(evt.data);
                else if (isAppointment) handleEditAppointment(evt.data.docId, evt.data.visit);
                else openReportModal(evt.data.docId, evt.data.visit); 
            }}
            className={chipClasses}
        >
            {isSlot ? (
                <>
                    <span className={`text-xs font-bold block ${
                        isAppointment ? 'text-pink-900' : (isCompleted ? 'text-green-900' : 'text-blue-900')
                    }`}>{evt.data.docName} ({evt.data.docCategory || 'MEDICO'})</span>
                    <span className={`text-[10px] uppercase ${
                        isAppointment ? 'text-pink-700' : (isCompleted ? 'text-green-700' : 'text-blue-700')
                    }`}>{evt.data.visit.objective}</span>
                </>
            ) : (
                <>
                    <span className="truncate leading-tight flex-1">
                        {!isTimeOff && <span className="font-black mr-1 opacity-90">{evt.data.visit.time || '??:??'}</span>}
                        {isTimeOff ? evt.data.reason : evt.data.docName}
                    </span>
                    {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-white flex-shrink-0" />}
                    {isAppointment && <Lock className="w-2 h-2 text-white/80 ml-1" />}
                </>
            )}
        </div>
      );
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-10 relative animate-fadeIn">

        {/* TOOLBAR */}
        <div className="flex flex-col xl:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-300 shadow-xl gap-6">
            <div className="text-center xl:text-left w-full xl:w-auto">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center justify-center xl:justify-start gap-3">
                    <CalendarClock className="w-8 h-8 md:w-10 md:h-10 text-blue-700" />
                    CALENDARIO <span className="text-blue-700">EJECUTIVO</span>
                </h1>
                <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest mt-2">Gestión de rutas y tiempos operativos.</p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-center w-full xl:w-auto">
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto border border-slate-200">
                    {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`flex-1 md:flex-none px-6 md:px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
                        >
                            {mode === 'month' ? 'Mes' : (mode === 'week' ? 'Semana' : 'Día')}
                        </button>
                    ))}
                </div>

               <div className="flex gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
                   <button 
                       onClick={() => handleDayClick(currentDate, false)}
                       className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 md:px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center whitespace-nowrap"
                   >
                       <Plus className="w-5 h-5 mr-2" />
                       Visita
                   </button>
                   <button 
                       onClick={() => handleDayClick(currentDate, true)}
                       className="flex-1 md:flex-none bg-pink-600 hover:bg-pink-500 text-white px-6 md:px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-pink-500/20 transition-all active:scale-95 flex items-center justify-center whitespace-nowrap"
                   >
                       <Lock className="w-4 h-4 mr-2" />
                       Cita
                   </button>
                   <button 
                       onClick={handleOpenTimeOffModal}
                       className="flex-1 md:flex-none bg-slate-50 hover:bg-slate-100 text-slate-600 px-6 md:px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm transition-all border border-slate-200 active:scale-95 flex items-center justify-center whitespace-nowrap"
                   >
                       <Coffee className="w-4 h-4 mr-2" />
                       Ausencia
                   </button>
                   <div 
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={handleTrashDrop}
                        className={`w-14 md:w-16 rounded-2xl flex items-center justify-center transition-all border-2 border-dashed flex-shrink-0 ${isDragging ? 'bg-red-50 text-red-600 border-red-500 scale-110 shadow-lg shadow-red-500/20' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-red-500/50 hover:text-red-600'}`}
                        title="Arrastra aquí para eliminar"
                   >
                       <Trash2 className="h-6 w-6 pointer-events-none" />
                   </div>
               </div>
           </div>
       </div>

       {/* CALENDAR HEADER CONTROLS */}
       <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-[2.5rem] shadow-lg border border-slate-300 gap-6">
           <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
               <button onClick={prevPeriod} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-500 hover:text-blue-700"><ChevronLeft className="w-6 h-6" /></button>
               <h2 className="text-lg md:text-2xl font-black text-slate-900 uppercase tracking-tight text-center flex-1 md:flex-none">{getHeaderTitle()}</h2>
               <button onClick={nextPeriod} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-500 hover:text-blue-700"><ChevronRight className="w-6 h-6" /></button>
           </div>
           
           <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:flex-none">
                   <select 
                       value={selectedExecutive} 
                       onChange={(e) => setSelectedExecutive(e.target.value)}
                       className="w-full md:w-64 appearance-none bg-slate-100 border border-slate-300 text-slate-800 text-xs font-black uppercase tracking-wide rounded-2xl py-3 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                       disabled={user.role === 'executive'}
                   >
                       {executives.map(e => <option key={e} value={e} className="bg-white text-slate-900">{e}</option>)}
                   </select>
                   <UserIcon className="absolute right-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
               </div>
               <button onClick={() => setCurrentDate(new Date())} className="px-4 py-3 bg-blue-100 text-blue-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-200 transition-colors whitespace-nowrap border border-blue-200">
                   Hoy
               </button>
           </div>
       </div>











       {/* CALENDAR VIEW */}
       <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-xl overflow-hidden flex flex-col h-[65vh] md:h-[75vh] min-h-[500px]">


           <div className="flex-1 overflow-auto bg-transparent">
               <div className={`h-full flex flex-col ${viewMode !== 'day' ? 'min-w-[800px]' : 'min-w-full'}`}>
                   {viewMode !== 'day' && (
                       <div className="grid grid-cols-7 border-b border-slate-300 bg-slate-200 flex-shrink-0">
                           {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                               <div key={d} className="py-3 text-center text-[10px] font-black text-slate-700 uppercase tracking-widest">{d}</div>
                           ))}
                       </div>
                   )}

                   <div className={`flex-1 ${viewMode === 'day' ? 'flex flex-col' : 'grid grid-cols-7 auto-rows-fr gap-px'}`}>
                       {calendarDays.map((day, idx) => {
                           if (viewMode !== 'day' && day === null) return <div key={`empty-${idx}`} className="bg-slate-50/20 min-h-[100px]"></div>;
                           
                           const events = day ? getEventsForDate(day) : [];
                           const isToday = day ? new Date().toDateString() === day.toDateString() : false;

                           if (viewMode === 'day' && day) {
                               return (
                                   <div key={idx} className="flex-1 bg-transparent p-4 md:p-8 animate-fadeIn flex">
                                       <div className="w-24 flex-shrink-0 border-r border-slate-300 pr-4 pt-2">
                                           {visitTimeSlots.map(time => (
                                               <div key={time} className="h-24 text-xs font-bold text-slate-700 flex items-start justify-between group relative">
                                                   <span className="-mt-3 bg-white pr-2 z-10">{time}</span>
                                                   <button 
                                                        onClick={(e) => { e.stopPropagation(); handleTimeSlotClick(time); }}
                                                        className="absolute right-0 top-0 bg-blue-100 text-blue-700 hover:bg-blue-700 hover:text-white rounded-full p-1.5 transition-all transform active:scale-95 z-20 md:opacity-0 md:group-hover:opacity-100 border border-blue-200"
                                                        title="Planear Visita aquí"
                                                   >
                                                       <Plus className="h-3 w-3" />
                                                   </button>
                                               </div>
                                           ))}
                                       </div>

                                       <div className="flex-1 pl-4 relative pt-2">
                                            {visitTimeSlots.map((time, tIdx) => (
                                                 <div 
                                                    key={`line-${time}`} 
                                                    className="absolute w-full border-t border-slate-300"
                                                    style={{ top: `${tIdx * 6}rem` }}
                                                 ></div>
                                            ))}
                                            
                                            {visitTimeSlots.map((time, tIdx) => {
                                                const slotEvents = events.filter(e => e.type === 'visit' && e.data.visit.time === time);
                                                return (
                                                    <div 
                                                        key={time} 
                                                        onClick={() => handleTimeSlotClick(time)}
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, day, time)}
                                                        className="absolute w-full hover:bg-slate-100 transition-colors z-0 cursor-pointer rounded-xl"
                                                        style={{ top: `${tIdx * 6}rem`, height: '6rem' }}
                                                    >
                                                        {slotEvents.map((evt, i) => renderEventChip(evt, i, true))}
                                                    </div>
                                                )
                                            })}
                                       </div>
                                   </div>
                               )
                           }
                           
                           if (!day) return null;

                           return (
                               <div key={idx} 
                                   onDragOver={handleDragOver}
                                   onDrop={(e) => handleDrop(e, day)}
                                   onClick={() => handleDayClick(day)}
                                   className={`min-h-[140px] bg-white p-3 border border-slate-300 hover:bg-slate-50 transition-all cursor-pointer relative group flex flex-col gap-2 ${isToday ? 'bg-blue-50 ring-1 ring-inset ring-blue-500/30' : ''}`}
                               >
                                   <div className="flex justify-between items-start">
                                        <span className={`text-xs font-black w-7 h-7 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-600 group-hover:text-slate-900'}`}>
                                            {day.getDate()}
                                        </span>
                                        <button className="opacity-0 group-hover:opacity-100 bg-slate-100 p-1.5 rounded-xl text-slate-600 hover:text-blue-600 transition-all border border-slate-300">
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                   </div>
                                   
                                   <div className="flex-1 w-full overflow-y-auto max-h-[140px] no-scrollbar space-y-1.5">
                                       {events.map((evt, i) => renderEventChip(evt, i))}
                                   </div>
                               </div>
                           )
                       })}
                   </div>
               </div>
           </div>
       </div>

       {/* 1. Plan Visit Modal */}
       {isModalOpen && (
           <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-2xl w-[95%] md:w-full md:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                   <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                       <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                           {isAppointmentMode ? <Clock className="w-6 h-6 text-pink-600" /> : <Calendar className="w-6 h-6 text-blue-500" />}
                           {isAppointmentMode ? (editingAppointment ? 'EDITAR CITA' : 'PROGRAMAR CITA') : 'PLANEAR VISITA'}
                       </h3>
                       <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-500 hover:text-slate-900">
                           <X className="w-6 h-6" />
                       </button>
                   </div>
                   <div className="p-8 space-y-6 overflow-y-auto">
                        {isAppointmentMode && (
                           <div className="bg-pink-50 p-4 rounded-2xl border border-pink-200 flex items-center text-pink-800 text-xs font-bold">
                               <Lock className="w-4 h-4 mr-3" />
                               {editingAppointment ? 'Modo Edición - Cambio de Contacto' : 'Cita Bloqueada - Prioridad Alta'}
                           </div>
                        )}

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Contacto</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                                <input 
                                    type="text" 
                                    placeholder="BUSCAR MÉDICO..." 
                                    value={searchDoctorTerm} 
                                    onChange={(e) => setSearchDoctorTerm(e.target.value.toUpperCase())}
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            {searchDoctorTerm && (
                                <div className="mt-2 max-h-48 overflow-y-auto border border-white/10 rounded-2xl bg-slate-900/90 backdrop-blur-xl shadow-2xl">
                                    {filteredDoctorsForModal.map(doc => (
                                        <div 
                                            key={doc.id} 
                                            onClick={() => { setSelectedDoctorId(doc.id); setSearchDoctorTerm(doc.name); }}
                                            className={`p-4 text-xs font-bold border-b border-white/5 last:border-0 cursor-pointer transition-colors ${selectedDoctorId === doc.id ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            <div className="uppercase tracking-wide">{doc.name}</div>
                                            <div className="text-[10px] text-slate-500 font-medium flex items-center mt-1.5">
                                                <Building className="w-3 h-3 mr-1.5" /> {doc.hospital || doc.address}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredDoctorsForModal.length === 0 && <div className="p-6 text-xs text-slate-500 text-center font-bold">No se encontraron resultados</div>}
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                               <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Fecha</label>
                               <DatePicker
                                   selected={planDate}
                                   onChange={(date) => date && setPlanDate(date)}
                                   disabled={!!editingAppointment}
                                   dateFormat="dd/MM/yyyy"
                                   locale="es"
                                   className={`w-full bg-white border border-slate-300 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all ${!!editingAppointment ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                               />
                           </div>

                           <div className="space-y-2">
                               <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Hora</label>
                               <select 
                                   value={appointmentTime} 
                                   onChange={(e) => setAppointmentTime(e.target.value)}
                                   disabled={!!editingAppointment}
                                   className={`w-full bg-white border border-slate-300 rounded-2xl p-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none ${!!editingAppointment ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                               >
                                   {(isAppointmentMode ? appointmentTimeSlots : visitTimeSlots).map(t => <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>)}
                               </select>
                           </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{isAppointmentMode ? 'Objetivo Cita' : 'Objetivo SMART'}</label>
                            <textarea 
                                rows={3}
                                value={planObjective}
                                onChange={(e) => setPlanObjective(e.target.value.toUpperCase())}
                                disabled={isAppointmentMode || !!editingAppointment}
                                className={`w-full bg-white border border-slate-300 rounded-2xl p-4 text-sm uppercase font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all ${isAppointmentMode || !!editingAppointment ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                                placeholder={isAppointmentMode ? "MOTIVO DE LA CITA..." : "ESPECÍFICO, MEDIBLE, ALCANZABLE..."}
                            />
                        </div>
                   </div>
                   <div className="p-8 border-t border-white/10 flex justify-end gap-4 bg-white/5">
                       <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-sm font-black text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all uppercase tracking-widest">Cancelar</button>
                       <button onClick={savePlan} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95">Guardar Plan</button>
                   </div>
               </div>
           </div>
       )}

       {/* 2. Report/Edit Modal */}
       {reportModalOpen && selectedVisitToReport && (
           <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-2xl w-[95%] md:w-full md:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                   <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                       <div>
                           <div className="flex space-x-6 mb-3">
                                <button onClick={() => setIsEditingPlan(false)} className={`text-sm font-black uppercase border-b-2 pb-2 transition-all tracking-widest ${!isEditingPlan ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                                     Reportar
                                </button>
                                <button onClick={() => setIsEditingPlan(true)} className={`text-sm font-black uppercase border-b-2 pb-2 transition-all tracking-widest ${isEditingPlan ? 'text-blue-500 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                                     Reprogramar
                                </button>
                           </div>
                           <h3 className="text-xl font-black text-white uppercase flex items-center gap-3">
                               {isEditingPlan ? 'Modificar Planificación' : 'Reportar Resultado'}
                           </h3>
                       </div>
                       <div className="flex items-center gap-3">
                            <button onClick={confirmDeleteVisit} className="p-3 text-red-500 hover:bg-red-500/10 rounded-2xl transition-all" title="Eliminar Visita">
                                <Trash2 className="w-6 h-6" />
                            </button>
                            <button onClick={() => setReportModalOpen(false)} className="p-3 text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
                                <X className="w-7 h-7" />
                            </button>
                       </div>
                   </div>

                   {/* Doctor Info Header Fixed */}
                   {selectedVisitToReport && (() => {
                       const doc = doctors.find(d => d.id === selectedVisitToReport.docId);
                       return doc ? (
                           <div className="px-8 py-6 bg-blue-500/5 border-b border-white/10 flex items-center gap-4">
                               <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-blue-400 shadow-xl">
                                   <UserIcon className="w-6 h-6" />
                               </div>
                               <div>
                                   <h4 className="text-base font-black text-white uppercase leading-tight tracking-wide">{doc.name}</h4>
                                   <p className="text-xs font-bold text-blue-400 uppercase flex items-center gap-2 mt-1">
                                       <Stethoscope className="w-4 h-4" />
                                       {doc.specialty || 'GENERAL'}
                                   </p>
                               </div>
                           </div>
                       ) : null;
                   })()}

                   <div className="p-8 space-y-8 overflow-y-auto">
                        {/* Common Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Fecha</label>
                                <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hora</label>
                                <select value={reportTime} onChange={(e) => setReportTime(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
                                    {visitTimeSlots.map(t => <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>)}
                                </select>
                            </div>
                        </div>

                        {isEditingPlan ? (
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Objetivo (Editar)</label>
                                <textarea 
                                    rows={3}
                                    value={editObjective}
                                    onChange={(e) => setEditObjective(e.target.value.toUpperCase())}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase resize-none transition-all hover:bg-white/10"
                                />
                            </div>
                        ) : (
                            <>
                                <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Objetivo Original</span>
                                    <p className="text-sm font-bold text-slate-300 uppercase leading-relaxed">{editObjective}</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Resultado</label>
                                    <select value={reportOutcome} onChange={(e) => setReportOutcome(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
                                        <option value="SEGUIMIENTO" className="bg-slate-900 text-white">SEGUIMIENTO</option>
                                        <option value="COTIZACIÓN" className="bg-slate-900 text-white">COTIZACIÓN</option>
                                        <option value="INTERESADO" className="bg-slate-900 text-white">INTERESADO</option>
                                        <option value="PROGRAMAR PROCEDIMIENTO" className="bg-slate-900 text-white">PROGRAMAR PROCEDIMIENTO</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Reporte / Notas</label>
                                    <textarea 
                                        rows={3}
                                        value={reportNote}
                                        onChange={(e) => setReportNote(e.target.value.toUpperCase())}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase resize-none transition-all hover:bg-white/10"
                                        placeholder="DETALLES DE LA VISITA..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Siguiente Paso</label>
                                    <textarea 
                                        rows={2}
                                        value={reportFollowUp}
                                        onChange={(e) => setReportFollowUp(e.target.value.toUpperCase())}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none uppercase resize-none transition-all hover:bg-white/10"
                                        placeholder="COMPROMISOS..."
                                    />
                                </div>

                                <div className="border-t border-white/10 pt-8 bg-blue-500/5 p-6 rounded-[2rem] border border-white/5">
                                    <div className="mb-4">
                                        <span className="text-sm font-black text-white uppercase flex items-center tracking-widest">
                                             <Calendar className="w-5 h-5 mr-3 text-blue-500" />
                                             Agendar Próxima Visita
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Fecha</label>
                                            <DatePicker 
                                                 selected={nextVisitDate} 
                                                 onChange={(date) => setNextVisitDate(date)} 
                                                 dateFormat="dd/MM/yyyy"
                                                 locale="es"
                                                 placeholderText="SELECCIONE FECHA"
                                                 className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Hora</label>
                                            <select 
                                                 value={nextVisitTime} 
                                                 onChange={(e) => setNextVisitTime(e.target.value)}
                                                 className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                                            >
                                                {visitTimeSlots.map(t => <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                   </div>

                   <div className="p-8 border-t border-white/10 flex justify-end gap-4 bg-white/5">
                       <button onClick={() => setReportModalOpen(false)} className="px-6 py-3 text-sm font-black text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all uppercase tracking-widest">Cancelar</button>
                       {isEditingPlan ? (
                           <button onClick={savePlanChanges} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95">Guardar Cambios</button>
                       ) : (
                           <button onClick={saveReport} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-green-500/20 transition-all active:scale-95">Finalizar Reporte</button>
                       )}
                   </div>
               </div>
           </div>
       )}

       {/* 3. Time Off Modal */}
       {isTimeOffModalOpen && (
           <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-2xl w-[95%] md:w-full md:max-w-md overflow-hidden flex flex-col">
                   <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                       <h3 className="text-xl font-black text-white uppercase flex items-center gap-3">
                           <Coffee className="w-6 h-6 text-orange-500" />
                           Registrar Ausencia
                       </h3>
                       <button onClick={() => setIsTimeOffModalOpen(false)} className="p-3 text-slate-500 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
                           <X className="w-7 h-7" />
                       </button>
                   </div>
                   <div className="p-8 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                               <DatePicker
                                   selected={parseDateString(newTimeOff.startDate || '')}
                                   onChange={(date) => setNewTimeOff({...newTimeOff, startDate: formatDateToString(date)})}
                                   dateFormat="dd/MM/yyyy"
                                   locale="es"
                                   className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all hover:bg-white/10"
                               />
                           </div>
                           <div className="space-y-2">
                               <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                               <DatePicker
                                   selected={parseDateString(newTimeOff.endDate || '')}
                                   onChange={(date) => setNewTimeOff({...newTimeOff, endDate: formatDateToString(date)})}
                                   dateFormat="dd/MM/yyyy"
                                   locale="es"
                                   className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all hover:bg-white/10"
                               />
                           </div>
                       </div>
                       
                       <div className="space-y-2">
                           <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Duración</label>
                           <select 
                               value={newTimeOff.duration} 
                               onChange={(e) => setNewTimeOff({...newTimeOff, duration: e.target.value as any})} 
                               className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none hover:bg-white/10"
                           >
                               <option value="TODO EL DÍA" className="bg-slate-900 text-white">TODO EL DÍA</option>
                               <option value="2 A 4 HRS" className="bg-slate-900 text-white">2 A 4 HRS</option>
                               <option value="6 A 8 HRS" className="bg-slate-900 text-white">6 A 8 HRS</option>
                           </select>
                       </div>

                       <div className="space-y-2">
                           <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Motivo</label>
                           <select 
                               value={newTimeOff.reason} 
                               onChange={(e) => setNewTimeOff({...newTimeOff, reason: e.target.value as any})} 
                               className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none hover:bg-white/10"
                           >
                               <option value="JUNTA" className="bg-slate-900 text-white">JUNTA</option>
                               <option value="CAPACITACIÓN" className="bg-slate-900 text-white">CAPACITACIÓN</option>
                               <option value="PERMISO" className="bg-slate-900 text-white">PERMISO</option>
                               <option value="ADMINISTRATIVO" className="bg-slate-900 text-white">ADMINISTRATIVO</option>
                           </select>
                       </div>

                       <div className="space-y-2">
                           <label className="block text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Notas</label>
                           <textarea 
                               rows={3} 
                               value={newTimeOff.notes} 
                               onChange={(e) => setNewTimeOff({...newTimeOff, notes: e.target.value.toUpperCase()})} 
                               className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-orange-500 outline-none uppercase resize-none transition-all hover:bg-white/10" 
                               placeholder="DETALLES ADICIONALES..."
                           />
                       </div>
                   </div>
                   <div className="p-8 border-t border-white/10 flex justify-end gap-4 bg-white/5">
                       <button onClick={() => setIsTimeOffModalOpen(false)} className="px-6 py-3 text-sm font-black text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all uppercase tracking-widest">Cancelar</button>
                       <button onClick={handleSaveTimeOff} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all active:scale-95">Guardar Ausencia</button>
                   </div>
               </div>
           </div>
       )}

       {/* 4. Time Off Detail/Delete Modal */}
       {selectedTimeOff && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-[2.5rem] border border-slate-300 shadow-2xl p-10 w-[95%] md:w-full max-w-md">
                    <div className="flex justify-between items-start mb-8">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">{selectedTimeOff.reason}</h3>
                        <button onClick={() => setSelectedTimeOff(null)} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="space-y-4 mb-10">
                        <div className="flex items-center gap-4 text-slate-300">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-bold uppercase tracking-wide">{selectedTimeOff.startDate} - {selectedTimeOff.endDate}</span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-300">
                            <Clock className="w-5 h-5 text-blue-500" />
                            <span className="text-sm font-bold uppercase tracking-wide">{selectedTimeOff.duration}</span>
                        </div>
                        {selectedTimeOff.notes && (
                            <div className="mt-6 p-5 bg-white/5 rounded-2xl border border-white/10">
                                <p className="text-sm font-medium text-slate-400 italic leading-relaxed">"{selectedTimeOff.notes}"</p>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <button 
                            onClick={() => handleDeleteTimeOff(selectedTimeOff.id)}
                            className="flex items-center gap-3 text-red-500 hover:text-red-400 font-black text-xs uppercase tracking-widest px-6 py-3 hover:bg-red-500/10 rounded-2xl transition-all"
                        >
                            <Trash2 className="w-5 h-5" /> Eliminar Evento
                        </button>
                    </div>
                </div>
            </div>
       )}

    </div>
  );
};

export default ExecutiveCalendar;

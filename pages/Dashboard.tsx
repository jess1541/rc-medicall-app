
import React, { useMemo, useState } from 'react';
import { Doctor, User, Procedure } from '../types';
import { 
  Users, TrendingUp, Filter, 
  Award, Activity, DollarSign, Calendar, 
  ArrowUpRight, Clock, MapPin, 
  BarChart3, PieChart, Zap, ChevronRight, Stethoscope, Wallet,
  Download, FileSpreadsheet, X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

interface DashboardProps {
  doctors: Doctor[];
  user: User;
  procedures: Procedure[];
  isOnline: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ doctors, user, procedures, isOnline }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filterExecutive, setFilterExecutive] = useState<string | null>(() => {
      if (user.role === 'executive') return user.name;
      const params = new URLSearchParams(location.search);
      return params.get('exec');
  });

  // Update filter when URL changes
  React.useEffect(() => {
      if (user.role === 'admin') {
          const params = new URLSearchParams(location.search);
          setFilterExecutive(params.get('exec'));
      }
  }, [location.search, user.role, user.name]);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const filteredDoctors = useMemo(() => {
      // Filter out archived doctors for the main list, but we might need them for historical data?
      // Actually, usually dashboard shows active portfolio.
      // If we filter them out here, they won't contribute to 'totalDoctors' count, which is correct.
      // However, their visits will also be excluded from 'completedMonth', 'performance', etc.
      // If the user wants "permanezcan en el directorio y en procedimiento el registro", they probably want the history to count.
      // So we should NOT filter them out here if we want their visits to count.
      // BUT, we should filter them out for 'totalDoctors' count.
      // Let's keep them in 'filteredDoctors' but handle the count separately.
      // Wait, if I keep them, they might show up in lists where they shouldn't.
      // Let's filter them out from 'filteredDoctors' to keep the dashboard focused on active portfolio, 
      // UNLESS the user explicitly wants to see historical performance including archived.
      // Standard CRM behavior: Dashboard reflects ACTIVE portfolio.
      // However, if a visit happened this month, it should probably count.
      // Let's filter by status !== 'archived' for now to be consistent with DoctorList.
      // If the user complains that stats dropped, we can adjust.
      // Actually, let's filter them out.
      const activeDocs = doctors.filter(d => d.status !== 'archived');
      return filterExecutive ? activeDocs.filter(d => d.executive === filterExecutive) : activeDocs;
  }, [doctors, filterExecutive]);

  const stageDetails = useMemo(() => {
      if (!selectedStage) return [];
      const details: any[] = [];
      filteredDoctors.forEach(doc => {
          (doc.visits || []).forEach(v => {
              if (v.status === 'completed' && v.outcome === selectedStage) {
                  details.push({
                      date: v.date,
                      doctor: doc.name,
                      specialty: doc.specialty,
                      category: doc.category,
                      classification: doc.classification,
                      executive: doc.executive,
                      notes: v.note,
                      docId: doc.id
                  });
              }
          });
      });
      return details.sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredDoctors, selectedStage]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    let completedMonth = 0;
    let plannedMonth = 0;
    let completedWeek = 0;
    let plannedWeek = 0;
    
    const outcomes = {
        INTERESADO: 0,
        COTIZACIÓN: 0,
        'PROGRAMAR PROCEDIMIENTO': 0,
        SEGUIMIENTO: 0
    };

    const classifications = { A: 0, B: 0, C: 0, D: 0 };
    const upcomingVisits: any[] = [];
    const recentActivity: any[] = [];

    filteredDoctors.forEach(doc => {
        // Stats por clasificación
        if (doc.classification === 'A') classifications.A++;
        else if (doc.classification === 'B') classifications.B++;
        else if (doc.classification === 'C') classifications.C++;
        else classifications.D++; // Counts D or undefined as D

        (doc.visits || []).forEach(v => {
            const vDate = parseISO(v.date);
            const isThisMonth = vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear;
            const isThisWeek = isWithinInterval(vDate, { start: weekStart, end: weekEnd });

            if (isThisMonth) {
                if (v.status === 'completed') completedMonth++;
                else plannedMonth++;
            }

            if (isThisWeek) {
                if (v.status === 'completed') completedWeek++;
                else plannedWeek++;
            }

            // Pipeline de los últimos resultados reportados
            if (v.status === 'completed' && outcomes.hasOwnProperty(v.outcome)) {
                (outcomes as any)[v.outcome]++;
            }

            // Agrupar para listas
            if (v.status === 'planned' && vDate >= now) {
                upcomingVisits.push({ ...v, docName: doc.name, docId: doc.id, hospital: doc.hospital });
            }
            if (v.status === 'completed') {
                recentActivity.push({ 
                    ...v, 
                    docName: doc.name, 
                    docId: doc.id,
                    specialty: doc.specialty,
                    category: doc.category,
                    classification: doc.classification,
                    executive: doc.executive
                });
            }
        });
    });

    const relevantProcedures = procedures.filter(p => {
        const pDate = parseISO(p.date);
        const belongs = filterExecutive ? filteredDoctors.some(d => d.id === p.doctorId) : true;
        return p.status === 'performed' && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear && belongs;
    });

    const recentProcedures = procedures
        .filter(p => filterExecutive ? filteredDoctors.some(d => d.id === p.doctorId) : true)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5);

    const totalRevenue = relevantProcedures.reduce((a, c) => a + (c.cost || 0), 0);
    const totalCommissions = totalRevenue * 0.03; // Cálculo del 3%

    return { 
        totalDoctors: filteredDoctors.length, 
        completedMonth,
        plannedMonth,
        completedWeek,
        plannedWeek,
        outcomes,
        totalRevenue,
        totalCommissions,
        performance: (plannedMonth + completedMonth) > 0 ? Math.round((completedMonth / (plannedMonth + completedMonth)) * 100) : 0,
        classifications,
        upcomingVisits: upcomingVisits.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
        recentActivity: recentActivity.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
        recentProcedures
    };
  }, [filteredDoctors, procedures, filterExecutive]);

  // Funciones de Exportación
  const downloadCSV = (data: any[], filename: string) => {
      if (data.length === 0) {
          alert("No hay datos para generar el reporte.");
          return;
      }
      const headers = Object.keys(data[0]);
      const csvContent = [
          headers.join(','),
          ...data.map(row => headers.map(header => `"${String((row as any)[header]).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportVisits = () => {
      const allVisits = filteredDoctors.flatMap(doc => 
          (doc.visits || []).map(v => ({
              FECHA: v.date,
              HORA: v.time || '',
              MEDICO: doc.name,
              ESPECIALIDAD: doc.specialty,
              EJECUTIVO: doc.executive,
              HOSPITAL: doc.hospital || '',
              ESTADO: v.status === 'completed' ? 'REALIZADA' : 'PROGRAMADA',
              RESULTADO: v.outcome,
              OBJETIVO: v.objective || '',
              NOTAS: v.note || '',
              SEGUIMIENTO: v.followUp || ''
          }))
      ).sort((a, b) => b.FECHA.localeCompare(a.FECHA));

      downloadCSV(allVisits, 'Reporte_Visitas_Medicas');
  };

  const handleExportProcedures = () => {
      const filteredProcedures = procedures.filter(p => 
          filterExecutive ? filteredDoctors.some(d => d.id === p.doctorId) : true
      ).map(p => {
          const doc = doctors.find(d => d.id === p.doctorId);
          const cost = p.cost || 0;
          
          // Only consider executive commission (3%) for procedures
          const commEjecutivo = cost * 0.03;

          return {
              FECHA: p.date,
              HORA: p.time || '',
              MEDICO: p.doctorName,
              ESPECIALIDAD: doc?.specialty || '',
              EJECUTIVO: doc?.executive || '',
              HOSPITAL: p.hospital || '',
              TIPO_PROCEDIMIENTO: p.procedureType,
              TECNICO: p.technician || '',
              PAGO: p.paymentType,
              COSTO: cost,
              'COMISIÓN EJECUTIVO': commEjecutivo,
              'COMISIÓN TOTAL': commEjecutivo,
              ESTADO: p.status === 'performed' ? 'REALIZADO' : 'PROGRAMADO'
          };
      }).sort((a, b) => b.FECHA.localeCompare(a.FECHA));

      downloadCSV(filteredProcedures, 'Reporte_Procedimientos');
  };

  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long' });

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* HERO SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full blur-3xl -z-10 opacity-60"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8 text-center md:text-left z-10">
            <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[1.5rem] text-white shadow-2xl shadow-blue-500/30 ring-4 ring-blue-50">
                <Zap className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight">
                    Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Estratégico</span>
                </h1>
                <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-[10px] mt-2 flex items-center gap-2 justify-center md:justify-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {user.role === 'admin' ? `Control Global • ${filterExecutive || 'Todo el Equipo'}` : `Mis KPIs • ${user.name}`}
                </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-center z-10">
            <div className={`px-5 py-2.5 rounded-2xl flex items-center gap-2.5 border font-black text-[10px] uppercase tracking-widest shadow-sm ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500'}`}></div>
                {isOnline ? 'Sincronizado' : 'Modo Local'}
            </div>
            {user.role === 'admin' && filterExecutive && (
                <button onClick={() => { setFilterExecutive(null); navigate('/'); }} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all active:scale-95 border border-slate-200">
                    <Filter className="w-4 h-4" />
                </button>
            )}
          </div>
      </div>

      {/* METRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1: Cartera */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100/60 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-slate-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <Users className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-100 group-hover:text-blue-50 transition-colors duration-300" />
          
          <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
                  <Users className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cartera Total</p>
              <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{stats.totalDoctors}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Contactos</span>
              </div>
          </div>
        </div>

        {/* Card 2: Efectividad */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-blue-500/20 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          
          <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm">
                  <Activity className="w-5 h-5 text-white" />
              </div>
              <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1">Efectividad {currentMonthName}</p>
              <div className="flex items-baseline gap-3">
                  <span className="text-4xl md:text-5xl font-black tracking-tight">{stats.performance}%</span>
                  <div className="px-2 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10">
                      <p className="text-[9px] font-bold uppercase leading-none">{stats.completedMonth} Visitas</p>
                  </div>
              </div>
          </div>
        </div>

        {/* Card 3: Ventas */}
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100/60 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          
          <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ventas del Mes</p>
              <div className="flex items-center gap-2">
                  <span className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">${stats.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ArrowUpRight className="w-3 h-3" />
                  <span className="text-[9px] font-black uppercase tracking-wide">Facturación</span>
              </div>
          </div>
        </div>

        {/* Card 4: Comisiones */}
        <div className="bg-gradient-to-br from-purple-600 to-fuchsia-700 p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-purple-500/20 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <Wallet className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          
          <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm">
                  <PieChart className="w-5 h-5 text-white" />
              </div>
              <p className="text-[10px] font-black text-purple-100 uppercase tracking-widest mb-1">Comisiones (3%)</p>
              <div className="flex items-baseline gap-2">
                  <span className="text-3xl md:text-4xl font-black text-white tracking-tight">
                    ${stats.totalCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/10">
                  <span className="text-[9px] font-black uppercase tracking-wide">Estimado Mensual</span>
              </div>
          </div>
        </div>
      </div>

      {/* CENTRO DE REPORTES Y DESCARGAS */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><FileSpreadsheet className="w-40 h-40 text-white" /></div>
          <div className="relative z-10">
              <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                  <Download className="w-6 h-6 text-emerald-400" /> Centro de Reportes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                      onClick={handleExportVisits}
                      className="bg-white/10 hover:bg-white/20 border border-white/10 p-4 md:p-6 rounded-2xl flex items-center justify-between group transition-all"
                  >
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform"><Users className="w-6 h-6" /></div>
                          <div className="text-left">
                              <p className="text-sm font-bold text-white uppercase">Reporte de Visitas</p>
                              <p className="text-[10px] font-medium text-slate-400">Historial completo en Excel</p>
                          </div>
                      </div>
                      <Download className="w-5 h-5 text-slate-400 group-hover:text-white" />
                  </button>

                  <button 
                      onClick={handleExportProcedures}
                      className="bg-white/10 hover:bg-white/20 border border-white/10 p-4 md:p-6 rounded-2xl flex items-center justify-between group transition-all"
                  >
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-purple-500 rounded-xl text-white shadow-lg group-hover:scale-110 transition-transform"><Activity className="w-6 h-6" /></div>
                          <div className="text-left">
                              <p className="text-sm font-bold text-white uppercase">Reporte de Procedimientos</p>
                              <p className="text-[10px] font-medium text-slate-400">Detalle financiero y estado</p>
                          </div>
                      </div>
                      <Download className="w-5 h-5 text-slate-400 group-hover:text-white" />
                  </button>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* COLUMNA IZQUIERDA: PIPELINE Y CARTERA */}
          <div className="lg:col-span-2 space-y-8">
              {/* PIPELINE COMERCIAL */}
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                          <BarChart3 className="w-6 h-6 text-blue-600" /> Pipeline de Conversión
                      </h3>
                      <span className="text-[10px] font-black text-slate-400 uppercase">Estado actual de prospectos</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {Object.entries(stats.outcomes).map(([key, value]) => (
                          <div 
                            key={key} 
                            onClick={() => setSelectedStage(key)}
                            className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group"
                          >
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500">{key}</p>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                              <div className="flex justify-between items-end">
                                  <span className="text-3xl font-black text-slate-800 group-hover:text-blue-700">{value}</span>
                                  <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-blue-600" 
                                        style={{ width: `${stats.totalDoctors > 0 ? ((value as number) / stats.totalDoctors) * 100 : 0}%` }}
                                      ></div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* DISTRIBUCIÓN DE CARTERA */}
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5"><Award className="w-40 h-40 text-slate-900" /></div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8 relative z-10 flex items-center gap-3">
                      <PieChart className="w-6 h-6 text-indigo-500" /> Análisis de Clasificación
                  </h3>
                  
                  <div className="space-y-6 relative z-10">
                      {[
                        { label: 'Top Productivo (A)', count: stats.classifications.A, color: 'bg-emerald-500' },
                        { label: 'Potencial Alto (B)', count: stats.classifications.B, color: 'bg-blue-500' },
                        { label: 'Ocasional (C)', count: stats.classifications.C, color: 'bg-yellow-500' },
                        { label: 'No Estratégico (D)', count: stats.classifications.D, color: 'bg-slate-400' },
                      ].map((item) => (
                        <div key={item.label}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-slate-500 uppercase">{item.label}</span>
                                <span className="text-xs font-black text-slate-800">{item.count}</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full ${item.color} transition-all duration-1000`} 
                                    style={{ width: `${stats.totalDoctors > 0 ? (item.count / stats.totalDoctors) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* COLUMNA DERECHA: AGENDA Y ACTIVIDAD */}
          <div className="space-y-8">
              {/* PROXIMAS ACTIVIDADES */}
              <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 h-full">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-blue-600" /> Próxima Agenda
                  </h3>
                  
                  <div className="space-y-4">
                      {stats.upcomingVisits.length > 0 ? stats.upcomingVisits.map((visit, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => navigate(`/doctors/${visit.docId}`)}
                            className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-200 cursor-pointer transition-all group"
                          >
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[9px] font-black bg-white px-2 py-1 rounded-lg text-blue-600 shadow-sm border border-slate-100 uppercase">{visit.date}</span>
                                  <div className="flex gap-1">
                                      {visit.priority === 'ALTA' && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
                                      <Clock className="w-3 h-3 text-slate-300" />
                                  </div>
                              </div>
                              <p className="text-xs font-black text-slate-800 uppercase truncate group-hover:text-blue-600">{visit.docName}</p>
                              <div className="flex items-center gap-1 mt-1 opacity-50">
                                  <MapPin className="w-3 h-3" />
                                  <p className="text-[9px] font-bold uppercase truncate">{visit.hospital || 'Consultorio'}</p>
                              </div>
                          </div>
                      )) : (
                          <div className="py-12 text-center">
                              <Calendar className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                              <p className="text-[10px] font-black text-slate-300 uppercase">Sin actividades pendientes</p>
                          </div>
                      )}
                      
                      <button 
                        onClick={() => navigate('/calendar')}
                        className="w-full py-4 mt-2 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition-all"
                      >
                          Ver Calendario Completo
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* ACTIVIDAD RECIENTE (CRM FEED) */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                  <Activity className="w-6 h-6 text-emerald-500" /> Actividad Reciente
              </h3>
              <div className="flex gap-2">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">Feed Directo</div>
              </div>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full">
                  <thead>
                      <tr className="text-left border-b border-slate-50">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Médico</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidad</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clasificación</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ejecutivo</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas</th>
                          <th className="pb-4"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {stats.recentActivity.map((act, i) => (
                          <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-5">
                                  <span className="text-xs font-bold text-slate-500">{act.date}</span>
                              </td>
                              <td className="py-5">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px]">{act.docName.charAt(0)}</div>
                                      <span className="text-xs font-black text-slate-800 uppercase">{act.docName}</span>
                                  </div>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{act.specialty || '-'}</span>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{act.category}</span>
                              </td>
                              <td className="py-5">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                      act.classification === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      act.classification === 'B' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                      act.classification === 'C' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                      'bg-slate-50 text-slate-500 border-slate-100'
                                  }`}>
                                      {act.classification || 'C'}
                                  </span>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{act.executive}</span>
                              </td>
                              <td className="py-5">
                                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                      act.outcome === 'INTERESADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      act.outcome === 'COTIZACIÓN' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                      'bg-slate-50 text-slate-500 border-slate-100'
                                  }`}>{act.outcome}</span>
                              </td>
                              <td className="py-5 max-w-xs">
                                  <p className="text-xs text-slate-500 truncate italic">{act.note || 'Sin comentarios adicionales.'}</p>
                              </td>
                              <td className="py-5 text-right">
                                  <button onClick={() => navigate(`/doctors/${act.docId}`)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                                      <ChevronRight className="w-5 h-5" />
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {stats.recentActivity.length === 0 && (
                          <tr>
                              <td colSpan={9} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                  No hay reportes recientes registrados
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* PROCEDIMIENTOS RECIENTES */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                  <Stethoscope className="w-6 h-6 text-purple-500" /> Procedimientos Recientes
              </h3>
              <div className="flex gap-2">
                  <div className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[9px] font-black uppercase tracking-widest">Últimos Registros</div>
              </div>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full">
                  <thead>
                      <tr className="text-left border-b border-slate-50">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Médico</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedimiento</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hospital</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pago</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                          <th className="pb-4"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {stats.recentProcedures.map((proc, i) => (
                          <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-5">
                                  <span className="text-xs font-bold text-slate-500">{proc.date}</span>
                              </td>
                              <td className="py-5">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-[10px]">{proc.doctorName.charAt(0)}</div>
                                      <span className="text-xs font-black text-slate-800 uppercase">{proc.doctorName}</span>
                                  </div>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{proc.procedureType}</span>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{proc.hospital || '-'}</span>
                              </td>
                              <td className="py-5">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                      proc.paymentType === 'DIRECTO' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      'bg-blue-50 text-blue-600 border-blue-100'
                                  }`}>
                                      {proc.paymentType}
                                  </span>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-bold text-slate-700">${(proc.cost || 0).toLocaleString()}</span>
                              </td>
                              <td className="py-5">
                                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                                      proc.status === 'performed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      'bg-orange-50 text-orange-600 border-orange-100'
                                  }`}>
                                      {proc.status === 'performed' ? 'REALIZADO' : 'PROGRAMADO'}
                                  </span>
                              </td>
                              <td className="py-5 text-right">
                                  <button onClick={() => navigate(`/procedures`)} className="p-2 text-slate-300 hover:text-purple-600 transition-colors">
                                      <ChevronRight className="w-5 h-5" />
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {stats.recentProcedures.length === 0 && (
                          <tr>
                              <td colSpan={8} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                  No hay procedimientos recientes registrados
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
      {/* MODAL DETALLE PIPELINE */}
      {selectedStage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-fadeIn border border-white/20 flex flex-col max-h-[85vh]">
                <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-black uppercase tracking-tight flex items-center gap-3">
                            <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                            Detalle: <span className="text-blue-600">{selectedStage}</span>
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 ml-8 md:ml-9">
                            {stageDetails.length} Registros encontrados
                        </p>
                    </div>
                    <button onClick={() => setSelectedStage(null)} className="p-2 md:p-3 bg-white rounded-2xl text-slate-400 hover:text-red-500 transition-all shadow-sm">
                        <X className="h-5 w-5 md:h-6 md:w-6" />
                    </button>
                </div>
                
                <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                            <thead>
                                <tr className="text-left border-b border-slate-100">
                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Médico</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Especialidad</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Clasificación</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ejecutivo</th>
                                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas</th>
                                    <th className="pb-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stageDetails.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 text-xs font-bold text-slate-500">{item.date}</td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px]">{item.doctor.charAt(0)}</div>
                                                <span className="text-xs font-black text-slate-800 uppercase">{item.doctor}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-xs font-medium text-slate-500 uppercase">{item.specialty || '-'}</td>
                                        <td className="py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                                item.classification === 'A' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                item.classification === 'B' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                item.classification === 'C' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                'bg-slate-50 text-slate-500 border-slate-100'
                                            }`}>
                                                {item.classification || 'C'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-xs font-medium text-slate-500 uppercase">{item.executive}</td>
                                        <td className="py-4 text-xs text-slate-500 italic max-w-xs truncate">{item.notes}</td>
                                        <td className="py-4 text-right">
                                            <button onClick={() => navigate(`/doctors/${item.docId}`)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

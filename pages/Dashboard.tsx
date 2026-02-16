
import React, { useMemo, useState } from 'react';
import { Doctor, User, Procedure, Visit } from '../types';
import { 
  Users, ShieldCheck, CheckCircle2, TrendingUp, Filter, 
  Award, Activity, DollarSign, Target, Calendar, 
  ArrowUpRight, Clock, MapPin, AlertCircle, 
  BarChart3, PieChart, Zap, ChevronRight, Stethoscope, Wallet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';

interface DashboardProps {
  doctors: Doctor[];
  user: User;
  procedures: Procedure[];
  isOnline: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ doctors, user, procedures, isOnline }) => {
  const navigate = useNavigate();
  const [filterExecutive, setFilterExecutive] = useState<string | null>(user.role === 'executive' ? user.name : null);

  const filteredDoctors = useMemo(() => {
      return filterExecutive ? doctors.filter(d => d.executive === filterExecutive) : doctors;
  }, [doctors, filterExecutive]);

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
                recentActivity.push({ ...v, docName: doc.name, docId: doc.id });
            }
        });
    });

    const relevantProcedures = procedures.filter(p => {
        const pDate = parseISO(p.date);
        const belongs = filterExecutive ? filteredDoctors.some(d => d.id === p.doctorId) : true;
        return p.status === 'performed' && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear && belongs;
    });

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
        recentActivity: recentActivity.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    };
  }, [filteredDoctors, procedures, filterExecutive]);

  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long' });

  return (
    <div className="space-y-8 pb-16 animate-fadeIn">
      {/* HERO SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-blue-600 rounded-[2rem] text-white shadow-2xl shadow-blue-200">
                <Zap className="w-10 h-10" />
            </div>
            <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                    Dashboard <span className="text-blue-600">Estratégico</span>
                </h1>
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mt-1">
                    {user.role === 'admin' ? `Control Global • ${filterExecutive || 'Todo el Equipo'}` : `Mis KPIs • ${user.name}`}
                </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border font-black text-[10px] uppercase tracking-widest ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                {isOnline ? 'Sincronizado' : 'Modo Local'}
            </div>
            {user.role === 'admin' && filterExecutive && (
                <button onClick={() => setFilterExecutive(null)} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all">
                    <Filter className="w-5 h-5" />
                </button>
            )}
          </div>
      </div>

      {/* METRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Cartera */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100 relative overflow-hidden group">
          <Users className="absolute -right-4 -bottom-4 w-32 h-32 text-slate-50 group-hover:text-blue-50 transition-colors" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 relative z-10">Cartera Total</p>
          <div className="flex items-end gap-2 relative z-10">
              <span className="text-5xl font-black text-slate-900">{stats.totalDoctors}</span>
              <span className="text-xs font-bold text-blue-600 mb-2 uppercase">Contactos</span>
          </div>
        </div>

        {/* Card 2: Efectividad */}
        <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-200 text-white relative overflow-hidden">
          <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
          <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-4 relative z-10">Efectividad {currentMonthName}</p>
          <div className="flex items-end gap-2 relative z-10">
              <span className="text-5xl font-black">{stats.performance}%</span>
              <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase leading-none">{stats.completedMonth} Visitas</p>
                  <p className="text-[10px] font-bold uppercase opacity-60">Logradas</p>
              </div>
          </div>
        </div>

        {/* Card 3: Ventas */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100 group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ventas del Mes</p>
          <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><DollarSign className="w-6 h-6" /></div>
              <span className="text-3xl font-black text-slate-900">${stats.totalRevenue.toLocaleString()}</span>
          </div>
          <p className="text-[9px] font-bold text-emerald-600 uppercase mt-4 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Facturación Procedimientos
          </p>
        </div>

        {/* Card 4: Comisiones (NUEVO) */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2.5rem] shadow-xl shadow-purple-200 text-white relative overflow-hidden">
          <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
          <p className="text-[10px] font-black text-purple-100 uppercase tracking-widest mb-4 relative z-10">Comisiones (3%)</p>
          <div className="flex items-end gap-2 relative z-10">
              <span className="text-4xl lg:text-4xl xl:text-5xl font-black text-white">
                ${stats.totalCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase opacity-80">Estimado</p>
                  <p className="text-[10px] font-bold uppercase">Mensual</p>
              </div>
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
                          <div key={key} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:border-blue-200 transition-colors">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{key}</p>
                              <div className="flex justify-between items-end">
                                  <span className="text-3xl font-black text-slate-800">{value}</span>
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
              <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><Award className="w-40 h-40 text-white" /></div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8 relative z-10 flex items-center gap-3">
                      <PieChart className="w-6 h-6 text-indigo-400" /> Análisis de Clasificación
                  </h3>
                  
                  <div className="space-y-6 relative z-10">
                      {[
                        { label: 'Top Productivo (A)', count: stats.classifications.A, color: 'bg-emerald-500' },
                        { label: 'Potencial Alto (B)', count: stats.classifications.B, color: 'bg-blue-500' },
                        { label: 'Ocasional (C)', count: stats.classifications.C, color: 'bg-yellow-500' },
                        { label: 'No Estratégico (D)', count: stats.classifications.D, color: 'bg-slate-600' },
                      ].map((item) => (
                        <div key={item.label}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-black text-slate-400 uppercase">{item.label}</span>
                                <span className="text-xs font-black text-white">{item.count}</span>
                            </div>
                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
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
                              <td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                  No hay reportes recientes registrados
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;

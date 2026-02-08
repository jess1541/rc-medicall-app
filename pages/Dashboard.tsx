
import React, { useMemo, useState } from 'react';
import { Doctor, User, Procedure } from '../types';
import { Users, ShieldCheck, CheckCircle2, TrendingUp, Filter, Award, Activity, DollarSign, Coins, Target, Briefcase, PieChart, FileSpreadsheet, Stethoscope, ArrowRight } from 'lucide-react';

interface DashboardProps {
  doctors: Doctor[];
  user: User;
  procedures: Procedure[];
}

const Dashboard: React.FC<DashboardProps> = ({ doctors, user, procedures }) => {
  const [filterExecutive, setFilterExecutive] = useState<string | null>(user.role === 'executive' ? user.name : null);

  const executives = [
      { name: 'LUIS', color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-700' },
      { name: 'ORALIA', color: 'bg-pink-500', gradient: 'from-pink-500 to-rose-600' },
      { name: 'ANGEL', color: 'bg-purple-500', gradient: 'from-purple-500 to-indigo-600' },
      { name: 'TALINA', color: 'bg-teal-500', gradient: 'from-emerald-500 to-teal-600' }
  ];

  const filteredDoctors = useMemo(() => {
      return filterExecutive ? doctors.filter(d => d.executive === filterExecutive) : doctors;
  }, [doctors, filterExecutive]);

  const stats = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    let plannedVisits = 0;
    let completedVisits = 0;
    const classifications = { A: 0, B: 0, C: 0, None: 0 };

    filteredDoctors.forEach(doc => {
        doc.visits.forEach(v => {
            const vDate = new Date(v.date + 'T00:00:00');
            if (vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear) {
                if (v.status === 'completed') completedVisits++;
                else plannedVisits++;
            }
        });
        if (doc.classification === 'A') classifications.A++;
        else if (doc.classification === 'B') classifications.B++;
        else if (doc.classification === 'C') classifications.C++;
        else classifications.None++;
    });

    const relevantProcedures = procedures.filter(p => {
        const pDate = new Date(p.date + 'T00:00:00');
        const belongs = filterExecutive ? filteredDoctors.some(d => d.id === p.doctorId) : true;
        return p.status === 'performed' && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear && belongs;
    });

    return { 
        totalDoctors: filteredDoctors.length, 
        completedVisits, 
        totalRevenue: relevantProcedures.reduce((a, c) => a + (c.cost || 0), 0),
        performance: (plannedVisits + completedVisits) > 0 ? Math.round((completedVisits / (plannedVisits + completedVisits)) * 100) : 0,
        classifications
    };
  }, [filteredDoctors, procedures, filterExecutive]);

  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long' });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl border border-white/50">
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
                Hola, <span className="text-blue-600">{user.name}</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                SISTEMA RC MEDICALL ACTUALIZADO
            </p>
          </div>
          {user.role === 'admin' && filterExecutive && (
            <button onClick={() => setFilterExecutive(null)} className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg">
                Ver Todo el Equipo
            </button>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Contactos Totales</p>
          <p className="text-4xl font-black text-slate-800">{stats.totalDoctors}</p>
        </div>
        <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl text-white">
          <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-4">Visitas {currentMonthName}</p>
          <p className="text-4xl font-black">{stats.completedVisits}</p>
          <p className="text-[10px] font-bold mt-2 uppercase">Efectividad: {stats.performance}%</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Ventas Mes</p>
          <p className="text-3xl font-black text-slate-800">${stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Clasificación A</p>
          <p className="text-4xl font-black text-emerald-600">{stats.classifications.A}</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="p-4 bg-white/10 rounded-3xl text-blue-400">
                  <FileSpreadsheet className="w-10 h-10" />
              </div>
              <div>
                  <h3 className="text-xl font-black text-white">Central de Información</h3>
                  <p className="text-sm text-slate-400 font-medium">La base de datos se ha cargado automáticamente desde el motor de arranque.</p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;

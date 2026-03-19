import React, { useMemo } from 'react';
import { Operation, Procedure, Doctor } from '../types';
import { 
  Activity, DollarSign, FileSpreadsheet, 
  Stethoscope, Users, User as UserIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface OperationsDashboardProps {
  operations: Operation[];
  procedures: Procedure[];
  doctors: Doctor[];
}

const OperationsDashboard: React.FC<OperationsDashboardProps> = ({ operations, procedures, doctors }) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const currentMonthName = new Date().toLocaleDateString('es-ES', { month: 'long' });

  const technicians = [
    "ALAN GARCÍA", 
    "ANGEL GUERRERO", 
    "GABRIEL LÓPEZ", 
    "RODRIGO GUTIÉRREZ", 
    "KEVIN VILLEDA", 
    "MAURICIO HERRERA"
  ];

  const stats = useMemo(() => {
    const monthlyOps = operations.filter(op => {
      const [year, month, day] = op.date.split('-').map(Number);
      const opDate = new Date(year, month - 1, day);
      
      return op.status === 'performed' && 
             opDate.getMonth() === currentMonth && 
             opDate.getFullYear() === currentYear;
    });

    const monthlyProcs = procedures.filter(p => {
        const [year, month, day] = p.date.split('-').map(Number);
        const pDate = new Date(year, month - 1, day);
        return p.status === 'performed' && 
               pDate.getMonth() === currentMonth && 
               pDate.getFullYear() === currentYear;
    });

    // De-duplicate: If a procedure exists in both lists, prefer the one in operations
    const seenKeys = new Set();
    const uniqueMonthlyOps = [...monthlyOps];
    uniqueMonthlyOps.forEach(op => {
        const normalizedType = (op.operationType || '').toLowerCase().trim();
        const key = `${op.date}-${op.doctorId}-${normalizedType}`;
        seenKeys.add(key);
    });

    const uniqueMonthlyProcs = monthlyProcs.filter(p => {
        const normalizedType = (p.procedureType || '').toLowerCase().trim();
        const key = `${p.date}-${p.doctorId}-${normalizedType}`;
        return !seenKeys.has(key);
    });

    const allMonthlyEvents = [
        ...uniqueMonthlyOps.map(op => {
            const cost = op.cost || 0;
            const commission = cost * 0.05; // Operations -> 5%
            return {
                ...op,
                type: op.operationType,
                executive: op.executive || '',
                category: 'operation',
                commission
            };
        }),
        ...uniqueMonthlyProcs.map(p => {
            const doc = doctors.find(d => d.id === p.doctorId);
            const cost = p.cost || 0;
            const commission = cost * 0.05; // In Operations Dashboard, everything is 5%
            return {
                ...p,
                type: p.procedureType,
                executive: doc ? doc.executive : '',
                remissionNumber: '',
                category: 'procedure',
                commission
            };
        })
    ];

    const totalProcedures = allMonthlyEvents.length;
    const totalSales = allMonthlyEvents.reduce((acc, item) => acc + (item.cost || 0), 0);
    const totalCommissions = allMonthlyEvents.reduce((acc, item) => acc + (item.commission || 0), 0);

    // Combine both operations and procedures for technician stats
    const technicianStats = technicians.map(tech => {
        const techEvents = allMonthlyEvents.filter(e => e.technician === tech);
        const combinedCommission = techEvents.reduce((acc, item) => acc + (item.commission || 0), 0);
        const combinedCount = techEvents.length;

        return {
            name: tech,
            commission: combinedCommission,
            count: combinedCount
        };
    });

    return {
      totalProcedures,
      totalSales,
      totalCommissions,
      allMonthlyEvents,
      technicianStats
    };
  }, [operations, procedures, currentMonth, currentYear, doctors]);

  const recentProcedures = useMemo(() => {
    // Combine both and de-duplicate for the recent list as well
    const all = [
        ...operations.map(o => ({ 
            ...o, 
            type: o.operationType,
            executive: o.executive || ''
        })),
        ...procedures.map(p => {
            const doc = doctors.find(d => d.id === p.doctorId);
            return { 
                ...p, 
                type: p.procedureType,
                executive: doc ? doc.executive : '',
                remissionNumber: ''
            };
        })
    ];
    
    const seen = new Set();
    const unique = all.filter(item => {
        const normalizedType = (item.type || '').toLowerCase().trim();
        const key = `${item.date}-${item.doctorId}-${normalizedType}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return unique
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [operations, procedures, doctors]);

  const handleExportExcel = () => {
    const dataToExport = stats.allMonthlyEvents.map(item => {
      const cost = item.cost || 0;
      
      // Calculate both commissions for the Excel report
      const commEjecutivo = cost * 0.03;
      const commTecnico = cost * 0.05;

      return {
        FECHA: item.date,
        MEDICO: item.doctorName,
        REMISION: item.remissionNumber || '',
        HOSPITAL: item.hospital || '',
        PROCEDIMIENTO: item.type,
        TECNICO: item.technician || '',
        EJECUTIVO: item.executive || '',
        MONTO: cost,
        'COMISIÓN EJECUTIVO (3%)': commEjecutivo,
        'COMISIÓN TÉCNICO (5%)': commTecnico,
        'COMISIÓN TOTAL': commEjecutivo + commTecnico,
        ESTADO: item.status === 'performed' ? 'REALIZADO' : 'PROGRAMADO',
        NOTAS: item.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Operativos");
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(data, `Reporte_Operativos_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* HERO SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl -z-10 opacity-60"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-5 md:gap-8 text-center md:text-left z-10">
            <div className="p-5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[1.5rem] text-white shadow-xl shadow-indigo-500/20 ring-4 ring-white/50">
                <Activity className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight">
                    Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">Operativos</span>
                </h1>
                <p className="text-slate-400 font-black uppercase tracking-[0.25em] text-[10px] mt-2 flex items-center gap-2 justify-center md:justify-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    Resumen Mensual • {currentMonthName} {currentYear}
                </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-center z-10">
             <button 
                onClick={handleExportExcel}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-2.5 active:scale-95 border border-white/10"
             >
                <FileSpreadsheet className="w-5 h-5" /> Descargar Excel
             </button>
          </div>
      </div>

      {/* METRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Card 1: Procedimientos */}
        <div className="bg-indigo-50 p-6 md:p-8 rounded-[2.5rem] shadow-md border border-indigo-100 relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-100/50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          <Stethoscope className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-200/20 group-hover:text-indigo-500/10 transition-colors duration-300" />
          
          <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm group-hover:bg-indigo-100 transition-colors">
                  <Stethoscope className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest mb-1">Procedimientos (Mes)</p>
              <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{stats.totalProcedures}</span>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase">Registrados</span>
              </div>
          </div>
        </div>

        {/* Card 2: Venta Mensual */}
        <div className="bg-emerald-50 p-6 md:p-8 rounded-[2.5rem] shadow-md border border-emerald-100 relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-100/50 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
          
          <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center mb-4 shadow-sm group-hover:bg-emerald-100 transition-colors">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Venta Mensual</p>
              <div className="flex items-center gap-2">
                  <span className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">${stats.totalSales.toLocaleString()}</span>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200">
                  <span className="text-[9px] font-black uppercase tracking-wide">Total Facturado</span>
              </div>
          </div>
        </div>

        {/* Card 3: Comisiones */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border border-white/10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10 group-hover:scale-110 transition-transform duration-500" />
          
          <div className="relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm">
                  <DollarSign className="w-5 h-5 text-white" />
              </div>
              <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Comisiones (5%)</p>
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

      {/* COMISIONES POR TÉCNICO */}
      <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
              <Users className="w-6 h-6 text-indigo-600" />
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Comisiones por Técnico (Gestión)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {stats.technicianStats.map((tech, idx) => (
                  <div key={idx} className="bg-slate-50 p-8 rounded-[2.5rem] shadow-md border border-slate-200 hover:shadow-xl transition-all group hover:-translate-y-1">
                      <div className="flex justify-between items-start mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-white text-slate-400 flex items-center justify-center shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                              <UserIcon className="w-6 h-6" />
                          </div>
                          <span className="px-3 py-1 bg-white text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">{tech.count} Proc.</span>
                      </div>
                      <h4 className="text-base font-black text-slate-800 uppercase mb-2 tracking-tight">{tech.name}</h4>
                      <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-indigo-600">${tech.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Comisión 5%</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* PROCEDIMIENTOS RECIENTES */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                  <Activity className="w-6 h-6 text-indigo-600" /> Procedimientos Recientes
              </h3>
              <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100">Últimos Registros</div>
          </div>

          <div className="overflow-x-auto">
              <table className="w-full">
                  <thead>
                      <tr className="text-left border-b border-slate-50">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Médico</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Remisión</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hospital</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Procedimiento</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Técnico</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ejecutivo</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {recentProcedures.map((op, i) => (
                          <tr key={i} className="group hover:bg-slate-50 transition-colors">
                              <td className="py-5">
                                  <span className="text-xs font-bold text-slate-400">{op.date}</span>
                              </td>
                              <td className="py-5">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px]">{op.doctorName.charAt(0)}</div>
                                      <span className="text-xs font-black text-slate-700 uppercase">{op.doctorName}</span>
                                  </div>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{op.remissionNumber || '-'}</span>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{op.hospital || '-'}</span>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{op.type}</span>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{op.technician || '-'}</span>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-medium text-slate-500 uppercase">{op.executive || '-'}</span>
                              </td>
                              <td className="py-5">
                                  <span className="text-xs font-bold text-slate-800">${(op.cost || 0).toLocaleString()}</span>
                              </td>
                          </tr>
                      ))}
                      {recentProcedures.length === 0 && (
                          <tr>
                              <td colSpan={8} className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                  No hay procedimientos registrados
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

export default OperationsDashboard;

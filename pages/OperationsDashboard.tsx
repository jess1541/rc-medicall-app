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
            const commission = cost * 0.03; // Procedures -> 3%
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
      
      // Calculate commission based on category
      // Operations -> 5% (Technician)
      // Procedures -> 3% (Executive)
      const commEjecutivo = (item as any).category === 'procedure' ? cost * 0.03 : 0;
      const commTecnico = (item as any).category === 'operation' ? cost * 0.05 : 0;

      return {
        FECHA: item.date,
        MEDICO: item.doctorName,
        REMISION: item.remissionNumber || '',
        HOSPITAL: item.hospital || '',
        PROCEDIMIENTO: item.type,
        TECNICO: item.technician || '',
        EJECUTIVO: item.executive || '',
        MONTO: cost,
        'COMISIÓN EJECUTIVO': commEjecutivo,
        'COMISIÓN TÉCNICO': commTecnico,
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
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
            <div className="p-4 md:p-5 bg-indigo-600 rounded-[1.5rem] md:rounded-[2rem] text-white shadow-2xl shadow-indigo-200">
                <Activity className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
                    Dashboard <span className="text-indigo-600">Operativos</span>
                </h1>
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mt-1">
                    Resumen Mensual • {currentMonthName} {currentYear}
                </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-center">
             <button 
                onClick={handleExportExcel}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
             >
                <FileSpreadsheet className="w-4 h-4" /> Descargar Excel
             </button>
          </div>
      </div>

      {/* METRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Card 1: Procedimientos */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-lg border border-slate-100 relative overflow-hidden group">
          <Stethoscope className="absolute -right-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 text-slate-50 group-hover:text-indigo-50 transition-colors" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 relative z-10">Procedimientos (Mes)</p>
          <div className="flex items-end gap-2 relative z-10">
              <span className="text-4xl md:text-5xl font-black text-slate-900">{stats.totalProcedures}</span>
              <span className="text-xs font-bold text-indigo-600 mb-2 uppercase">Registrados</span>
          </div>
        </div>

        {/* Card 2: Venta Mensual */}
        <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-lg border border-slate-100 group">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Venta Mensual</p>
          <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><DollarSign className="w-6 h-6" /></div>
              <span className="text-2xl md:text-3xl font-black text-slate-900">${stats.totalSales.toLocaleString()}</span>
          </div>
          <p className="text-[9px] font-bold text-emerald-600 uppercase mt-4 flex items-center gap-1">
              Total Facturado
          </p>
        </div>

        {/* Card 3: Comisiones */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-purple-200 text-white relative overflow-hidden">
          <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 text-white/10" />
          <p className="text-[10px] font-black text-purple-100 uppercase tracking-widest mb-4 relative z-10">Comisiones (5%)</p>
          <div className="flex items-end gap-2 relative z-10">
              <span className="text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-black text-white">
                ${stats.totalCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className="mb-2">
                  <p className="text-[10px] font-bold uppercase opacity-80">Estimado</p>
                  <p className="text-[10px] font-bold uppercase">Mensual</p>
              </div>
          </div>
        </div>
      </div>

      {/* COMISIONES POR TÉCNICO */}
      <div className="space-y-6">
          <div className="flex items-center gap-3 px-4">
              <Users className="w-6 h-6 text-indigo-500" />
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Comisiones por Técnico (Gestión)</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.technicianStats.map((tech, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100 hover:shadow-xl transition-all group">
                      <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                              <UserIcon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tech.count} Proc.</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-800 uppercase mb-1">{tech.name}</h4>
                      <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-indigo-600">${tech.commission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Comisión 5%</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* PROCEDIMIENTOS RECIENTES */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                  <Activity className="w-6 h-6 text-indigo-500" /> Procedimientos Recientes
              </h3>
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
                          <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-5">
                                  <span className="text-xs font-bold text-slate-500">{op.date}</span>
                              </td>
                              <td className="py-5">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[10px]">{op.doctorName.charAt(0)}</div>
                                      <span className="text-xs font-black text-slate-800 uppercase">{op.doctorName}</span>
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
                                  <span className="text-xs font-bold text-slate-700">${(op.cost || 0).toLocaleString()}</span>
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

import React, { useState, useMemo } from 'react';
import { Doctor, Visit } from '../types';
import { MapPin, User as UserIcon, ExternalLink, Filter } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';

registerLocale('es', es);

interface LocationHistoryProps {
  doctors: Doctor[];
}

const LocationHistory: React.FC<LocationHistoryProps> = ({ doctors }) => {
  const [selectedExecutive, setSelectedExecutive] = useState<string>('TODOS');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const executivesList = useMemo(() => {
    const execs = new Set(doctors.map(d => d.executive));
    return ['TODOS', ...Array.from(execs).sort()];
  }, [doctors]);

  const visitsWithLocation = useMemo(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const allVisits: { docName: string; docAddress: string; visit: Visit; executive: string }[] = [];

    doctors.forEach(doc => {
      if (selectedExecutive !== 'TODOS' && doc.executive !== selectedExecutive) return;
      
      (doc.visits || []).forEach(visit => {
        if (visit.date === dateStr && visit.checkIn) {
          allVisits.push({
            docName: doc.name,
            docAddress: doc.address,
            visit: visit,
            executive: doc.executive
          });
        }
      });
    });

    // Sort by timestamp
    return allVisits.sort((a, b) => {
        const timeA = new Date(a.visit.checkIn!.timestamp).getTime();
        const timeB = new Date(b.visit.checkIn!.timestamp).getTime();
        return timeA - timeB;
    });
  }, [doctors, selectedExecutive, selectedDate]);

  const generateRouteLink = () => {
      if (visitsWithLocation.length < 2) return '';
      
      const baseUrl = "https://www.google.com/maps/dir/?api=1";
      const origin = `${visitsWithLocation[0].visit.checkIn!.lat},${visitsWithLocation[0].visit.checkIn!.lng}`;
      const destination = `${visitsWithLocation[visitsWithLocation.length - 1].visit.checkIn!.lat},${visitsWithLocation[visitsWithLocation.length - 1].visit.checkIn!.lng}`;
      
      let waypoints = '';
      if (visitsWithLocation.length > 2) {
          const points = visitsWithLocation.slice(1, -1).map(v => `${v.visit.checkIn!.lat},${v.visit.checkIn!.lng}`).join('|');
          waypoints = `&waypoints=${points}`;
      }

      return `${baseUrl}&origin=${origin}&destination=${destination}${waypoints}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <MapPin className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                Historial de Ubicaciones
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] ml-9 md:ml-11">
                Auditoría de visitas geolocalizadas.
            </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Fecha</label>
                  <DatePicker 
                      selected={selectedDate} 
                      onChange={(date) => date && setSelectedDate(date)} 
                      dateFormat="dd/MM/yyyy"
                      locale="es"
                      className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
              </div>
              <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Ejecutivo</label>
                  <div className="relative">
                      <select
                          className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none uppercase appearance-none"
                          value={selectedExecutive}
                          onChange={(e) => setSelectedExecutive(e.target.value)}
                      >
                          {executivesList.map(exec => <option key={exec} value={exec}>{exec}</option>)}
                      </select>
                      <Filter className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
              </div>
              <div className="flex items-end">
                  {visitsWithLocation.length > 1 ? (
                      <a 
                          href={generateRouteLink()} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
                      >
                          <MapPin className="w-4 h-4 mr-2" />
                          Ver Ruta Completa en Maps
                      </a>
                  ) : (
                      <button disabled className="w-full flex items-center justify-center px-6 py-3 bg-slate-100 text-slate-400 rounded-xl font-black text-xs uppercase tracking-widest cursor-not-allowed">
                          <MapPin className="w-4 h-4 mr-2" />
                          Ruta no disponible
                      </button>
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
          {visitsWithLocation.length > 0 ? (
              visitsWithLocation.map((item, index) => (
                  <div key={`${item.visit.id}-${index}`} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-all">
                      <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 shrink-0">
                              {index + 1}
                          </div>
                          <div>
                              <h3 className="text-sm font-black text-slate-900 uppercase">{item.docName}</h3>
                              <p className="text-xs text-slate-500 font-bold uppercase flex items-center mt-1">
                                  <UserIcon className="w-3 h-3 mr-1" /> {item.executive}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
                                  {item.docAddress}
                              </p>
                          </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                          <div className="flex items-center gap-2">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase">
                                  {new Date(item.visit.checkIn!.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${item.visit.checkIn!.accuracy < 50 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  Precisión: {Math.round(item.visit.checkIn!.accuracy)}m
                              </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a 
                                href={`https://www.google.com/maps?q=${item.visit.checkIn!.lat},${item.visit.checkIn!.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-blue-500 hover:text-blue-700 flex items-center uppercase tracking-wide"
                            >
                                Ver Ubicación <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                      </div>
                  </div>
              ))
          ) : (
              <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <MapPin className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No hay registros de ubicación para esta selección</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default LocationHistory;


export interface Visit {
  id: string;
  date: string; 
  time?: string; 
  note: string; 
  objective?: string; 
  followUp?: string; 
  outcome: 'SEGUIMIENTO' | 'COTIZACIÓN' | 'INTERESADO' | 'PROGRAMAR PROCEDIMIENTO' | 'PLANEADA' | 'CITA' | 'AUSENTE' | 'COMPROMISO';
  status: 'planned' | 'completed';
  // Nuevos campos de relevancia comercial
  priority?: 'ALTA' | 'MEDIA' | 'BAJA';
  materialsDelivered?: string;
  interestLevel?: 1 | 2 | 3 | 4 | 5; // 1-5 estrellas
  nextStepType?: 'LLAMADA' | 'WHATSAPP' | 'VISITA' | 'EMAIL';
}

export interface ScheduleSlot {
  day: string;
  time: string;
  active: boolean;
}

export interface TimeOffEvent {
  id: string;
  executive: string;
  startDate: string;
  endDate: string;
  duration: '2 A 4 HRS' | '6 A 8 HRS' | 'TODO EL DÍA';
  reason: 'VACACIONES' | 'INCAPACIDAD' | 'JUNTA' | 'PERMISO' | 'ADMINISTRATIVO';
  notes: string;
}

export interface Doctor {
  id: string;
  category: 'MEDICO' | 'ADMINISTRATIVO' | 'HOSPITAL';
  executive: string;
  name: string;
  specialty?: string;
  address: string;
  phone?: string;
  email?: string;
  floor?: string;
  officeNumber?: string;
  hospital?: string;
  subSpecialty?: string;
  birthDate?: string;
  cedula?: string;
  classification?: 'A' | 'B' | 'C' | 'D';
  socialStyle?: 'ANALÍTICO' | 'EMPRENDEDOR' | 'AFABLE' | 'EXPRESIVO' | '';
  attitudinalSegment?: 'RELACIÓN' | 'PACIENTE' | 'INNOVACIÓN' | 'EXPERIENCIA' | '';
  schedule: ScheduleSlot[];
  importantNotes?: string;
  isInsuranceDoctor?: boolean; 
  visits: Visit[];
}

export interface Procedure {
  id: string;
  date: string;
  time?: string;
  hospital?: string;
  doctorId: string;
  doctorName: string;
  procedureType: string;
  paymentType: 'DIRECTO' | 'ASEGURADORA';
  cost?: number; 
  commission?: number;
  technician?: string;
  notes: string;
  status: 'scheduled' | 'performed';
}

export interface User {
  name: string;
  role: 'admin' | 'executive';
  password?: string;
}

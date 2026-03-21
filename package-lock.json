import { Doctor, ScheduleSlot } from './types';

// Motor de datos masivos para RC MediCall - Carga Automática
const RAW_DATA = `EJECUTIVO,NOMBRE,ESPECIALIDAD,SUB ESPECIALIDAD,DIRECCION,HOSPITAL,CONSULTORIO,PISO,TELEFONO,CORREO ELECTRONICO,CEDULA PROFESIONAL,FECHA DE NACIMIENTO,ASEGURADORA,CATEGORIA,ESTILO SOCIAL,SEGMENTO ACTITUDINAL,HORA DE ATENCIÓN,OBSERVACIONES
TALINA,HOSPITAL ÁNGELES MÉXICO,HOSPITAL,,TLACOTALPAN 59,HOSPITAL ÁNGELES MÉXICO,,,55 5265 1800,,,,,HOSPITAL,,,,
TALINA,HOSPITAL ÁNGELES MOCEL,HOSPITAL,,GOBERNADOR GREGORIO V. GELATI 29,HOSPITAL ÁNGELES MOCEL,,,55 5278 2300,,,,,HOSPITAL,,,,
TALINA,HOSPITAL ÁNGELES ROMA,HOSPITAL,,QUERÉTARO 58,HOSPITAL ÁNGELES ROMA,,,52 55 5225 2600,,,,,HOSPITAL,,,,
TALINA,CLÍNICA LONDRES,HOSPITAL,,DURANGO 50,CLÍNICA LONDRES,,,52 55 5229 8400,,,,,HOSPITAL,,,,
TALINA,HOSPITAL ÁNGELES METROPOLITANO,HOSPITAL,,AGRARISMO 208,HOSPITAL ÁNGELES METROPOLITANO,,,52 55 5516 9900,,,,,HOSPITAL,,,,
TALINA,STAR MÉDICA CENTRO,HOSPITAL,,SAN LUIS POTOSÍ 143,STAR MÉDICA CENTRO,,,55 1084 4747,,,,,HOSPITAL,,,,
TALINA,MARÍA JOSÉ ROMA,HOSPITAL,,COZUMEL 62,MARÍA JOSÉ ROMA,,,55 6650 9972,,,,,HOSPITAL,,,,
TALINA,DALINDE,HOSPITAL,,AV. TUXPAN 25,DALINDE,,,52 55 5265 2800,,,,,HOSPITAL,,,,
TALINA,TORRE MÉDICA TUXPAN,HOSPITAL,,TEHUANTEPEC 251,TORRE MÉDICA TUXPAN,,,41652800,,,,,HOSPITAL,,,,
LUIS,SAN ÁNGEL INN UNIVERSIDAD,HOSPITAL,,AV. CUAUHTÉMOC 1128,SAN ÁNGEL INN UNIVERSIDAD,,,55 2868 0643,,,,,HOSPITAL,,,,
LUIS,ÁNGELES UNIVERSIDAD,HOSPITAL,,AV. UNIVERSIDAD 1080,ÁNGELES UNIVERSIDAD,,,55 7256 9800,,,,,HOSPITAL,,,,
LUIS,HMG HOSPITAL COYOACÁN,HOSPITAL,,CALLE ÁRBOL DE FUEGO 80,HMG HOSPITAL COYOACÁN,,,55 5338 0700,,,,,HOSPITAL,,,,
LUIS,MAC LA VIGA,HOSPITAL,,CALZ. DE LA VIGA 1174,MAC LA VIGA,,,55 4169 8514,,,,,HOSPITAL,,,,
LUIS,SAN ÁNGEL INN CHURUBUSCO,HOSPITAL,,AV. RÍO CHURUBUSCO 601,SAN ÁNGEL INN CHURUBUSCO,,,55 5623 6363,,,,,HOSPITAL,,,,
ORALIA,ÁNGELES SANTA MÓNICA,HOSPITAL,,TEMÍSTOCLES 210,ÁNGELES SANTA MÓNICA,,,5555313120,,,,,HOSPITAL,,,,
ORALIA,STAR MÉDICA TLALNEPANTLA,HOSPITAL,,AV SOR JUANA INÉS DE LA CRUZ 280,STAR MÉDICA TLALNEPANTLA,,,55 5321 7070,,,,,HOSPITAL,,,,
ORALIA,STAR MÉDICA LOMAS VERDES,HOSPITAL,,AVENIDA LOMAS VERDES 2165,STAR MÉDICA LOMAS VERDES,,,55 2625 1700,,,,,HOSPITAL,,,,
ORALIA,SAN ÁNGEL INN SATÉLITE,HOSPITAL,,CTO CENTRO COMERCIAL 22,SAN ÁNGEL INN SATÉLITE,,,55 9550 7000,,,,,HOSPITAL,,,,
ORALIA,CLÍNICA AZURA SATÉLITE,HOSPITAL,,ENRIQUE SADA MUGUERZA 17,CLÍNICA AZURA SATÉLITE,,,55 5572 5858,,,,,HOSPITAL,,,,
ORALIA,ÁNGELES LINDAVISTA,HOSPITAL,,RÍO BAMBA 639,ÁNGELES LINDAVISTA,,,55 5754 7000,,,,,HOSPITAL,,,,
ORALIA,TORRE MÉDICA MONTEVIDEO,HOSPITAL,,AV. MONTEVIDEO 359,TORRE MÉDICA MONTEVIDEO,,,55 8931 1440,,,,,HOSPITAL,,,,
ORALIA,HOSPITAL ESPAÑOL,HOSPITAL,,EJÉRCITO NACIONAL 613,HOSPITAL ESPAÑOL,,,55 5255 9600,,,,,HOSPITAL,,,,
ORALIA,MAC LOMAS VERDES,HOSPITAL,,ALEXANDER VON HUMBOLDT 26,MAC LOMAS VERDES,,,55 4169 8514,,,,,HOSPITAL,,,,
ORALIA,MAC TLALNEPANTLA,HOSPITAL,,AV. DR. GUSTAVO BAZ 28,MAC TLALNEPANTLA,,,5589775100,,,,,HOSPITAL,,,,
ORALIA,CORPORATIVO SATÉLITE,HOSPITAL,,CTO MISIONEROS 5,CORPORATIVO SATÉLITE,,,55 5089 1410,,,,,HOSPITAL,,,,`;

export const parseDataString = (data: string): Doctor[] => {
  const lines = data.trim().split('\n');
  const doctors: Doctor[] = [];

  lines.forEach((line, index) => {
    // Salta la cabecera
    if (index === 0 && line.toUpperCase().includes('EJECUTIVO')) return;
    
    // Parser robusto para CSV con comas dentro de comillas
    const parts: string[] = [];
    let currentPart = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            parts.push(currentPart.trim());
            currentPart = '';
        } else {
            currentPart += char;
        }
    }
    parts.push(currentPart.trim());

    if (parts.length >= 2) {
      const executive = (parts[0] || 'SIN ASIGNAR').toUpperCase();
      const name = (parts[1] || 'DESCONOCIDO').toUpperCase();
      
      if (name && name !== "NOMBRE" && name !== "") {
        const initialSchedule: ScheduleSlot[] = [
            { day: 'LUNES', time: '', active: false },
            { day: 'MARTES', time: '', active: false },
            { day: 'MIÉRCOLES', time: '', active: false },
            { day: 'JUEVES', time: '', active: false },
            { day: 'VIERNES', time: '', active: false },
            { day: 'SÁBADO', time: '', active: false },
            { day: 'DOMINGO', time: '', active: false }
        ];

        doctors.push({
          id: `doc-${index}-${name.replace(/\s+/g, '')}`,
          category: (parts[13] || 'MEDICO').toUpperCase() as any,
          executive,
          name,
          specialty: (parts[2] || 'GENERAL').toUpperCase(),
          subSpecialty: (parts[3] || '').toUpperCase(),
          address: (parts[4] || '').toUpperCase(),
          hospital: (parts[5] || '').toUpperCase(),
          officeNumber: parts[6] || '',
          floor: parts[7] || '',
          phone: parts[8] || '',
          email: parts[9] || '',
          cedula: parts[10] || '',
          birthDate: parts[11] || '',
          isInsuranceDoctor: !!parts[12], 
          classification: (parts[13]?.toUpperCase().includes('VIP') ? 'A' : 'C'),
          socialStyle: (parts[14] || '') as any,
          attitudinalSegment: (parts[15] || '') as any,
          importantNotes: parts[17] || '',
          visits: [],
          schedule: initialSchedule
        });
      }
    }
  });

  return doctors;
};

export const parseData = (): Doctor[] => {
  return parseDataString(RAW_DATA);
};

import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(cors());

/**
 * CONFIGURACIÓN DE BASE DE DATOS
 * Prioriza variables de entorno para flexibilidad en Cloud Run.
 */
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root1',
    password: process.env.DB_PASSWORD || 'Medicall2026!',
    database: process.env.DB_NAME || 'rc-medicall-db',
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    // El socketPath es vital para el conector de Cloud SQL en Cloud Run
    socketPath: process.env.INSTANCE_UNIX_SOCKET || null 
};

let pool;

async function initDB() {
    let retries = 5;
    while (retries > 0) {
        try {
            console.log(`📡 Intentando conectar a MySQL (Intentos restantes: ${retries})...`);
            
            const connParams = dbConfig.socketPath 
                ? { user: dbConfig.user, password: dbConfig.password, socketPath: dbConfig.socketPath }
                : { host: dbConfig.host, user: dbConfig.user, password: dbConfig.password, port: dbConfig.port };

            const connection = await mysql.createConnection(connParams);
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
            await connection.end();

            pool = mysql.createPool(dbConfig);
            
            // Verificación de tablas básicas
            await pool.query('SELECT 1'); 
            
            console.log("✅ Conexión establecida con éxito.");
            break;
        } catch (err) {
            console.error("❌ Error de conexión:", err.message);
            retries--;
            if (retries === 0) console.error("⚠️ No se pudo conectar a la DB. El servidor iniciará pero las peticiones fallarán.");
            await new Promise(res => setTimeout(res, 5000)); // Esperar 5s para reintentar (Cold Start protection)
        }
    }
}

initDB();

// --- API ENDPOINTS ---
app.get('/api/doctors', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM doctors ORDER BY updatedAt DESC");
        const doctors = rows.map(row => ({
            ...row,
            isInsuranceDoctor: !!row.isInsuranceDoctor,
            visits: typeof row.visits === 'string' ? JSON.parse(row.visits) : (row.visits || []),
            schedule: typeof row.schedule === 'string' ? JSON.parse(row.schedule) : (row.schedule || [])
        }));
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/doctors', async (req, res) => {
    try {
        const d = req.body;
        const query = `
            INSERT INTO doctors (
                id, category, executive, name, specialty, subSpecialty, address, 
                hospital, area, phone, email, floor, officeNumber, birthDate, 
                cedula, classification, socialStyle, attitudinalSegment, 
                importantNotes, isInsuranceDoctor, visits, schedule
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                category=VALUES(category), executive=VALUES(executive), name=VALUES(name),
                specialty=VALUES(specialty), subSpecialty=VALUES(subSpecialty), address=VALUES(address),
                hospital=VALUES(hospital), area=VALUES(area), phone=VALUES(phone),
                email=VALUES(email), floor=VALUES(floor), officeNumber=VALUES(officeNumber),
                birthDate=VALUES(birthDate), cedula=VALUES(cedula), classification=VALUES(classification),
                socialStyle=VALUES(socialStyle), attitudinalSegment=VALUES(attitudinalSegment),
                importantNotes=VALUES(importantNotes), isInsuranceDoctor=VALUES(isInsuranceDoctor),
                visits=VALUES(visits), schedule=VALUES(schedule)
        `;
        await pool.execute(query, [
            d.id, d.category || 'MEDICO', d.executive, d.name, d.specialty, d.subSpecialty, d.address,
            d.hospital, d.area, d.phone, d.email, d.floor, d.officeNumber, d.birthDate,
            d.cedula, d.classification, d.socialStyle, d.attitudinalSegment,
            d.importantNotes, d.isInsuranceDoctor ? 1 : 0,
            JSON.stringify(d.visits || []), JSON.stringify(d.schedule || [])
        ]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/procedures', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM procedures ORDER BY date DESC");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/procedures', async (req, res) => {
    try {
        const p = req.body;
        const query = `
            INSERT INTO procedures (
                id, date, time, hospital, doctorId, doctorName, 
                procedureType, paymentType, cost, commission, technician, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                date=VALUES(date), time=VALUES(time), hospital=VALUES(hospital),
                doctorId=VALUES(doctorId), doctorName=VALUES(doctorName),
                procedureType=VALUES(procedureType), paymentType=VALUES(paymentType),
                cost=VALUES(cost), commission=VALUES(commission),
                technician=VALUES(technician), notes=VALUES(notes), status=VALUES(status)
        `;
        await pool.execute(query, [
            p.id, p.date, p.time, p.hospital, p.doctorId, p.doctorName,
            p.procedureType, p.paymentType, p.cost || 0, p.commission || 0,
            p.technician, p.notes, p.status
        ]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- SERVING FRONTEND (DIST) ---
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Soporte para SPA: redirigir todas las rutas al index.html
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'));
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CRM RC MediCall Online en puerto ${PORT}`);
});

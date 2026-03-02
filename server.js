

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer as createViteServer } from 'vite';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000; // Hardcoded to 3000 as per environment requirements

// Límite aumentado para la carga inicial masiva
app.use(express.json({ limit: '100mb' }));
app.use(cors());

// Headers para evitar caché excesivo en la API
app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// --- MONGODB CONNECTION ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rc_medicall_db';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ MongoDB Conectado Exitósamente");
    } catch (err) {
        console.error("❌ Error de conexión MongoDB:", err.message);
        // Reintentar conexión en 5 segundos
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// --- MONGOOSE SCHEMAS ---

const VisitSchema = new mongoose.Schema({
    id: String,
    date: String,
    time: String,
    note: String,
    objective: String,
    followUp: String,
    outcome: String,
    status: String,
    priority: String,
    materialsDelivered: String,
    interestLevel: Number,
    nextStepType: String
}, { _id: false });

const ScheduleSlotSchema = new mongoose.Schema({
    day: String,
    time: String,
    active: Boolean
}, { _id: false });

const DoctorSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    category: { type: String, default: 'MEDICO' },
    executive: String,
    name: String,
    specialty: String,
    subSpecialty: String,
    address: String,
    hospital: String,
    officeNumber: String,
    floor: String,
    phone: String,
    email: String,
    cedula: String,
    birthDate: String,
    isInsuranceDoctor: { type: Boolean, default: false },
    classification: { type: String, default: 'C' },
    socialStyle: String,
    attitudinalSegment: String,
    importantNotes: String,
    visits: [VisitSchema],
    schedule: [ScheduleSlotSchema],
    status: { type: String, default: 'active' } // Added status field for archiving
}, { timestamps: true });

const TimeOffSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    executive: String,
    startDate: String,
    endDate: String,
    duration: String,
    reason: String,
    notes: String
}, { timestamps: true });

const ProcedureSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    date: String,
    time: String,
    hospital: String,
    doctorId: String,
    doctorName: String,
    procedureType: String,
    paymentType: String,
    cost: Number,
    commission: Number,
    technician: String,
    notes: String,
    status: String
}, { timestamps: true });

const OperationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    date: String,
    time: String,
    remissionNumber: String,
    hospital: String,
    doctorId: String,
    doctorName: String,
    executive: String,
    operationType: String,
    paymentType: String,
    cost: Number,
    commission: Number,
    technician: String,
    notes: String,
    status: String
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'executive', 'admin_restricted'], required: true },
    password: { type: String, required: true }
}, { timestamps: true });

// --- MODELS ---
const Doctor = mongoose.model('Doctor', DoctorSchema);
const TimeOff = mongoose.model('TimeOff', TimeOffSchema);
const Procedure = mongoose.model('Procedure', ProcedureSchema);
const Operation = mongoose.model('Operation', OperationSchema);
const User = mongoose.model('User', UserSchema);

// --- API ROUTES ---

// 0. USERS (AUTH & MANAGEMENT)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}).lean();
        // Si no hay usuarios, devolver los default para que el frontend los use o los cree
        if (users.length === 0) {
            return res.json([]); 
        }
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const u = req.body;
        const updatedUser = await User.findOneAndUpdate(
            { id: u.id },
            u,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, data: updatedUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/init', async (req, res) => {
    try {
        const initialUsers = req.body;
        if (!Array.isArray(initialUsers) || initialUsers.length === 0) return res.status(400).json({ error: "No data" });
        
        const operations = initialUsers.map(u => ({
            updateOne: {
                filter: { id: u.name }, // Usamos nombre como ID inicial para compatibilidad
                update: { $set: { ...u, id: u.name } }, // Aseguramos que tenga ID
                upsert: true
            }
        }));
        
        await User.bulkWrite(operations);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 1. DOCTORS
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find({}).sort({ name: 1 }).lean();
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/doctors', async (req, res) => {
    try {
        const d = req.body;
        const updatedDoctor = await Doctor.findOneAndUpdate(
            { id: d.id },
            d,
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, data: updatedDoctor });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/doctors/bulk', async (req, res) => {
    try {
        const doctors = req.body;
        if (!Array.isArray(doctors) || doctors.length === 0) {
            return res.status(400).json({ error: "No data provided" });
        }
        const operations = doctors.map(doc => ({
            updateOne: {
                filter: { id: doc.id },
                update: { $set: doc },
                upsert: true
            }
        }));
        const result = await Doctor.bulkWrite(operations);
        res.json({ success: true, count: result.upsertedCount + result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/doctors/clear/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const result = await Doctor.deleteMany({ category: category.toUpperCase() });
        res.json({ success: true, count: result.deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/doctors/:id', async (req, res) => {
    try {
        await Doctor.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. TIMEOFF
app.get('/api/timeoff', async (req, res) => {
    try {
        const events = await TimeOff.find({}).sort({ startDate: -1 }).lean();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/timeoff', async (req, res) => {
    try {
        const t = req.body;
        await TimeOff.findOneAndUpdate(
            { id: t.id },
            t,
            { new: true, upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/timeoff/:id', async (req, res) => {
    try {
        await TimeOff.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. PROCEDURES
app.get('/api/procedures', async (req, res) => {
    try {
        const procs = await Procedure.find({}).sort({ date: -1 }).lean();
        res.json(procs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/procedures', async (req, res) => {
    try {
        const p = req.body;
        await Procedure.findOneAndUpdate(
            { id: p.id },
            p,
            { new: true, upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/procedures/:id', async (req, res) => {
    try {
        await Procedure.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. OPERATIONS
app.get('/api/operations', async (req, res) => {
    try {
        const ops = await Operation.find({}).sort({ date: -1 }).lean();
        res.json(ops);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/operations', async (req, res) => {
    try {
        const op = req.body;
        await Operation.findOneAndUpdate(
            { id: op.id },
            op,
            { new: true, upsert: true }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/operations/:id', async (req, res) => {
    try {
        await Operation.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- VITE MIDDLEWARE & STATIC FILES ---

if (process.env.NODE_ENV !== 'production') {
    // Development: Use Vite middleware
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
    });
    app.use(vite.middlewares);
} else {
    // Production: Serve static files
    app.use(express.static(join(__dirname, 'dist')));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(join(__dirname, 'dist', 'index.html'));
        }
    });
}

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Elite CRM (Mongo Edition) Online Port ${PORT}`));


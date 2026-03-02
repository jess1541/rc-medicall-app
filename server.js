
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

async function startServer() {
    const app = express();
    // Límite aumentado para la carga inicial masiva
    app.use(express.json({ limit: '100mb' }));
    app.use(cors());

    // Headers para evitar caché excesivo en la API
    app.use('/api', (req, res, next) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        next();
    });

// --- HYBRID STORAGE SETUP ---
const MONGO_URI = process.env.MONGO_URI;
const isMemoryMode = !MONGO_URI;

// In-memory store for fallback
let memoryStore = {
    doctors: [],
    timeoff: [],
    procedures: [],
    operations: [],
    users: []
};

if (isMemoryMode) {
    console.log("ℹ️ MODO DEMO: No se detectó MONGO_URI. Usando almacenamiento en memoria.");
    console.log("💡 Los datos se perderán al reiniciar el servidor. Configura MONGO_URI para persistencia real.");
}

const connectDB = async () => {
    if (isMemoryMode) return;
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("✅ MongoDB Conectado Exitósamente");
    } catch (err) {
        console.error("❌ Error de conexión MongoDB:", err.message);
        setTimeout(connectDB, 10000);
    }
};

connectDB();

// --- API STATUS ---
app.get('/api/status', (req, res) => {
    res.json({
        database: isMemoryMode ? 'memory' : (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'),
        mode: isMemoryMode ? 'demo' : 'production',
        uptime: process.uptime(),
        mongoUriSet: !!MONGO_URI
    });
});

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
        if (isMemoryMode) return res.json(memoryStore.users);
        const users = await User.find({}).lean();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const u = req.body;
        if (isMemoryMode) {
            const idx = memoryStore.users.findIndex(x => x.id === u.id);
            if (idx >= 0) memoryStore.users[idx] = u;
            else memoryStore.users.push(u);
            return res.json({ success: true, data: u });
        }
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
        if (isMemoryMode) {
            memoryStore.users = initialUsers.map(u => ({ ...u, id: u.name }));
            return res.json({ success: true });
        }
        const operations = initialUsers.map(u => ({
            updateOne: {
                filter: { id: u.name },
                update: { $set: { ...u, id: u.name } },
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
        if (isMemoryMode) {
            memoryStore.users = memoryStore.users.filter(u => u.id !== req.params.id);
            return res.json({ success: true });
        }
        await User.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 1. DOCTORS
app.get('/api/doctors', async (req, res) => {
    try {
        if (isMemoryMode) return res.json(memoryStore.doctors);
        const doctors = await Doctor.find({}).sort({ name: 1 }).lean();
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/doctors', async (req, res) => {
    try {
        const d = req.body;
        if (isMemoryMode) {
            const idx = memoryStore.doctors.findIndex(x => x.id === d.id);
            if (idx >= 0) memoryStore.doctors[idx] = d;
            else memoryStore.doctors.push(d);
            return res.json({ success: true, data: d });
        }
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
        if (isMemoryMode) {
            doctors.forEach(d => {
                const idx = memoryStore.doctors.findIndex(x => x.id === d.id);
                if (idx >= 0) memoryStore.doctors[idx] = d;
                else memoryStore.doctors.push(d);
            });
            return res.json({ success: true, count: doctors.length });
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
        if (isMemoryMode) {
            const count = memoryStore.doctors.filter(d => d.category === category.toUpperCase()).length;
            memoryStore.doctors = memoryStore.doctors.filter(d => d.category !== category.toUpperCase());
            return res.json({ success: true, count });
        }
        const result = await Doctor.deleteMany({ category: category.toUpperCase() });
        res.json({ success: true, count: result.deletedCount });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/doctors/:id', async (req, res) => {
    try {
        if (isMemoryMode) {
            memoryStore.doctors = memoryStore.doctors.filter(d => d.id !== req.params.id);
            return res.json({ success: true });
        }
        await Doctor.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. TIMEOFF
app.get('/api/timeoff', async (req, res) => {
    try {
        if (isMemoryMode) return res.json(memoryStore.timeoff);
        const events = await TimeOff.find({}).sort({ startDate: -1 }).lean();
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/timeoff', async (req, res) => {
    try {
        const t = req.body;
        if (isMemoryMode) {
            const idx = memoryStore.timeoff.findIndex(x => x.id === t.id);
            if (idx >= 0) memoryStore.timeoff[idx] = t;
            else memoryStore.timeoff.push(t);
            return res.json({ success: true });
        }
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
        if (isMemoryMode) {
            memoryStore.timeoff = memoryStore.timeoff.filter(t => t.id !== req.params.id);
            return res.json({ success: true });
        }
        await TimeOff.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. PROCEDURES
app.get('/api/procedures', async (req, res) => {
    try {
        if (isMemoryMode) return res.json(memoryStore.procedures);
        const procs = await Procedure.find({}).sort({ date: -1 }).lean();
        res.json(procs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/procedures', async (req, res) => {
    try {
        const p = req.body;
        if (isMemoryMode) {
            const idx = memoryStore.procedures.findIndex(x => x.id === p.id);
            if (idx >= 0) memoryStore.procedures[idx] = p;
            else memoryStore.procedures.push(p);
            return res.json({ success: true });
        }
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
        if (isMemoryMode) {
            memoryStore.procedures = memoryStore.procedures.filter(p => p.id !== req.params.id);
            return res.json({ success: true });
        }
        await Procedure.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. OPERATIONS
app.get('/api/operations', async (req, res) => {
    try {
        if (isMemoryMode) return res.json(memoryStore.operations);
        const ops = await Operation.find({}).sort({ date: -1 }).lean();
        res.json(ops);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/operations', async (req, res) => {
    try {
        const op = req.body;
        if (isMemoryMode) {
            const idx = memoryStore.operations.findIndex(x => x.id === op.id);
            if (idx >= 0) memoryStore.operations[idx] = op;
            else memoryStore.operations.push(op);
            return res.json({ success: true });
        }
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
        if (isMemoryMode) {
            memoryStore.operations = memoryStore.operations.filter(o => o.id !== req.params.id);
            return res.json({ success: true });
        }
        await Operation.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- STATIC FILES (Frontend) ---
    if (process.env.NODE_ENV !== 'production') {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static(join(__dirname, 'dist')));
        app.get('*', (req, res) => {
            if (!req.path.startsWith('/api')) {
                res.sendFile(join(__dirname, 'dist', 'index.html'));
            }
        });
    }

    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Elite CRM (Mongo Edition) Online Port ${PORT}`));
}

startServer();

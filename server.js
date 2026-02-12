const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' })); // Increased limit for large data syncs
app.use(cors());

// --- Database Connection ---
// REQUISITO: Tener MongoDB corriendo localmente o usar una URL de MongoDB Atlas
const MONGO_URI = 'mongodb://localhost:27017/crm_medicall'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Conectado: Base de datos lista para sincronizar."))
  .catch(err => console.error("❌ Error conectando a MongoDB:", err));

// --- Schemas & Models ---

// Flexible Schema definitions to match TypeScript interfaces
const visitSchema = new mongoose.Schema({
    id: String,
    date: String,
    time: String,
    note: String,
    objective: String,
    followUp: String,
    outcome: String,
    status: String
}, { _id: false }); // Disable auto _id for subdocuments to keep original IDs

const scheduleSchema = new mongoose.Schema({
    day: String,
    time: String,
    active: Boolean
}, { _id: false });

const doctorSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
    category: { type: String, default: 'MEDICO' }, // MEDICO, ADMINISTRATIVO, HOSPITAL
    executive: String,
    name: String,
    specialty: String,
    subSpecialty: String,
    address: String,
    hospital: String,
    area: String,
    phone: String,
    email: String,
    floor: String,
    officeNumber: String,
    birthDate: String,
    cedula: String,
    profile: String,
    classification: String,
    socialStyle: String,
    attitudinalSegment: String,
    importantNotes: String,
    isInsuranceDoctor: Boolean,
    visits: [visitSchema],
    schedule: [scheduleSchema]
}, { minimize: false, strict: false }); // strict: false allows saving fields not explicitly defined if needed

const procedureSchema = new mongoose.Schema({
    id: { type: String, unique: true, required: true },
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
});

const Doctor = mongoose.model('Doctor', doctorSchema);
const Procedure = mongoose.model('Procedure', procedureSchema);

// --- API Routes ---

// --- DOCTORS / HOSPITALS / ADMINS ---

// GET: Obtener todos los registros
app.get('/api/doctors', async (req, res) => {
    try {
        const doctors = await Doctor.find();
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear o Actualizar (Upsert) - Guarda automáticamente cambios desde cualquier dispositivo
app.post('/api/doctors', async (req, res) => {
    const data = req.body;
    try {
        // findOneAndUpdate with upsert: true handles both creation and updates
        const result = await Doctor.findOneAndUpdate(
            { id: data.id },
            data,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar un registro
app.delete('/api/doctors/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Doctor.deleteOne({ id: id });
        if (result.deletedCount > 0) {
            res.status(200).json({ success: true, message: "Registro eliminado." });
        } else {
            res.status(404).json({ success: false, message: "No encontrado." });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE VISIT: Eliminar una visita específica dentro de un doctor
app.delete('/api/doctors/:doctorId/visits/:visitId', async (req, res) => {
    const { doctorId, visitId } = req.params;
    try {
        const result = await Doctor.updateOne(
            { id: doctorId }, 
            { $pull: { visits: { id: visitId } } }
        );
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// --- PROCEDURES ---

// GET: Obtener todos los procedimientos
app.get('/api/procedures', async (req, res) => {
    try {
        const procedures = await Procedure.find();
        res.json(procedures);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear o Actualizar Procedimiento
app.post('/api/procedures', async (req, res) => {
    const data = req.body;
    try {
        const result = await Procedure.findOneAndUpdate(
            { id: data.id },
            data,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar Procedimiento
app.delete('/api/procedures/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await Procedure.deleteOne({ id: id });
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Port configuration
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => { // Listen on 0.0.0.0 to accept connections from other devices in LAN
    console.log(`🚀 Servidor API corriendo en puerto ${PORT}`);
    console.log(`📱 Para acceder desde celular, usa la IP de tu PC: http://TU_IP:${PORT}`);
});
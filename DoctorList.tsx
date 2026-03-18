
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Lock, UserCircle, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import ParticleBackground from './ParticleBackground';
import Logo from './Logo';

interface LoginProps {
  onLogin: (user: User) => void;
}

const DEFAULT_USERS: User[] = [
  { name: 'Administrador', role: 'admin', password: 'admin' },
  { name: 'LUIS', role: 'executive', password: 'luis01' },
  { name: 'ORALIA', role: 'executive', password: 'oralia02' },
  { name: 'TALINA', role: 'executive', password: 'talina03' },
  { name: 'ALBERTO', role: 'admin_restricted', password: 'alberto01' },
  { name: 'NAYELY', role: 'admin_restricted', password: 'nayely01' },
  { name: 'LIZ', role: 'admin_restricted', password: 'liz01' },
];

const API_BASE_URL = '/api';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/status`);
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data.database);
        } else {
          setDbStatus('disconnected');
        }
      } catch (e) {
        setDbStatus('disconnected');
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/users`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setUsers(data);
          } else {
            // Seed default users if DB is empty
            await fetch(`${API_BASE_URL}/users/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(DEFAULT_USERS)
            });
            setUsers(DEFAULT_USERS);
          }
        } else {
            // Fallback to defaults if API fails
            setUsers(DEFAULT_USERS);
        }
      } catch (e) {
        console.error("Error fetching users:", e);
        setUsers(DEFAULT_USERS);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.name === selectedUser);
    
    if (user && user.password === password) {
      setIsAnimating(true);
      setTimeout(() => {
          onLogin(user);
      }, 800); // Wait for animation
    } else {
      setError('Contraseña incorrecta o usuario no seleccionado.');
    }
  };

  if (loading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Cargando sistema...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 relative overflow-hidden">
      <ParticleBackground />

      <div className={`relative bg-white border border-slate-300 p-8 rounded-3xl shadow-2xl w-full max-w-md transform transition-all duration-700 ${isAnimating ? 'scale-110 opacity-0 translate-y-[-50px]' : 'scale-100 opacity-100'}`}>
        
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center mb-8">
                <Logo className="h-28 w-auto" />
          </div>
          <p className="text-slate-700 text-sm mt-4 font-bold uppercase tracking-widest">Plataforma de Gestión Comercial</p>
          
          {dbStatus === 'disconnected' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-[10px] text-red-700 font-black uppercase tracking-widest leading-relaxed">
                ⚠️ Error de Conexión MongoDB<br/>
                <span className="font-bold normal-case text-red-600">El sistema está operando en modo lectura/escritura local temporal. Los datos no se guardarán permanentemente hasta que se configure MONGO_URI.</span>
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">Quién eres</label>
            <div className="relative">
                <UserCircle className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                <select 
                  value={selectedUser}
                  onChange={(e) => { setSelectedUser(e.target.value); setError(''); }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block pl-10 p-3 appearance-none transition-all hover:bg-white"
                >
                  <option value="" disabled>-- Selecciona tu perfil --</option>
                  {users.map(u => (
                    <option key={u.name} value={u.name} className="text-slate-900">{u.name}</option>
                  ))}
                </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-600 uppercase tracking-widest ml-1">Contraseña</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm font-bold rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block pl-10 pr-10 p-3 transition-all hover:bg-white placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-900 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-black flex items-center animate-fadeIn uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 mr-2" />
                {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full group relative flex justify-center py-4 px-4 border border-transparent text-sm font-black uppercase tracking-widest rounded-xl text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-xl shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-1"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <ArrowRight className="h-5 w-5 text-blue-200 group-hover:text-white transition-colors" />
            </span>
            Iniciar Sesión
          </button>
        </form>
        
        <div className="mt-8 text-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Acceso restringido. Solo personal autorizado.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

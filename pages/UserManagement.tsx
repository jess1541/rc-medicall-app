import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Users, Plus, Edit3, Trash2, Check, X, Shield, Key, User as UserIcon } from 'lucide-react';

interface UserManagementProps {
  user: User;
}

const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:8080/api' : '/api';

const UserManagement: React.FC<UserManagementProps> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    role: 'executive',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        role: userToEdit.role,
        password: userToEdit.password
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        role: 'executive',
        password: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.password) {
      alert("Nombre y contraseña son requeridos");
      return;
    }

    const userData = {
      id: editingUser ? (editingUser as any).id : formData.name, // Use name as ID for new users if not present
      name: formData.name,
      role: formData.role,
      password: formData.password
    };

    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (res.ok) {
        fetchUsers();
        setIsModalOpen(false);
      } else {
        alert("Error al guardar usuario");
      }
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchUsers();
      } else {
        alert("Error al eliminar usuario");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  if (user.role !== 'admin') {
    return <div className="p-8 text-center text-red-500 font-bold">Acceso denegado</div>;
  }

  return (
    <div className="space-y-6 pb-16 animate-fadeIn">
      {/* HERO SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
            <div className="p-4 md:p-5 bg-slate-800 rounded-[1.5rem] md:rounded-[2rem] text-white shadow-2xl shadow-slate-200">
                <Users className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
                    Gestión de <span className="text-slate-600">Usuarios</span>
                </h1>
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] mt-1">
                    Administración de perfiles y accesos
                </p>
            </div>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
      </div>

      {/* USERS LIST */}
      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-50">
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol</th>
                <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña</th>
                <th className="pb-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={(u as any).id || u.name} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${u.role === 'admin' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                        {u.role === 'admin' ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                      </div>
                      <span className="text-sm font-bold text-slate-800 uppercase">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      u.role === 'admin' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {u.role === 'admin' ? 'Administrador' : 'Ejecutivo'}
                    </span>
                  </td>
                  <td className="py-5">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Key className="w-4 h-4" />
                      <span className="text-xs font-mono">••••••••</span>
                    </div>
                  </td>
                  <td className="py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      {u.name !== 'Administrador' && (
                        <button 
                          onClick={() => handleDelete((u as any).id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn border border-white/20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Nombre de Usuario</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-10 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm placeholder-slate-300 text-slate-900 bg-white"
                    placeholder="NOMBRE DE USUARIO"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Rol</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as any})}
                    className="w-full pl-10 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-slate-900 bg-white appearance-none"
                  >
                    <option value="executive">EJECUTIVO</option>
                    <option value="admin">ADMINISTRADOR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Contraseña</label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-10 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm placeholder-slate-300 text-slate-900 bg-white"
                    placeholder="CONTRASEÑA"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors text-sm">Cancelar</button>
              <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-sm flex items-center">
                <Check className="w-4 h-4 mr-2" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

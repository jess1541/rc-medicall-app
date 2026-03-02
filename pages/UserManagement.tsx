import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Users, Plus, Edit3, Trash2, Check, X, Shield, Key, User as UserIcon, Lock } from 'lucide-react';

interface UserManagementProps {
  user: User;
}

const API_BASE_URL = '/api';

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
    <div className="space-y-6 pb-20 animate-fadeIn text-slate-200">
      {/* HERO SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-slate-900/50 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-800 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
            <div className="p-4 md:p-5 bg-indigo-600 rounded-[1.5rem] md:rounded-[2rem] text-white shadow-lg shadow-indigo-500/20">
                <Users className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter">
                    Gestión de <span className="text-indigo-400">Usuarios</span>
                </h1>
                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
                    Administración de perfiles y accesos
                </p>
            </div>
          </div>
          
          <button 
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
      </div>

      {/* USERS LIST - Responsive Grid/Table */}
      <div className="bg-slate-900/50 p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-slate-800 backdrop-blur-sm">
        
        {/* Mobile View (Cards) */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
            {users.map((u) => (
                <div key={(u as any).id || u.name} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                                u.role === 'admin' ? 'bg-yellow-500/10 text-yellow-500' : 
                                u.role === 'admin_restricted' ? 'bg-purple-500/10 text-purple-500' :
                                'bg-blue-500/10 text-blue-500'
                            }`}>
                                {u.role === 'admin' ? <Shield className="w-5 h-5" /> : 
                                 u.role === 'admin_restricted' ? <Lock className="w-5 h-5" /> :
                                 <UserIcon className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase">{u.name}</h3>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${
                                    u.role === 'admin' ? 'text-yellow-500' : 
                                    u.role === 'admin_restricted' ? 'text-purple-500' :
                                    'text-blue-500'
                                }`}>
                                    {u.role === 'admin' ? 'Administrador' : 
                                     u.role === 'admin_restricted' ? 'Admin (Restringido)' :
                                     'Ejecutivo'}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-slate-500 bg-slate-900/50 p-2 rounded-lg">
                        <Key className="w-4 h-4" />
                        <span className="text-xs font-mono">••••••••</span>
                    </div>

                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-700">
                        <button 
                            onClick={() => handleOpenModal(u)}
                            className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                        >
                            <Edit3 className="w-5 h-5" />
                        </button>
                        {u.name !== 'Administrador' && (
                            <button 
                                onClick={() => handleDelete((u as any).id)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Desktop View (Table) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-800">
                <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuario</th>
                <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Rol</th>
                <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Contraseña</th>
                <th className="pb-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={(u as any).id || u.name} className="group hover:bg-slate-800/50 transition-colors">
                  <td className="py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                          u.role === 'admin' ? 'bg-yellow-500/10 text-yellow-500' : 
                          u.role === 'admin_restricted' ? 'bg-purple-500/10 text-purple-500' :
                          'bg-blue-500/10 text-blue-500'
                      }`}>
                        {u.role === 'admin' ? <Shield className="w-5 h-5" /> : 
                         u.role === 'admin_restricted' ? <Lock className="w-5 h-5" /> :
                         <UserIcon className="w-5 h-5" />}
                      </div>
                      <span className="text-sm font-bold text-slate-200 uppercase">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-5">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      u.role === 'admin' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 
                      u.role === 'admin_restricted' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {u.role === 'admin' ? 'Administrador' : 
                       u.role === 'admin_restricted' ? 'Admin (Restringido)' :
                       'Ejecutivo'}
                    </span>
                  </td>
                  <td className="py-5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Key className="w-4 h-4" />
                      <span className="text-xs font-mono">••••••••</span>
                    </div>
                  </td>
                  <td className="py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      {u.name !== 'Administrador' && (
                        <button 
                          onClick={() => handleDelete((u as any).id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn border border-slate-800">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <h3 className="text-lg font-black text-white uppercase tracking-tight">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-red-500 transition-all shadow-sm hover:bg-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Nombre de Usuario</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-12 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm placeholder-slate-600"
                    placeholder="NOMBRE DE USUARIO"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Rol</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as any})}
                    className="w-full pl-12 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none"
                  >
                    <option value="executive">EJECUTIVO</option>
                    <option value="admin">ADMINISTRADOR</option>
                    <option value="admin_restricted">ADMINISTRADOR (RESTRINGIDO)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase mb-2">Contraseña</label>
                <div className="relative">
                  <Key className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                  <input 
                    type="text"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-12 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm placeholder-slate-600"
                    placeholder="CONTRASEÑA"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-400 font-bold hover:bg-slate-700 rounded-xl transition-colors text-sm">Cancelar</button>
              <button onClick={handleSave} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 text-sm flex items-center">
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

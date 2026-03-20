
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, User, LogOut, Shield, ChevronLeft, ChevronRight, Activity, RefreshCw, Briefcase, BarChart3, Settings } from 'lucide-react';
import { User as UserType } from '../types';
import Logo from './Logo';

interface SidebarProps {
    user: UserType;
    onLogout: () => void;
    isMobileOpen: boolean;
    closeMobileMenu: () => void;
    isCollapsed: boolean;
    toggleCollapse: () => void;
    isOnline?: boolean;
    isSyncing?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, isMobileOpen, closeMobileMenu, isCollapsed, toggleCollapse, isOnline = true, isSyncing = false }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentExec = searchParams.get('exec');

  const isActive = (path: string, matchExec?: boolean) => {
      if (matchExec !== undefined) {
          return location.pathname === path && !!currentExec === matchExec;
      }
      if (path === '/') return location.pathname === '/';
      return location.pathname.startsWith(path);
  };

  const executives = [
      { name: 'LUIS', color: 'from-blue-400 to-blue-600', initials: 'LU' },
      { name: 'ORALIA', color: 'from-pink-400 to-rose-600', initials: 'OR' },
      { name: 'TALINA', color: 'from-teal-400 to-emerald-600', initials: 'TA' },
      { name: 'LIZ', color: 'from-purple-400 to-indigo-600', initials: 'LI' }
  ];

  return (
    <>
        {/* Mobile Overlay */}
        <div 
            className={`fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={closeMobileMenu}
        />

        <div className={`flex flex-col bg-white text-slate-700 shadow-2xl overflow-hidden transition-all duration-500 ease-in-out z-50 fixed inset-y-0 left-0 h-full border-r border-slate-200 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isCollapsed ? 'w-20' : 'w-72'}`}>
            
            <div className="flex flex-col items-center justify-center h-24 border-b border-slate-100 relative z-10 mt-safe-top md:mt-0">
                <div className="text-center group cursor-default flex items-center justify-center w-full h-full relative">
                    {isSyncing && (
                        <div className="absolute top-4 right-4 animate-spin text-blue-500/50">
                            <RefreshCw className="w-4 h-4" />
                        </div>
                    )}
                    {isCollapsed ? (
                        <div className="flex flex-col items-center justify-center">
                            <Logo variant="icon" className="h-10 w-10" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center px-6">
                            <Logo className="h-16 w-auto" />
                        </div>
                    )}
                </div>
            </div>
            
            <button onClick={toggleCollapse} className="hidden md:flex absolute top-24 -right-3 z-50 bg-blue-600 text-white p-1.5 rounded-full border border-white/20 shadow-xl transform translate-y-[-50%] hover:scale-110 transition-all group">
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            <div className="flex flex-col flex-1 overflow-y-auto py-6 space-y-8 no-scrollbar z-10 overflow-x-hidden">
                <div onClick={closeMobileMenu}>
                    <nav className="space-y-1.5 px-4">
                        <SidebarLink to="/" icon={<LayoutDashboard />} label="Dashboard" isActive={isActive('/', false)} collapsed={isCollapsed} />
                        <SidebarLink to="/calendar" icon={<CalendarDays />} label="Planificación" isActive={isActive('/calendar', false)} collapsed={isCollapsed} />
                        <SidebarLink to="/doctors" icon={<Users />} label="Directorio" isActive={isActive('/doctors', false)} collapsed={isCollapsed} />
                        <SidebarLink to="/procedures" icon={<Activity />} label="Procedimientos" isActive={isActive('/procedures', false)} collapsed={isCollapsed} />
                        {(user.role === 'admin' || user.role === 'admin_restricted') && (
                            <>
                                <div className={`pt-6 pb-2 ${isCollapsed ? 'text-center' : 'px-3'}`}>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isCollapsed ? 'OPS' : 'Operaciones'}</p>
                                </div>
                                <SidebarLink to="/operations-dashboard" icon={<BarChart3 />} label="Dashboard" isActive={isActive('/operations-dashboard', false)} collapsed={isCollapsed} />
                                <SidebarLink to="/operations" icon={<Briefcase />} label="Gestión" isActive={isActive('/operations', false)} collapsed={isCollapsed} />
                                {user.role === 'admin' && (
                                    <>
                                        <div className={`pt-6 pb-2 ${isCollapsed ? 'text-center' : 'px-3'}`}>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{isCollapsed ? 'SYS' : 'Sistema'}</p>
                                        </div>
                                        <SidebarLink to="/users" icon={<Settings />} label="Usuarios" isActive={isActive('/users', false)} collapsed={isCollapsed} />
                                    </>
                                )}
                            </>
                        )}
                    </nav>
                </div>

                {user.role === 'admin' && (
                    <div onClick={closeMobileMenu}>
                        {!isCollapsed && <p className="px-7 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Equipo Comercial</p>}
                        <nav className="space-y-1.5 px-4">
                            {executives.map((exec) => (
                                <Link key={exec.name} to={`/calendar?exec=${exec.name}`} className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2.5 text-sm font-bold rounded-2xl transition-all duration-300 group ${currentExec === exec.name ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}>
                                    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'w-full'}`}>
                                        <div className={`${!isCollapsed && 'mr-3'} w-8 h-8 rounded-xl bg-gradient-to-br ${exec.color} flex items-center justify-center text-[10px] text-white font-black shadow-lg ring-2 ring-white group-hover:scale-110 transition-transform`}>{exec.initials}</div>
                                        {!isCollapsed && <span className="flex-1 truncate text-xs tracking-wide">{exec.name}</span>}
                                    </div>
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-transparent z-10 border-t border-slate-100">
                <div className={`bg-slate-50/80 backdrop-blur-md rounded-3xl border border-slate-200 transition-all group hover:bg-white hover:shadow-md ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    <div className={`flex items-center ${isCollapsed ? 'justify-center mb-3' : 'justify-between mb-4'}`}>
                        <div className="flex items-center">
                            <div className={`p-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'} animate-pulse`}></div>
                            {!isCollapsed && <span className={`text-[9px] font-black ml-2 uppercase tracking-widest ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>{isOnline ? 'Online' : 'Offline'}</span>}
                        </div>
                        {!isCollapsed && isSyncing && <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />}
                    </div>

                    <div className={`flex items-center ${isCollapsed ? 'justify-center mb-3' : 'mb-4'}`}>
                        <div className={`p-0.5 rounded-2xl bg-gradient-to-br ${user.role === 'admin' ? 'from-yellow-400 to-orange-500' : 'from-blue-400 to-indigo-600'} shadow-lg`}>
                            <div className="bg-white p-2 rounded-2xl">
                                {user.role === 'admin' ? <Shield className="h-4 w-4 text-yellow-500" /> : <User className="h-4 w-4 text-blue-500" />}
                            </div>
                        </div>
                        {!isCollapsed && (
                            <div className="ml-3 overflow-hidden">
                                <p className="text-xs font-black text-slate-800 truncate tracking-wide">{user.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{user.role}</p>
                            </div>
                        )}
                    </div>
                    <button onClick={onLogout} className={`flex items-center justify-center rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest ${isCollapsed ? 'w-10 h-10' : 'w-full py-3'}`}>
                        <LogOut className={`h-4 w-4 ${!isCollapsed && 'mr-2'}`} /> {!isCollapsed && 'Salir'}
                    </button>
                </div>
            </div>
        </div>
    </>
  );
};

const SidebarLink = ({ to, icon, label, isActive, collapsed }: { to: string, icon: React.ReactNode, label: string, isActive: boolean, collapsed: boolean }) => (
    <Link to={to} className={`flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-500 group ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-1 ring-white/20' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'} ${collapsed ? 'justify-center' : ''}`}>
        <div className={`h-5 w-5 flex-shrink-0 transition-colors duration-500 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}</div>
        {!collapsed && <span className="ml-3 truncate tracking-wide">{label}</span>}
    </Link>
);

export default Sidebar;

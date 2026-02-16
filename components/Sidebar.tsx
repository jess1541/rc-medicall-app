
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, User, LogOut, Shield, ChevronLeft, ChevronRight, X, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { User as UserType } from '../types';

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
      { name: 'TALINA', color: 'from-teal-400 to-emerald-600', initials: 'TA' }
  ];

  return (
    <>
        {isMobileOpen && (
            <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={closeMobileMenu}></div>
        )}

        <div className={`flex flex-col bg-slate-900 text-white shadow-2xl overflow-hidden transition-all duration-300 ease-in-out z-40 fixed inset-y-0 left-0 h-full border-r border-slate-800/50 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isCollapsed ? 'w-20' : 'w-64'}`}>
            
            <div className="flex flex-col items-center justify-center h-24 border-b border-slate-800/50 relative z-10 mt-8 md:mt-0">
                <div className="text-center group cursor-default flex items-center justify-center w-full h-full relative">
                    {isSyncing && (
                        <div className="absolute top-2 right-2 animate-spin text-cyan-500/30">
                            <RefreshCw className="w-3 h-3" />
                        </div>
                    )}
                    {isCollapsed ? (
                        <div className="flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-cyan-500 tracking-tighter">RC</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center group-hover:scale-105 transition-transform">
                            <div className="flex items-baseline leading-none">
                                <span className="text-3xl font-black text-cyan-400 tracking-tighter">RC</span>
                                <span className="text-3xl font-bold text-slate-300 ml-1">Medi</span>
                                <span className="text-3xl font-bold text-cyan-400">Call</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <button onClick={toggleCollapse} className="hidden md:block absolute top-24 -right-3 z-50 bg-slate-800 text-slate-400 hover:text-white p-1 rounded-full border border-slate-700 shadow-md transform translate-y-[-50%] hover:scale-110 transition-all">
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            <div className="flex flex-col flex-1 overflow-y-auto py-6 space-y-8 no-scrollbar z-10 overflow-x-hidden">
                <div onClick={closeMobileMenu}>
                    <nav className="space-y-1.5 px-3">
                        <SidebarLink to="/" icon={<LayoutDashboard />} label="Dashboard" isActive={isActive('/', false)} collapsed={isCollapsed} />
                        <SidebarLink to="/calendar" icon={<CalendarDays />} label="Planificación" isActive={isActive('/calendar', false)} collapsed={isCollapsed} />
                        <SidebarLink to="/doctors" icon={<Users />} label="Directorio" isActive={isActive('/doctors', false)} collapsed={isCollapsed} />
                        <SidebarLink to="/procedures" icon={<Activity />} label="Procedimientos" isActive={isActive('/procedures', false)} collapsed={isCollapsed} />
                    </nav>
                </div>

                {user.role === 'admin' && (
                    <div onClick={closeMobileMenu}>
                        {!isCollapsed && <p className="px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-4">Equipo RC</p>}
                        <nav className="space-y-2 px-3">
                            {executives.map((exec) => (
                                <Link key={exec.name} to={`/calendar?exec=${exec.name}`} className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 text-sm font-bold rounded-xl transition-all duration-300 group ${currentExec === exec.name ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'w-full'}`}>
                                        <div className={`${!isCollapsed && 'mr-3'} w-8 h-8 rounded-lg bg-gradient-to-br ${exec.color} flex items-center justify-center text-[10px] text-white ring-2 ring-slate-900`}>{exec.initials}</div>
                                        {!isCollapsed && <span className="flex-1 truncate">{exec.name}</span>}
                                    </div>
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-slate-900/80 backdrop-blur-md z-10 border-t border-slate-800">
                <div className={`bg-slate-800/50 rounded-2xl border border-slate-700/50 transition-all ${isCollapsed ? 'p-2' : 'p-4'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                            <div className={`p-1 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
                            {!isCollapsed && <span className={`text-[9px] font-black ml-2 uppercase tracking-tighter ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>{isOnline ? 'En Línea' : 'Desconectado'}</span>}
                        </div>
                        {!isCollapsed && isSyncing && <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />}
                    </div>

                    <div className={`flex items-center ${isCollapsed ? 'justify-center mb-2' : 'mb-3'}`}>
                        <div className={`p-0.5 rounded-full bg-gradient-to-br ${user.role === 'admin' ? 'from-yellow-400 to-orange-500' : 'from-cyan-400 to-blue-600'}`}>
                            <div className="bg-slate-800 p-2 rounded-full">
                                {user.role === 'admin' ? <Shield className="h-4 w-4 text-yellow-400" /> : <User className="h-4 w-4 text-cyan-400" />}
                            </div>
                        </div>
                        {!isCollapsed && <div className="ml-3 overflow-hidden"><p className="text-xs font-bold text-white truncate">{user.name}</p></div>}
                    </div>
                    <button onClick={onLogout} className={`flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase ${isCollapsed ? 'w-8 h-8' : 'w-full py-2'}`}>
                        <LogOut className={`h-3 w-3 ${!isCollapsed && 'mr-2'}`} /> {!isCollapsed && 'Salir'}
                    </button>
                </div>
            </div>
        </div>
    </>
  );
};

const SidebarLink = ({ to, icon, label, isActive, collapsed }: { to: string, icon: React.ReactNode, label: string, isActive: boolean, collapsed: boolean }) => (
    <Link to={to} className={`flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${collapsed ? 'justify-center' : ''}`}>
        <div className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-cyan-400'}`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}</div>
        {!collapsed && <span className="ml-3 truncate">{label}</span>}
    </Link>
);

export default Sidebar;

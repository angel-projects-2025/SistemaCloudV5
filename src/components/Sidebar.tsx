import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Cloud, 
  DollarSign, 
  Globe, 
  Shield, 
  Network, 
  Server,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/planning', label: 'Planificación Cloud', icon: Cloud },
  { path: '/costs', label: 'Costos y Economía', icon: DollarSign },
  { path: '/infrastructure', label: 'Infraestructura Global', icon: Globe },
  { path: '/security', label: 'Seguridad e IAM', icon: Shield },
  { path: '/network', label: 'Arquitectura de Red', icon: Network },
  { path: '/services', label: 'Catálogo de Servicios', icon: Server },
];

export function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { sidebarOpen, closeSidebar } = useSidebar();

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-64 bg-sidebar text-white flex flex-col shadow-xl z-40 no-print transition-transform duration-200 ease-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}
    >
      <div className="p-6 border-b border-gray-700/50">
        <h1 className="text-xl font-bold tracking-tight">CloudOps Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Gestión Cloud AWS</p>
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400'} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-700/50 bg-gray-900/30">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="w-full flex items-center justify-between gap-2 px-4 py-2.5 mb-3 rounded-lg bg-gray-800/60 hover:bg-gray-700/70 border border-gray-700/50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm text-gray-300">
            {theme === 'dark' ? <Moon size={16} className="text-blue-400" /> : <Sun size={16} className="text-amber-400" />}
            {theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}
          </span>
          <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-gray-600'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-4.5' : 'translate-x-0.5'}`} style={{ transform: theme === 'dark' ? 'translateX(18px)' : 'translateX(2px)' }} />
          </span>
        </button>
        <div className="text-sm text-gray-400">
          <p className="font-medium">Versión 1.0.0</p>
          <p className="mt-1 text-xs">© 2024 CloudOps</p>
        </div>
      </div>
    </aside>
  );
}

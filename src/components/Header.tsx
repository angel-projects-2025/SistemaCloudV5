import { CheckCircle, LogOut, Menu } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  title: string;
  region?: string;
  systemStatus?: string;
}

export function Header({ title, region = 'us-east-1', systemStatus = 'Operational' }: HeaderProps) {
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-cardBorder px-4 md:px-8 py-4 md:py-5 flex items-center justify-between gap-3 shadow-sm sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Abrir o cerrar menú"
          className="md:hidden shrink-0 p-2 rounded-lg border border-cardBorder dark:border-slate-700 text-textMain dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-textMain truncate">{title}</h2>
          <p className="text-xs sm:text-sm text-textSecondary mt-1 truncate">
            Región: <span className="font-medium text-textMain">{region}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="hidden sm:flex items-center gap-2 bg-green-50 dark:bg-green-500/10 px-4 py-2 rounded-lg border border-green-200 dark:border-green-500/30">
          <CheckCircle size={20} className="text-statusGreen dark:text-green-400" />
          <span className="text-sm font-medium text-statusGreen dark:text-green-400">{systemStatus}</span>
        </div>

        {/* Cerrar sesión: independiente del menú de navegación */}
        <div className="flex items-center gap-2">
          {user && (
            <span
              className="hidden lg:inline text-xs text-textSecondary max-w-[140px] truncate"
              title={user.email}
            >
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={logout}
            aria-label="Cerrar sesión"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cardBorder dark:border-slate-700 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
}

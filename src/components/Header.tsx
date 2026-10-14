import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useAuth } from '../context/AuthContext';
import { usePlanning } from '../context/PlanningContext';

interface HeaderProps {
  title: string;
  region?: string;
  showPlanSelector?: boolean;
}

export function Header({ title, region, showPlanSelector = false }: HeaderProps) {
  const { toggleSidebar } = useSidebar();
  const { user, logout } = useAuth();
  const { savedPlannings, activePlanning, setActivePlanningId } = usePlanning();
  const [selectionError, setSelectionError] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const selecting = useRef(false);
  const loggingOut = useRef(false);
  const navigate = useNavigate();
  const handleLogout = async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    } finally {
      loggingOut.current = false;
      setIsLoggingOut(false);
    }
  };
  const planningRegion = activePlanning?.plan.region;
  const displayedRegion = region ?? (planningRegion
    ? planningRegion.match(/\b[a-z]{2}(?:-[a-z]+)+-\d+\b/)?.[0] ?? planningRegion
    : 'Sin planificación');

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
            Región: <span className="font-medium text-textMain">{displayedRegion}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {showPlanSelector && savedPlannings.length > 0 && (
          <div className="min-w-0">
            <label htmlFor="active-planning" className="block text-[10px] sm:text-xs font-medium text-textSecondary mb-1">
              Planificación activa
            </label>
            <select
              id="active-planning"
              value={activePlanning?.id ?? ''}
              disabled={isSelecting || isLoggingOut}
              onChange={async (event) => {
                if (selecting.current) return;
                selecting.current = true;
                setIsSelecting(true);
                try {
                  await setActivePlanningId(event.target.value);
                  setSelectionError('');
                } catch (error) {
                  setSelectionError(error instanceof Error ? error.message : 'No se pudo guardar la selección.');
                } finally {
                  selecting.current = false;
                  setIsSelecting(false);
                }
              }}
              className="w-32 sm:w-44 lg:w-52 bg-white dark:bg-slate-900 border border-cardBorder rounded-lg px-3 py-2 text-sm font-medium text-textMain dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-sm"
            >
              {savedPlannings.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.plan.solutionName}</option>
              ))}
            </select>
            {selectionError && <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">{selectionError}</p>}
          </div>
        )}
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
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label="Cerrar sesión"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cardBorder dark:border-slate-700 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
          {logoutError && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{logoutError}</p>}
        </div>
      </div>
    </header>
  );
}

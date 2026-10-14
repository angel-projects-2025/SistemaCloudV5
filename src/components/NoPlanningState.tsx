import { ClipboardList, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NoPlanningState() {
  return (
    <section className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-8 md:p-12 shadow-sm flex flex-col items-center justify-center text-center min-h-[320px]">
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 mb-5">
        <ClipboardList size={32} className="text-primary dark:text-blue-400" />
      </div>
      <h3 className="text-xl font-semibold text-textMain">Seleccione una planificación para empezar</h3>
      <p className="text-sm text-textSecondary mt-2 max-w-md">
        Crea y guarda una planificación para establecer el proyecto activo y comenzar a consultar sus módulos.
      </p>
      <Link to="/planning" className="mt-6 flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
        Comenzar<ChevronRight size={16} />
      </Link>
    </section>
  );
}

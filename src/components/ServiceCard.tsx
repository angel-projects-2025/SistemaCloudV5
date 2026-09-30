import type { LucideIcon } from 'lucide-react';

interface ServiceCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  status: 'active' | 'inactive';
  category: string;
}

export function ServiceCard({ name, description, icon: Icon, status, category }: ServiceCardProps) {
  const statusClasses = {
    active: 'bg-green-100 text-statusGreen border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/30 dark:hover:border-blue-500/40">
      <div className="flex items-start justify-between mb-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
          <Icon size={24} className="text-primary dark:text-blue-400" />
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClasses[status]}`}>
          {status === 'active' ? 'Activo' : 'Inactivo'}
        </span>
      </div>
      
      <h3 className="text-lg font-semibold text-textMain mb-2">{name}</h3>
      <p className="text-sm text-textSecondary mb-3 leading-relaxed">{description}</p>
      <p className="text-xs text-textSecondary font-medium bg-gray-50 dark:bg-slate-800 inline-block px-2 py-1 rounded">{category}</p>
    </div>
  );
}

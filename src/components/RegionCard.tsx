interface RegionCardProps {
  name: string;
  location: string;
  services: string[];
  latency: number;
  status: 'operational' | 'degraded' | 'down';
}

export function RegionCard({ name, location, services, latency, status }: RegionCardProps) {
  const statusClasses = {
    operational: 'bg-green-100 text-statusGreen border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30',
    degraded: 'bg-amber-100 text-statusAmber border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    down: 'bg-red-100 text-statusRed border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30'
  };

  const statusText = {
    operational: 'Operacional',
    degraded: 'Degradado',
    down: 'Caído'
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/30 dark:hover:border-blue-500/40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-textMain">{name}</h3>
          <p className="text-sm text-textSecondary">{location}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClasses[status]}`}>
          {statusText[status]}
        </span>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg">
          <span className="text-sm text-textSecondary">Latencia</span>
          <span className="text-sm font-bold text-textMain">{latency}ms</span>
        </div>
        
        <div>
          <p className="text-sm font-medium text-textSecondary mb-3">Servicios</p>
          <div className="flex flex-wrap gap-2">
            {services.map((service) => (
              <span
                key={service}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-500/30"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

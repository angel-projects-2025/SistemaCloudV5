import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  children?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, color = 'primary', children, className = '' }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-blue-50 text-primary border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400',
    green: 'bg-green-50 text-statusGreen border-green-200 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400',
    amber: 'bg-amber-50 text-statusAmber border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400',
    red: 'bg-red-50 text-statusRed border-red-200 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400',
  };

  return (
    <div className={`relative bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${className}`}>
      {children && (
        <div className="absolute inset-0 pointer-events-none opacity-30">
          {children}
        </div>
      )}
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-textSecondary mb-2">{title}</p>
          <p className="text-3xl font-bold text-textMain">{value}</p>
          {trend && (
            <p className={`text-xs font-medium mt-2 ${trendUp ? 'text-statusRed' : 'text-statusGreen'}`}>
              {trendUp ? '▲' : '▼'} {trend}
            </p>
          )}
        </div>
        <div className={`p-4 rounded-xl border ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

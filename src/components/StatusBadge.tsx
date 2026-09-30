interface StatusBadgeProps {
  status: 'operational' | 'degraded' | 'down' | 'approved' | 'review' | 'alert';
  text?: string;
}

export function StatusBadge({ status, text }: StatusBadgeProps) {
  const statusClasses = {
    operational: 'bg-green-100 text-statusGreen dark:bg-green-500/15 dark:text-green-400',
    degraded: 'bg-amber-100 text-statusAmber dark:bg-amber-500/15 dark:text-amber-400',
    down: 'bg-red-100 text-statusRed dark:bg-red-500/15 dark:text-red-400',
    approved: 'bg-green-100 text-statusGreen dark:bg-green-500/15 dark:text-green-400',
    review: 'bg-amber-100 text-statusAmber dark:bg-amber-500/15 dark:text-amber-400',
    alert: 'bg-red-100 text-statusRed dark:bg-red-500/15 dark:text-red-400'
  };

  const statusText = {
    operational: text || 'Operacional',
    degraded: text || 'Degradado',
    down: text || 'Caído',
    approved: text || 'Aprobado',
    review: text || 'Revisión',
    alert: text || 'Alerta'
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClasses[status]}`}>
      {statusText[status]}
    </span>
  );
}

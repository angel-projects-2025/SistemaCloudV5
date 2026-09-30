interface SecurityCardProps {
  title: string;
  value: number;
  total?: number;
  status: 'approved' | 'review' | 'alert';
}

export function SecurityCard({ title, value, total, status }: SecurityCardProps) {
  const statusClasses = {
    approved: 'bg-green-50 border-statusGreen hover:border-green-300 dark:bg-green-500/10 dark:border-green-500/40 dark:hover:border-green-400',
    review: 'bg-amber-50 border-statusAmber hover:border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/40 dark:hover:border-amber-400',
    alert: 'bg-red-50 border-statusRed hover:border-red-300 dark:bg-red-500/10 dark:border-red-500/40 dark:hover:border-red-400'
  };

  const statusText = {
    approved: 'Aprobado',
    review: 'Revisión',
    alert: 'Alerta'
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 ${statusClasses[status]}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-textMain">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          status === 'approved' ? 'bg-statusGreen text-white' :
          status === 'review' ? 'bg-statusAmber text-white' :
          'bg-statusRed text-white'
        }`}>
          {statusText[status]}
        </span>
      </div>
      
      <div className="text-3xl font-bold text-textMain">
        {total ? `${value}/${total}` : value}
      </div>
    </div>
  );
}

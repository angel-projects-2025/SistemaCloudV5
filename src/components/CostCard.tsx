interface CostCardProps {
  service: string;
  monthlyTotal: number;
  annualTotal: number;
  quantity: number;
}

export function CostCard({ service, monthlyTotal, annualTotal, quantity }: CostCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/30 dark:hover:border-blue-500/40">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-textMain">{service}</h3>
        <span className="text-sm text-textSecondary bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded-full">Cantidad: {quantity}</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg">
          <span className="text-sm text-textSecondary">Mensual</span>
          <span className="text-lg font-bold text-textMain">${monthlyTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30">
          <span className="text-sm text-textSecondary">Anual</span>
          <span className="text-lg font-bold text-primary dark:text-blue-400">${annualTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

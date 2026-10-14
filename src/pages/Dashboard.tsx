import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { Header } from '../components/Header';
import { NoPlanningState } from '../components/NoPlanningState';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { useTheme } from '../context/ThemeContext';
import { usePlanning } from '../context/PlanningContext';
import { SERVICES } from '../lib/planningCatalog';
import type { SavedPlanning, ServiceCategory } from '../lib/planningCatalog';
import { buildPillars } from '../lib/wellArchitected';
import { describeCostLine } from '../lib/costEngine';
import type { CostLine } from '../lib/costEngine';
import {
  Activity, DollarSign, MapPin, Shield, Download,
  Server, HardDrive, Network, Lock, X, CheckCircle,
} from 'lucide-react';

interface CategoryCost {
  name: ServiceCategory;
  value: number;
  percent: number;
  color: string;
}

interface ArchitectureItem {
  label: string;
  detail: string;
  percent?: number;
}

interface ArchitectureGroup {
  category: string;
  bg: string;
  border: string;
  barColor: string;
  icon: typeof Server;
  hasServices: boolean;
  items: ArchitectureItem[];
}

interface SecurityItem {
  id: string;
  name: string;
  included: boolean;
  description: string;
  bgColor: string;
  borderColor: string;
}

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  'Cómputo': '#2563EB', Serverless: '#16A34A', Contenedores: '#F59E0B',
  Almacenamiento: '#16A34A', 'Bases de datos': '#2563EB', Redes: '#F59E0B', Seguridad: '#DC2626',
};

function money(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function regionCode(region: string) {
  return region.match(/\b[a-z]{2}(?:-[a-z]+)+-\d+\b/)?.[0] ?? region;
}

function buildCategoryData(lines: CostLine[]): CategoryCost[] {
  const grouped = new Map<ServiceCategory, number>();
  for (const line of lines) {
    const service = SERVICES.find((entry) => entry.id === line.planningServiceId);
    if (service && line.monthly > 0) grouped.set(service.category, (grouped.get(service.category) ?? 0) + line.monthly);
  }
  const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];
  const shares = [...grouped].map(([name, value]) => {
    const exact = value / total * 100;
    return { name, value, percent: Math.floor(exact), remainder: exact - Math.floor(exact), color: CATEGORY_COLORS[name] };
  });
  // Reparto por restos mayores: las etiquetas enteras suman exactamente 100%.
  const remaining = 100 - shares.reduce((sum, entry) => sum + entry.percent, 0);
  const order = shares.map((entry, index) => ({ index, remainder: entry.remainder })).sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; index < remaining; index++) shares[order[index % order.length].index].percent++;
  return shares.map(({ name, value, percent, color }) => ({ name, value, percent, color }));
}

function buildDashboardData(planning: SavedPlanning, lines: CostLine[]) {
  const { plan, network } = planning;
  const totalMonthly = lines.reduce((sum, line) => sum + line.monthly, 0);
  const totalAnnual = lines.reduce((sum, line) => sum + line.annual, 0);
  const evaluation = buildPillars(plan.awsServices, network);
  const costData = [...lines.reduce((grouped, line) => {
    const service = grouped.get(line.planningServiceId);
    if (service) service.value += line.monthly;
    else grouped.set(line.planningServiceId, {
      id: line.planningServiceId, name: line.planningServiceId,
      serviceName: line.serviceName, value: line.monthly,
    });
    return grouped;
  }, new Map<string, { id: string; name: string; serviceName: string; value: number }>()).values()]
    .sort((a, b) => {
      const first = plan.awsServices.indexOf(a.name);
      const second = plan.awsServices.indexOf(b.name);
      return (first < 0 ? plan.awsServices.length : first) - (second < 0 ? plan.awsServices.length : second);
    });
  const categoryData = buildCategoryData(lines);
  const projectionData = Array.from({ length: 12 }, (_, index) => ({ name: `Mes ${index + 1}`, costo: totalAnnual * (index + 1) / 12 }));
  const selectedServices = SERVICES.filter((service) => plan.awsServices.includes(service.id));
  const serviceItems = (categories: ServiceCategory[]): ArchitectureItem[] => selectedServices
    .filter((service) => categories.includes(service.category))
    .flatMap((service) => {
      const matchingLines = lines.filter((line) => line.planningServiceId === service.id);
      if (!matchingLines.length) return [{ label: service.name, detail: 'Sin configuración de costos' }];
      return matchingLines.map((line) => {
        const description = describeCostLine(line);
        return {
          label: `${description.quantity} × ${line.serviceName} · ${description.option}`,
          detail: money(line.monthly),
          percent: totalMonthly > 0 ? Math.min(100, Math.max(0, line.monthly / totalMonthly * 100)) : 0,
        };
      });
    });
  const computeCategories: ServiceCategory[] = ['Cómputo', 'Serverless', 'Contenedores', 'Bases de datos'];
  const storageGb = lines.reduce((sum, line) => sum + ('storageGb' in line.config ? line.config.storageGb : 0), 0);
  const securityItems: SecurityItem[] = [
    { id: 'firewall', name: 'Firewall Web (WAF)', included: network.enableWaf, description: 'Protección perimetral mediante AWS WAF.' },
    { id: 'iam', name: 'AWS IAM', included: plan.awsServices.includes('IAM'), description: 'Servicio de identidad y control de acceso.' },
    { id: 'flowLogs', name: 'VPC Flow Logs', included: network.enableFlowLogs, description: 'Registro del tráfico de red para observabilidad.' },
  ].map((item) => ({
    ...item,
    bgColor: item.included ? 'bg-green-50 dark:bg-green-500/10' : 'bg-amber-50 dark:bg-amber-500/10',
    borderColor: item.included ? 'border-green-200 dark:border-green-500/30' : 'border-amber-200 dark:border-amber-500/30',
  }));
  const architectureResources: ArchitectureGroup[] = [
    {
      category: 'Compute', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/30', barColor: 'bg-primary', icon: Server,
      hasServices: selectedServices.some((service) => computeCategories.includes(service.category)), items: serviceItems(computeCategories),
    },
    {
      category: 'Storage', bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/30', barColor: 'bg-statusGreen', icon: HardDrive,
      hasServices: selectedServices.some((service) => service.category === 'Almacenamiento'),
      items: [...serviceItems(['Almacenamiento']), ...(storageGb > 0 ? [{ label: 'Almacenamiento configurado total', detail: `${storageGb.toLocaleString('en-US')} GB` }] : [])],
    },
    {
      category: 'Network', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', barColor: 'bg-statusAmber', icon: Network,
      hasServices: selectedServices.some((service) => service.category === 'Redes'),
      items: [
        { label: 'CIDR de la VPC', detail: network.vpcCidr },
        { label: 'Zonas de Disponibilidad', detail: String(network.availabilityZones) },
        { label: 'Subredes públicas', detail: String(network.publicSubnets) },
        { label: 'Subredes privadas', detail: String(network.privateSubnets) },
        { label: 'NAT Gateways', detail: String(network.natGateways) },
        ...serviceItems(['Redes']),
      ],
    },
    {
      category: 'Security', bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/30', barColor: 'bg-statusRed', icon: Lock,
      hasServices: plan.awsServices.includes('IAM') || network.enableWaf || network.enableFlowLogs || network.enableTransit,
      items: [
        { label: 'AWS WAF', detail: network.enableWaf ? 'Activado' : 'No incluido' },
        { label: 'VPC Flow Logs', detail: network.enableFlowLogs ? 'Activado' : 'No incluido' },
        { label: 'Transit Gateway', detail: network.enableTransit ? 'Activado' : 'No incluido' },
        ...(plan.awsServices.includes('IAM') ? [{ label: 'AWS IAM', detail: 'Seleccionado' }] : []),
      ],
    },
  ];
  return {
    totalMonthly, totalAnnual, evaluation, costData, categoryData, projectionData, securityItems, architectureResources,
    securityScore: evaluation.pillars.find((pillar) => pillar.pillar === 'Seguridad')?.score,
  };
}

function buildSummaryCsv(planning: SavedPlanning, lines: CostLine[], totalMonthly: number, totalAnnual: number) {
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    'Servicio,Mensual,Anual',
    ...lines.map((line) => `${quote(line.serviceName)},${line.monthly.toFixed(2)},${line.annual.toFixed(2)}`),
    '',
    `Planificacion,${quote(planning.plan.solutionName)}`,
    `Region,${quote(regionCode(planning.plan.region))}`,
    `Total Mensual,${totalMonthly.toFixed(2)}`,
    `Total Anual,${totalAnnual.toFixed(2)}`,
  ];
  return '\uFEFF' + rows.join('\n');
}

function RadialGauge({ percent, size = 140 }: { percent: number; size?: number }) {
  const { isDark } = useTheme();
  const chartGridStroke = isDark ? '#334155' : '#E2E8F0';
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const center = size / 2;
  const getColor = (value: number) => value >= 90 ? '#16A34A' : value >= 70 ? '#F59E0B' : '#DC2626';
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke={chartGridStroke} strokeWidth={strokeWidth} />
        <circle cx={center} cy={center} r={radius} fill="none" stroke={getColor(percent)} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-3xl font-bold text-textMain">{percent}%</span>
        <span className="text-xs text-textSecondary">Salud</span>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { isDark } = useTheme();
  const { activePlanning, activeCostLines } = usePlanning();
  const [modalSelection, setModalSelection] = useState<{ planningId: string; itemId: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const data = useMemo(() => activePlanning ? buildDashboardData(activePlanning, activeCostLines) : null, [activePlanning, activeCostLines]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const chartGridStroke = isDark ? '#334155' : '#E2E8F0';
  const chartTickFill = isDark ? '#94A3B8' : '#64748B';
  const chartTooltipStyle = isDark
    ? { backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)' }
    : { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };

  const handleExport = () => {
    if (!activePlanning || !data) return;
    const csvContent = buildSummaryCsv(activePlanning, activeCostLines, data.totalMonthly, data.totalAnnual);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resumen_dashboard_${regionCode(activePlanning.plan.region)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast(`Descarga del resumen iniciada: ${activePlanning.plan.solutionName}`);
  };

  if (!activePlanning || !data) {
    return <><Header title="Dashboard" showPlanSelector /><main className="p-4 md:p-8 bg-background min-h-screen"><NoPlanningState /></main></>;
  }

  const modalItem = modalSelection && modalSelection.planningId === activePlanning.id
    ? data.securityItems.find((item) => item.id === modalSelection.itemId) ?? null
    : null;

  return (
    <>
      <Header title="Dashboard" showPlanSelector />
      <main className="p-4 md:p-8 bg-background min-h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm sm:ml-auto">
            <Download size={16} />Exportar Resumen
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard title="Servicios Seleccionados" value={activePlanning.plan.awsServices.length} icon={Activity} color="primary" />
          <StatCard title="Región Seleccionada" value={regionCode(activePlanning.plan.region)} icon={MapPin} color="green" />
          <StatCard title="Costo Mensual Est." value={money(data.totalMonthly)} icon={DollarSign} color="amber" />
          <StatCard title="Costo Anual Est." value={money(data.totalAnnual)} icon={DollarSign} color="primary" />
          <StatCard title="Puntuación Well-Architected" value={`${data.evaluation.overall}/100`} icon={Shield} color="green" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-textMain mb-4">Desglose de Costo — Costo Mensual</h3>
              {data.costData.length > 0 && data.totalMonthly > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.costData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="name" tick={{ fill: chartTickFill, fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={55} />
                    <YAxis tick={{ fill: chartTickFill }} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'transparent' }} formatter={(value) => [money(Number(value)), 'Costo mensual']} />
                    <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} activeBar={{ opacity: 0.8 }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[300px] flex items-center justify-center text-sm text-textSecondary">Sin costos estimados para mostrar.</div>}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-textMain mb-4">Puntuación por Pilar Well-Architected</h3>
              {data.evaluation.pillars.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.evaluation.pillars}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                    <XAxis dataKey="pillar" tick={{ fill: chartTickFill, fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={65} />
                    <YAxis domain={[0, 100]} tick={{ fill: chartTickFill }} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'transparent' }} formatter={(value, _name, item) => [`${Number(value)}/100`, item.payload.status]} />
                    <Bar dataKey="score" fill="#2563EB" radius={[4, 4, 0, 0]} activeBar={{ opacity: 0.8 }} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-sm text-textSecondary">Sin evaluación disponible.</div>}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-textMain mb-4">Distribución por Categoría</h3>
              {data.categoryData.length > 0 ? <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {data.categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'transparent' }} formatter={(value, _name, item) => [money(Number(value)), `${item.payload.name} ${item.payload.percent}%`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-2">{data.categoryData.map((category) => <div key={category.name} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }} /><span className="text-xs text-textSecondary">{category.name} {category.percent}%</span></div>)}</div>
              </> : <div className="h-[200px] flex items-center justify-center text-sm text-textSecondary">Sin costos por categoría para mostrar.</div>}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-textMain mb-4">Salud de Seguridad</h3>
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">{data.securityScore !== undefined ? <RadialGauge percent={data.securityScore} size={130} /> : <p className="text-sm text-textSecondary">Sin puntuación.</p>}</div>
                <div className="space-y-2 flex-1 min-w-0">{data.securityItems.map((item) => <button key={item.id} onClick={() => setModalSelection({ planningId: activePlanning.id, itemId: item.id })}
                  className={`w-full flex items-center justify-between gap-2 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer ${item.bgColor} ${item.borderColor}`}>
                  <div className="text-left"><p className="text-sm font-medium text-textMain">{item.name}</p><p className="text-xs text-textSecondary">{item.included ? 'Incluido en la planificación' : 'No incluido en la planificación'}</p></div>
                  <StatusBadge status={item.included ? 'approved' : 'review'} text={item.included ? 'Aprobado' : 'No incluido'} />
                </button>)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow mb-8">
          <h3 className="text-lg font-semibold text-textMain mb-2">Proyección de Costo Acumulado a 12 Meses</h3>
          <p className="text-xs text-textSecondary mb-4">Proyección basada en la estimación anual de la planificación activa; no representa un historial de consumo.</p>
          {data.projectionData.length > 0 && data.totalAnnual > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.projectionData}>
                <defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} /><stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                <XAxis dataKey="name" tick={{ fill: chartTickFill, fontSize: 12 }} />
                <YAxis tick={{ fill: chartTickFill }} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'transparent' }} formatter={(value) => [money(Number(value)), 'Costo acumulado']} />
                <Area type="monotone" dataKey="costo" stroke="#2563EB" strokeWidth={2} fill="url(#trendGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-[220px] flex items-center justify-center text-sm text-textSecondary">Sin costos estimados para proyectar.</div>}
        </div>

        <p className="text-xs text-textSecondary mb-8">Precios de referencia de AWS (us-east-1), sin capa gratuita. Estimación inicial editable en Costos.</p>

        <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-textMain mb-6">Resumen de Arquitectura</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{data.architectureResources.map((category) => {
            const Icon = category.icon;
            return <div key={category.category} className={`p-5 rounded-xl border ${category.bg} ${category.border} hover:shadow-md transition-shadow`}>
              <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80"><Icon size={18} className="text-textMain" /></div><p className="font-semibold text-textMain">{category.category}</p></div>
              <div className="space-y-3">
                {!category.hasServices && <p className="text-xs text-textSecondary">Sin servicios seleccionados</p>}
                {category.items.map((item, index) => <div key={`${item.label}-${index}`}>
                  <div className="flex items-start justify-between gap-2 mb-1"><span className="text-xs font-medium text-textMain break-words min-w-0">{item.label}</span><span className="text-xs font-semibold text-textSecondary shrink-0">{item.detail}</span></div>
                  {item.percent !== undefined && <div className="w-full h-1.5 bg-white/80 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${category.barColor} transition-all duration-500`} style={{ width: `${item.percent}%` }} /></div>}
                </div>)}
              </div>
            </div>;
          })}</div>
        </div>
      </main>

      {modalItem && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="security-detail-title" onKeyDown={(event) => { if (event.key === 'Escape') setModalSelection(null); }}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-cardBorder"><div><h3 id="security-detail-title" className="text-lg font-semibold text-textMain">Detalle de Seguridad</h3><p className="text-sm text-textSecondary mt-0.5">{modalItem.name}</p></div><button autoFocus onClick={() => setModalSelection(null)} aria-label="Cerrar detalle de seguridad" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"><X size={20} className="text-textSecondary" /></button></div>
          <div className="px-6 py-5"><p className="text-sm font-medium text-textMain mb-3">Estado en la planificación:</p><StatusBadge status={modalItem.included ? 'approved' : 'review'} text={modalItem.included ? 'Aprobado' : 'No incluido'} /><p className="text-sm text-textSecondary mt-4">{modalItem.description}</p><p className="text-xs text-textSecondary mt-3">Detalle de la planificación «{activePlanning.plan.solutionName}». Los componentes se configuran en Planificación.</p></div>
          <div className="px-6 py-4 border-t border-cardBorder flex items-center justify-end gap-3"><button onClick={() => setModalSelection(null)} className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Cerrar</button></div>
        </div>
      </div>}

      {toast && <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-statusGreen text-white px-5 py-3 rounded-xl shadow-lg animate-[fadeIn_0.3s_ease-out]"><CheckCircle size={20} /><span className="font-medium">{toast}</span></div>}
    </>
  );
}

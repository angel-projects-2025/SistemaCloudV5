import { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { useTheme } from '../context/ThemeContext';
import {
  Activity, DollarSign, MapPin, Shield, Download, ChevronDown,
  Server, HardDrive, Network, Lock, X, CheckCircle
} from 'lucide-react';

const regions = ['us-east-1', 'us-west-2', 'eu-central-1'];
const timeRanges = ['Últimos 7 días', 'Últimos 30 días', 'Este año'];

const regionMultipliers: Record<string, number> = {
  'us-east-1': 1,
  'us-west-2': 1.12,
  'eu-central-1': 1.08,
};

const regionTrendPct: Record<string, { costMonth: string; costYear: string; costMonthUp: boolean; costYearUp: boolean }> = {
  'us-east-1': { costMonth: '+8.4% vs mes anterior', costYear: '+5.2% vs año anterior', costMonthUp: true, costYearUp: true },
  'us-west-2': { costMonth: '+12.1% vs mes anterior', costYear: '+7.8% vs año anterior', costMonthUp: true, costYearUp: true },
  'eu-central-1': { costMonth: '-3.2% vs mes anterior', costYear: '+2.1% vs año anterior', costMonthUp: true, costYearUp: true },
};

const periodMultipliers: Record<string, number> = {
  'Últimos 7 días': 0.25,
  'Últimos 30 días': 1,
  'Este año': 12,
};

const baseCostData = [
  { name: 'EC2', value: 438 },
  { name: 'RDS', value: 365 },
  { name: 'S3', value: 16.79 },
  { name: 'CloudFront', value: 62.05 },
  { name: 'VPC', value: 36.5 },
  { name: 'IAM', value: 14.6 },
];

const baseCategoryData = [
  { name: 'Compute', base: 42, color: '#2563EB' },
  { name: 'Storage', base: 25, color: '#16A34A' },
  { name: 'Network', base: 18, color: '#F59E0B' },
  { name: 'Security', base: 15, color: '#DC2626' },
];

interface ArchItem {
  label: string;
  detail: string;
  basePercent: number;
}

interface ArchCategory {
  category: string;
  bg: string;
  border: string;
  barColor: string;
  icon: typeof Server;
  regions: Record<string, ArchItem[]>;
  periodOffsets: Record<string, number>;
}

const architectureData: ArchCategory[] = [
  {
    category: 'Compute',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/30',
    barColor: 'bg-primary',
    icon: Server,
    regions: {
      'us-east-1': [
        { label: '5 Instancias EC2', detail: 'CPU 42%', basePercent: 42 },
        { label: '2 Instancias RDS', detail: 'RAM 68%', basePercent: 68 },
        { label: 'Auto Scaling Groups', detail: 'Activo', basePercent: 100 },
      ],
      'us-west-2': [
        { label: '3 Instancias EC2', detail: 'CPU 31%', basePercent: 31 },
        { label: '1 Instancia RDS', detail: 'RAM 55%', basePercent: 55 },
        { label: 'Auto Scaling Groups', detail: 'Activo', basePercent: 100 },
      ],
      'eu-central-1': [
        { label: '4 Instancias EC2', detail: 'CPU 50%', basePercent: 50 },
        { label: '2 Instancias RDS', detail: 'RAM 72%', basePercent: 72 },
        { label: 'Auto Scaling Groups', detail: 'Activo', basePercent: 100 },
      ],
    },
    periodOffsets: { 'Últimos 7 días': -8, 'Últimos 30 días': 0, 'Este año': 5 },
  },
  {
    category: 'Storage',
    bg: 'bg-green-50 dark:bg-green-500/10',
    border: 'border-green-200 dark:border-green-500/30',
    barColor: 'bg-statusGreen',
    icon: HardDrive,
    regions: {
      'us-east-1': [
        { label: 'Buckets S3: 3', detail: '1.2 TB', basePercent: 60 },
        { label: 'EBS Volumes: 8', detail: '480 GB', basePercent: 45 },
        { label: 'Backup automatizado', detail: 'Diario', basePercent: 100 },
      ],
      'us-west-2': [
        { label: 'Buckets S3: 2', detail: '0.8 TB', basePercent: 40 },
        { label: 'EBS Volumes: 5', detail: '300 GB', basePercent: 30 },
        { label: 'Backup automatizado', detail: 'Diario', basePercent: 100 },
      ],
      'eu-central-1': [
        { label: 'Buckets S3: 4', detail: '1.8 TB', basePercent: 75 },
        { label: 'EBS Volumes: 10', detail: '600 GB', basePercent: 55 },
        { label: 'Backup automatizado', detail: 'Diario', basePercent: 100 },
      ],
    },
    periodOffsets: { 'Últimos 7 días': -5, 'Últimos 30 días': 0, 'Este año': 3 },
  },
  {
    category: 'Network',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    barColor: 'bg-statusAmber',
    icon: Network,
    regions: {
      'us-east-1': [
        { label: '1 VPC principal', detail: '/16', basePercent: 100 },
        { label: '3 Subredes públicas', detail: '/24 c/u', basePercent: 75 },
        { label: '2 Subredes privadas', detail: '/24 c/u', basePercent: 50 },
      ],
      'us-west-2': [
        { label: '1 VPC principal', detail: '/16', basePercent: 100 },
        { label: '2 Subredes públicas', detail: '/24 c/u', basePercent: 50 },
        { label: '1 Subred privada', detail: '/24', basePercent: 25 },
      ],
      'eu-central-1': [
        { label: '1 VPC principal', detail: '/16', basePercent: 100 },
        { label: '4 Subredes públicas', detail: '/24 c/u', basePercent: 100 },
        { label: '3 Subredes privadas', detail: '/24 c/u', basePercent: 75 },
      ],
    },
    periodOffsets: { 'Últimos 7 días': -3, 'Últimos 30 días': 0, 'Este año': 2 },
  },
  {
    category: 'Security',
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-500/30',
    barColor: 'bg-statusRed',
    icon: Lock,
    regions: {
      'us-east-1': [
        { label: 'Firewall Web', detail: 'WAF activo', basePercent: 100 },
        { label: 'IAM Roles', detail: '12 configurados', basePercent: 94 },
        { label: 'Certificados SSL', detail: 'Renovar 1', basePercent: 80 },
      ],
      'us-west-2': [
        { label: 'Firewall Web', detail: 'WAF activo', basePercent: 100 },
        { label: 'IAM Roles', detail: '8 configurados', basePercent: 90 },
        { label: 'Certificados SSL', detail: ' al día', basePercent: 100 },
      ],
      'eu-central-1': [
        { label: 'Firewall Web', detail: 'WAF activo', basePercent: 100 },
        { label: 'IAM Roles', detail: '15 configurados', basePercent: 97 },
        { label: 'Certificados SSL', detail: ' al día', basePercent: 100 },
      ],
    },
    periodOffsets: { 'Últimos 7 días': -2, 'Últimos 30 días': 0, 'Este año': 1 },
  },
];

interface SecurityItemState {
  id: string;
  name: string;
  status: 'approved' | 'review' | 'alert';
  points: number;
  bgColor: string;
  borderColor: string;
}

const securityDescriptions: Record<string, Record<'approved' | 'review' | 'alert', string>> = {
  firewall: {
    approved: 'Protección activa y reglas vigentes',
    review: 'Reglas de tráfico en observación',
    alert: 'Sin protección / WAF deshabilitado',
  },
  iam: {
    approved: 'Configuración y permisos correctos',
    review: 'Políticas con permisos excesivos',
    alert: 'Configuración vulnerable / Claves expuestas',
  },
  ssl: {
    approved: 'Certificados válidos y actualizados',
    review: 'Renovación pendiente',
    alert: 'Certificado vencido o no válido',
  },
};

const defaultSecurityItems: SecurityItemState[] = [
  { id: 'firewall', name: 'Firewall Web', status: 'approved', points: 100, bgColor: 'bg-green-50 dark:bg-green-500/10', borderColor: 'border-green-200 dark:border-green-500/30' },
  { id: 'iam', name: 'IAM Roles', status: 'approved', points: 100, bgColor: 'bg-green-50 dark:bg-green-500/10', borderColor: 'border-green-200 dark:border-green-500/30' },
  { id: 'ssl', name: 'Certificados SSL', status: 'review', points: 70, bgColor: 'bg-amber-50 dark:bg-amber-500/10', borderColor: 'border-amber-200 dark:border-amber-500/30' },
];

const statusConfig: Record<string, { label: string; points: number; bg: string; border: string; badge: 'approved' | 'review' | 'alert' }> = {
  approved: { label: 'Aprobado', points: 100, bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-500/30', badge: 'approved' },
  review: { label: 'Revisión', points: 70, bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30', badge: 'review' },
  alert: { label: 'Alerta', points: 40, bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-500/30', badge: 'alert' },
};

const dayLabels7 = ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7'];
const weekLabels = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
const monthLabels = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function generateTrendData(region: string, period: string, baseMonthly: number) {
  const labels = period === 'Últimos 7 días' ? dayLabels7 : period === 'Este año' ? monthLabels : weekLabels;
  const rMult = regionMultipliers[region];

  return labels.map((label, i) => {
    const phase = (i / (labels.length - 1)) * Math.PI * 2;
    const noise = Math.sin(phase) * 0.15 + Math.cos(phase * 1.7) * 0.08;
    const val = baseMonthly * rMult * (1 + noise);
    return { name: label, costo: Math.round(val * 100) / 100 };
  });
}

function clampPercent(v: number) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function SparklineSVG({ color = '#2563EB' }: { color?: string }) {
  const points = [
    [0, 20], [30, 35], [60, 15], [90, 40], [120, 25], [150, 45],
    [180, 30], [210, 50], [240, 38], [270, 55], [300, 42], [330, 60],
  ];
  const pathD = points
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(' ');
  const areaD = `${pathD} L330,70 L0,70 Z`;

  return (
    <svg
      viewBox="0 0 330 70"
      preserveAspectRatio="none"
      className="absolute bottom-0 left-0 w-full h-16"
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RadialGauge({ percent, size = 140 }: { percent: number; size?: number }) {
  const { isDark } = useTheme();
  const chartGridStroke = isDark ? '#334155' : '#E2E8F0';
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const center = size / 2;

  const getColor = (p: number) => {
    if (p >= 90) return '#16A34A';
    if (p >= 70) return '#F59E0B';
    return '#DC2626';
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={chartGridStroke}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getColor(percent)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
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
  const [selectedRegion, setSelectedRegion] = useState('us-east-1');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Últimos 30 días');
  const [securityItems, setSecurityItems] = useState<SecurityItemState[]>(defaultSecurityItems);
  const [modalItem, setModalItem] = useState<SecurityItemState | null>(null);
  const [modalDraft, setModalDraft] = useState<'approved' | 'review' | 'alert'>('approved');
  const [toast, setToast] = useState<string | null>(null);

  const chartGridStroke = isDark ? '#334155' : '#E2E8F0';
  const chartTickFill = isDark ? '#94A3B8' : '#64748B';
  const chartTooltipStyle = isDark
    ? { backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)' }
    : { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' };

  const regionMult = regionMultipliers[selectedRegion];
  const periodMult = periodMultipliers[selectedTimeRange];

  const costData = useMemo(() =>
    baseCostData.map((item) => ({
      ...item,
      value: Math.round(item.value * regionMult * periodMult * 100) / 100,
    })),
    [regionMult, periodMult]
  );

  const totalMonthly = useMemo(() =>
    costData.reduce((sum, item) => sum + item.value, 0),
    [costData]
  );

  const totalAnnual = useMemo(() => totalMonthly * 12, [totalMonthly]);

  const environmentData = useMemo(() => {
    const base = baseCostData.reduce((sum, item) => sum + item.value, 0) * regionMult * periodMult;
    return [
      { name: 'Producción', value: Math.round(base * 0.65 * 100) / 100 },
      { name: 'Staging / QA', value: Math.round(base * 0.25 * 100) / 100 },
      { name: 'Desarrollo', value: Math.round(base * 0.10 * 100) / 100 },
    ];
  }, [regionMult, periodMult]);

  const categoryData = useMemo(() =>
    baseCategoryData.map((cat) => {
      const shifted = cat.base + (periodMult === 0.25 ? -4 : periodMult === 12 ? 5 : 0);
      return { ...cat, value: clampPercent(shifted) };
    }),
    [periodMult]
  );

  const securityScore = useMemo(() => {
    const sum = securityItems.reduce((acc, item) => acc + item.points, 0);
    return Math.round(sum / securityItems.length);
  }, [securityItems]);

  const prevScore = useMemo(() => {
    const base = 94;
    if (selectedRegion === 'eu-central-1') return 97;
    if (selectedRegion === 'us-west-2') return 95;
    return base;
  }, [selectedRegion]);

  const scoreDelta = securityScore - prevScore;

  const architectureResources = useMemo(() =>
    architectureData.map((cat) => {
      const regionItems = cat.regions[selectedRegion] || cat.regions['us-east-1'];
      const offset = cat.periodOffsets[selectedTimeRange] ?? 0;
      return {
        ...cat,
        items: regionItems.map((item) => ({
          ...item,
          percent: clampPercent(item.basePercent + offset),
        })),
      };
    }),
    [selectedRegion, selectedTimeRange]
  );

  const periodLabel = useMemo(() => {
    if (selectedTimeRange === 'Últimos 7 días') return 'Últimos 7 días';
    if (selectedTimeRange === 'Este año') return 'Este año';
    return 'Costo Mensual';
  }, [selectedTimeRange]);

  const trendData = useMemo(() =>
    generateTrendData(selectedRegion, selectedTimeRange, totalMonthly),
    [selectedRegion, selectedTimeRange, totalMonthly]
  );

  const trend = regionTrendPct[selectedRegion];

  const openModal = useCallback((item: SecurityItemState) => {
    setModalItem(item);
    setModalDraft(item.status);
  }, []);

  const closeModal = useCallback(() => {
    setModalItem(null);
  }, []);

  const saveModal = useCallback(() => {
    if (!modalItem) return;
    const cfg = statusConfig[modalDraft];
    setSecurityItems((prev) =>
      prev.map((item) =>
        item.id === modalItem.id
          ? { ...item, status: modalDraft, points: cfg.points, bgColor: cfg.bg, borderColor: cfg.border }
          : item
      )
    );
    setModalItem(null);
    setToast(`"${modalItem.name}" actualizado a ${cfg.label}`);
    setTimeout(() => setToast(null), 3000);
  }, [modalItem, modalDraft]);

  const handleExport = () => {
    const lines = [
      'Servicio,Mensual,Anual',
      ...costData.map((d) => `${d.name},${d.value.toFixed(2)},${(d.value * 12).toFixed(2)}`),
      '',
      `Total ${periodLabel},${totalMonthly.toFixed(2)}`,
      `Total Anual,${totalAnnual.toFixed(2)}`,
      `Region,${selectedRegion}`,
      `Periodo,${selectedTimeRange}`,
    ];
    const csvContent = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen_dashboard_${selectedRegion}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header title="Dashboard" region={selectedRegion} />

      <main className="p-4 md:p-8 bg-background min-h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-textSecondary">Región:</label>
            <div className="relative">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-900 border border-cardBorder rounded-lg px-4 py-2 pr-10 text-sm font-medium text-textMain dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-sm"
              >
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-textSecondary">Período:</label>
            <div className="relative">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-900 border border-cardBorder rounded-lg px-4 py-2 pr-10 text-sm font-medium text-textMain dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-sm"
              >
                {timeRanges.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary pointer-events-none" />
            </div>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm sm:ml-auto"
          >
            <Download size={16} />
            Exportar Resumen
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Servicios Activos"
            value={costData.length}
            icon={Activity}
            color="primary"
          />
          <StatCard
            title="Región Seleccionada"
            value={selectedRegion}
            icon={MapPin}
            color="green"
          />
          <StatCard
            title="Costo Mensual Est."
            value={`$${totalMonthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="amber"
            trend={trend.costMonth}
            trendUp={trend.costMonthUp}
          >
            <SparklineSVG color="#F59E0B" />
          </StatCard>
          <StatCard
            title="Costo Anual Est."
            value={`$${totalAnnual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="primary"
            trend={trend.costYear}
            trendUp={trend.costYearUp}
          />
          <StatCard
            title="Salud de Seguridad"
            value={`${securityScore}%`}
            icon={Shield}
            color="green"
            trend={scoreDelta >= 0 ? `▲ Mejoró ${Math.abs(scoreDelta)} pts` : `▼ Empeoró ${Math.abs(scoreDelta)} pts`}
            trendUp={scoreDelta < 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-textMain mb-4">
                Desglose de Costo — {periodLabel}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="name" tick={{ fill: chartTickFill }} />
                  <YAxis tick={{ fill: chartTickFill }} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    cursor={{ fill: 'transparent' }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Costo']}
                  />
                  <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} activeBar={{ opacity: 0.8 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-textMain mb-4">Costo por Entorno (Prod / QA / Dev)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={environmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
                  <XAxis dataKey="name" tick={{ fill: chartTickFill }} />
                  <YAxis tick={{ fill: chartTickFill }} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    cursor={{ fill: 'transparent' }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Costo']}
                  />
                  <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} activeBar={{ opacity: 0.8 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-textMain mb-4">Distribución por Categoría</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    cursor={{ fill: 'transparent' }}
                    formatter={(value) => [`${Number(value)}%`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-textSecondary">{cat.name} {cat.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-textMain mb-4">Salud de Seguridad</h3>
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  <RadialGauge percent={securityScore} size={130} />
                </div>
                <div className="space-y-2 flex-1">
                  {securityItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => openModal(item)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer ${item.bgColor} ${item.borderColor}`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-textMain">{item.name}</p>
                        <p className="text-xs text-textSecondary">{securityDescriptions[item.id]?.[item.status] ?? ''}</p>
                      </div>
                      <StatusBadge status={statusConfig[item.status].badge} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow mb-8">
          <h3 className="text-lg font-semibold text-textMain mb-4">
            Tendencia Temporal de Costo — {periodLabel}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} />
              <XAxis dataKey="name" tick={{ fill: chartTickFill, fontSize: 12 }} />
              <YAxis tick={{ fill: chartTickFill }} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                cursor={{ fill: 'transparent' }}
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Costo']}
              />
              <Area
                type="monotone"
                dataKey="costo"
                stroke="#2563EB"
                strokeWidth={2}
                fill="url(#trendGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-textMain mb-6">Resumen de Arquitectura Activa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {architectureResources.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <div
                  key={cat.category}
                  className={`p-5 rounded-xl border ${cat.bg} ${cat.border} hover:shadow-md transition-shadow`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80">
                      <CatIcon size={18} className="text-textMain" />
                    </div>
                    <p className="font-semibold text-textMain">{cat.category}</p>
                  </div>
                  <div className="space-y-3">
                    {cat.items.map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-textMain">{item.label}</span>
                          <span className="text-xs font-semibold text-textSecondary">{item.detail}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/80 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${cat.barColor} transition-all duration-500`}
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {modalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cardBorder">
              <div>
                <h3 className="text-lg font-semibold text-textMain">Detalle de Seguridad</h3>
                <p className="text-sm text-textSecondary mt-0.5">{modalItem.name}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} className="text-textSecondary" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm font-medium text-textMain mb-3">Estado actual:</p>
              <div className="space-y-2">
                {(Object.keys(statusConfig) as Array<'approved' | 'review' | 'alert'>).map((key) => {
                  const cfg = statusConfig[key];
                  const isSelected = modalDraft === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setModalDraft(key)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-primary bg-blue-50 dark:bg-blue-500/10 shadow-sm'
                          : 'border-cardBorder hover:border-gray-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary' : 'border-gray-300 dark:border-slate-600'
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="text-sm font-medium text-textMain">{cfg.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-cardBorder flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-textSecondary rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveModal}
                className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-statusGreen text-white px-5 py-3 rounded-xl shadow-lg animate-[fadeIn_0.3s_ease-out]">
          <CheckCircle size={20} />
          <span className="font-medium">{toast}</span>
        </div>
      )}
    </>
  );
}

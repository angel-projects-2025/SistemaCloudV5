import { useState } from 'react';
import type { FormEvent } from 'react';
import { Header } from '../components/Header';
import {
  X, CheckCircle, ChevronLeft, ChevronRight,
  ClipboardList, FileText, Printer, Gauge,
  Info, Cloud, Cpu, Zap, Container, Boxes, HardDrive, Database,
  Network, Globe, Layers, Shield
} from 'lucide-react';

/* ============================================================
   Tipos y datos locales (simulación 100% frontend)
   ============================================================ */

interface NetworkPlan {
  vpcCidr: string;
  availabilityZones: number;
  publicSubnets: number;
  privateSubnets: number;
  natGateways: number;
  enableWaf: boolean;
  enableFlowLogs: boolean;
  enableTransit: boolean;
}

interface CloudPlan {
  id: string;
  solutionName: string;
  applicationType: string;
  region: string;
  estimatedUsers: string;
  availabilityLevel: string;
  awsServices: string[];
  migrationGoal: string;
  createdAt: string;
}

type ServiceCategory = 'Cómputo' | 'Serverless' | 'Contenedores' | 'Almacenamiento' | 'Bases de datos' | 'Redes' | 'Seguridad';

interface ServiceCardDef {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  monthly: number;
  icon: typeof Cpu;
  iconClass: string;
}

interface TcoLine {
  name: string;
  category: string;
  base: number;
  adjusted: number;
}

type PillarStatus = 'Conforme' | 'En revisión' | 'Requiere atención';

interface PillarEval {
  pillar: string;
  score: number;
  status: PillarStatus;
  notes: string;
}

interface ReportData {
  folio: string;
  generatedAt: string;
  plan: CloudPlan;
  network: NetworkPlan;
  tcoLines: TcoLine[];
  monthlyTotal: number;
  annualTotal: number;
  userMult: number;
  regionMult: number;
  pillars: PillarEval[];
  overallScore: number;
}

/* ============================================================
   Constantes
   ============================================================ */

const STEPS = [
  { id: 1, title: 'Parámetros del Proyecto', short: 'Proyecto' },
  { id: 2, title: 'Selección de Servicios Cloud', short: 'Servicios' },
  { id: 3, title: 'Red y Topología', short: 'Red' },
  { id: 4, title: 'Reporte Final', short: 'Reporte' },
];

const availabilityOptions = [
  { value: '99.0% - Basico (2 nueves | Max ~3.65 dias/inactividad)', pct: '99.0%', name: 'Básico', detail: '2 nueves · Max ~3.65 días de inactividad / año' },
  { value: '99.9% - Alta Disponibilidad Estandar (3 nueves | Max ~8.76 hrs/inactividad)', pct: '99.9%', name: 'Alta Disponibilidad Estándar', detail: '3 nueves · Max ~8.76 hrs de inactividad / año' },
  { value: '99.99% - Mision Critica Enterprise (4 nueves | Max ~52.6 min/inactividad)', pct: '99.99%', name: 'Misión Crítica Enterprise', detail: '4 nueves · Max ~52.6 min de inactividad / año' },
  { value: '99.999% - Tolerancia a Fallos Critica (5 nueves | Max ~5.26 min/inactividad)', pct: '99.999%', name: 'Tolerancia a Fallos Crítica', detail: '5 nueves · Max ~5.26 min de inactividad / año' },
];

const appTypeLabels: Record<string, string> = {
  web: 'Aplicacion Web',
  mobile: 'Aplicacion Movil',
  api: 'API / Microservicios',
  data: 'Procesamiento de Datos',
};

const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'];

const REGION_MULTIPLIERS: Record<string, number> = {
  'us-east-1': 1,
  'us-west-2': 1.12,
  'eu-west-1': 1.18,
  'ap-southeast-1': 1.15,
  'ap-northeast-1': 1.22,
};

const SERVICES: ServiceCardDef[] = [
  { id: 'EC2', name: 'Amazon EC2', category: 'Cómputo', description: 'Instancias virtuales para cargas de trabajo generales con escalado horizontal.', monthly: 420, icon: Cpu, iconClass: 'bg-orange-500/10 text-orange-500 dark:text-orange-400' },
  { id: 'Lambda', name: 'AWS Lambda', category: 'Serverless', description: 'Ejecución de funciones sin servidor, facturada por invocación.', monthly: 85, icon: Zap, iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { id: 'ECS', name: 'Amazon ECS', category: 'Contenedores', description: 'Orquestación de contenedores gestionada con Fargate o EC2.', monthly: 260, icon: Container, iconClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { id: 'EKS', name: 'Amazon EKS', category: 'Contenedores', description: 'Kubernetes gestionado para microservicios de alta escala.', monthly: 340, icon: Boxes, iconClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { id: 'S3', name: 'Amazon S3', category: 'Almacenamiento', description: 'Almacenamiento de objetos durable, con versionado y lifecycle.', monthly: 95, icon: HardDrive, iconClass: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { id: 'RDS', name: 'Amazon RDS', category: 'Bases de datos', description: 'Bases de datos relacionales administradas con réplicas multi-AZ.', monthly: 380, icon: Database, iconClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  { id: 'VPC', name: 'Amazon VPC', category: 'Redes', description: 'Red privada virtual aislada con subredes públicas y privadas.', monthly: 0, icon: Network, iconClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  { id: 'Route 53', name: 'Amazon Route 53', category: 'Redes', description: 'DNS administrado con enrutamiento de latencia y failover.', monthly: 28, icon: Globe, iconClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { id: 'CloudFront', name: 'Amazon CloudFront', category: 'Redes', description: 'CDN global con caché de borde y protección DDoS integrada.', monthly: 72, icon: Layers, iconClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { id: 'IAM', name: 'AWS IAM', category: 'Seguridad', description: 'Control de identidad y acceso con principios de mínimo privilegio.', monthly: 0, icon: Shield, iconClass: 'bg-red-500/10 text-red-600 dark:text-red-400' },
];

const SERVICE_CATEGORIES: ServiceCategory[] = [
  'Cómputo', 'Serverless', 'Contenedores', 'Almacenamiento', 'Bases de datos', 'Redes', 'Seguridad'
];

const NETWORK_ADDONS = [
  { key: 'enableWaf' as const, title: 'AWS WAF', desc: 'Firewall de aplicación para filtrar tráfico malicioso.', cost: 5.0 },
  { key: 'enableFlowLogs' as const, title: 'VPC Flow Logs', desc: 'Registro de tráfico IP para auditoría y diagnóstico.', cost: 6.4 },
  { key: 'enableTransit' as const, title: 'Transit Gateway', desc: 'Hub de red para conectar VPCs y redes on-premise.', cost: 36.0 },
];

const NAT_GATEWAY_COST = 32.85;

const DEFAULT_NETWORK: NetworkPlan = {
  vpcCidr: '10.0.0.0/16',
  availabilityZones: 3,
  publicSubnets: 3,
  privateSubnets: 3,
  natGateways: 2,
  enableWaf: true,
  enableFlowLogs: true,
  enableTransit: false,
};

/* ============================================================
   Utilidades de cálculo simulado
   ============================================================ */

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

const BASE_USERS = 50;
const COST_SCALE_STEP = 5000;
const COST_SCALE_FACTOR = 0.35;

function usersMultiplier(usersStr: string): number {
  const users = parseInt(usersStr, 10);
  if (!Number.isFinite(users) || users <= BASE_USERS) return 1;
  return round2(1 + ((users - BASE_USERS) / COST_SCALE_STEP) * COST_SCALE_FACTOR);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function validateStep(step: number, plan: CloudPlan, network: NetworkPlan): string[] {
  const errs: string[] = [];
  if (step === 1) {
    if (!plan.solutionName.trim()) errs.push('Indique un nombre para la solución.');
    if (!plan.applicationType) errs.push('Seleccione el tipo de aplicación.');
  }
  if (step === 2) {
    if (plan.awsServices.length === 0) errs.push('Seleccione al menos un servicio cloud.');
    const users = parseInt(plan.estimatedUsers, 10);
    if (!Number.isFinite(users) || users <= 0) errs.push('Indique un número de usuarios estimados válido.');
  }
  if (step === 3) {
    if (network.publicSubnets < network.availabilityZones) {
      errs.push('Debe haber al menos una subred pública por cada Zona de Disponibilidad.');
    }
    if (network.natGateways > network.availabilityZones) {
      errs.push('Los NAT Gateways no pueden superar el número de Zonas de Disponibilidad.');
    }
    if (network.privateSubnets > 0 && network.natGateways === 0) {
      errs.push('Las subredes privadas requieren al menos un NAT Gateway para salir a Internet.');
    }
  }
  return errs;
}

function buildTco(services: string[], region: string, usersStr: string, network: NetworkPlan) {
  const regionMult = REGION_MULTIPLIERS[region] ?? 1;
  const userMult = usersMultiplier(usersStr);
  const lines: TcoLine[] = [];

  for (const id of services) {
    const def = SERVICES.find((s) => s.id === id);
    if (!def) continue;
    lines.push({
      name: def.name,
      category: def.category,
      base: def.monthly,
      adjusted: round2(def.monthly * regionMult * userMult),
    });
  }

  if (network.natGateways > 0) {
    const base = round2(NAT_GATEWAY_COST * network.natGateways);
    lines.push({
      name: `NAT Gateway × ${network.natGateways}`,
      category: 'Redes',
      base,
      adjusted: round2(base * regionMult * userMult),
    });
  }

  for (const addon of NETWORK_ADDONS) {
    if (network[addon.key]) {
      lines.push({
        name: addon.title,
        category: 'Redes',
        base: addon.cost,
        adjusted: round2(addon.cost * regionMult * userMult),
      });
    }
  }

  const monthlyTotal = round2(lines.reduce((sum, l) => sum + l.adjusted, 0));
  return { lines, monthlyTotal, annualTotal: round2(monthlyTotal * 12), userMult, regionMult };
}

function buildPillars(services: string[], network: NetworkPlan): { pillars: PillarEval[]; overall: number } {
  const has = (id: string) => services.includes(id);

  const opScore = clamp(
    50 +
    (network.enableFlowLogs ? 15 : 0) +
    (services.length >= 6 ? 15 : services.length >= 4 ? 8 : 0) +
    (has('Route 53') ? 10 : 0) +
    (network.availabilityZones >= 3 ? 10 : 5)
  );
  const secScore = clamp(
    48 +
    (has('IAM') ? 22 : 0) +
    (network.enableWaf ? 18 : 0) +
    (network.enableFlowLogs ? 12 : 0)
  );
  const relScore = clamp(
    45 +
    (network.availabilityZones >= 3 ? 25 : network.availabilityZones === 2 ? 15 : 5) +
    (network.natGateways >= 2 ? 12 : network.natGateways === 1 ? 6 : 0) +
    (network.publicSubnets + network.privateSubnets >= 6 ? 10 : 5) +
    (has('CloudFront') ? 8 : 0)
  );
  const perfScore = clamp(
    50 +
    (has('CloudFront') ? 18 : 0) +
    (has('EKS') || has('ECS') ? 15 : 0) +
    (has('Lambda') ? 12 : 0) +
    (has('RDS') ? 10 : 5)
  );
  const costScore = clamp(
    58 +
    (has('Lambda') ? 14 : 0) +
    (services.length <= 5 ? 12 : services.length <= 8 ? 6 : 0) +
    (network.natGateways <= 2 ? 8 : 0) +
    (has('S3') ? 6 : 0)
  );

  const statusOf = (score: number): PillarStatus =>
    score >= 85 ? 'Conforme' : score >= 70 ? 'En revisión' : 'Requiere atención';

  const pillars: PillarEval[] = [
    {
      pillar: 'Excelencia Operacional',
      score: opScore,
      status: statusOf(opScore),
      notes: network.enableFlowLogs
        ? 'VPC Flow Logs habilitados: la observabilidad de red y el registro operacional están cubiertos.'
        : 'Se recomienda habilitar VPC Flow Logs para trazabilidad operacional y detección temprana de incidentes.',
    },
    {
      pillar: 'Seguridad',
      score: secScore,
      status: statusOf(secScore),
      notes: has('IAM') && network.enableWaf
        ? 'IAM aplica mínimo privilegio y WAF protege el perímetro de la aplicación contra amenazas comunes.'
        : 'Refuerce la postura de seguridad habilitando IAM con políticas escasas y AWS WAF en el balanceador.',
    },
    {
      pillar: 'Fiabilidad',
      score: relScore,
      status: statusOf(relScore),
      notes: network.availabilityZones >= 3 && network.natGateways >= 2
        ? `Diseño multi-AZ con ${network.availabilityZones} zonas y ${network.natGateways} NAT Gateways: alta tolerancia a fallos de zona.`
        : 'Considere distribuir recursos en 3 Zonas de Disponibilidad y duplicar NAT Gateways para evitar puntos únicos de fallo.',
    },
    {
      pillar: 'Eficiencia de Rendimiento',
      score: perfScore,
      status: statusOf(perfScore),
      notes: has('CloudFront')
        ? 'CloudFront acerca el contenido al usuario final y reduce la latencia percibida a nivel global.'
        : 'Evalúe Amazon CloudFront para servir contenido desde el borde y mejorar tiempos de respuesta.',
    },
    {
      pillar: 'Optimización de Costos',
      score: costScore,
      status: statusOf(costScore),
      notes: has('Lambda') && network.natGateways <= 2
        ? 'Combinación de cómputo serverless y NAT Gateways dimensionados: uso alineado al consumo real.'
        : 'Revise instancias reservadas, VPC Endpoints y políticas de retención de S3 para reducir el gasto recurrente.',
    },
  ];

  const overall = Math.round(pillars.reduce((sum, p) => sum + p.score, 0) / pillars.length);
  return { pillars, overall };
}

function statusChipClass(status: PillarStatus): string {
  if (status === 'Conforme') return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30';
  if (status === 'En revisión') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
  return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
}

function statusBarClass(status: PillarStatus): string {
  if (status === 'Conforme') return 'bg-statusGreen';
  if (status === 'En revisión') return 'bg-statusAmber';
  return 'bg-statusRed';
}

function money(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ============================================================
   Componente principal
   ============================================================ */

export function Planning() {
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | ServiceCategory>('Todas');
  const [formData, setFormData] = useState<CloudPlan>({
    id: '',
    solutionName: '',
    applicationType: '',
    region: 'us-east-1',
    estimatedUsers: '',
    availabilityLevel: availabilityOptions[1].value,
    awsServices: [],
    migrationGoal: '',
    createdAt: '',
  });
  const [network, setNetwork] = useState<NetworkPlan>({ ...DEFAULT_NETWORK });
  const [report, setReport] = useState<ReportData | null>(null);

  const updateForm = (partial: Partial<CloudPlan>) =>
    setFormData((prev) => ({ ...prev, ...partial }));

  const toggleService = (id: string) =>
    setFormData((prev) => ({
      ...prev,
      awsServices: prev.awsServices.includes(id)
        ? prev.awsServices.filter((s) => s !== id)
        : [...prev.awsServices, id],
    }));

  const goToStep = (target: number) => {
    if (target <= maxReached) {
      setErrors([]);
      setStep(target);
    }
  };

  const handleNext = (e?: FormEvent) => {
    e?.preventDefault();
    const errs = validateStep(step, formData, network);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    const next = Math.min(4, step + 1);
    setStep(next);
    setMaxReached((m) => Math.max(m, next));
  };

  const handleBack = () => {
    setErrors([]);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleGenerateReport = () => {
    const errs = validateStep(4, formData, network);
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    const tco = buildTco(formData.awsServices, formData.region, formData.estimatedUsers, network);
    const wa = buildPillars(formData.awsServices, network);
    const folio = `CW-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random()
      .toString(16)
      .slice(2, 6)
      .toUpperCase()}`;
    setErrors([]);
    setReport({
      folio,
      generatedAt: new Date().toLocaleString('es-ES'),
      plan: { ...formData },
      network: { ...network },
      tcoLines: tco.lines,
      monthlyTotal: tco.monthlyTotal,
      annualTotal: tco.annualTotal,
      userMult: tco.userMult,
      regionMult: tco.regionMult,
      pillars: wa.pillars,
      overallScore: wa.overall,
    });
  };

  const selectedSla = availabilityOptions.find((o) => o.value === formData.availabilityLevel);
  const progressPct = Math.round((step / 4) * 100);

  const visibleServices =
    categoryFilter === 'Todas'
      ? SERVICES
      : SERVICES.filter((s) => s.category === categoryFilter);

  const liveUserMult = usersMultiplier(formData.estimatedUsers);
  const liveBaseTotal = round2(
    formData.awsServices.reduce((sum, id) => {
      const def = SERVICES.find((s) => s.id === id);
      return sum + (def ? def.monthly : 0);
    }, 0),
  );
  const liveMonthly = round2(liveBaseTotal * liveUserMult);

  /* ============================================================
     Vista previa de render
     ============================================================ */

  return (
    <>
      <Header title="Planificacion Cloud" />

      <main className="p-4 md:p-8 bg-background min-h-screen">
        <div className="max-w-5xl mx-auto">

          {/* ---------- BARRA DE PASOS (estilo consola) ---------- */}
          <div className="bg-[#232F3E] dark:bg-slate-950 border border-slate-700/50 rounded-xl shadow-md overflow-hidden">
            <div className="flex items-center px-5 py-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <ClipboardList size={16} className="text-amber-400 shrink-0" />
                <span className="text-xs font-semibold tracking-wider uppercase text-slate-300 truncate">
                  Asistente de Diseño de Arquitectura Cloud
                </span>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-5 overflow-x-auto">
              <ol className="flex items-start gap-0 min-w-[560px]">
                {STEPS.map((s, idx) => {
                  const isActive = step === s.id;
                  const isDone = s.id < step || (s.id < maxReached && !isActive);
                  const canJump = s.id <= maxReached;
                  return (
                    <li key={s.id} className="flex-1 flex items-start">
                      <button
                        type="button"
                        onClick={() => canJump && goToStep(s.id)}
                        disabled={!canJump}
                        className={`flex flex-col items-center gap-2 px-2 sm:px-3 flex-1 group ${
                          canJump ? 'cursor-pointer' : 'cursor-not-allowed'
                        }`}
                      >
                        <span
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                            isActive
                              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                              : isDone
                              ? 'bg-green-600/15 border-green-500 text-green-400'
                              : 'bg-slate-800 border-slate-600 text-slate-400'
                          }`}
                        >
                          {isDone && !isActive ? <CheckCircle size={17} /> : s.id}
                        </span>
                        <span
                          className={`text-[11px] sm:text-xs font-semibold text-center leading-tight ${
                            isActive
                              ? 'text-white'
                              : isDone
                              ? 'text-slate-300 group-hover:text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          <span className="block sm:hidden">{s.short}</span>
                          <span className="hidden sm:block">{s.title}</span>
                        </span>
                      </button>
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`hidden sm:block h-0.5 w-full max-w-24 mt-4 -mx-2 rounded ${
                            s.id < step ? 'bg-green-500/70' : 'bg-slate-700'
                          }`}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="h-1.5 bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* ---------- PANEL DEL PASO ACTUAL ---------- */}
          <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl mt-6 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-cardBorder bg-gray-50 dark:bg-slate-800/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary dark:text-blue-400">
                Paso {step} de 4
              </p>
              <h3 className="text-lg font-semibold text-textMain mt-0.5">
                {STEPS[step - 1].title}
              </h3>
            </div>

            {errors.length > 0 && (
              <div className="mx-6 mt-5 flex items-start gap-2.5 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-4 py-3">
                <Info size={16} className="shrink-0 mt-0.5" />
                <ul className="list-disc list-inside space-y-0.5">
                  {errors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ===== PASO 1: PARAMETROS DEL PROYECTO ===== */}
            {step === 1 && (
              <form onSubmit={handleNext} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">Nombre de la Solucion</label>
                    <input
                      type="text"
                      value={formData.solutionName}
                      onChange={(e) => updateForm({ solutionName: e.target.value })}
                      placeholder="Ej. Portal Clientes Bancarios"
                      className="w-full px-4 py-3 border border-cardBorder rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">Tipo de Aplicacion</label>
                    <select
                      value={formData.applicationType}
                      onChange={(e) => updateForm({ applicationType: e.target.value })}
                      className="w-full px-4 py-3 border border-cardBorder rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="web">Aplicacion Web</option>
                      <option value="mobile">Aplicacion Movil</option>
                      <option value="api">API / Microservicios</option>
                      <option value="data">Procesamiento de Datos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">Region</label>
                    <select
                      value={formData.region}
                      onChange={(e) => updateForm({ region: e.target.value })}
                      className="w-full px-4 py-3 border border-cardBorder rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      {regions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-3">
                    Nivel de Disponibilidad (Estimacion AWS SLA)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availabilityOptions.map((opt) => {
                      const isSelected = formData.availabilityLevel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateForm({ availabilityLevel: opt.value })}
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-primary bg-blue-50 dark:bg-blue-500/10 shadow-sm'
                              : 'border-cardBorder hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-base font-bold ${isSelected ? 'text-primary dark:text-blue-400' : 'text-textMain'}`}>
                              {opt.pct}
                            </span>
                            {isSelected && <CheckCircle size={16} className="text-primary dark:text-blue-400" />}
                          </div>
                          <p className="text-sm font-medium text-textMain mt-1">{opt.name}</p>
                          <p className="text-xs text-textSecondary mt-0.5">{opt.detail}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-textMain mb-2">Objetivo de Migracion</label>
                  <textarea
                    value={formData.migrationGoal}
                    onChange={(e) => updateForm({ migrationGoal: e.target.value })}
                    placeholder="Ej. Modernizar la infraestructura on-premise, reducir costos operativos y lograr escalado elástico..."
                    className="w-full px-4 py-3 border border-cardBorder rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all h-20 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </button>
                </div>
              </form>
            )}

            {/* ===== PASO 2: SERVICIOS (TARJETAS) ===== */}
            {step === 2 && (
              <div className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <p className="text-sm text-textSecondary">
                    Elija los servicios que compondrán la arquitectura. Puede combinarlos libremente.
                  </p>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                    formData.awsServices.length > 0
                      ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30'
                      : 'bg-gray-100 text-textSecondary border-cardBorder dark:bg-slate-800'
                  }`}>
                    {formData.awsServices.length} servicio{formData.awsServices.length === 1 ? '' : 's'} seleccionado{formData.awsServices.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* ---------- FILTROS POR CATEGORIA ---------- */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {(['Todas', ...SERVICE_CATEGORIES] as const).map((cat) => {
                    const isActive = categoryFilter === cat;
                    const count = cat === 'Todas' ? SERVICES.length : SERVICES.filter((s) => s.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isActive
                            ? 'bg-[#232F3E] dark:bg-slate-700 border-[#232F3E] dark:border-slate-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-cardBorder text-textSecondary hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-textMain'
                        }`}
                      >
                        {cat}
                        <span className={`ml-1.5 text-[10px] ${isActive ? 'text-slate-300' : 'text-textSecondary'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ---------- GRID DE SERVICIOS (3 POR LINEA) ---------- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visibleServices.map((svc) => {
                    const Icon = svc.icon;
                    const isSelected = formData.awsServices.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        className={`relative text-left p-4 rounded-xl border-2 transition-all duration-150 ${
                          isSelected
                            ? 'border-primary bg-blue-50/70 dark:bg-blue-500/10 shadow-md ring-1 ring-primary/40'
                            : 'border-cardBorder bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md'
                        }`}
                      >
                        <span
                          className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-primary border-primary'
                              : 'border-gray-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <CheckCircle size={13} className="text-white" />}
                        </span>

                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${svc.iconClass}`}>
                          <Icon size={18} />
                        </div>
                        <p className="text-sm font-bold text-textMain pr-6">{svc.name}</p>
                        <p className="text-xs text-textSecondary mt-1 leading-relaxed line-clamp-2">
                          {svc.description}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-cardBorder">
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-textSecondary">
                            {svc.category}
                          </span>
                          <span className="text-xs font-semibold text-statusGreen dark:text-green-400 whitespace-nowrap">
                            {svc.monthly === 0 ? 'Sin costo' : `${money(svc.monthly)}/mes`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {visibleServices.length === 0 && (
                  <p className="text-sm text-textSecondary text-center py-10">
                    No hay servicios disponibles en esta categoría.
                  </p>
                )}

                {/* ---------- USUARIOS ESTIMADOS + IMPACTO EN COSTO ---------- */}
                <div className="mt-7 p-5 rounded-xl border border-cardBorder bg-gray-50 dark:bg-slate-800/60">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                    <div>
                      <label className="block text-sm font-medium text-textMain mb-2">
                        Usuarios Estimados
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formData.estimatedUsers}
                        onChange={(e) => updateForm({ estimatedUsers: e.target.value })}
                        placeholder="Ej. 25000"
                        className="w-full px-4 py-3 border border-cardBorder rounded-lg bg-white dark:bg-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                      <p className="text-xs text-textSecondary mt-2 leading-relaxed">
                        El numero de usuarios define el consumo estimado y escala proporcionalmente
                        el costo mensual de los servicios seleccionados.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-cardBorder text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                          Costo base
                        </p>
                        <p className="text-sm font-bold text-textMain mt-1 font-mono">
                          {money(liveBaseTotal)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                          Multiplicador
                        </p>
                        <p className="text-sm font-bold text-primary dark:text-blue-400 mt-1 font-mono">
                          ×{liveUserMult.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                          Costo estimado
                        </p>
                        <p className="text-sm font-bold text-statusGreen dark:text-green-400 mt-1 font-mono">
                          {money(liveMonthly)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-cardBorder">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Atras
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Siguiente
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ===== PASO 3: RED Y TOPOLOGIA ===== */}
            {step === 3 && (
              <div className="p-6 space-y-6">
                {/* Diagrama esquematico */}
                <div className="p-4 rounded-xl border border-cardBorder bg-gray-50 dark:bg-slate-800/60">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-textSecondary mb-3">
                    Vista esquematica de la topologia
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <div className="flex-1 p-3 rounded-lg border-2 border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10 text-center">
                      <p className="text-xs font-bold text-primary dark:text-blue-400">VPC</p>
                      <p className="text-[11px] text-textSecondary font-mono mt-0.5">{network.vpcCidr}</p>
                    </div>
                    <ChevronRight size={16} className="hidden sm:block text-textSecondary shrink-0 rotate-90 sm:rotate-0" />
                    <div className="flex-1 grid grid-cols-3 gap-1.5">
                      {Array.from({ length: network.availabilityZones }).map((_, i) => (
                        <div
                          key={i}
                          className="p-2 rounded border border-green-300 dark:border-green-500/40 bg-green-50 dark:bg-green-500/10 text-center"
                        >
                          <p className="text-[10px] font-bold text-statusGreen dark:text-green-400">AZ-{i + 1}</p>
                        </div>
                      ))}
                    </div>
                    <ChevronRight size={16} className="hidden sm:block text-textSecondary shrink-0 rotate-90 sm:rotate-0" />
                    <div className="flex-1 grid grid-cols-2 gap-1.5">
                      <div className="p-2 rounded border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-center">
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          Públicas: {network.publicSubnets}
                        </p>
                      </div>
                      <div className="p-2 rounded border border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-center">
                        <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                          Privadas: {network.privateSubnets}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">Bloque CIDR de la VPC</label>
                    <select
                      value={network.vpcCidr}
                      onChange={(e) => setNetwork((prev) => ({ ...prev, vpcCidr: e.target.value }))}
                      className="w-full px-4 py-3 border border-cardBorder rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono text-sm"
                    >
                      <option value="10.0.0.0/16">10.0.0.0/16</option>
                      <option value="172.16.0.0/16">172.16.0.0/16</option>
                      <option value="192.168.0.0/16">192.168.0.0/16</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">Zonas de Disponibilidad</label>
                    <div className="flex gap-2">
                      {[2, 3, 4].map((az) => (
                        <button
                          key={az}
                          type="button"
                          onClick={() =>
                            setNetwork((prev) => ({
                              ...prev,
                              availabilityZones: az,
                              publicSubnets: Math.max(prev.publicSubnets, az),
                              natGateways: Math.min(prev.natGateways, az),
                            }))
                          }
                          className={`flex-1 py-3 rounded-lg border-2 text-sm font-bold transition-all ${
                            network.availabilityZones === az
                              ? 'border-primary bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400'
                              : 'border-cardBorder text-textMain hover:border-blue-300 dark:hover:border-blue-500/50'
                          }`}
                        >
                          {az} AZ
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">Subredes Publicas</label>
                    <select
                      value={network.publicSubnets}
                      onChange={(e) => setNetwork((prev) => ({ ...prev, publicSubnets: Number(e.target.value) }))}
                      className="w-full px-4 py-3 border border-cardBorder rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} subred{ n === 1 ? '' : 'es'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">Subredes Privadas</label>
                    <select
                      value={network.privateSubnets}
                      onChange={(e) => setNetwork((prev) => ({ ...prev, privateSubnets: Number(e.target.value) }))}
                      className="w-full px-4 py-3 border border-cardBorder rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} subred{ n === 1 ? '' : 'es'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">NAT Gateways</label>
                    <select
                      value={network.natGateways}
                      onChange={(e) => setNetwork((prev) => ({ ...prev, natGateways: Number(e.target.value) }))}
                      className="w-full px-4 py-3 border border-cardBorder rounded-lg dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    >
                      {[0, 1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>{n} nat{n === 1 ? '' : 's'} · {money(n * NAT_GATEWAY_COST)}/mes</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">Costo de red estimado</label>
                    <div className="px-4 py-3 rounded-lg border border-cardBorder bg-gray-50 dark:bg-slate-800/70 text-sm font-semibold text-textMain">
                      {money(
                        round2(
                          (network.natGateways * NAT_GATEWAY_COST +
                            NETWORK_ADDONS.reduce((sum, a) => sum + (network[a.key] ? a.cost : 0), 0)) *
                            (REGION_MULTIPLIERS[formData.region] ?? 1)
                        )
                      )}
                      <span className="text-textSecondary font-normal"> /mes</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-textSecondary mb-3">
                    Componentes de red opcionales
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {NETWORK_ADDONS.map((addon) => {
                      const active = network[addon.key];
                      return (
                        <button
                          key={addon.key}
                          type="button"
                          onClick={() =>
                            setNetwork((prev) => {
                              const next = { ...prev };
                              next[addon.key] = !prev[addon.key];
                              return next;
                            })
                          }
                          className={`text-left p-4 rounded-xl border-2 transition-all ${
                            active
                              ? 'border-primary bg-blue-50 dark:bg-blue-500/10 shadow-sm'
                              : 'border-cardBorder hover:border-blue-300 dark:hover:border-blue-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-sm font-bold text-textMain">{addon.title}</span>
                            <span
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                active ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-600'
                              }`}
                            >
                              <span
                                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow"
                                style={{ transform: active ? 'translateX(18px)' : 'translateX(2px)' }}
                              />
                            </span>
                          </div>
                          <p className="text-xs text-textSecondary leading-relaxed">{addon.desc}</p>
                          <p className="text-xs font-semibold text-statusGreen dark:text-green-400 mt-1.5">
                            {money(addon.cost)}/mes (base)
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-5 border-t border-cardBorder">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Atras
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Revisar resumen
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ===== PASO 4: RESUMEN Y REPORTE ===== */}
            {step === 4 && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-cardBorder bg-gray-50 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                        Parametros del Proyecto
                      </p>
                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="text-xs font-semibold text-primary dark:text-blue-400 hover:underline"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-textMain">{formData.solutionName || '—'}</p>
                    <p className="text-xs text-textSecondary mt-1">
                      {appTypeLabels[formData.applicationType] || 'Sin tipo definido'} · {formData.region}
                    </p>
                    <p className="text-xs text-textSecondary mt-1">
                      {formData.estimatedUsers || '0'} usuarios estimados
                    </p>
                    <p className="text-xs text-textSecondary mt-1">
                      Multiplicador de consumo estimado:{' '}
                      <span className="font-semibold text-textMain">
                        ×{usersMultiplier(formData.estimatedUsers).toFixed(2)}
                      </span>
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-cardBorder bg-gray-50 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                        SLA Objetivo
                      </p>
                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="text-xs font-semibold text-primary dark:text-blue-400 hover:underline"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-textMain">{selectedSla?.pct ?? '—'}</p>
                    <p className="text-xs text-textSecondary mt-1">{selectedSla?.name ?? ''}</p>
                    <p className="text-xs text-textSecondary mt-1">{selectedSla?.detail ?? ''}</p>
                  </div>

                  <div className="p-4 rounded-xl border border-cardBorder bg-gray-50 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                        Servicios Seleccionados
                      </p>
                      <button
                        type="button"
                        onClick={() => goToStep(2)}
                        className="text-xs font-semibold text-primary dark:text-blue-400 hover:underline"
                      >
                        Editar
                      </button>
                    </div>
                    {formData.awsServices.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {formData.awsServices.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 bg-primary/10 dark:bg-blue-500/15 text-primary dark:text-blue-400 text-[11px] font-semibold rounded-md"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-textSecondary">Ninguno seleccionado</p>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border border-cardBorder bg-gray-50 dark:bg-slate-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">
                        Red y Topologia
                      </p>
                      <button
                        type="button"
                        onClick={() => goToStep(3)}
                        className="text-xs font-semibold text-primary dark:text-blue-400 hover:underline"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="text-xs text-textMain font-mono">{network.vpcCidr}</p>
                    <p className="text-xs text-textSecondary mt-1">
                      {network.availabilityZones} AZ · {network.publicSubnets} públicas · {network.privateSubnets} privadas · {network.natGateways} NAT
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {NETWORK_ADDONS.filter((a) => network[a.key]).map((a) => (
                        <span
                          key={a.key}
                          className="px-2 py-0.5 bg-green-500/10 text-statusGreen dark:text-green-400 text-[10px] font-semibold rounded-md"
                        >
                          {a.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10">
                  <div className="flex items-start gap-2.5">
                    <Info size={16} className="shrink-0 mt-0.5 text-primary dark:text-blue-400" />
                    <p className="text-xs text-textSecondary leading-relaxed">
                      Al generar el reporte se calculará una estimación de TCO y una evaluación del{' '}
                      <span className="font-semibold text-textMain">AWS Well-Architected Framework</span>{' '}
                      basada en las decisiones de este asistente. Todos los valores son simulados con fines
                      de planeación.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 border-t border-cardBorder">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Atras
                  </button>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleGenerateReport}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                    >
                      <FileText size={16} />
                      Generar Reporte Arquitectonico
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ---------- MODAL: REPORTE / ENTREGABLE ---------- */}
      {report && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8 print:p-0">
          <div
            className="fixed inset-0 bg-black/60 print:hidden"
            onClick={() => setReport(null)}
          />

          <article
            id="printable-report"
            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-cardBorder print:rounded-none print:shadow-none print:border-none"
          >
            {/* Toolbar (no imprime) */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-cardBorder print:hidden">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/15 shrink-0">
                  <FileText size={18} className="text-primary dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-textMain truncate">Vista previa del entregable</p>
                  <p className="text-xs text-textSecondary truncate">Folio {report.folio}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Printer size={15} />
                  <span className="hidden sm:inline">Imprimir / Exportar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
                <button
                  onClick={() => setReport(null)}
                  aria-label="Cerrar reporte"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={18} className="text-textSecondary" />
                </button>
              </div>
            </div>

            {/* Documento */}
            <div className="p-6 md:p-10 space-y-8">
              {/* Encabezado del documento */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b-2 border-slate-800 dark:border-slate-600">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#232F3E] flex items-center justify-center shrink-0">
                    <Cloud size={22} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary dark:text-blue-400">
                      CloudOps Dashboard
                    </p>
                    <h2 className="text-xl font-extrabold text-textMain leading-tight">
                      Entregable de Consultoria Cloud
                    </h2>
                    <p className="text-sm text-textSecondary">Reporte Arquitectonico de Solucion en AWS</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-textSecondary">Folio</p>
                  <p className="text-sm font-mono font-bold text-textMain">{report.folio}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-textSecondary mt-1.5">Emision</p>
                  <p className="text-xs text-textSecondary">{report.generatedAt}</p>
                </div>
              </div>

              {/* 1. Metadatos */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary text-white text-xs flex items-center justify-center">1</span>
                  Metadatos del Proyecto
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Solucion', value: report.plan.solutionName || '—' },
                    { label: 'Tipo de Aplicacion', value: appTypeLabels[report.plan.applicationType] || '—' },
                    { label: 'Region', value: report.plan.region },
                    { label: 'Usuarios Estimados', value: report.plan.estimatedUsers || '0' },
                    { label: 'SLA Objetivo', value: availabilityOptions.find((o) => o.value === report.plan.availabilityLevel)?.pct ?? '—' },
                    { label: 'Servicios', value: `${report.plan.awsServices.length} seleccionados` },
                    { label: 'Topologia', value: `${report.network.availabilityZones} AZ / ${report.network.publicSubnets}+${report.network.privateSubnets} subredes` },
                    { label: 'Estado', value: 'Borrador tecnico' },
                  ].map((meta) => (
                    <div key={meta.label} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-cardBorder">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">{meta.label}</p>
                      <p className="text-xs font-semibold text-textMain mt-1 break-words">{meta.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 2. Resumen ejecutivo */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary text-white text-xs flex items-center justify-center">2</span>
                  Resumen Ejecutivo
                </h3>
                {report.plan.migrationGoal ? (
                  <>
                    <p className="text-xs font-bold uppercase tracking-wider text-textSecondary mb-1">
                      Objetivo de migracion
                    </p>
                    <p className="text-sm text-textSecondary leading-relaxed">{report.plan.migrationGoal}</p>
                  </>
                ) : (
                  <p className="text-sm text-textSecondary leading-relaxed">
                    No se registro un objetivo de migracion para esta solucion.
                  </p>
                )}
              </section>

              {/* 3. Servicios */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary text-white text-xs flex items-center justify-center">3</span>
                  Servicios Cloud Seleccionados
                </h3>
                <div className="overflow-x-auto border border-cardBorder rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Servicio</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Categoria</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Costo base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.tcoLines.map((line) => (
                        <tr key={line.name} className="border-t border-cardBorder">
                          <td className="px-4 py-2.5 font-medium text-textMain">{line.name}</td>
                          <td className="px-4 py-2.5 text-textSecondary">{line.category}</td>
                          <td className="px-4 py-2.5 text-textSecondary font-mono">{money(line.base)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 4. TCO */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary text-white text-xs flex items-center justify-center">4</span>
                  Estimacion de Costos (TCO)
                </h3>

                <p className="text-xs text-textSecondary leading-relaxed mb-3">
                  El costo ajustado aplica un factor proporcional de consumo segun los{' '}
                  <span className="font-semibold text-textMain">
                    {report.plan.estimatedUsers || '0'} usuarios estimados
                  </span>{' '}
                  (×{report.userMult.toFixed(2)}) y un factor de region (×{report.regionMult.toFixed(2)}) sobre el
                  costo base de cada componente.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Mensual</p>
                    <p className="text-base font-bold text-primary dark:text-blue-400 mt-0.5">{money(report.monthlyTotal)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Anual</p>
                    <p className="text-base font-bold text-statusGreen dark:text-green-400 mt-0.5">{money(report.annualTotal)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-cardBorder text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Region</p>
                    <p className="text-sm font-bold text-textMain mt-1">{report.plan.region}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-cardBorder text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Usuarios</p>
                    <p className="text-sm font-bold text-textMain mt-1">{report.plan.estimatedUsers || '0'}</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-cardBorder rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Componente</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Costo base</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">
                          Factor usuarios
                        </th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Ajustado (USD/mes)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.tcoLines.map((line) => (
                        <tr key={line.name} className="border-t border-cardBorder">
                          <td className="px-4 py-2.5 font-medium text-textMain">{line.name}</td>
                          <td className="px-4 py-2.5 text-textSecondary font-mono">{money(line.base)}</td>
                          <td className="px-4 py-2.5 text-textSecondary font-mono">×{report.userMult.toFixed(2)}</td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-textMain">{money(line.adjusted)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-400 dark:border-slate-600 bg-gray-50 dark:bg-slate-800">
                        <td className="px-4 py-2.5 font-bold text-textMain">Total mensual</td>
                        <td className="px-4 py-2.5" />
                        <td className="px-4 py-2.5" />
                        <td className="px-4 py-2.5 font-mono font-bold text-primary dark:text-blue-400">
                          {money(report.monthlyTotal)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50 dark:bg-slate-800">
                        <td className="px-4 py-2.5 font-bold text-textMain">Total anual proyectado</td>
                        <td className="px-4 py-2.5" />
                        <td className="px-4 py-2.5" />
                        <td className="px-4 py-2.5 font-mono font-bold text-statusGreen dark:text-green-400">
                          {money(report.annualTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-textSecondary mt-2 flex items-center gap-1.5">
                  <Info size={12} className="shrink-0" />
                  Valores simulados: precio de referencia us-east-1 ajustado por región y volumen de usuarios.
                </p>
              </section>

              {/* 5. Well-Architected */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary text-white text-xs flex items-center justify-center">5</span>
                  Evaluacion AWS Well-Architected Framework
                </h3>

                <div className="flex items-center gap-4 p-4 mb-4 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-cardBorder">
                  <div className="relative shrink-0">
                    <Gauge size={44} className="text-primary dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Puntuacion global</p>
                    <p className="text-2xl font-extrabold text-textMain">{report.overallScore}/100</p>
                  </div>
                  <div className="flex-1 hidden sm:block">
                    <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          report.overallScore >= 85 ? 'bg-statusGreen' : report.overallScore >= 70 ? 'bg-statusAmber' : 'bg-statusRed'
                        }`}
                        style={{ width: `${report.overallScore}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-cardBorder rounded-lg">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Pilar</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Puntuacion</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Estado</th>
                        <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.pillars.map((p) => (
                        <tr key={p.pillar} className="border-t border-cardBorder align-top">
                          <td className="px-4 py-3 font-semibold text-textMain whitespace-nowrap">{p.pillar}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-textMain text-xs">{p.score}/100</span>
                              <span className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden inline-block">
                                <span className={`block h-full ${statusBarClass(p.status)}`} style={{ width: `${p.score}%` }} />
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${statusChipClass(p.status)}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-textSecondary leading-relaxed">{p.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 6. Notas */}
              <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-primary text-white text-xs flex items-center justify-center">6</span>
                  Notas y Aprobacion
                </h3>
                <p className="text-xs text-textSecondary leading-relaxed">
                  Documento generado automaticamente por CloudOps Dashboard. Las estimaciones de costo y la
                  evaluacion del Well-Architected Framework son simuladas con fines de planeacion y no
                  sustituyen una revision formal del equipo de arquitectura de AWS. Valide los importes en el
                  calculador oficial de costos antes de comprometer presupuesto.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">
                  <div>
                    <div className="border-t border-dashed border-slate-400 dark:border-slate-600 pt-2">
                      <p className="text-xs font-semibold text-textMain">Arquitecto de Soluciones Cloud</p>
                      <p className="text-[11px] text-textSecondary">Firma y fecha</p>
                    </div>
                  </div>
                  <div>
                    <div className="border-t border-dashed border-slate-400 dark:border-slate-600 pt-2">
                      <p className="text-xs font-semibold text-textMain">Revisor Tecnico</p>
                      <p className="text-[11px] text-textSecondary">Firma y fecha</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="pt-4 border-t border-cardBorder flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-[11px] text-textSecondary">
                  Folio {report.folio} · {report.generatedAt} · CloudOps Dashboard
                </p>
                <div className="flex items-center gap-3 print:hidden">
                  <button
                    onClick={() => setReport(null)}
                    className="px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Printer size={15} />
                    Imprimir / PDF
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  );
}

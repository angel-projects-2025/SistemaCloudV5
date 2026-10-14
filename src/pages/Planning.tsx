import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Header } from '../components/Header';
import { usePlanning } from '../context/PlanningContext';
import { SERVICES } from '../lib/planningCatalog';
import type { CloudPlan, NetworkPlan, SavedPlanning, ServiceCategory } from '../lib/planningCatalog';
import { buildPillars } from '../lib/wellArchitected';
import { buildDefaultCostLines } from '../lib/costEngine';
import type { PillarEval, PillarStatus } from '../lib/wellArchitected';
import {
  X, CheckCircle, ChevronLeft, ChevronRight, ChevronDown, Save, Eye, Trash2,
  ClipboardList, FileText, Printer, Gauge, Info, Cloud, Cpu, Zap,
  Container, Boxes, HardDrive, Database, Network, Globe, Layers, Shield,
} from 'lucide-react';

interface ReportData {
  folio: string;
  generatedAt: string;
  plan: CloudPlan;
  network: NetworkPlan;
  pillars: PillarEval[];
  overallScore: number;
}

const STEPS = [
  { id: 1, title: 'Parámetros del Proyecto', short: 'Proyecto' },
  { id: 2, title: 'Selección de Servicios Cloud', short: 'Servicios' },
  { id: 3, title: 'Red y Topología', short: 'Red' },
];

const availabilityOptions = [
  { value: '99.0%', pct: '99.0%', name: 'Básico', detail: '2 nueves · Max ~3.65 días de inactividad / año' },
  { value: '99.9%', pct: '99.9%', name: 'Alta Disponibilidad Estándar', detail: '3 nueves · Max ~8.76 hrs de inactividad / año' },
  { value: '99.99%', pct: '99.99%', name: 'Misión Crítica Enterprise', detail: '4 nueves · Max ~52.6 min de inactividad / año' },
  { value: '99.999%', pct: '99.999%', name: 'Tolerancia a Fallos Crítica', detail: '5 nueves · Max ~5.26 min de inactividad / año' },
];
const appTypeLabels: Record<string, string> = {
  web: 'Aplicación Web', mobile: 'Aplicación Móvil',
  api: 'API / Microservicios', data: 'Procesamiento de Datos',
};

interface SelectOption { value: string; label: string }
interface SelectGroup { label: string; options: SelectOption[] }
const REGION_GROUPS: SelectGroup[] = [
  { label: 'Norteamérica', options: [
    { value: 'us-east-1', label: 'US East (N. Virginia) us-east-1' },
    { value: 'us-east-2', label: 'US East (Ohio) us-east-2' },
    { value: 'us-west-1', label: 'US West (N. California) us-west-1' },
    { value: 'us-west-2', label: 'US West (Oregon) us-west-2' },
    { value: 'ca-central-1', label: 'Canada (Central) ca-central-1' },
    { value: 'ca-west-1', label: 'Canada West (Calgary) ca-west-1' },
    { value: 'mx-central-1', label: 'Mexico (Central) mx-central-1' },
  ] },
  { label: 'Sudamérica', options: [
    { value: 'sa-east-1', label: 'South America (São Paulo) sa-east-1' },
  ] },
  { label: 'Europa', options: [
    { value: 'eu-west-1', label: 'Europe (Ireland) eu-west-1' },
    { value: 'eu-west-2', label: 'Europe (London) eu-west-2' },
    { value: 'eu-west-3', label: 'Europe (Paris) eu-west-3' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt) eu-central-1' },
    { value: 'eu-central-2', label: 'Europe (Zurich) eu-central-2' },
    { value: 'eu-north-1', label: 'Europe (Stockholm) eu-north-1' },
    { value: 'eu-south-1', label: 'Europe (Milan) eu-south-1' },
    { value: 'eu-south-2', label: 'Europe (Spain) eu-south-2' },
  ] },
  { label: 'África', options: [
    { value: 'af-south-1', label: 'Africa (Cape Town) af-south-1' },
  ] },
  { label: 'Asia Pacífico', options: [
    { value: 'ap-east-1', label: 'Asia Pacific (Hong Kong) ap-east-1' },
    { value: 'ap-east-2', label: 'Asia Pacific (Taipei) ap-east-2' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai) ap-south-1' },
    { value: 'ap-south-2', label: 'Asia Pacific (Hyderabad) ap-south-2' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore) ap-southeast-1' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney) ap-southeast-2' },
    { value: 'ap-southeast-3', label: 'Asia Pacific (Jakarta) ap-southeast-3' },
    { value: 'ap-southeast-4', label: 'Asia Pacific (Melbourne) ap-southeast-4' },
    { value: 'ap-southeast-5', label: 'Asia Pacific (Malaysia) ap-southeast-5' },
    { value: 'ap-southeast-6', label: 'Asia Pacific (New Zealand) ap-southeast-6' },
    { value: 'ap-southeast-7', label: 'Asia Pacific (Thailand) ap-southeast-7' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo) ap-northeast-1' },
    { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul) ap-northeast-2' },
    { value: 'ap-northeast-3', label: 'Asia Pacific (Osaka) ap-northeast-3' },
  ] },
];
const MIGRATION_GOALS = ['Rehosting (Lift & Shift)', 'Replatforming', 'Refactoring', 'Modernización de Datos'];
const SERVICE_ICONS: Record<string, typeof Cpu> = {
  EC2: Cpu, Lambda: Zap, ECS: Container, EKS: Boxes, S3: HardDrive,
  RDS: Database, VPC: Network, 'Route 53': Globe, CloudFront: Layers, IAM: Shield,
};
const SERVICE_CATEGORIES: ServiceCategory[] = ['Cómputo', 'Serverless', 'Contenedores', 'Almacenamiento', 'Bases de datos', 'Redes', 'Seguridad'];
const NETWORK_ADDONS = [
  { key: 'enableWaf' as const, title: 'AWS WAF', desc: 'Firewall de aplicación para filtrar tráfico malicioso.' },
  { key: 'enableFlowLogs' as const, title: 'VPC Flow Logs', desc: 'Registro de tráfico IP para auditoría y diagnóstico.' },
  { key: 'enableTransit' as const, title: 'Transit Gateway', desc: 'Hub de red para conectar VPCs y redes on-premise.' },
];
const DEFAULT_NETWORK: NetworkPlan = {
  vpcCidr: '10.0.0.0/16', availabilityZones: 3, publicSubnets: 3,
  privateSubnets: 3, natGateways: 2, enableWaf: true, enableFlowLogs: true, enableTransit: false,
};

const fieldClass = 'w-full px-4 py-3 border border-cardBorder rounded-lg bg-white dark:bg-slate-800 text-textMain focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all';
const backClass = 'flex items-center justify-center gap-2 px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors';
const primaryClass = 'flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm';

// Portal: el menú siempre se coloca debajo, fuera de cualquier contenedor recortado.
function DownSelect({ id, value, groups, onChange, placeholder = 'Seleccionar...' }: {
  id: string; value: string; groups: SelectGroup[]; onChange: (value: string) => void; placeholder?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 280 });
  const options = groups.flatMap((group) => group.options);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (rect) setPosition({ top: rect.bottom + 6, left: rect.left, width: rect.width, height: Math.max(40, Math.min(280, window.innerHeight - rect.bottom - 18)) });
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const toggle = () => {
    if (!open && trigger.current) {
      const rect = trigger.current.getBoundingClientRect();
      if (window.innerHeight - rect.bottom < 260) trigger.current.scrollIntoView({ block: 'center' });
      const next = trigger.current.getBoundingClientRect();
      setPosition({ top: next.bottom + 6, left: next.left, width: next.width, height: Math.max(40, Math.min(280, window.innerHeight - next.bottom - 18)) });
    }
    setOpen(!open);
  };

  return <>
    <button ref={trigger} id={id} type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`}
      onClick={toggle} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); if (!open) toggle(); requestAnimationFrame(() => menu.current?.querySelector<HTMLButtonElement>('button')?.focus()); } }}
      className={`${fieldClass} flex items-center justify-between gap-2 text-left text-sm`}>
      <span className="min-w-0 break-words">{selected?.label ?? placeholder}</span><ChevronDown size={16} className="shrink-0 text-textSecondary" />
    </button>
    {open && createPortal(
      <div ref={menu} id={`${id}-options`} role="listbox" aria-labelledby={id}
        className="fixed z-[60] overflow-y-auto rounded-lg border border-cardBorder bg-white dark:bg-slate-900 shadow-xl p-1"
        style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.height }}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
        }}>
        {groups.map((group) => <div key={group.label} role="group" aria-label={group.label}>
          {group.label && <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-textSecondary">{group.label}</p>}
          {group.options.map((option) => <button type="button" role="option" aria-selected={option.value === value} key={option.value}
            onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}
            className={`w-full px-3 py-2 text-left text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${option.value === value ? 'bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400' : 'text-textMain hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
            {option.label}
          </button>)}
        </div>)}
      </div>, document.body,
    )}
  </>;
}

function validateStep(step: number, plan: CloudPlan, network: NetworkPlan): string[] {
  const errors: string[] = [];
  if (step === 1) {
    if (!plan.solutionName.trim()) errors.push('Indique un nombre para la solución.');
    if (!plan.applicationType) errors.push('Seleccione el tipo de aplicación.');
    if (!plan.region) errors.push('Seleccione una región.');
  }
  if (step === 2) {
    if (!plan.awsServices.length) errors.push('Seleccione al menos un servicio cloud.');
    const users = Number(plan.estimatedUsers);
    if (!Number.isInteger(users) || users < 10 || users > 10000) errors.push('Seleccione entre 10 y 10,000 usuarios concurrentes.');
  }
  if (step === 3) {
    if (network.publicSubnets < network.availabilityZones) errors.push('Debe haber al menos una subred pública por cada Zona de Disponibilidad.');
    if (network.natGateways > network.availabilityZones) errors.push('Los NAT Gateways no pueden superar el número de Zonas de Disponibilidad.');
    if (network.privateSubnets > 0 && network.natGateways === 0) errors.push('Las subredes privadas requieren al menos un NAT Gateway para salir a Internet.');
  }
  return errors;
}

function statusChipClass(status: PillarStatus) {
  if (status === 'Conforme') return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30';
  if (status === 'En revisión') return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30';
  return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
}

export function Planning() {
  const { savedPlannings, activePlanning, setActivePlanningId, savePlanning, updatePlanning, deletePlanning } = usePlanning();
  const [viewingPlanningId, setViewingPlanningId] = useState<string | null>(null);
  const [editingPlanningId, setEditingPlanningId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [maxReached, setMaxReached] = useState(1);
  const [errors, setErrors] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | ServiceCategory>('Todas');
  const [formData, setFormData] = useState<CloudPlan>({
    solutionName: '', applicationType: '', region: '', estimatedUsers: '',
    availabilityLevel: '99.9%', awsServices: ['IAM'], migrationGoal: '',
  });
  const [network, setNetwork] = useState<NetworkPlan>({ ...DEFAULT_NETWORK });
  const [report, setReport] = useState<ReportData | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [goalText, setGoalText] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const goalInput = useRef<HTMLTextAreaElement>(null);
  const wizard = useRef<HTMLDivElement>(null);

  const updateForm = (partial: Partial<CloudPlan>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
    setSaveMessage('');
  };
  const updateNetwork = (partial: Partial<NetworkPlan>) => {
    setNetwork((prev) => ({ ...prev, ...partial }));
    setSaveMessage('');
  };
  const updateGoals = (goals: string[], text: string) => {
    setSelectedGoals(goals);
    setGoalText(text);
    updateForm({ migrationGoal: [...goals, text.trim()].filter(Boolean).join(' · ') });
  };
  const toggleService = (id: string) => {
    if (id === 'IAM') return;
    updateForm({ awsServices: formData.awsServices.includes(id) ? formData.awsServices.filter((service) => service !== id) : [...formData.awsServices, id] });
  };
  const goToStep = (target: number) => { if (target <= maxReached) { setErrors([]); setStep(target); } };
  const handleNext = (event?: FormEvent) => {
    event?.preventDefault();
    const nextErrors = validateStep(step, formData, network);
    setErrors(nextErrors);
    if (nextErrors.length) return;
    const next = Math.min(3, step + 1);
    setStep(next);
    setMaxReached((prev) => Math.max(prev, next));
  };
  const handleBack = () => { setErrors([]); setStep((prev) => Math.max(1, prev - 1)); };
  const validatePlan = () => {
    for (const phase of [1, 2, 3]) {
      const nextErrors = validateStep(phase, formData, network);
      if (nextErrors.length) { setStep(phase); setErrors(nextErrors); return false; }
    }
    setErrors([]);
    return true;
  };
  const handleSave = async () => {
    if (saving.current || !validatePlan()) return;
    saving.current = true;
    setIsSaving(true);
    try {
      if (editingPlanningId) {
        if (activePlanning?.id !== editingPlanningId) throw new Error('La planificación activa cambió. Vuelve a abrir la planificación para modificarla.');
        const removed = activePlanning.plan.awsServices.filter((id) => id !== 'IAM' && !formData.awsServices.includes(id));
        const lines = activePlanning.costLines ?? buildDefaultCostLines(activePlanning.plan.awsServices);
        if (removed.length && !window.confirm(removed.map((id) => `Quitar ${id} eliminará sus ${lines.filter((line) => line.planningServiceId === id).length} recursos de Costos.`).join('\n'))) return;
        await updatePlanning(editingPlanningId, {
          plan: formData, network, selectedGoals, goalText,
        });
        setHistoryError('');
        setSaveMessage('Planificación guardada correctamente.');
        return;
      }
      const entry: SavedPlanning = {
        id: crypto.randomUUID(),
        savedAt: new Date().toISOString(),
        plan: { ...formData, awsServices: [...formData.awsServices] },
        network: { ...network },
        selectedGoals: [...selectedGoals],
        goalText,
      };
      const saved = await savePlanning(entry);
      setEditingPlanningId(saved.id);
      setHistoryError('');
      setSaveMessage('Planificación guardada correctamente.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'No se pudo guardar la planificación.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };
  const handleViewPlanning = (entry: SavedPlanning) => {
    setViewingPlanningId(entry.id);
  };
  const handleModifyPlanning = async (entry: SavedPlanning) => {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    try {
      await setActivePlanningId(entry.id);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'No se pudo seleccionar la planificación.');
      return;
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
    setEditingPlanningId(entry.id);
    setViewingPlanningId(null);
    setFormData({ ...entry.plan, awsServices: [...entry.plan.awsServices] });
    setNetwork({ ...entry.network });
    setSelectedGoals([...entry.selectedGoals]);
    setGoalText(entry.goalText);
    setCategoryFilter('Todas');
    setMaxReached(3);
    setStep(1);
    setErrors([]);
    setSaveMessage('');
    setReport(null);
    wizard.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const cancelPlanningEdit = () => {
    setEditingPlanningId(null);
    setFormData({ solutionName: '', applicationType: '', region: '', estimatedUsers: '', availabilityLevel: '99.9%', awsServices: ['IAM'], migrationGoal: '' });
    setNetwork({ ...DEFAULT_NETWORK });
    setSelectedGoals([]);
    setGoalText('');
    setCategoryFilter('Todas');
    setStep(1);
    setMaxReached(1);
    setErrors([]);
    setSaveMessage('');
    setReport(null);
  };
  const handleDeletePlanning = async (id: string) => {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    try {
      await deletePlanning(id);
      if (editingPlanningId === id) cancelPlanningEdit();
      if (viewingPlanningId === id) setViewingPlanningId(null);
      setHistoryError('');
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'No se pudo borrar la planificación.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };
  const handleGenerateReport = () => {
    if (!validatePlan()) return;
    const evaluation = buildPillars(formData.awsServices, network);
    setReport({
      folio: `CW-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
      generatedAt: new Date().toLocaleString('es-ES'),
      plan: { ...formData, awsServices: [...formData.awsServices] }, network: { ...network },
      pillars: evaluation.pillars, overallScore: evaluation.overall,
    });
  };
  const visibleServices = categoryFilter === 'Todas' ? SERVICES : SERVICES.filter((service) => service.category === categoryFilter);
  const selectedServices = SERVICES.filter((service) => formData.awsServices.includes(service.id));
  const regionLabel = REGION_GROUPS.flatMap((group) => group.options).find((option) => option.value === formData.region)?.label;
  const networkDefined = maxReached >= 3;
  const viewedPlanning = savedPlannings.find((entry) => entry.id === viewingPlanningId);

  return <>
    <Header title="Planificacion Cloud" />
    <main className="p-4 md:p-8 bg-background min-h-screen">
      <div ref={wizard} className="max-w-7xl mx-auto scroll-mt-6">
        {editingPlanningId && <div className="flex flex-wrap items-center justify-between gap-3 mb-5 p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
          <p className="text-sm font-semibold text-textMain">Editando: {savedPlannings.find((entry) => entry.id === editingPlanningId)?.plan.solutionName ?? formData.solutionName}</p>
          <button type="button" disabled={isSaving} onClick={cancelPlanningEdit} className={backClass}><X size={16} />Cancelar edición</button>
        </div>}
        <div className="bg-[#232F3E] dark:bg-slate-950 border border-slate-700/50 rounded-xl shadow-md overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3 border-b border-slate-700/60">
            <ClipboardList size={16} className="text-amber-400 shrink-0" />
            <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">Asistente de Diseño de Arquitectura Cloud</span>
          </div>
          <ol className="flex items-start px-3 sm:px-6 py-5">
            {STEPS.map((phase, index) => {
              const active = step === phase.id;
              const done = phase.id < maxReached && !active;
              return <li key={phase.id} className="flex-1 flex items-start">
                <button type="button" onClick={() => goToStep(phase.id)} disabled={phase.id > maxReached}
                  className="flex flex-col items-center gap-2 px-2 sm:px-3 flex-1 disabled:cursor-not-allowed">
                  <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${active ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30' : done ? 'bg-green-600/15 border-green-500 text-green-400' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                    {done ? <CheckCircle size={17} /> : phase.id}
                  </span>
                  <span className={`text-[11px] sm:text-xs font-semibold text-center leading-tight ${active ? 'text-white' : done ? 'text-slate-300' : 'text-slate-500'}`}>
                    <span className="sm:hidden">{phase.short}</span><span className="hidden sm:block">{phase.title}</span>
                  </span>
                </button>
                {index < STEPS.length - 1 && <div className={`hidden sm:block h-0.5 w-full max-w-24 mt-4 -mx-2 rounded ${phase.id < step ? 'bg-green-500/70' : 'bg-slate-700'}`} />}
              </li>;
            })}
          </ol>
          <div className="h-1.5 bg-slate-800"><div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500" style={{ width: `${Math.round(step / 3 * 100)}%` }} /></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] gap-6 mt-6 items-start">
          <div className="min-w-0 bg-white dark:bg-slate-900 border border-cardBorder rounded-xl shadow-sm">
            <div className="px-6 py-4 border-b border-cardBorder bg-gray-50 dark:bg-slate-800/60 rounded-t-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary dark:text-blue-400">Fase {step} de 3</p>
              <h3 className="text-lg font-semibold text-textMain mt-0.5">{STEPS[step - 1].title}</h3>
            </div>
            {!!errors.length && <div role="alert" className="mx-6 mt-5 flex items-start gap-2.5 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-4 py-3">
              <Info size={16} className="shrink-0 mt-0.5" /><ul className="list-disc list-inside space-y-0.5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>}

            {/* ===== FASE 1: PARÁMETROS DEL PROYECTO ===== */}
            {step === 1 && <form onSubmit={handleNext} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label htmlFor="solution-name" className="block text-sm font-medium text-textMain mb-2">Nombre de la Solución</label>
                  <input id="solution-name" value={formData.solutionName} onChange={(event) => updateForm({ solutionName: event.target.value })} placeholder="Ej. Portal Clientes Bancarios" className={fieldClass} />
                </div>
                <div><label htmlFor="application-type" className="block text-sm font-medium text-textMain mb-2">Tipo de Aplicación</label>
                  <DownSelect id="application-type" value={formData.applicationType} onChange={(applicationType) => updateForm({ applicationType })} groups={[{ label: '', options: Object.entries(appTypeLabels).map(([value, label]) => ({ value, label })) }]} />
                </div>
                <div className="md:col-span-2"><label htmlFor="project-region" className="block text-sm font-medium text-textMain mb-2">Región</label>
                  <DownSelect id="project-region" value={formData.region} groups={REGION_GROUPS} onChange={(region) => updateForm({ region })} placeholder="Seleccionar región..." />
                </div>
              </div>
              <div>
                <p className="block text-sm font-medium text-textMain mb-3">Nivel de Disponibilidad (Estimación AWS SLA)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{availabilityOptions.map((option) => {
                  const active = formData.availabilityLevel === option.value;
                  return <button key={option.value} type="button" aria-pressed={active} onClick={() => updateForm({ availabilityLevel: option.value })}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${active ? 'border-primary bg-blue-50 dark:bg-blue-500/10 shadow-sm' : 'border-cardBorder hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-sm'}`}>
                    <div className="flex items-center justify-between gap-2"><span className={`text-base font-bold ${active ? 'text-primary dark:text-blue-400' : 'text-textMain'}`}>{option.pct}</span>{active && <CheckCircle size={16} className="text-primary dark:text-blue-400" />}</div>
                    <p className="text-sm font-medium text-textMain mt-1">{option.name}</p><p className="text-xs text-textSecondary mt-0.5">{option.detail}</p>
                  </button>;
                })}</div>
              </div>
              <div>
                <label htmlFor="migration-goal" className="block text-sm font-medium text-textMain mb-2">Objetivo de Migración</label>
                <div className="flex flex-wrap gap-2 mb-3">{MIGRATION_GOALS.map((goal) => <button key={goal} type="button" aria-pressed={selectedGoals.includes(goal)}
                  onClick={() => { updateGoals(selectedGoals.includes(goal) ? selectedGoals.filter((item) => item !== goal) : [...selectedGoals, goal], goalText); goalInput.current?.focus(); }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${selectedGoals.includes(goal) ? 'border-primary bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400' : 'border-cardBorder text-textSecondary hover:border-blue-300 dark:hover:border-blue-500/50'}`}>{goal}</button>)}</div>
                <div className="p-3 rounded-lg border border-cardBorder dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent">
                  <div className="flex flex-wrap items-start gap-2">
                    {selectedGoals.map((goal) => <button key={goal} type="button" aria-label={`Eliminar ${goal}`}
                      onClick={() => updateGoals(selectedGoals.filter((item) => item !== goal), goalText)}
                      onKeyDown={(event) => { if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); updateGoals(selectedGoals.filter((item) => item !== goal), goalText); goalInput.current?.focus(); } }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-500/15 text-primary dark:text-blue-400 text-xs font-semibold">
                      {goal}<X size={12} />
                    </button>)}
                    <textarea ref={goalInput} id="migration-goal" value={goalText} rows={3}
                      onChange={(event) => updateGoals(selectedGoals, event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Backspace' && event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0 && selectedGoals.length) { event.preventDefault(); updateGoals(selectedGoals.slice(0, -1), goalText); } }}
                      placeholder="Añade detalles y objetivos de la migración..."
                      className="min-w-[180px] flex-1 bg-transparent text-sm text-textMain outline-none resize-y" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-1"><button type="submit" className={primaryClass}>Siguiente<ChevronRight size={16} /></button></div>
            </form>}

            {/* ===== FASE 2: CAPACIDAD Y SERVICIOS CLOUD ===== */}
            {step === 2 && <div className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <p className="text-sm text-textSecondary">Elija los servicios que compondrán la arquitectura. Puede combinarlos libremente.</p>
                <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${formData.awsServices.length ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/30' : 'bg-gray-100 text-textSecondary border-cardBorder dark:bg-slate-800'}`}>{formData.awsServices.length} servicios seleccionados</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-5">{(['Todas', ...SERVICE_CATEGORIES] as const).map((category) => <button key={category} type="button" onClick={() => setCategoryFilter(category)} aria-pressed={categoryFilter === category}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${categoryFilter === category ? 'bg-[#232F3E] dark:bg-slate-700 border-[#232F3E] dark:border-slate-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border-cardBorder text-textSecondary hover:border-blue-300 dark:hover:border-blue-500/50 hover:text-textMain'}`}>
                {category}<span className="ml-1.5 text-[10px]">{category === 'Todas' ? SERVICES.length : SERVICES.filter((service) => service.category === category).length}</span>
              </button>)}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{visibleServices.map((service) => {
                const Icon = SERVICE_ICONS[service.id];
                const active = formData.awsServices.includes(service.id);
                return <button key={service.id} type="button" aria-pressed={active} disabled={service.id === 'IAM'} onClick={() => toggleService(service.id)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all duration-150 ${active ? 'border-primary bg-blue-50/70 dark:bg-blue-500/10 shadow-md ring-1 ring-primary/40' : 'border-cardBorder bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-md'}`}>
                  <span className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'bg-primary border-primary' : 'border-gray-300 dark:border-slate-600'}`}>{active && <CheckCircle size={13} className="text-white" />}</span>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${service.iconClass}`}><Icon size={18} /></div>
                  <p className="text-sm font-bold text-textMain pr-6">{service.name}</p>
                  <p className="text-xs text-textSecondary mt-1 leading-relaxed line-clamp-2">{service.description}</p>
                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-cardBorder"><span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-textSecondary">{service.category}</span></div>
                </button>;
              })}</div>
              <p className="text-xs text-textSecondary mt-3">Toda cuenta de AWS incluye IAM; no tiene costo.</p>
              <div className="mt-7 p-5 rounded-xl border border-cardBorder bg-gray-50 dark:bg-slate-800/60">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <label htmlFor="concurrent-users" className="text-sm font-medium text-textMain">Usuarios Concurrentes</label>
                  <input type="number" readOnly id="concurrent-users" value={formData.estimatedUsers} placeholder="Sin definir" aria-label="Usuarios concurrentes seleccionados"
                    className="w-36 px-3 py-2 border border-cardBorder rounded-lg bg-white dark:bg-slate-900 text-textMain text-right font-mono focus:outline-none" />
                </div>
                <input type="range" min={10} max={10000} step={1} value={formData.estimatedUsers || '10'} aria-label="Seleccionar usuarios concurrentes"
                  aria-valuetext={`${formData.estimatedUsers || '10'} usuarios concurrentes`}
                  onChange={(event) => updateForm({ estimatedUsers: event.target.value })}
                  onPointerUp={(event) => updateForm({ estimatedUsers: event.currentTarget.value })}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary focus-visible:outline-primary"
                  style={{ background: `linear-gradient(to right, #2563EB ${(Number(formData.estimatedUsers || 10) - 10) / 9990 * 100}%, ${'#94a3b8'} 0%)` }} />
                <div className="flex justify-between text-xs text-textSecondary mt-2"><span>10</span><span>10,000 usuarios</span></div>
                <div className="flex flex-wrap gap-2 mt-4">{[100, 1000, 2500, 5000, 7500].map((users) => <button type="button" key={users} onClick={() => updateForm({ estimatedUsers: String(users) })} aria-pressed={formData.estimatedUsers === String(users)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${formData.estimatedUsers === String(users) ? 'border-primary bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400' : 'border-cardBorder text-textSecondary hover:border-blue-300 dark:hover:border-blue-500/50'}`}>{users.toLocaleString('en-US')}</button>)}</div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-cardBorder"><button type="button" onClick={handleBack} className={backClass}><ChevronLeft size={16} />Atrás</button><button type="button" onClick={() => handleNext()} className={primaryClass}>Siguiente<ChevronRight size={16} /></button></div>
            </div>}

            {/* ===== FASE 3: RED Y TOPOLOGÍA ===== */}
            {step === 3 && <div className="p-6 space-y-6">
              <div className="p-4 rounded-xl border border-cardBorder bg-gray-50 dark:bg-slate-800/60">
                <p className="text-[11px] font-bold uppercase tracking-wider text-textSecondary mb-3">Vista esquemática de la topología</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <div className="flex-1 p-3 rounded-lg border-2 border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10 text-center"><p className="text-xs font-bold text-primary dark:text-blue-400">VPC</p><p className="text-[11px] text-textSecondary font-mono mt-0.5">{network.vpcCidr}</p></div>
                  <ChevronRight size={16} className="hidden sm:block text-textSecondary shrink-0" />
                  <div className="flex-1 grid grid-cols-3 gap-1.5">{Array.from({ length: network.availabilityZones }).map((_, index) => <div key={index} className="p-2 rounded border border-green-300 dark:border-green-500/40 bg-green-50 dark:bg-green-500/10 text-center"><p className="text-[10px] font-bold text-statusGreen dark:text-green-400">AZ-{index + 1}</p></div>)}</div>
                  <ChevronRight size={16} className="hidden sm:block text-textSecondary shrink-0" />
                  <div className="flex-1 grid grid-cols-2 gap-1.5"><div className="p-2 rounded border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-center"><p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Públicas: {network.publicSubnets}</p></div><div className="p-2 rounded border border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-center"><p className="text-[10px] font-bold text-violet-600 dark:text-violet-400">Privadas: {network.privateSubnets}</p></div></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><label className="block text-sm font-medium text-textMain mb-2">Bloque CIDR de la VPC</label><select value={network.vpcCidr} onChange={(event) => updateNetwork({ vpcCidr: event.target.value })} className={`${fieldClass} font-mono text-sm`}>{['10.0.0.0/16', '172.16.0.0/16', '192.168.0.0/16'].map((cidr) => <option key={cidr}>{cidr}</option>)}</select></div>
                <div><p className="block text-sm font-medium text-textMain mb-2">Zonas de Disponibilidad</p><div className="flex gap-2">{[2, 3, 4].map((zones) => <button type="button" key={zones} onClick={() => updateNetwork({ availabilityZones: zones, publicSubnets: Math.max(network.publicSubnets, zones), natGateways: Math.min(network.natGateways, zones) })}
                  className={`flex-1 py-3 rounded-lg border-2 text-sm font-bold transition-all ${network.availabilityZones === zones ? 'border-primary bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400' : 'border-cardBorder text-textMain hover:border-blue-300 dark:hover:border-blue-500/50'}`}>{zones} AZ</button>)}</div></div>
                <div><label className="block text-sm font-medium text-textMain mb-2">Subredes Públicas</label><select value={network.publicSubnets} onChange={(event) => updateNetwork({ publicSubnets: Number(event.target.value) })} className={fieldClass}>{[1, 2, 3, 4, 5, 6].map((number) => <option key={number} value={number}>{number} subred{number === 1 ? '' : 'es'}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-textMain mb-2">Subredes Privadas</label><select value={network.privateSubnets} onChange={(event) => updateNetwork({ privateSubnets: Number(event.target.value) })} className={fieldClass}>{[0, 1, 2, 3, 4, 5, 6].map((number) => <option key={number} value={number}>{number} subred{number === 1 ? '' : 'es'}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-textMain mb-2">NAT Gateways</label><select value={network.natGateways} onChange={(event) => updateNetwork({ natGateways: Number(event.target.value) })} className={fieldClass}>{[0, 1, 2, 3, 4].map((number) => <option key={number} value={number}>{number} NAT Gateway{number === 1 ? '' : 's'}</option>)}</select></div>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-textSecondary mb-3">Componentes de red opcionales</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{NETWORK_ADDONS.map((addon) => {
                  const active = network[addon.key];
                  return <button key={addon.key} type="button" aria-pressed={active} onClick={() => updateNetwork({ [addon.key]: !active })}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${active ? 'border-primary bg-blue-50 dark:bg-blue-500/10 shadow-sm' : 'border-cardBorder hover:border-blue-300 dark:hover:border-blue-500/50'}`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5"><span className="text-sm font-bold text-textMain">{addon.title}</span><span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${active ? 'bg-primary' : 'bg-gray-300 dark:bg-slate-600'}`}><span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow" style={{ transform: active ? 'translateX(18px)' : 'translateX(2px)' }} /></span></div>
                    <p className="text-xs text-textSecondary leading-relaxed">{addon.desc}</p>
                  </button>;
                })}</div>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 pt-5 border-t border-cardBorder">
                <button type="button" onClick={handleBack} className={backClass}><ChevronLeft size={16} />Atrás</button>
                <div className="flex flex-col sm:flex-row gap-3"><button type="button" disabled={isSaving} onClick={handleSave} className={backClass}><Save size={16} />Guardar Planificación</button><button type="button" onClick={handleGenerateReport} className={primaryClass}><FileText size={16} />Reporte Final</button></div>
              </div>
              {saveMessage && <p role="status" className="text-sm text-textMain p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">{saveMessage}</p>}
            </div>}
          </div>

          <aside className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto bg-white dark:bg-slate-900 border border-cardBorder rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-cardBorder bg-gray-50 dark:bg-slate-800/60 rounded-t-xl"><h3 className="text-base font-semibold text-textMain flex items-center gap-2"><ClipboardList size={17} className="text-primary dark:text-blue-400" />Resumen de Selección</h3><p className="text-xs text-textSecondary mt-1">Se actualiza con tus decisiones</p></div>
            <div className="p-5 space-y-5">
              <dl className="space-y-4">{[
                { label: 'Nombre', value: formData.solutionName.trim() || 'Sin definir' },
                { label: 'Tipo de Aplicación', value: appTypeLabels[formData.applicationType] || 'Sin definir' },
                { label: 'Región', value: regionLabel || 'Sin definir' },
                { label: 'Objetivo', value: formData.migrationGoal || 'Sin definir' },
                { label: 'Usuarios Concurrentes', value: formData.estimatedUsers ? Number(formData.estimatedUsers).toLocaleString('en-US') : 'Sin definir' },
                { label: 'SLA Objetivo', value: formData.availabilityLevel },
              ].map((item) => <div key={item.label}><dt className="text-[10px] font-bold uppercase tracking-wider text-textSecondary mb-1">{item.label}</dt><dd className="text-sm font-medium text-textMain break-words whitespace-pre-wrap">{item.value}</dd></div>)}</dl>
              <div className="pt-4 border-t border-cardBorder"><p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary mb-2">Servicios seleccionados</p>{selectedServices.length ? <div className="flex flex-wrap gap-1.5">{selectedServices.map((service) => <span key={service.id} className="px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400">{service.name}</span>)}</div> : <p className="text-sm text-textMain">Sin definir</p>}</div>
              <div className="pt-4 border-t border-cardBorder"><p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary mb-2">Topología de Red</p>{networkDefined ? <div className="space-y-2 text-xs text-textMain"><p className="font-mono">VPC {network.vpcCidr}</p><p>{network.availabilityZones} zonas de disponibilidad</p><p>{network.publicSubnets} subredes públicas / {network.privateSubnets} privadas</p><p>{network.natGateways} NAT Gateways</p><div className="flex flex-wrap gap-1.5">{NETWORK_ADDONS.filter((addon) => network[addon.key]).map((addon) => <span key={addon.key} className="px-2 py-1 rounded-md bg-green-500/10 text-statusGreen dark:text-green-400">{addon.title}</span>)}</div></div> : <p className="text-sm text-textMain">Sin definir</p>}</div>
            </div>
          </aside>
        </div>

        {/* ---------- HISTORIAL DE PLANIFICACIONES ---------- */}
        <section aria-labelledby="planning-history-title" className="mt-8 bg-white dark:bg-slate-900 border border-cardBorder rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-cardBorder bg-gray-50 dark:bg-slate-800/60 rounded-t-xl">
            <div>
              <h3 id="planning-history-title" className="flex items-center gap-2 text-lg font-semibold text-textMain">
                <ClipboardList size={18} className="text-primary dark:text-blue-400" />
                Planificaciones Guardadas
              </h3>
              <p className="text-xs text-textSecondary mt-1">Consulta tus planificaciones y vuelve a cargarlas en el asistente.</p>
            </div>
            <span className="px-3 py-1.5 rounded-full border border-cardBorder text-xs font-semibold text-textSecondary">
              {savedPlannings.length} guardada{savedPlannings.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="p-6">
            {historyError && <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3">{historyError}</p>}
            {!savedPlannings.length ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-xl border border-dashed border-cardBorder bg-gray-50 dark:bg-slate-800/40">
                <ClipboardList size={28} className="text-textSecondary" />
                <p className="text-sm font-medium text-textSecondary">No hay planificaciones guardadas</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {savedPlannings.map((entry) => {
                  const savedRegion = REGION_GROUPS.flatMap((group) => group.options).find((option) => option.value === entry.plan.region)?.label ?? entry.plan.region;
                  return <article key={entry.id} className="min-w-0 flex flex-col p-5 rounded-xl border border-cardBorder bg-white dark:bg-slate-900 shadow-sm">
                    <h4 className="text-base font-semibold text-textMain break-words">{entry.plan.solutionName}</h4>
                    <p className="text-[11px] text-textSecondary mt-1">
                      {new Date(entry.savedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <dl className="space-y-3 mt-4">
                      <div><dt className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Región</dt><dd className="text-xs text-textMain mt-1 break-words">{savedRegion}</dd></div>
                      <div><dt className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Aplicación / Capacidad</dt><dd className="text-xs text-textMain mt-1">{appTypeLabels[entry.plan.applicationType] ?? entry.plan.applicationType} · {Number(entry.plan.estimatedUsers).toLocaleString('en-US')} usuarios concurrentes</dd></div>
                      <div><dt className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Objetivo de Migración</dt><dd className="text-xs text-textMain mt-1 break-words whitespace-pre-wrap line-clamp-3">{entry.plan.migrationGoal || 'Sin definir'}</dd></div>
                      <div><dt className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">Topología de Red</dt><dd className="text-xs text-textMain mt-1"><span className="font-mono">{entry.network.vpcCidr}</span> · {entry.network.availabilityZones} AZ<br />{entry.network.publicSubnets} subredes públicas / {entry.network.privateSubnets} privadas · {entry.network.natGateways} NAT</dd></div>
                    </dl>
                    <div className="flex flex-wrap gap-1.5 mt-4 mb-5">
                      {entry.plan.awsServices.map((id) => <span key={id} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400">
                        {SERVICES.find((service) => service.id === id)?.name ?? id}
                      </span>)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-4 mt-auto border-t border-cardBorder">
                      <button type="button" onClick={() => handleViewPlanning(entry)} aria-label={`Ver ${entry.plan.solutionName}`} className={primaryClass}>
                        <Eye size={15} />Ver
                      </button>
                      <button type="button" disabled={isSaving} onClick={() => handleDeletePlanning(entry.id)} aria-label={`Borrar ${entry.plan.solutionName}`}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-500/30 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                        <Trash2 size={15} />Borrar
                      </button>
                    </div>
                  </article>;
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>

    {viewedPlanning && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8" role="dialog" aria-modal="true" aria-labelledby="planning-view-title" onKeyDown={(event) => { if (event.key === 'Escape') setViewingPlanningId(null); }}>
      <div className="fixed inset-0 bg-black/60" onClick={() => setViewingPlanningId(null)} />
      <article className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-cardBorder">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-cardBorder">
          <div className="flex items-center gap-3 min-w-0"><div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/15 shrink-0"><ClipboardList size={18} className="text-primary dark:text-blue-400" /></div><h2 id="planning-view-title" className="text-lg font-bold text-textMain break-words">{viewedPlanning.plan.solutionName}</h2></div>
          <button type="button" autoFocus onClick={() => setViewingPlanningId(null)} aria-label="Cerrar planificación" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"><X size={18} className="text-textSecondary" /></button>
        </div>
        <div className="p-6 md:p-10 space-y-8">
          <section><h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">Metadatos del Proyecto</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[
              ['Solución', viewedPlanning.plan.solutionName], ['Tipo de Aplicación', appTypeLabels[viewedPlanning.plan.applicationType] ?? viewedPlanning.plan.applicationType],
              ['Región', REGION_GROUPS.flatMap((group) => group.options).find((option) => option.value === viewedPlanning.plan.region)?.label ?? viewedPlanning.plan.region],
              ['Usuarios Concurrentes', Number(viewedPlanning.plan.estimatedUsers).toLocaleString('en-US')], ['SLA Objetivo', viewedPlanning.plan.availabilityLevel],
              ['Guardada', new Date(viewedPlanning.savedAt).toLocaleString('es-ES')],
            ].map(([label, value]) => <div key={label} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-cardBorder"><p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">{label}</p><p className="text-sm font-semibold text-textMain mt-1 break-words">{value}</p></div>)}</div>
          </section>
          <section><h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">Objetivo de Migración</h3><p className="text-sm text-textSecondary leading-relaxed whitespace-pre-wrap">{viewedPlanning.plan.migrationGoal || 'Sin definir'}</p></section>
          <section><h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">Servicios Cloud Seleccionados</h3>
            <div className="flex flex-wrap gap-2">{viewedPlanning.plan.awsServices.map((id) => <span key={id} className="px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-primary dark:text-blue-400">{SERVICES.find((service) => service.id === id)?.name ?? id}</span>)}</div>
          </section>
          <section><h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">Red y Topología</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[
              ['VPC CIDR', viewedPlanning.network.vpcCidr], ['Zonas de Disponibilidad', `${viewedPlanning.network.availabilityZones} AZ`],
              ['Subredes Públicas', String(viewedPlanning.network.publicSubnets)], ['Subredes Privadas', String(viewedPlanning.network.privateSubnets)], ['NAT Gateways', String(viewedPlanning.network.natGateways)],
              ...NETWORK_ADDONS.map((addon) => [addon.title, viewedPlanning.network[addon.key] ? 'Activado' : 'No incluido']),
            ].map(([label, value]) => <div key={label} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-cardBorder"><p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">{label}</p><p className="text-sm font-semibold text-textMain mt-1">{value}</p></div>)}</div>
          </section>
          <div className="pt-4 border-t border-cardBorder flex items-center justify-end gap-3"><button type="button" onClick={() => setViewingPlanningId(null)} className={backClass}>Cerrar</button><button type="button" disabled={isSaving} onClick={() => handleModifyPlanning(viewedPlanning)} className={primaryClass}>Modificar</button></div>
        </div>
      </article>
    </div>}

    {/* ---------- MODAL: REPORTE ARQUITECTÓNICO ---------- */}
    {report && <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8 print:p-0" role="dialog" aria-modal="true" aria-labelledby="report-title" onKeyDown={(event) => { if (event.key === 'Escape') setReport(null); }}>
      <div className="fixed inset-0 bg-black/60 print:hidden" onClick={() => setReport(null)} />
      <article id="printable-report" className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-cardBorder print:rounded-none print:shadow-none print:border-none">
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-cardBorder print:hidden">
          <div className="flex items-center gap-3 min-w-0"><div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/15 shrink-0"><FileText size={18} className="text-primary dark:text-blue-400" /></div><div><p className="text-sm font-bold text-textMain">Vista previa del entregable</p><p className="text-xs text-textSecondary">Folio {report.folio}</p></div></div>
          <div className="flex items-center gap-2 shrink-0"><button onClick={() => window.print()} className={primaryClass}><Printer size={15} /><span className="hidden sm:inline">Imprimir / PDF</span></button><button autoFocus onClick={() => setReport(null)} aria-label="Cerrar reporte" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"><X size={18} className="text-textSecondary" /></button></div>
        </div>
        <div className="p-6 md:p-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b-2 border-slate-800 dark:border-slate-600">
            <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-[#232F3E] flex items-center justify-center shrink-0"><Cloud size={22} className="text-amber-400" /></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-primary dark:text-blue-400">CloudOps Dashboard</p><h2 id="report-title" className="text-xl font-extrabold text-textMain leading-tight">Entregable de Consultoría Cloud</h2><p className="text-sm text-textSecondary">Reporte Arquitectónico de Solución en AWS</p></div></div>
            <div className="text-left sm:text-right"><p className="text-[10px] font-bold uppercase tracking-widest text-textSecondary">Folio</p><p className="text-sm font-mono font-bold text-textMain">{report.folio}</p><p className="text-xs text-textSecondary mt-1.5">{report.generatedAt}</p></div>
          </div>
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">1. Metadatos del Proyecto</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[
              { label: 'Solución', value: report.plan.solutionName }, { label: 'Tipo de Aplicación', value: appTypeLabels[report.plan.applicationType] },
              { label: 'Región', value: report.plan.region }, { label: 'Usuarios Concurrentes', value: report.plan.estimatedUsers },
              { label: 'SLA Objetivo', value: report.plan.availabilityLevel }, { label: 'Servicios', value: `${report.plan.awsServices.length} seleccionados` },
              { label: 'Topología', value: `${report.network.availabilityZones} AZ / ${report.network.publicSubnets}+${report.network.privateSubnets} subredes` }, { label: 'Estado', value: 'Borrador técnico' },
            ].map((item) => <div key={item.label} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-cardBorder"><p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">{item.label}</p><p className="text-xs font-semibold text-textMain mt-1 break-words">{item.value}</p></div>)}</div>
          </section>
          <section><h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">2. Objetivo de Migración</h3><p className="text-sm text-textSecondary leading-relaxed whitespace-pre-wrap">{report.plan.migrationGoal || 'Sin definir'}</p></section>
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">3. Servicios Cloud Seleccionados</h3>
            <div className="overflow-x-auto border border-cardBorder rounded-lg"><table className="w-full text-left text-sm"><thead className="bg-gray-100 dark:bg-slate-800"><tr>{['Servicio', 'Categoría', 'Descripción Técnica'].map((label) => <th key={label} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">{label}</th>)}</tr></thead><tbody>{SERVICES.filter((service) => report.plan.awsServices.includes(service.id)).map((service) => <tr key={service.id} className="border-t border-cardBorder"><td className="px-4 py-2.5 font-medium text-textMain">{service.name}</td><td className="px-4 py-2.5 text-textSecondary">{service.category}</td><td className="px-4 py-2.5 text-xs text-textSecondary">{service.description}</td></tr>)}</tbody></table></div>
          </section>
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">4. Red y Topología</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[
              ['VPC CIDR', report.network.vpcCidr], ['Zonas de Disponibilidad', `${report.network.availabilityZones} AZ`],
              ['Subredes Públicas', String(report.network.publicSubnets)], ['Subredes Privadas', String(report.network.privateSubnets)],
              ['NAT Gateways', String(report.network.natGateways)], ['Componentes Opcionales', NETWORK_ADDONS.filter((addon) => report.network[addon.key]).map((addon) => addon.title).join(', ') || 'Ninguno'],
            ].map(([label, value]) => <div key={label} className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/70 border border-cardBorder"><p className="text-[10px] font-bold uppercase tracking-wider text-textSecondary">{label}</p><p className="text-sm font-semibold text-textMain mt-1">{value}</p></div>)}</div>
          </section>
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">5. Evaluación AWS Well-Architected Framework</h3>
            <div className="flex items-center gap-4 p-4 mb-4 rounded-xl bg-gray-50 dark:bg-slate-800/70 border border-cardBorder"><Gauge size={44} className="text-primary dark:text-blue-400" /><div><p className="text-xs font-bold uppercase tracking-wider text-textSecondary">Puntuación global</p><p className="text-2xl font-extrabold text-textMain">{report.overallScore}/100</p></div><div className="flex-1 hidden sm:block h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${report.overallScore >= 85 ? 'bg-statusGreen' : report.overallScore >= 70 ? 'bg-statusAmber' : 'bg-statusRed'}`} style={{ width: `${report.overallScore}%` }} /></div></div>
            <div className="overflow-x-auto border border-cardBorder rounded-lg"><table className="w-full text-left text-sm"><thead className="bg-gray-100 dark:bg-slate-800"><tr>{['Pilar', 'Puntuación', 'Estado', 'Observaciones'].map((label) => <th key={label} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-textSecondary">{label}</th>)}</tr></thead><tbody>{report.pillars.map((pillar) => <tr key={pillar.pillar} className="border-t border-cardBorder align-top"><td className="px-4 py-3 font-semibold text-textMain">{pillar.pillar}</td><td className="px-4 py-3 font-mono font-bold text-textMain">{pillar.score}/100</td><td className="px-4 py-3 whitespace-nowrap"><span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${statusChipClass(pillar.status)}`}>{pillar.status}</span></td><td className="px-4 py-3 text-xs text-textSecondary leading-relaxed">{pillar.notes}</td></tr>)}</tbody></table></div>
          </section>
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-textMain mb-3">6. Notas y Aprobación</h3>
            <p className="text-xs text-textSecondary leading-relaxed">Documento generado por CloudOps Dashboard. La evaluación arquitectónica es orientativa y requiere revisión del equipo de arquitectura antes de su implementación.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-8">{['Arquitecto de Soluciones Cloud', 'Revisor Técnico'].map((label) => <div key={label} className="border-t border-dashed border-slate-400 dark:border-slate-600 pt-2"><p className="text-xs font-semibold text-textMain">{label}</p><p className="text-[11px] text-textSecondary">Firma y fecha</p></div>)}</div>
          </section>
          <div className="pt-4 border-t border-cardBorder flex flex-col sm:flex-row items-center justify-between gap-3"><p className="text-[11px] text-textSecondary">Folio {report.folio} · {report.generatedAt} · CloudOps Dashboard</p><div className="flex items-center gap-3 print:hidden"><button onClick={() => setReport(null)} className={backClass}>Cerrar</button><button onClick={() => window.print()} className={primaryClass}><Printer size={15} />Imprimir / PDF</button></div></div>
        </div>
      </article>
    </div>}
  </>;
}

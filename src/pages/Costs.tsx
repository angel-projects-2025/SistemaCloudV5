import { useMemo, useRef, useState } from 'react';
import {
  Download,
  Printer,
  Plus,
  Trash2,
  Calculator,
  Pencil,
  X
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';

import { Header } from '../components/Header';
import { NoPlanningState } from '../components/NoPlanningState';
import { usePlanning } from '../context/PlanningContext';
import { useTheme } from '../context/ThemeContext';
import {
  serviceOptions, pricingModels, osOptions, storageTypeOptions,
  MAX_MONTHLY_HOURS, computeLineCost, describeCostLine, estimateCostConfig,
  DEFAULT_COST_CONFIGS, SERVICE_NAMES, extendedServiceOptions, FARGATE_MEMORY_OPTIONS,
  normalizeCostConfig, normalizeCostLine, S3_STORAGE_NOTE,
} from '../lib/costEngine';
import type { CostConfig, CostLine, PlanningServiceId } from '../lib/costEngine';
import { summarizeIamIdentities } from '../lib/securityCatalog';
import type { IamIdentity } from '../lib/planningCatalog';

interface TableRow {
  id: string;
  service: string;
  cells: string[];
}

const TABLE_COLUMNS = [
  'Servicio', 'Configuración principal', 'Modelo de precios', 'SO / Licencia',
  'Almacenamiento', 'Cantidad', 'Horas al mes', 'Transferencia de salida',
  'Solicitudes', 'Otros parámetros específicos', 'Tarifa efectiva / hora',
  'Total mensual', 'Total anual',
];

const CHART_COLORS = [
  '#2563EB',
  '#16A34A',
  '#F59E0B',
  '#DC2626',
  '#7C3AED',
  '#0891B2'
];

interface EstimatorField {
  key: string;
  label: string;
  value: string | number;
  type: 'number' | 'select';
  group: 'general' | 'spec';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  scale?: number;
}

function estimatorFields(config: CostConfig): EstimatorField[] {
  const fields: EstimatorField[] = [];
  const number = (key: string, label: string, value: number, group: 'general' | 'spec' = 'general', min = 0, max?: number, scale = 1) => fields.push({ key, label, value: value / scale, type: 'number', group, min, max, scale, step: 1 / scale });
  const select = (key: string, label: string, value: string, options: { value: string; label: string }[], group: 'general' | 'spec' = 'general') => fields.push({ key, label, value, options, type: 'select', group });
  const instances = (id: PlanningServiceId) => serviceOptions.find((service) => service.service === SERVICE_NAMES[id])!.instances.map((option) => ({ value: option.id, label: option.label }));
  const models = (spot: boolean) => pricingModels.filter((model) => spot || model.id !== 'spot').map((model) => ({ value: model.id, label: model.label }));
  switch (config.serviceId) {
    case 'EC2':
      select('instanceId', 'Tipo de Instancia', config.instanceId, instances('EC2'));
      select('pricingModelId', 'Modelo de Precios', config.pricingModelId, models(true));
      number('quantity', 'Cantidad de instancias', config.quantity, 'general', 1);
      number('hours', 'Horas al mes', config.hours, 'general', 1, MAX_MONTHLY_HOURS);
      number('storageGb', 'Almacenamiento EBS (GB totales)', config.storageGb);
      select('osId', 'Sistema Operativo / Licencia', config.osId, osOptions.map((option) => ({ value: option.id, label: option.label })), 'spec');
      select('storageTypeId', 'Tipo de Almacenamiento EBS', config.storageTypeId, storageTypeOptions.map((option) => ({ value: option.id, label: option.label })), 'spec');
      number('dataTransferGb', 'Transferencia de salida (GB)', config.dataTransferGb, 'spec');
      break;
    case 'RDS':
      select('engine', 'Motor de Base de Datos', config.engine, [{ value: 'mysql', label: 'MySQL' }, { value: 'postgresql', label: 'PostgreSQL' }, { value: 'mariadb', label: 'MariaDB' }]);
      select('instanceId', 'Clase de Instancia', config.instanceId, instances('RDS'));
      select('pricingModelId', 'Modelo de Precios', config.pricingModelId, models(false));
      number('quantity', 'Cantidad de instancias', config.quantity, 'general', 1);
      number('hours', 'Horas al mes', config.hours, 'general', 1, MAX_MONTHLY_HOURS);
      select('multiAz', 'Disponibilidad', String(config.multiAz), [{ value: 'false', label: 'Single-AZ' }, { value: 'true', label: 'Multi-AZ' }], 'spec');
      select('storageTypeId', 'Tipo de Almacenamiento', config.storageTypeId, [{ value: 'gp2', label: 'gp2 General Purpose' }, { value: 'gp3', label: 'gp3 General Purpose' }], 'spec');
      number('storageGb', 'Almacenamiento (GB totales)', config.storageGb, 'spec');
      break;
    case 'S3':
      select('classId', 'Clase de Almacenamiento', config.classId, instances('S3'));
      number('storageGb', 'GB almacenados', config.storageGb);
      number('putRequests', 'PUT / POST / LIST (miles)', config.putRequests, 'general', 0, undefined, 1000);
      number('getRequests', 'Solicitudes GET (miles)', config.getRequests, 'general', 0, undefined, 1000);
      number('dataTransferGb', 'Transferencia de salida (GB)', config.dataTransferGb);
      break;
    case 'Lambda':
      select('architecture', 'Arquitectura', config.architecture, extendedServiceOptions.Lambda.architectures.map((option) => ({ value: option.id, label: option.label })));
      number('memoryMb', 'Memoria (MB)', config.memoryMb, 'general', 128, 10240);
      number('durationMs', 'Duración promedio (ms)', config.durationMs, 'general', 0, 900000);
      number('lambdaRequests', 'Solicitudes totales al mes (millones)', config.invocations * config.quantity, 'general', 0, undefined, 1_000_000);
      break;
    case 'ECS':
      number('quantity', 'Cantidad de tareas', config.quantity, 'general', 1);
      select('vcpu', 'vCPU por tarea', String(config.vcpu), Object.keys(FARGATE_MEMORY_OPTIONS).sort((a, b) => Number(a) - Number(b)).map((value) => ({ value, label: value })));
      select('memoryGb', 'Memoria por tarea (GB)', String(config.memoryGb), FARGATE_MEMORY_OPTIONS[config.vcpu].map((value) => ({ value: String(value), label: String(value) })));
      number('hours', 'Horas al mes', config.hours, 'general', 1, MAX_MONTHLY_HOURS);
      break;
    case 'EKS':
      number('quantity', 'Cantidad de clústeres', config.quantity, 'general', 1);
      number('hours', 'Horas al mes', config.hours, 'general', 1, MAX_MONTHLY_HOURS);
      select('support', 'Soporte', config.support, extendedServiceOptions.EKS.instances.map((option) => ({ value: option.id, label: option.label })));
      break;
    case 'VPC':
      select('resourceType', 'Componente de VPC', config.resourceType, [{ value: 'vpc', label: 'VPC (sin cargo)' }, { value: 'gateway-endpoint', label: 'Gateway Endpoint (sin cargo)' }, { value: 'nat-gateway', label: 'NAT Gateway' }, { value: 'interface-endpoint', label: 'Interface Endpoint' }]);
      if (config.resourceType === 'nat-gateway' || config.resourceType === 'interface-endpoint') {
        number('quantity', 'Cantidad de componentes', config.quantity, 'general', 1);
        number('hours', 'Horas al mes', config.hours, 'general', 1, MAX_MONTHLY_HOURS);
        number('processedGb', 'GB procesados totales', config.processedGb);
      }
      break;
    case 'Route 53':
      number('hostedZones', 'Zonas hospedadas', config.hostedZones);
      number('queries', 'Consultas al mes (millones)', config.queries, 'general', 0, undefined, 1_000_000);
      select('routingType', 'Tipo de Enrutamiento', config.routingType, extendedServiceOptions['Route 53'].routingOptions.map((option) => ({ value: option.id, label: option.label })));
      number('healthChecks', 'Health checks', config.healthChecks);
      break;
    case 'CloudFront':
      number('dataTransferGb', 'Transferencia de salida (GB)', config.dataTransferGb);
      number('httpRequests', 'Solicitudes HTTP (unidades de 10.000)', config.httpRequests, 'general', 0, undefined, 10000);
      number('httpsRequests', 'Solicitudes HTTPS (unidades de 10.000)', config.httpsRequests, 'general', 0, undefined, 10000);
      break;
    case 'IAM':
      break;
  }
  return fields;
}

function changeEstimatorField(config: CostConfig, field: EstimatorField, input: string): CostConfig {
  let value: unknown = input;
  if (field.type === 'number' || field.key === 'vcpu' || field.key === 'memoryGb') {
    const number = Number(input);
    if (!Number.isFinite(number)) throw new Error('Introduce un número válido.');
    value = Math.min(field.max ?? Infinity, Math.max(field.min ?? 0, number)) * (field.scale ?? 1);
  }
  if (field.key === 'multiAz') value = input === 'true';
  if (field.key === 'lambdaRequests' && config.serviceId === 'Lambda') return normalizeCostConfig({ ...config, invocations: Number(value) / config.quantity });
  const updated: Record<string, unknown> = { ...config, [field.key]: value };
  if (field.key === 'vcpu' && config.serviceId === 'ECS') {
    const options = FARGATE_MEMORY_OPTIONS[Number(value)];
    if (!options.includes(config.memoryGb)) updated.memoryGb = options[0];
  }
  return normalizeCostConfig(updated);
}

function buildCostRows(lines: CostLine[], identities: IamIdentity[]): TableRow[] {
  const formatNumber = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 20 });
  const iam = summarizeIamIdentities(identities);
  return lines.map((storedLine) => {
    const line = normalizeCostLine(storedLine);
    const config = line.config;
    const description = describeCostLine(line);
    const paidVpc = config.serviceId === 'VPC' && (config.resourceType === 'nat-gateway' || config.resourceType === 'interface-endpoint');
    const hours = 'hours' in config && (config.serviceId !== 'VPC' || paidVpc) ? config.hours : null;
    const hourlyRate = hours !== null && hours > 0 && description.quantity > 0 ? line.monthly / (description.quantity * hours) : null;
    let main = '—';
    let storage = '—';
    let quantity = '—';
    let requests = '—';
    let other = '—';
    switch (config.serviceId) {
      case 'EC2':
        main = config.instanceId;
        quantity = `${formatNumber(config.quantity)} instancias`;
        break;
      case 'RDS':
        main = `${config.instanceId} · ${{ mysql: 'MySQL', postgresql: 'PostgreSQL', mariadb: 'MariaDB' }[config.engine]}`;
        quantity = `${formatNumber(config.quantity)} instancias`;
        other = config.multiAz ? 'Multi-AZ' : 'Single-AZ';
        break;
      case 'S3': {
        const label = serviceOptions.find((service) => service.service === SERVICE_NAMES.S3)!.instances.find((instance) => instance.id === config.classId)!.label;
        main = label;
        storage = `${label} · ${formatNumber(config.storageGb)} GB`;
        requests = `PUT / POST / LIST: ${formatNumber(config.putRequests)}; GET: ${formatNumber(config.getRequests)}`;
        break;
      }
      case 'Lambda':
        main = extendedServiceOptions.Lambda.architectures.find((option) => option.id === config.architecture)!.label;
        requests = `${formatNumber(config.invocations * config.quantity)} totales/mes`;
        other = `Memoria: ${formatNumber(config.memoryMb)} MB; duración: ${formatNumber(config.durationMs)} ms`;
        break;
      case 'ECS':
        main = `Fargate · ${config.architecture}`;
        quantity = `${formatNumber(config.quantity)} tareas`;
        other = `${formatNumber(config.vcpu)} vCPU/tarea; ${formatNumber(config.memoryGb)} GB RAM/tarea`;
        break;
      case 'EKS':
        main = config.support === 'standard' ? 'Soporte estándar' : 'Soporte extendido';
        quantity = `${formatNumber(config.quantity)} clústeres`;
        break;
      case 'VPC':
        main = { vpc: 'VPC (sin cargo)', 'gateway-endpoint': 'Gateway Endpoint (sin cargo)', 'nat-gateway': 'NAT Gateway', 'interface-endpoint': 'Interface Endpoint' }[config.resourceType];
        if (paidVpc) {
          quantity = `${formatNumber(config.quantity)} componentes`;
          other = `GB procesados: ${formatNumber(config.processedGb)}`;
        }
        break;
      case 'Route 53':
        main = `Enrutamiento: ${extendedServiceOptions['Route 53'].routingOptions.find((option) => option.id === config.routingType)!.label}`;
        quantity = `${formatNumber(config.hostedZones)} zonas hospedadas`;
        requests = `${formatNumber(config.queries)} consultas/mes`;
        other = `Health checks: ${formatNumber(config.healthChecks)}`;
        break;
      case 'CloudFront':
        requests = `HTTP: ${formatNumber(config.httpRequests)}; HTTPS: ${formatNumber(config.httpsRequests)}`;
        break;
      case 'IAM':
        other = identities.length ? `Usuarios: ${formatNumber(iam.users)}; roles: ${formatNumber(iam.roles)}; políticas: ${formatNumber(iam.policies)}` : '—';
        break;
    }
    if (config.serviceId === 'EC2' || config.serviceId === 'RDS') {
      storage = `${storageTypeOptions.find((option) => option.id === config.storageTypeId)?.label ?? config.storageTypeId} · ${formatNumber(config.storageGb)} GB`;
    }
    return {
      id: line.id, service: line.serviceName,
      cells: [
        line.serviceName, main,
        config.serviceId === 'EC2' || config.serviceId === 'RDS' ? pricingModels.find((model) => model.id === config.pricingModelId)?.label ?? config.pricingModelId : '—',
        config.serviceId === 'EC2' ? osOptions.find((option) => option.id === config.osId)?.label ?? config.osId : '—',
        storage, quantity, hours === null ? '—' : formatNumber(hours),
        'dataTransferGb' in config ? `${formatNumber(config.dataTransferGb)} GB` : '—',
        requests, other, hourlyRate === null ? '—' : `$${hourlyRate.toFixed(4)}`,
        `$${line.monthly.toFixed(2)}`, `$${line.annual.toFixed(2)}`,
      ],
    };
  });
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function Costs() {
  const { activePlanning } = usePlanning();
  if (!activePlanning) {
    return <><Header title="Costos y Economía Cloud" /><main className="p-4 md:p-6 lg:p-8 bg-background min-h-screen"><NoPlanningState /></main></>;
  }
  // Cambiar la activa remonta únicamente el estimador y cancela cualquier edición.
  return <PlanningCosts key={activePlanning.id} planningId={activePlanning.id} />;
}

function PlanningCosts({ planningId }: { planningId: string }) {
  const { isDark } = useTheme();
  const { activePlanning, activeCostLines, updateActiveCostLines } = usePlanning();
  const [draftConfig, setDraftConfig] = useState<CostConfig>(() => normalizeCostConfig(DEFAULT_COST_CONFIGS.EC2));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const estimator = useRef<HTMLElement>(null);
  const newService = SERVICE_NAMES[draftConfig.serviceId];
  const fields = useMemo(() => estimatorFields(draftConfig), [draftConfig]);
  const estimate = useMemo(() => estimateCostConfig(draftConfig), [draftConfig]);
  const estimatedCost = estimate.subtotal;
  const draftDescription = describeCostLine({
    id: editingId ?? 'preview', planningServiceId: draftConfig.serviceId, serviceName: newService,
    config: draftConfig, monthly: estimatedCost, annual: estimatedCost * 12,
  });

  const handleFieldChange = (field: EstimatorField, value: string) => {
    try {
      setDraftConfig(changeEstimatorField(draftConfig, field, value));
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Configuración no válida.');
    }
  };
  const renderField = (field: EstimatorField) => <div key={field.key} className="min-w-0 flex flex-col justify-end">
    <label htmlFor={`cost-field-${field.key}`} className="block text-sm font-medium text-textMain mb-2 sm:min-h-[2.5rem]">{field.label}</label>
    {field.type === 'select' ? (
      <select id={`cost-field-${field.key}`} value={field.value} onChange={(event) => handleFieldChange(field, event.target.value)} className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary">
        {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    ) : (
      <input id={`cost-field-${field.key}`} type="number" min={field.min} max={field.max} step={field.step} value={field.value} onChange={(event) => handleFieldChange(field, event.target.value)} className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary" />
    )}
  </div>;

  const handleServiceChange = (service: string) => {
    if (editingId) return;
    const id = Object.entries(SERVICE_NAMES).find(([, name]) => name === service)?.[0] as PlanningServiceId | undefined;
    if (id) setDraftConfig(normalizeCostConfig(DEFAULT_COST_CONFIGS[id]));
    setFormError('');
  };

  const totalMonthly = useMemo(() => {
    return activeCostLines.reduce((sum, line) => sum + line.monthly, 0);
  }, [activeCostLines]);

  const totalAnnual = useMemo(() => {
    return activeCostLines.reduce((sum, line) => sum + line.annual, 0);
  }, [activeCostLines]);

  const resourceTotal = activeCostLines.length;

  const costDistribution = useMemo(() => {
    const grouped = activeCostLines.reduce<Record<string, number>>((acc, item) => {
      acc[item.serviceName] = (acc[item.serviceName] || 0) + item.annual;
      return acc;
    }, {});

    return Object.entries(grouped).filter(([, value]) => value > 0).map(([name, value]) => ({
      name,
      value
    }));
  }, [activeCostLines]);

  const tableRows = useMemo(() => buildCostRows(activeCostLines, activePlanning?.iamIdentities ?? []), [activeCostLines, activePlanning?.iamIdentities]);
  const addCost = async () => {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    try {
      if (editingId && !activeCostLines.some((line) => line.id === editingId)) {
        throw new Error('El recurso que estabas editando ya no está en esta planificación.');
      }
      const line: CostLine = {
        id: editingId ?? crypto.randomUUID(),
        planningServiceId: draftConfig.serviceId,
        serviceName: SERVICE_NAMES[draftConfig.serviceId],
        config: { ...draftConfig },
        ...computeLineCost(draftConfig),
      };
      const nextLines = editingId
        ? activeCostLines.map((entry) => entry.id === editingId ? line : entry)
        : [...activeCostLines, line];
      await updateActiveCostLines(nextLines, planningId);
      setEditingId(null);
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo actualizar la planificación.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftConfig(normalizeCostConfig(DEFAULT_COST_CONFIGS.EC2));
    setFormError('');
  };
  const editCost = (id: string) => {
    const line = activeCostLines.find((entry) => entry.id === id);
    if (!line) return;
    setDraftConfig(normalizeCostConfig(line.config));
    setEditingId(line.id);
    setFormError('');
    estimator.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const removeCost = async (id: string) => {
    if (saving.current) return;
    const line = activeCostLines.find((entry) => entry.id === id);
    if (!line) return;
    const lastOfService = activeCostLines.filter((entry) => entry.planningServiceId === line.planningServiceId).length === 1;
    if (line.planningServiceId !== 'IAM' && lastOfService && !window.confirm(`Este era el último recurso de ${line.serviceName}. Al quitarlo, el servicio saldrá también de la planificación y del Dashboard.`)) return;
    saving.current = true;
    setIsSaving(true);
    try {
      await updateActiveCostLines(activeCostLines.filter((entry) => entry.id !== id), planningId);
      if (editingId === id) cancelEdit();
      else setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo eliminar el recurso.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  const exportCSV = () => {
    const csvContent = '\uFEFF' + [TABLE_COLUMNS, ...tableRows.map((item) => item.cells)]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'reporte_costos.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header title="Costos y Economía Cloud" />

      <main className="costs-page min-w-0 p-4 md:p-6 lg:p-8 bg-background min-h-screen">
        <style>{`
          @media print {
            @page { size: landscape; margin: 10mm; }
            .costs-page .costs-top { display: block !important; }
            .costs-page .costs-estimator { display: none !important; }
            .costs-page .costs-side { display: grid !important; grid-template-columns: 1fr 1fr !important; }
            .costs-page .costs-table-card { padding: 8px !important; break-inside: auto !important; page-break-inside: auto !important; }
            .costs-page .costs-table-scroll { overflow: visible !important; }
            .costs-page .costs-table { width: 100% !important; min-width: 0 !important; table-layout: fixed; break-inside: auto !important; page-break-inside: auto !important; }
            .costs-page .costs-table th, .costs-page .costs-table td {
              position: static !important; padding: 4px !important; font-size: 7px !important;
              letter-spacing: normal !important; white-space: normal !important; overflow-wrap: anywhere;
              background: white !important; color: #334155 !important;
            }
            .costs-page .costs-table thead { display: table-header-group; }
            .costs-page .costs-table tr { break-inside: avoid; }
          }
        `}</style>
        {/* ENCABEZADO SOLO IMPRESIÓN */}
        <div className="hidden print:flex print:justify-between print:items-start print:mb-5 print:pb-3 print:border-b print:border-gray-200">
          <div>
            <p className="text-xs font-bold text-primary uppercase tracking-widest">CloudOps Dashboard</p>
            <h1 className="text-lg font-bold text-textMain mt-1">Reporte de Costos y Economía Cloud</h1>
            <p className="text-xs text-textSecondary mt-1">Resumen de indicadores, distribución y desglose por servicio</p>
          </div>
          <p className="text-xs text-textSecondary">{formatDate()}</p>
        </div>

        {/* ESTIMADOR DE COSTOS */}
        <div className="costs-top grid grid-cols-1 lg:grid-cols-2 items-start gap-6 mb-8">
        <section ref={estimator} className="costs-estimator min-w-0 bg-white dark:bg-slate-900 border border-cardBorder rounded-lg p-6 shadow-sm break-inside-avoid scroll-mt-28">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Calculator size={20} className="text-primary dark:text-blue-400" />
            </div>

            <div>
              <h2 className="text-xl font-semibold text-textMain">
                Estimador de Costos Cloud
              </h2>

              <p className="text-sm text-textSecondary">
                Agrega recursos y calcula automáticamente su costo mensual y anual.
              </p>
            </div>
          </div>

          {formError && <p role="alert" className="mt-4 p-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm text-red-600 dark:text-red-400">{formError}</p>}

          <div className="mt-6 print:hidden">
            {/* SERVICIO */}
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Servicio
              </label>

              <select
                value={newService}
                disabled={editingId !== null}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {Object.entries(SERVICE_NAMES).map(([id, name]) => (
                  <option key={id} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {fields.filter((field) => field.group === 'general').map(renderField)}
            </div>
          </div>

          {/* ESPECIFICACIONES DINÁMICAS SEGÚN SERVICIO */}
          {fields.some((field) => field.group === 'spec') && (
            <div className="mt-4 p-4 rounded-lg border border-cardBorder bg-gray-50 dark:bg-slate-800/40 print:hidden">
              <p className="text-[11px] font-bold uppercase tracking-wider text-textSecondary mb-3">
                Especificaciones de {newService}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.filter((field) => field.group === 'spec').map(renderField)}
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN SELECCIONADA */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-textSecondary print:hidden">
              <span className="font-semibold uppercase tracking-wider text-textMain">
                Configuracion
              </span>
              <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                {draftDescription.option}
              </span>

              {draftConfig.serviceId === 'EC2' && (
                <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                  {osOptions.find((option) => option.id === draftConfig.osId)?.label}
                  {draftConfig.osId !== 'linux' && (
                    <span className="ml-1 text-statusAmber dark:text-amber-400">
                      +licencia
                    </span>
                  )}
                </span>
              )}

              {'storageTypeId' in draftConfig && (
                <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                  {storageTypeOptions.find((option) => option.id === draftConfig.storageTypeId)?.label}
                </span>
              )}

              {'storageGb' in draftConfig && draftConfig.storageGb > 0 && (
                <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                  {draftConfig.storageGb} GB
                </span>
              )}

              {'dataTransferGb' in draftConfig && draftConfig.dataTransferGb > 0 && (
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                    Salida {draftConfig.dataTransferGb} GB
                  </span>
                )}

              {(draftConfig.serviceId === 'EC2' || draftConfig.serviceId === 'RDS') && draftConfig.pricingModelId !== 'on-demand' && (
                <span className="px-2 py-1 rounded-md bg-green-50 dark:bg-green-500/10 text-statusGreen dark:text-green-400 font-semibold">
                  -{Math.round((pricingModels.find((model) => model.id === draftConfig.pricingModelId)?.discount ?? 0) * 100)}% al cómputo
                </span>
              )}
          </div>
          {draftConfig.serviceId === 'S3' && <p className="text-xs text-textSecondary mt-3">{S3_STORAGE_NOTE}</p>}
          {draftConfig.serviceId === 'CloudFront' && <p className="text-xs text-textSecondary mt-3">Tarifa de transferencia de referencia del primer tramo de 10 TB; no se aplican tarifas escalonadas de tramos superiores.</p>}
          {draftConfig.serviceId === 'EKS' && <p className="text-xs text-textSecondary mt-3">Los nodos (EC2) se agregan aparte. Esta estimación incluye solo el plano de control.</p>}
          {draftConfig.serviceId === 'ECS' && <p className="text-xs text-textSecondary mt-3">Fargate Linux x86.</p>}
          {draftConfig.serviceId === 'IAM' && <p className="text-xs text-textSecondary mt-3">Las identidades IAM se definen en Seguridad e IAM.</p>}
          {draftConfig.serviceId === 'EC2' && draftConfig.storageTypeId === 'io2' && <p className="text-xs text-textSecondary mt-3">io2: se estima el almacenamiento; no incluye IOPS provisionadas porque su tarifa no está definida.</p>}

          <div className="flex flex-col sm:flex-row gap-4 mt-4 print:hidden">
            {/* BOTÓN */}
            <div className="flex flex-1 items-end">
              <button
                onClick={addCost}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {editingId ? <Pencil size={17} /> : <Plus size={17} />}
                {editingId ? 'Actualizar recurso' : 'Agregar recurso'}
              </button>
            </div>
            {editingId && <div className="flex items-end"><button type="button" disabled={isSaving} onClick={cancelEdit} className="flex items-center justify-center gap-2 px-4 py-2.5 border border-cardBorder text-textMain rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"><X size={17} />Cancelar</button></div>}
          </div>

          {/* PREVISUALIZACIÓN */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 rounded-lg">
            <div className="flex flex-col gap-3">
              <div>
                <p className="text-sm text-textSecondary">
                  Costo estimado del recurso
                </p>

                <p className="text-2xl font-bold text-primary dark:text-blue-400">
                  ${estimatedCost.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-textSecondary">
                {estimate.compute > 0 && <div>
                  <p className="text-xs uppercase tracking-wider">{draftConfig.serviceId === 'Route 53' ? 'Zonas / health checks' : draftConfig.serviceId === 'VPC' ? 'Componentes por hora' : 'Cómputo'}</p>
                  <p className="font-semibold text-textMain font-mono">
                    ${estimate.compute.toFixed(2)}
                  </p>
                </div>}

                {estimate.storage > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider">Almacenamiento</p>
                    <p className="font-semibold text-textMain font-mono">
                      ${estimate.storage.toFixed(2)}
                    </p>
                  </div>
                )}

                {estimate.transfer > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider">Transferencia</p>
                    <p className="font-semibold text-textMain font-mono">
                      ${estimate.transfer.toFixed(2)}
                    </p>
                  </div>
                )}

                {estimate.requestsCost > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider">Peticiones API</p>
                    <p className="font-semibold text-textMain font-mono">
                      ${estimate.requestsCost.toFixed(2)}
                    </p>
                  </div>
                )}

                {estimate.effectiveRate !== null && <div>
                  <p className="text-xs uppercase tracking-wider">Tarifa efectiva / hora</p>
                  <p className="font-semibold text-textMain font-mono">
                    ${estimate.effectiveRate.toFixed(4)}/hora
                  </p>
                </div>}

                <div>
                  <p className="text-xs uppercase tracking-wider">Costo anual</p>
                  <p className="font-semibold text-textMain font-mono">
                    ${(estimatedCost * 12).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

          {/* GRÁFICO Y RESUMEN */}
          <div className="costs-side min-w-0 grid grid-cols-1 gap-6">
          <div className="min-w-0 bg-white dark:bg-slate-900 border border-cardBorder rounded-lg p-6 shadow-sm break-inside-avoid">
            <h3 className="text-lg font-semibold text-textMain mb-4">
              Distribución de Costos
            </h3>

            {costDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={costDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${
                        percent ? (percent * 100).toFixed(0) : 0
                      }%`
                    }
                    outerRadius={85}
                    dataKey="value"
                  >
                    {costDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={
                          CHART_COLORS[index % CHART_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={isDark
                      ? { backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9' }
                      : { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                    itemStyle={{ color: isDark ? '#F1F5F9' : undefined }}
                    cursor={{ fill: 'transparent' }}
                    formatter={(value) =>
                      `$${Number(value).toFixed(2)}`
                    }
                  />

                  <Legend
                    formatter={(value) => (
                      <span style={{ color: isDark ? '#CBD5E1' : '#334155' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-textSecondary text-sm">
                No hay datos para mostrar.
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-lg p-6 shadow-sm break-inside-avoid">
            <h3 className="text-lg font-semibold text-textMain mb-4">
              Resumen de Costos
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <p className="text-sm text-textSecondary">
                  Costo Mensual Total
                </p>

                <p className="text-2xl font-bold text-primary dark:text-blue-400">
                  ${totalMonthly.toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                <p className="text-sm text-textSecondary">
                  Costo Anual Total
                </p>

                <p className="text-2xl font-bold text-statusGreen dark:text-green-400">
                  ${totalAnnual.toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                <p className="text-sm text-textSecondary">
                  Recursos Configurados
                </p>

                <p className="text-2xl font-bold text-statusAmber dark:text-amber-400">
                  {resourceTotal}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* TABLA */}
        <div className="costs-table-card min-w-0 bg-white dark:bg-slate-900 border border-cardBorder rounded-lg p-6 shadow-sm break-inside-avoid">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-textMain">
                Desglose Detallado por Servicio
              </h3>

              <p className="text-sm text-textSecondary mt-1">
                Los cambios se aplican automáticamente a la planificación activa.
              </p>
            </div>

            <div className="flex items-center gap-3 print:hidden">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download size={16} />
                CSV
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 border border-cardBorder text-textMain rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Printer size={16} />
                PDF
              </button>
            </div>
          </div>

          <div className="costs-table-scroll overflow-x-auto" tabIndex={0} role="region" aria-label="Desglose de costos, desplazamiento horizontal">
            <table className="costs-table w-full min-w-[1900px]">
              <thead>
                <tr className="border-b border-cardBorder">
                  {TABLE_COLUMNS.map((column, index) => (
                    <th key={column} scope="col" className={`text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary ${index === 0 ? 'sticky left-0 z-20 bg-white dark:bg-slate-900' : ''}`}>
                      {column}
                    </th>
                  ))}
                  <th scope="col" className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary print:hidden">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {tableRows.length === 0 && <tr><td colSpan={TABLE_COLUMNS.length + 1} className="text-center py-10 px-4 text-textSecondary text-sm">Esta planificación no tiene recursos. Agrega uno con el estimador.</td></tr>}
                {tableRows.map((item) => (
                  <tr
                    key={item.id}
                    className="group border-b border-cardBorder hover:bg-gray-50 dark:hover:bg-slate-800/60"
                  >
                    {item.cells.map((value, index) => (
                      <td key={TABLE_COLUMNS[index]} className={`py-3 px-4 text-sm ${index === 0
                        ? 'sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-900 text-textMain font-medium whitespace-nowrap'
                        : index === 12 ? 'text-primary font-medium whitespace-nowrap'
                        : index === 11 ? 'text-textMain font-medium whitespace-nowrap'
                        : index === 10 ? 'text-textSecondary font-mono whitespace-nowrap'
                        : 'text-textSecondary'}`}>
                        {index === 1 && value !== '—' ? (
                          <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[11px] font-medium font-mono">{value}</span>
                        ) : value}
                      </td>
                    ))}

                    <td className="py-3 px-4 text-center print:hidden">
                      <button
                        type="button"
                        onClick={() => editCost(item.id)}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-primary dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                        title="Editar recurso"
                        aria-label={`Editar ${item.service}`}
                      >
                        <Pencil size={17} />
                      </button>
                        <button
                          type="button"
                          onClick={() => removeCost(item.id)}
                          disabled={isSaving}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                           title="Eliminar recurso"
                           aria-label={`Borrar ${item.service}`}
                        >
                          <Trash2 size={17} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}

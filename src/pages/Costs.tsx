import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Printer,
  Plus,
  Trash2,
  Calculator,
  Loader2
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
import { CostCard } from '../components/CostCard';
import { costsData, type CostItem } from '../data/costsData';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config/api';

interface CostRow extends CostItem {
  id: number;
  instanceType?: string;
  pricingModel?: string;
  storageGb?: number;
  os?: string;
  ebsType?: string;
  dataTransferGb?: number;
  apiRequests?: number;
}

interface TableRow {
  id: string | number;
  service: string;
  instanceType: string;
  pricingModel: string;
  quantity: number;
  estimatedHours: number;
  storageGb: number;
  hourlyRate: number;
  monthlyTotal: number;
  annualTotal: number;
  real: boolean;
  osLabel: string;
  storageLabel: string;
  dataTransferGb: number;
  apiRequests: number;
}

interface InstanceOption {
  id: string;
  label: string;
  vcpu: number;
  memory: string;
  hourlyRate: number;
  storagePerGb: number;
}

type SpecField = 'os' | 'storageType' | 'dataTransfer' | 'apiRequests';

interface ServiceOption {
  service: string;
  kind: 'compute' | 'database' | 'storage' | 'network' | 'security';
  instances: InstanceOption[];
  specFields: SpecField[];
  storagePerGb: number;
  storageLabel: string;
}

interface OsOption {
  id: string;
  label: string;
  licensePerVcpuHour: number;
}

interface StorageTypeOption {
  id: string;
  label: string;
  perGb: number;
}

const osOptions: OsOption[] = [
  { id: 'linux', label: 'Linux/UNIX (Amazon Linux 2023)', licensePerVcpuHour: 0 },
  { id: 'rhel', label: 'Red Hat Enterprise Linux', licensePerVcpuHour: 0.0135 },
  { id: 'windows', label: 'Windows Server 2022', licensePerVcpuHour: 0.0223 },
];

const storageTypeOptions: StorageTypeOption[] = [
  { id: 'gp3', label: 'gp3 General Purpose', perGb: 0.08 },
  { id: 'gp2', label: 'gp2 General Purpose', perGb: 0.1 },
  { id: 'io2', label: 'io2 Provisioned IOPS', perGb: 0.125 },
  { id: 'st1', label: 'st1 Throughput Optimized', perGb: 0.045 },
];

const DATA_TRANSFER_OUT_PER_GB = 0.09;
const S3_REQUEST_PRICE_PER_1K = 0.005;
const MAX_MONTHLY_HOURS = 744;

const serviceOptions: ServiceOption[] = [
  {
    service: 'Amazon EC2',
    kind: 'compute',
    specFields: ['os', 'storageType', 'dataTransfer'],
    storagePerGb: 0.08,
    storageLabel: 'Volumen EBS',
    instances: [
      { id: 't3.micro', label: 't3.micro', vcpu: 2, memory: '1 GiB', hourlyRate: 0.0104, storagePerGb: 0.08 },
      { id: 't3.medium', label: 't3.medium', vcpu: 2, memory: '4 GiB', hourlyRate: 0.0416, storagePerGb: 0.08 },
      { id: 't3.large', label: 't3.large', vcpu: 2, memory: '8 GiB', hourlyRate: 0.0832, storagePerGb: 0.08 },
      { id: 'c6i.large', label: 'c6i.large', vcpu: 2, memory: '4 GiB', hourlyRate: 0.085, storagePerGb: 0.08 },
      { id: 'c6i.xlarge', label: 'c6i.xlarge', vcpu: 4, memory: '8 GiB', hourlyRate: 0.17, storagePerGb: 0.08 },
      { id: 'm6i.xlarge', label: 'm6i.xlarge', vcpu: 4, memory: '16 GiB', hourlyRate: 0.192, storagePerGb: 0.08 },
    ],
  },
  {
    service: 'Amazon RDS',
    kind: 'database',
    specFields: ['os', 'storageType', 'dataTransfer'],
    storagePerGb: 0.115,
    storageLabel: 'Almacenamiento RDS',
    instances: [
      { id: 'db.t4g.micro', label: 'db.t4g.micro', vcpu: 2, memory: '1 GiB', hourlyRate: 0.017, storagePerGb: 0.115 },
      { id: 'db.t4g.medium', label: 'db.t4g.medium', vcpu: 2, memory: '4 GiB', hourlyRate: 0.067, storagePerGb: 0.115 },
      { id: 'db.m6g.large', label: 'db.m6g.large', vcpu: 2, memory: '8 GiB', hourlyRate: 0.15, storagePerGb: 0.115 },
      { id: 'db.m6g.xlarge', label: 'db.m6g.xlarge', vcpu: 4, memory: '16 GiB', hourlyRate: 0.30, storagePerGb: 0.115 },
      { id: 'db.r6g.large', label: 'db.r6g.large', vcpu: 2, memory: '16 GiB', hourlyRate: 0.26, storagePerGb: 0.115 },
    ],
  },
  {
    service: 'Amazon S3',
    kind: 'storage',
    specFields: ['dataTransfer', 'apiRequests'],
    storagePerGb: 0.023,
    storageLabel: 'Clase de almacenamiento',
    instances: [
      { id: 'standard', label: 'Standard Storage', vcpu: 0, memory: '—', hourlyRate: 0.023, storagePerGb: 0.023 },
      { id: 'standard-ia', label: 'Standard Infrequent Access', vcpu: 0, memory: '—', hourlyRate: 0.0125, storagePerGb: 0.0125 },
      { id: 'glacier-ir', label: 'Glacier Instant Retrieval', vcpu: 0, memory: '—', hourlyRate: 0.004, storagePerGb: 0.004 },
      { id: 'glacier-deep', label: 'Glacier Deep Archive', vcpu: 0, memory: '—', hourlyRate: 0.00099, storagePerGb: 0.00099 },
    ],
  },
  {
    service: 'Amazon CloudFront',
    kind: 'network',
    specFields: ['dataTransfer'],
    storagePerGb: 0.0,
    storageLabel: 'Transferencia de distribución',
    instances: [
      { id: 'standard', label: 'Standard Distribution', vcpu: 0, memory: '—', hourlyRate: 0.085, storagePerGb: 0 },
      { id: 'caching-optimized', label: 'Caching Optimized', vcpu: 0, memory: '—', hourlyRate: 0.078, storagePerGb: 0 },
      { id: 'custom', label: 'Custom / HTTP', vcpu: 0, memory: '—', hourlyRate: 0.012, storagePerGb: 0 },
    ],
  },
  {
    service: 'Amazon VPC',
    kind: 'network',
    specFields: ['dataTransfer'],
    storagePerGb: 0.0,
    storageLabel: 'Procesamiento de datos (NAT)',
    instances: [
      { id: 'standard', label: 'VPC Estándar', vcpu: 0, memory: '—', hourlyRate: 0.0, storagePerGb: 0 },
      { id: 'nat-gateway', label: 'NAT Gateway', vcpu: 0, memory: '—', hourlyRate: 0.045, storagePerGb: 0 },
      { id: 'vpc-endpoint', label: 'Gateway Endpoint', vcpu: 0, memory: '—', hourlyRate: 0.01, storagePerGb: 0 },
    ],
  },
  {
    service: 'AWS IAM',
    kind: 'security',
    specFields: [],
    storagePerGb: 0.0,
    storageLabel: 'Sin costo adicional',
    instances: [
      { id: 'standard', label: 'IAM Estándar', vcpu: 0, memory: '—', hourlyRate: 0, storagePerGb: 0 },
      { id: 'identity-center', label: 'Identity Center', vcpu: 0, memory: '—', hourlyRate: 0, storagePerGb: 0 },
    ],
  },
];

interface PricingModel {
  id: string;
  label: string;
  discount: number;
}

const pricingModels: PricingModel[] = [
  { id: 'on-demand', label: 'On-Demand (Bajo Demanda)', discount: 0 },
  { id: 'reserved-1y', label: 'Reserved 1 Año', discount: 0.3 },
  { id: 'spot', label: 'Spot', discount: 0.6 },
];

const CHART_COLORS = [
  '#2563EB',
  '#16A34A',
  '#F59E0B',
  '#DC2626',
  '#7C3AED',
  '#0891B2'
];

interface RealCostService {
  id: string;
  name: string;
  monthly: number;
  annual: number;
  quantity?: number;
  simulated?: boolean;
}

interface RealCostsData {
  services: RealCostService[];
  monthlyTotal: number;
  annualTotal: number;
  resourceTotal: number;
  source?: string;
  status?: string;
  iamUsers?: number;
  s3Buckets?: number;
  ec2Instances?: number;
}

const EMPTY_REAL_COSTS: RealCostsData = {
  services: [],
  monthlyTotal: 0,
  annualTotal: 0,
  resourceTotal: 0,
};

function serviceNameToId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function baseQuantityForService(
  service: RealCostService,
  data: RealCostsData
): number {
  if (typeof service.quantity === 'number' && service.quantity > 0) {
    return service.quantity;
  }
  if (service.id === 'ec2') return data.ec2Instances ?? 1;
  if (service.id === 's3') return data.s3Buckets ?? 1;
  if (service.id === 'iam') return data.iamUsers ?? 1;
  return 1;
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function Costs() {
  const { isDark } = useTheme();
  const [costs, setCosts] = useState<CostRow[]>([]);

  const [newService, setNewService] = useState('Amazon EC2');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newHours, setNewHours] = useState(730);
  const [newInstanceType, setNewInstanceType] = useState('t3.micro');
  const [newPricingModel, setNewPricingModel] = useState('on-demand');
  const [newStorageGb, setNewStorageGb] = useState(0);
  const [newOs, setNewOs] = useState('linux');
  const [newStorageType, setNewStorageType] = useState('gp3');
  const [newDataTransferGb, setNewDataTransferGb] = useState(0);
  const [newApiRequests, setNewApiRequests] = useState(0);
  const [realCosts, setRealCosts] = useState<RealCostsData>(EMPTY_REAL_COSTS);
  const [hasRealCosts, setHasRealCosts] = useState(false);
  const [loadingCosts, setLoadingCosts] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadRealCosts = async () => {
      setLoadingCosts(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/costs/real`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Partial<RealCostsData>;
        if (cancelled) return;

        const rawServices = Array.isArray(data.services) ? data.services : [];
        const parsed: RealCostsData = {
          services: rawServices.map((service) => ({
            ...service,
            quantity: baseQuantityForService(service, {
              ...EMPTY_REAL_COSTS,
              iamUsers: data.iamUsers,
              s3Buckets: data.s3Buckets,
              ec2Instances: data.ec2Instances,
            }),
          })),
          monthlyTotal:
            typeof data.monthlyTotal === 'number' ? data.monthlyTotal : 0,
          annualTotal:
            typeof data.annualTotal === 'number' ? data.annualTotal : 0,
          resourceTotal:
            typeof data.resourceTotal === 'number' ? data.resourceTotal : 0,
          source: data.source,
          status: data.status,
          iamUsers: data.iamUsers,
          s3Buckets: data.s3Buckets,
          ec2Instances: data.ec2Instances,
        };
        setRealCosts(parsed);
        setHasRealCosts(data.status === 'ok');
        setCosts([]);
      } catch (err) {
        if (!cancelled) {
          console.error('Error al consultar /api/costs/real en frontend:', err);
          setRealCosts(EMPTY_REAL_COSTS);
          setHasRealCosts(false);
          setCosts(
            costsData.map((item, index) => ({
              ...item,
              id: Date.now() + index,
            }))
          );
        }
      } finally {
        if (!cancelled) setLoadingCosts(false);
      }
    };

    void loadRealCosts();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedService = serviceOptions.find(
    (option) => option.service === newService
  );

  const selectedInstance = useMemo(
    () =>
      serviceOptions
        .find((option) => option.service === newService)
        ?.instances.find((instance) => instance.id === newInstanceType) ??
      serviceOptions
        .find((option) => option.service === newService)
        ?.instances[0],
    [newService, newInstanceType]
  );

  const selectedPricing = useMemo(
    () =>
      pricingModels.find((model) => model.id === newPricingModel) ??
      pricingModels[0],
    [newPricingModel]
  );

  const selectedOs = useMemo(
    () => osOptions.find((option) => option.id === newOs) ?? osOptions[0],
    [newOs]
  );

  const selectedStorageType = useMemo(
    () =>
      storageTypeOptions.find((option) => option.id === newStorageType) ??
      storageTypeOptions[0],
    [newStorageType]
  );

  const computeCost = (
    service: ServiceOption,
    instance: InstanceOption,
    pricing: PricingModel,
    os: OsOption,
    storageType: StorageTypeOption,
    quantity: number,
    hours: number,
    storageGb: number,
    dataTransferGb: number,
    apiRequests: number
  ) => {
    const qty = Math.max(1, quantity);
    const hrs = Math.min(MAX_MONTHLY_HOURS, Math.max(1, hours));
    const gb = Math.max(0, storageGb);
    const dtGb = Math.max(0, dataTransferGb);
    const requests = Math.max(0, apiRequests);

    const license = os.licensePerVcpuHour * Math.max(1, instance.vcpu) * qty * hrs;
    const compute = (instance.hourlyRate * qty * hrs) + license;

    const perGb =
      service.specFields.includes('storageType') ? storageType.perGb : instance.storagePerGb;
    const storage = perGb * gb;

    const transfer = service.specFields.includes('dataTransfer')
      ? DATA_TRANSFER_OUT_PER_GB * dtGb
      : 0;

    const requestsCost = service.specFields.includes('apiRequests')
      ? (requests / 1000) * S3_REQUEST_PRICE_PER_1K
      : 0;

    const subtotal = (compute + storage + transfer + requestsCost) * (1 - pricing.discount);

    return {
      compute,
      storage,
      transfer,
      requestsCost,
      subtotal,
      effectiveRate: subtotal / (qty * hrs),
    };
  };

  const estimate =
    selectedService && selectedInstance && selectedPricing
      ? computeCost(
          selectedService,
          selectedInstance,
          selectedPricing,
          selectedOs,
          selectedStorageType,
          newQuantity,
          newHours,
          newStorageGb,
          newDataTransferGb,
          newApiRequests
        )
      : {
          compute: 0,
          storage: 0,
          transfer: 0,
          requestsCost: 0,
          subtotal: 0,
          effectiveRate: 0,
        };

  const estimatedCost = estimate.subtotal;

  const handleServiceChange = (service: string) => {
    setNewService(service);
    const option = serviceOptions.find((item) => item.service === service);
    setNewInstanceType(option?.instances[0]?.id ?? '');
    setNewStorageGb(0);
    setNewDataTransferGb(0);
    setNewApiRequests(0);
  };

  const totalMonthly = useMemo(() => {
    if (loadingCosts) return 0;
    if (hasRealCosts) return realCosts.monthlyTotal;
    return costs.reduce((sum, item) => sum + item.monthlyTotal, 0);
  }, [costs, hasRealCosts, loadingCosts, realCosts.monthlyTotal]);

  const totalAnnual = useMemo(() => {
    if (loadingCosts) return 0;
    if (hasRealCosts) return realCosts.annualTotal;
    return costs.reduce((sum, item) => sum + item.annualTotal, 0);
  }, [costs, hasRealCosts, loadingCosts, realCosts.annualTotal]);

  const resourceTotal = useMemo(() => {
    if (loadingCosts) return 0;
    if (hasRealCosts) return realCosts.resourceTotal;
    return costs.length;
  }, [costs, hasRealCosts, loadingCosts, realCosts.resourceTotal]);

  const costDistribution = useMemo(() => {
    if (loadingCosts) return [];

    if (hasRealCosts && realCosts.services.length > 0) {
      return realCosts.services
        .filter((service) => service.annual > 0 || service.monthly > 0)
        .map((service) => ({
          name: service.name,
          value: service.annual > 0 ? service.annual : service.monthly * 12,
        }));
    }

    const grouped = costs.reduce<Record<string, number>>((acc, item) => {
      acc[item.service] = (acc[item.service] || 0) + item.annualTotal;
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value
    }));
  }, [costs, hasRealCosts, loadingCosts, realCosts.services]);

  const tableRows = useMemo<TableRow[]>(() => {
    if (loadingCosts) return [];

    if (hasRealCosts && realCosts.services.length > 0) {
      return realCosts.services.map((service) => {
        const quantity = Math.max(1, service.quantity ?? 1);
        const hours = 730;
        const monthly = service.monthly;
        const hourlyRate =
          quantity > 0 && hours > 0 ? monthly / (quantity * hours) : 0;

        return {
          id: `real-${service.id}`,
          service: service.name,
          instanceType: '—',
          pricingModel: 'On-Demand (Cost Explorer)',
          quantity,
          estimatedHours: hours,
          storageGb: 0,
          hourlyRate,
          monthlyTotal: monthly,
          annualTotal: service.annual,
          real: true,
          osLabel: '—',
          storageLabel: '—',
          dataTransferGb: 0,
          apiRequests: 0,
        };
      });
    }

    return costs.map((item) => ({
      id: item.id,
      service: item.service,
      instanceType: item.instanceType ?? '—',
      pricingModel: item.pricingModel ?? 'On-Demand (Bajo Demanda)',
      quantity: item.quantity,
      estimatedHours: item.estimatedHours,
      storageGb: item.storageGb ?? 0,
      hourlyRate: item.hourlyRate,
      monthlyTotal: item.monthlyTotal,
      annualTotal: item.annualTotal,
      real: false,
      osLabel: item.os ?? '—',
      storageLabel: item.ebsType ?? '—',
      dataTransferGb: item.dataTransferGb ?? 0,
      apiRequests: item.apiRequests ?? 0,
    }));
  }, [costs, hasRealCosts, loadingCosts, realCosts]);
  const addCost = () => {
    if (loadingCosts || !selectedService || !selectedInstance || !selectedPricing)
      return;

    const quantity = Math.max(1, newQuantity);
    const hours = Math.min(MAX_MONTHLY_HOURS, Math.max(1, newHours));
    const storageGb = Math.max(0, newStorageGb);
    const result = computeCost(
      selectedService,
      selectedInstance,
      selectedPricing,
      selectedOs,
      selectedStorageType,
      quantity,
      hours,
      storageGb,
      newDataTransferGb,
      newApiRequests
    );
    const monthlyCost = result.subtotal;
    const annualCost = monthlyCost * 12;
    const serviceName = selectedService.service;

    if (hasRealCosts) {
      setRealCosts((prev) => {
        const serviceId = serviceNameToId(serviceName);
        const existingIndex = prev.services.findIndex(
          (s) =>
            s.id === serviceId ||
            s.name.toLowerCase() === serviceName.toLowerCase()
        );

        let nextServices: RealCostService[];
        if (existingIndex >= 0) {
          nextServices = prev.services.map((s, i) => {
            if (i !== existingIndex) return s;
            const baseQty = baseQuantityForService(s, prev);
            return {
              ...s,
              quantity: baseQty + quantity,
              monthly: s.monthly + monthlyCost,
              annual: s.annual + annualCost,
              simulated: true,
            };
          });
        } else {
          nextServices = [
            ...prev.services,
            {
              id: serviceId,
              name: serviceName,
              monthly: monthlyCost,
              annual: annualCost,
              quantity,
              simulated: true,
            },
          ];
        }

        const nextMonthly = nextServices.reduce((sum, s) => sum + s.monthly, 0);
        const nextAnnual = nextServices.reduce((sum, s) => sum + s.annual, 0);
        const nextResources =
          prev.resourceTotal + quantity;

        return {
          ...prev,
          services: nextServices,
          monthlyTotal: Math.round(nextMonthly * 100) / 100,
          annualTotal: Math.round(nextAnnual * 100) / 100,
          resourceTotal: nextResources,
        };
      });
    } else {
      const newItem: CostRow = {
        id: Date.now(),
        service: serviceName,
        quantity,
        estimatedHours: hours,
        hourlyRate: result.effectiveRate,
        monthlyTotal: monthlyCost,
        annualTotal: annualCost,
        instanceType: selectedInstance.label,
        pricingModel: selectedPricing.label,
        storageGb: storageGb > 0 ? storageGb : undefined,
        os: selectedService.specFields.includes('os') ? selectedOs.label : undefined,
        ebsType: selectedService.specFields.includes('storageType')
          ? selectedStorageType.label
          : selectedService.kind === 'storage'
            ? selectedService.storageLabel
            : undefined,
        dataTransferGb:
          newDataTransferGb > 0 && selectedService.specFields.includes('dataTransfer')
            ? newDataTransferGb
            : undefined,
        apiRequests:
          newApiRequests > 0 && selectedService.specFields.includes('apiRequests')
            ? newApiRequests
            : undefined,
      };
      setCosts((prev) => [...prev, newItem]);
    }

    setNewQuantity(1);
    setNewHours(730);
  };

  const removeCost = (id: number) => {
    setCosts((prev) => prev.filter((item) => item.id !== id));
  };

  const exportCSV = () => {
    const headers =
      'Servicio,Configuracion,Modelo de Precios,SO/Licencia,Tipo de Almacenamiento,Cantidad,Horas Est.,Almacenamiento (GB),Egress (GB),Peticiones API,Tarifa/Hora,Total Mensual,Total Anual';

    const rows = tableRows.map(
      (item) =>
        `"${item.service}","${item.instanceType}","${item.pricingModel}","${item.osLabel}","${item.storageLabel}",${item.quantity},${item.estimatedHours},${item.storageGb},${item.dataTransferGb},${item.apiRequests},${item.hourlyRate.toFixed(
          4
        )},${item.monthlyTotal.toFixed(2)},${item.annualTotal.toFixed(2)}`
    );

    const csvContent = [headers, ...rows].join('\n');

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

      <main className="p-4 md:p-6 lg:p-8 bg-background min-h-screen">
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
        <section className="bg-white dark:bg-slate-900 border border-cardBorder rounded-lg p-6 shadow-sm mb-8 break-inside-avoid">
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

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-6 print:hidden">
            {/* SERVICIO */}
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Servicio
              </label>

              <select
                value={newService}
                onChange={(e) => handleServiceChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {serviceOptions.map((option) => (
                  <option key={option.service} value={option.service}>
                    {option.service}
                  </option>
                ))}
              </select>
            </div>

            {/* TIPO DE INSTANCIA / CONFIGURACION */}
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Tipo de Instancia
              </label>

              <select
                value={newInstanceType}
                onChange={(e) => setNewInstanceType(e.target.value)}
                className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {selectedService?.instances.map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.label}
                  </option>
                ))}
              </select>
            </div>

            {/* MODELO DE PRECIOS */}
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Modelo de Precios
              </label>

              <select
                value={newPricingModel}
                onChange={(e) => setNewPricingModel(e.target.value)}
                className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {pricingModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CANTIDAD */}
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Cantidad
              </label>

              <input
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) =>
                  setNewQuantity(Math.max(1, Number(e.target.value)))
                }
                className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* HORAS */}
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Horas estimadas
              </label>

              <input
                type="number"
                min="1"
                max="744"
                value={newHours}
                onChange={(e) =>
                  setNewHours(
                    Math.min(744, Math.max(1, Number(e.target.value)))
                  )
                }
                className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* ALMACENAMIENTO */}
            <div>
              <label className="block text-sm font-medium text-textMain mb-2">
                Almacenamiento (GB)
              </label>

              <input
                type="number"
                min="0"
                step="1"
                value={newStorageGb}
                onChange={(e) =>
                  setNewStorageGb(Math.max(0, Number(e.target.value) || 0))
                }
                className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* ESPECIFICACIONES DINÁMICAS SEGÚN SERVICIO */}
          {selectedService && selectedService.specFields.length > 0 && (
            <div className="mt-4 p-4 rounded-lg border border-cardBorder bg-gray-50 dark:bg-slate-800/40 print:hidden">
              <p className="text-[11px] font-bold uppercase tracking-wider text-textSecondary mb-3">
                Especificaciones de {selectedService.service}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {selectedService.specFields.includes('os') && (
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Sistema Operativo / Licenciamiento
                    </label>

                    <select
                      value={newOs}
                      onChange={(e) => setNewOs(e.target.value)}
                      className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {osOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedService.specFields.includes('storageType') && (
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Tipo de Almacenamiento
                    </label>

                    <select
                      value={newStorageType}
                      onChange={(e) => setNewStorageType(e.target.value)}
                      className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {storageTypeOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label} (${option.perGb.toFixed(3)}/GB)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedService.specFields.includes('dataTransfer') && (
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      {selectedService.kind === 'network'
                        ? 'Datos procesados (GB/mes)'
                        : 'Transferencia de Salida (GB/mes)'}
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={newDataTransferGb}
                      onChange={(e) =>
                        setNewDataTransferGb(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {selectedService.specFields.includes('apiRequests') && (
                  <div>
                    <label className="block text-sm font-medium text-textMain mb-2">
                      Peticiones API (PUT/GET por mes)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={newApiRequests}
                      onChange={(e) =>
                        setNewApiRequests(Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN SELECCIONADA */}
          {selectedInstance && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-textSecondary print:hidden">
              <span className="font-semibold uppercase tracking-wider text-textMain">
                Configuracion
              </span>
              <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                {selectedInstance.vcpu > 0
                  ? `${selectedInstance.vcpu} vCPU · ${selectedInstance.memory}`
                  : selectedInstance.memory}
              </span>

              {selectedService?.specFields.includes('os') && (
                <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                  {selectedOs.label}
                  {selectedOs.licensePerVcpuHour > 0 && (
                    <span className="ml-1 text-statusAmber dark:text-amber-400">
                      +licencia
                    </span>
                  )}
                </span>
              )}

              {selectedService?.specFields.includes('storageType') && (
                <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                  {selectedStorageType.label}
                </span>
              )}

              {newStorageGb > 0 && (
                <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                  {newStorageGb} GB
                </span>
              )}

              {selectedService?.specFields.includes('dataTransfer') &&
                newDataTransferGb > 0 && (
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                    {selectedService.kind === 'network' ? 'Datos' : 'Egress'}{' '}
                    {newDataTransferGb} GB
                  </span>
                )}

              {selectedService?.specFields.includes('apiRequests') &&
                newApiRequests > 0 && (
                  <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800">
                    {newApiRequests.toLocaleString('en-US')} requests
                  </span>
                )}

              {selectedPricing.discount > 0 && (
                <span className="px-2 py-1 rounded-md bg-green-50 dark:bg-green-500/10 text-statusGreen dark:text-green-400 font-semibold">
                  -{Math.round(selectedPricing.discount * 100)}% aplicado
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 print:hidden">
            {/* BOTÓN */}
            <div className="flex items-end">
              <button
                onClick={addCost}
                disabled={loadingCosts}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus size={17} />
                Agregar recurso
              </button>
            </div>
          </div>

          {/* PREVISUALIZACIÓN */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm text-textSecondary">
                  Costo estimado del recurso
                </p>

                <p className="text-2xl font-bold text-primary dark:text-blue-400">
                  ${estimatedCost.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-2 text-sm text-textSecondary">
                <div>
                  <p className="text-xs uppercase tracking-wider">Cómputo</p>
                  <p className="font-semibold text-textMain font-mono">
                    ${estimate.compute.toFixed(2)}
                  </p>
                </div>

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

                <div>
                  <p className="text-xs uppercase tracking-wider">Tarifa efectiva</p>
                  <p className="font-semibold text-textMain font-mono">
                    ${estimate.effectiveRate.toFixed(4)}/hora
                  </p>
                </div>

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

        {/* REPORTE ESTRUCTURADO: indicadores, distribución y desglose */}
        <div>
          {/* GRÁFICO Y RESUMEN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-lg p-6 shadow-sm break-inside-avoid">
            <h3 className="text-lg font-semibold text-textMain mb-4">
              Distribución de Costos
            </h3>

            {loadingCosts ? (
              <div className="h-[320px] flex flex-col items-center justify-center gap-3 text-textSecondary text-sm">
                <Loader2 size={28} className="animate-spin text-primary" />
                <span>Cargando distribución de costos…</span>
                <div className="w-40 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-primary/60 animate-pulse rounded-full" />
                </div>
              </div>
            ) : costDistribution.length > 0 ? (
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

                {loadingCosts ? (
                  <div className="h-8 w-28 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-primary dark:text-blue-400">
                    ${totalMonthly.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                <p className="text-sm text-textSecondary">
                  Costo Anual Total
                </p>

                {loadingCosts ? (
                  <div className="h-8 w-28 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-statusGreen dark:text-green-400">
                    ${totalAnnual.toFixed(2)}
                  </p>
                )}
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                <p className="text-sm text-textSecondary">
                  Recursos Configurados
                </p>

                {loadingCosts ? (
                  <div className="h-8 w-16 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-statusAmber dark:text-amber-400">
                    {resourceTotal}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TABLA */}
        <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-lg p-6 shadow-sm break-inside-avoid">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-textMain">
                Desglose Detallado por Servicio
              </h3>

              <p className="text-sm text-textSecondary mt-1">
                {loadingCosts
                  ? 'Consultando Cost Explorer y recursos reales en AWS…'
                  : hasRealCosts
                    ? 'Datos reales desde /api/costs/real · valores se actualizan al cargar la vista.'
                    : 'Los valores se actualizan automáticamente al agregar recursos.'}
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

          <div className="overflow-x-auto">
            {loadingCosts ? (
              <div className="py-10 flex flex-col items-center gap-3 text-textSecondary text-sm">
                <Loader2 size={28} className="animate-spin text-primary" />
                <span>Consultando Cost Explorer y recursos reales en AWS…</span>
              </div>
            ) : (
            <table className="w-full min-w-[1180px]">
              <thead>
                <tr className="border-b border-cardBorder">
                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Servicio
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Configuración
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Modelo de Precios
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    SO / Licencia
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Tipo de Almacen.
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Cant.
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Horas Est.
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Almacen.
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Egress / API
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Tarifa/Hora
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Total Mensual
                  </th>

                  <th className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary">
                    Total Anual
                  </th>

                  <th className="text-center py-3 px-4 text-xs font-semibold uppercase tracking-wider text-textSecondary print:hidden">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {tableRows.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-cardBorder hover:bg-gray-50 dark:hover:bg-slate-800/60"
                  >
                    <td className="py-3 px-4 text-sm text-textMain font-medium whitespace-nowrap">
                      {item.service}
                    </td>

                    <td className="py-3 px-4 text-sm text-textSecondary">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[11px] font-medium font-mono whitespace-nowrap">
                        {item.instanceType}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-sm text-textSecondary">
                      {item.pricingModel}
                    </td>

                    <td className="py-3 px-4 text-xs text-textSecondary">
                      {item.osLabel}
                    </td>

                    <td className="py-3 px-4 text-xs text-textSecondary">
                      {item.storageLabel}
                    </td>

                    <td className="py-3 px-4 text-sm text-textSecondary">
                      {item.quantity}
                    </td>

                    <td className="py-3 px-4 text-sm text-textSecondary">
                      {item.estimatedHours}
                    </td>

                    <td className="py-3 px-4 text-sm text-textSecondary whitespace-nowrap">
                      {item.storageGb > 0 ? `${item.storageGb} GB` : '—'}
                    </td>

                    <td className="py-3 px-4 text-xs text-textSecondary whitespace-nowrap">
                      {item.dataTransferGb > 0 ? (
                        <span className="text-primary dark:text-blue-400">
                          {item.dataTransferGb} GB
                        </span>
                      ) : item.apiRequests > 0 ? (
                        <span className="text-primary dark:text-blue-400">
                          {item.apiRequests.toLocaleString('en-US')} req
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3 px-4 text-sm text-textSecondary font-mono whitespace-nowrap">
                      ${item.hourlyRate.toFixed(4)}
                    </td>

                    <td className="py-3 px-4 text-sm text-textMain font-medium whitespace-nowrap">
                      ${item.monthlyTotal.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-sm text-primary font-medium whitespace-nowrap">
                      ${item.annualTotal.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center print:hidden">
                      {!item.real && (
                        <button
                          onClick={() => removeCost(item.id as number)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          title="Eliminar recurso"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>

          {!loadingCosts && tableRows.length === 0 && (
            <div className="text-center py-10 text-textSecondary text-sm">
              No hay recursos configurados. Agrega un servicio para comenzar.
            </div>
          )}
        </div>
        </div>

        {/* CARDS (duplican la tabla: solo pantalla) */}
        {!loadingCosts && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
          {hasRealCosts && realCosts.services.length > 0
            ? realCosts.services.map((service) => (
                <div key={service.id} className="break-inside-avoid">
                  <CostCard
                    service={service.name}
                    monthlyTotal={service.monthly}
                    annualTotal={service.annual}
                    quantity={Math.max(1, service.quantity ?? 1)}
                  />
                </div>
              ))
            : costs.map((item) => (
                <div key={item.id} className="break-inside-avoid">
                  <CostCard
                    service={item.service}
                    monthlyTotal={item.monthlyTotal}
                    annualTotal={item.annualTotal}
                    quantity={item.quantity}
                  />
                </div>
              ))}
        </div>
        )}
      </main>
    </>
  );
}
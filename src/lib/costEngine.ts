export interface InstanceOption {
  id: string;
  label: string;
  vcpu: number;
  memory: string;
  hourlyRate: number;
  storagePerGb: number;
}

export type SpecField = 'os' | 'storageType' | 'dataTransfer' | 'apiRequests';

export interface ServiceOption {
  service: string;
  kind: 'compute' | 'database' | 'storage' | 'network' | 'security';
  instances: InstanceOption[];
  specFields: SpecField[];
  storagePerGb: number;
  storageLabel: string;
}

export interface OsOption {
  id: string;
  label: string;
  licensePerVcpuHour: number;
}

export interface StorageTypeOption {
  id: string;
  label: string;
  perGb: number;
}

// Tablas existentes trasladadas desde Costs.tsx sin cambiar tarifas ni lógica.
export const osOptions: OsOption[] = [
  { id: 'linux', label: 'Linux/UNIX (Amazon Linux 2023)', licensePerVcpuHour: 0 },
  { id: 'rhel', label: 'Red Hat Enterprise Linux', licensePerVcpuHour: 0.0135 },
  { id: 'windows', label: 'Windows Server 2022', licensePerVcpuHour: 0.0223 },
];

export const storageTypeOptions: StorageTypeOption[] = [
  { id: 'gp3', label: 'gp3 General Purpose', perGb: 0.08 },
  { id: 'gp2', label: 'gp2 General Purpose', perGb: 0.1 },
  { id: 'io2', label: 'io2 Provisioned IOPS', perGb: 0.125 },
  { id: 'st1', label: 'st1 Throughput Optimized', perGb: 0.045 },
];

export const DATA_TRANSFER_OUT_PER_GB = 0.09;
export const S3_REQUEST_PRICE_PER_1K = 0.005;
export const MAX_MONTHLY_HOURS = 744;

// Catálogo de los seis servicios originales; los ampliados se mantienen separados.
export const serviceOptions: ServiceOption[] = [
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

export interface PricingModel {
  id: string;
  label: string;
  discount: number;
}

export const pricingModels: PricingModel[] = [
  { id: 'on-demand', label: 'On-Demand (Bajo Demanda)', discount: 0 },
  { id: 'reserved-1y', label: 'Reserved 1 Año', discount: 0.3 },
  { id: 'spot', label: 'Spot', discount: 0.6 },
];

export const computeCost = (
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
  // Firma compatible para consumidores existentes; solo existe el cálculo nuevo.
  const serviceId = Object.entries(SERVICE_NAMES).find(([, name]) => name === service.service)?.[0];
  return estimateCostConfig(normalizeCostConfig({
    serviceId, instanceId: instance.id, pricingModelId: pricing.id, osId: os.id,
    storageTypeId: storageType.id, quantity, hours, storageGb, dataTransferGb, apiRequests,
  }));
};

export type OriginalPlanningServiceId = 'EC2' | 'RDS' | 'S3' | 'CloudFront' | 'VPC' | 'IAM';
export type PlanningServiceId = OriginalPlanningServiceId | 'ECS' | 'EKS' | 'Lambda' | 'Route 53';

export interface OriginalCostConfig {
  serviceId: OriginalPlanningServiceId;
  instanceId: string;
  pricingModelId: string;
  osId: string;
  storageTypeId: string;
  quantity: number;
  hours: number;
  storageGb: number;
  dataTransferGb: number;
  apiRequests: number;
}

export interface Ec2CostConfig extends OriginalCostConfig {
  serviceId: 'EC2';
}

export interface RdsCostConfig {
  serviceId: 'RDS';
  engine: 'mysql' | 'postgresql' | 'mariadb';
  instanceId: string;
  pricingModelId: string;
  quantity: number;
  hours: number;
  multiAz: boolean;
  storageTypeId: 'gp2' | 'gp3';
  storageGb: number;
}

export interface S3CostConfig {
  serviceId: 'S3';
  pricingModelId: 'on-demand';
  quantity: number;
  classId: string;
  storageGb: number;
  putRequests: number;
  getRequests: number;
  dataTransferGb: number;
}

export interface CloudFrontCostConfig {
  serviceId: 'CloudFront';
  pricingModelId: 'on-demand';
  quantity: number;
  dataTransferGb: number;
  httpRequests: number;
  httpsRequests: number;
}

export interface VpcCostConfig {
  serviceId: 'VPC';
  pricingModelId: 'on-demand';
  resourceType: 'vpc' | 'gateway-endpoint' | 'nat-gateway' | 'interface-endpoint';
  quantity: number;
  hours: number;
  processedGb: number;
}

export interface IamCostConfig {
  serviceId: 'IAM';
  pricingModelId: 'on-demand';
  users: number;
  roles: number;
  policies: number;
}

export interface EcsCostConfig {
  serviceId: 'ECS';
  pricingModelId: 'on-demand';
  vcpu: number;
  memoryGb: number;
  quantity: number;
  hours: number;
  architecture: 'x86';
}

export interface EksCostConfig {
  serviceId: 'EKS';
  pricingModelId: 'on-demand';
  support: 'standard' | 'extended';
  quantity: number;
  hours: number;
}

export interface LambdaCostConfig {
  serviceId: 'Lambda';
  pricingModelId: 'on-demand';
  quantity: number;
  invocations: number;
  durationMs: number;
  memoryMb: number;
  architecture: 'x86' | 'arm';
}

export interface Route53CostConfig {
  serviceId: 'Route 53';
  pricingModelId: 'on-demand';
  hostedZones: number;
  queries: number;
  routingType: 'standard' | 'latency' | 'geolocation';
  healthChecks: number;
}

export type CostConfig = Ec2CostConfig | RdsCostConfig | S3CostConfig | CloudFrontCostConfig | VpcCostConfig | IamCostConfig | EcsCostConfig | EksCostConfig | LambdaCostConfig | Route53CostConfig;

export interface CostLine {
  id: string;
  planningServiceId: PlanningServiceId;
  serviceName: string;
  // Se acepta el formato guardado anterior como entrada, no como modelo de cálculo.
  config: CostConfig | OriginalCostConfig;
  monthly: number;
  annual: number;
}

export interface NormalizedCostLine extends Omit<CostLine, 'config'> {
  config: CostConfig;
}

export const SERVICE_NAMES: Record<PlanningServiceId, string> = {
  EC2: 'Amazon EC2', RDS: 'Amazon RDS', S3: 'Amazon S3',
  CloudFront: 'Amazon CloudFront', VPC: 'Amazon VPC', IAM: 'AWS IAM',
  ECS: 'Amazon ECS', EKS: 'Amazon EKS', Lambda: 'AWS Lambda', 'Route 53': 'Amazon Route 53',
};

// Fuentes de referencia AWS: tarifas proporcionadas para esta integración,
// octubre de 2026 (oct 2026), región us-east-1. No se consulta una API de precios.
// Fargate Linux x86: https://aws.amazon.com/fargate/pricing/
// EKS, solo plano de control: https://aws.amazon.com/eks/pricing/
// Lambda, sin capa gratuita: https://aws.amazon.com/lambda/pricing/
// Route 53: https://aws.amazon.com/route53/pricing/
export const EXTENDED_RATES = {
  fargate: { perVcpuHour: 0.0404784, perGbHour: 0.004446 },
  eks: { standardClusterHour: 0.10, extendedClusterHour: 0.60 },
  lambda: { x86GbSecond: 0.0000166667, armGbSecond: 0.0000133334, perMillionRequests: 0.20 },
  route53: {
    firstZoneCount: 25, firstZoneMonthly: 0.50, additionalZoneMonthly: 0.10,
    firstQueryCount: 1_000_000_000,
    standardPerMillion: 0.40, latencyPerMillion: 0.60, geolocationPerMillion: 0.70,
    additionalQueryRateFactor: 0.5, healthCheckMonthly: 0.50,
  },
} as const;

// Referencias us-east-1, sin capa gratuita, octubre de 2026. Tarifas autorizadas
// para esta integración: https://aws.amazon.com/cloudfront/pricing/
// https://aws.amazon.com/rds/pricing/ https://aws.amazon.com/s3/pricing/
// https://aws.amazon.com/vpc/pricing/ . No se consulta una API de precios.
export const SERVICE_RATES = {
  // Transferencia CloudFront: referencia del primer tramo de 10 TB.
  cloudFront: { outputGb: 0.085, httpPerTenThousand: 0.0075, httpsPerTenThousand: 0.0100 },
  rds: { storageGbMonth: 0.115 },
  s3: { putPerThousand: 0.005, getPerThousand: 0.0004 },
  vpc: { natHour: 0.045, natGb: 0.045, interfaceHour: 0.01, interfaceGb: 0.01 },
} as const;
export const S3_STORAGE_NOTE = 'No incluye cargos de recuperación ni mínimos de las clases distintas de Standard.';
export const FARGATE_MEMORY_OPTIONS: Record<number, number[]> = {
  0.25: [0.5, 1, 2], 0.5: [1, 2, 3, 4],
  1: [2, 3, 4, 5, 6, 7, 8],
  2: Array.from({ length: 13 }, (_, index) => index + 4),
  4: Array.from({ length: 23 }, (_, index) => index + 8),
};

// Catálogo ampliado separado del original, con On-Demand como único modelo.
export const extendedServiceOptions = {
  ECS: {
    service: SERVICE_NAMES.ECS,
    pricingModels: [pricingModels[0]],
    instances: [
      { id: 'fargate-025-05', label: 'Fargate Linux x86 · 0.25 vCPU / 0.5 GB', vcpu: 0.25, memoryGb: 0.5 },
      { id: 'fargate-05-1', label: 'Fargate Linux x86 · 0.5 vCPU / 1 GB', vcpu: 0.5, memoryGb: 1 },
      { id: 'fargate-1-2', label: 'Fargate Linux x86 · 1 vCPU / 2 GB', vcpu: 1, memoryGb: 2 },
      { id: 'fargate-2-4', label: 'Fargate Linux x86 · 2 vCPU / 4 GB', vcpu: 2, memoryGb: 4 },
      { id: 'fargate-4-8', label: 'Fargate Linux x86 · 4 vCPU / 8 GB', vcpu: 4, memoryGb: 8 },
    ],
  },
  EKS: {
    service: SERVICE_NAMES.EKS,
    pricingModels: [pricingModels[0]],
    instances: [
      { id: 'standard', label: 'Soporte estándar · No incluye nodos (EC2 aparte)', hourlyRate: EXTENDED_RATES.eks.standardClusterHour },
      { id: 'extended', label: 'Soporte extendido · No incluye nodos (EC2 aparte)', hourlyRate: EXTENDED_RATES.eks.extendedClusterHour },
    ],
  },
  Lambda: {
    service: SERVICE_NAMES.Lambda,
    pricingModels: [pricingModels[0]],
    architectures: [
      { id: 'x86', label: 'x86', gbSecondRate: EXTENDED_RATES.lambda.x86GbSecond },
      { id: 'arm', label: 'Arm', gbSecondRate: EXTENDED_RATES.lambda.armGbSecond },
    ],
  },
  'Route 53': {
    service: SERVICE_NAMES['Route 53'],
    pricingModels: [pricingModels[0]],
    routingOptions: [
      { id: 'standard', label: 'Estándar', perMillion: EXTENDED_RATES.route53.standardPerMillion },
      { id: 'latency', label: 'Latencia', perMillion: EXTENDED_RATES.route53.latencyPerMillion },
      { id: 'geolocation', label: 'Geolocalización', perMillion: EXTENDED_RATES.route53.geolocationPerMillion },
    ],
  },
} as const;

// Configuración por defecto centralizada. Los seis originales usan su primera opción.
export const ORIGINAL_COST_DEFAULTS = {
  pricingModelId: 'on-demand', osId: 'linux', storageTypeId: 'gp3',
  quantity: 1, hours: 730, storageGb: 0, dataTransferGb: 0, apiRequests: 0,
} as const;

function originalDefault(serviceId: OriginalPlanningServiceId): OriginalCostConfig {
  const service = serviceOptions.find((option) => option.service === SERVICE_NAMES[serviceId]);
  if (!service) throw new Error(`Servicio sin configuración: ${serviceId}`);
  return { serviceId, instanceId: service.instances[0].id, ...ORIGINAL_COST_DEFAULTS };
}

export const DEFAULT_COST_CONFIGS = {
  EC2: { ...originalDefault('EC2'), serviceId: 'EC2' },
  RDS: { serviceId: 'RDS', engine: 'mysql', instanceId: 'db.t4g.micro', pricingModelId: 'on-demand', quantity: 1, hours: 730, multiAz: false, storageTypeId: 'gp3', storageGb: 0 },
  S3: { serviceId: 'S3', pricingModelId: 'on-demand', quantity: 1, classId: 'standard', storageGb: 0, putRequests: 0, getRequests: 0, dataTransferGb: 0 },
  CloudFront: { serviceId: 'CloudFront', pricingModelId: 'on-demand', quantity: 1, dataTransferGb: 0, httpRequests: 0, httpsRequests: 0 },
  VPC: { serviceId: 'VPC', pricingModelId: 'on-demand', resourceType: 'vpc', quantity: 1, hours: 730, processedGb: 0 },
  IAM: { serviceId: 'IAM', pricingModelId: 'on-demand', users: 0, roles: 0, policies: 0 },
  ECS: { serviceId: 'ECS', pricingModelId: 'on-demand', vcpu: 0.25, memoryGb: 0.5, quantity: 1, hours: 730, architecture: 'x86' },
  EKS: { serviceId: 'EKS', pricingModelId: 'on-demand', support: 'standard', quantity: 1, hours: 730 },
  Lambda: { serviceId: 'Lambda', pricingModelId: 'on-demand', quantity: 1, invocations: 1_000_000, durationMs: 200, memoryMb: 512, architecture: 'x86' },
  'Route 53': { serviceId: 'Route 53', pricingModelId: 'on-demand', hostedZones: 1, queries: 1_000_000, routingType: 'standard', healthChecks: 0 },
} satisfies Record<PlanningServiceId, CostConfig>;

function enumValue<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === 'string' && options.includes(value as T) ? value as T : fallback;
}

export function normalizeCostConfig(value: unknown, fallbackServiceId?: string): CostConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuración de costos no válida.');
  const raw = value as Record<string, unknown>;
  const serviceId = raw.serviceId ?? fallbackServiceId;
  if (typeof serviceId !== 'string' || !Object.prototype.hasOwnProperty.call(DEFAULT_COST_CONFIGS, serviceId)) throw new Error('Servicio no disponible.');
  const number = (key: string, fallback: number, alias?: string) => {
    const input = raw[key] ?? (alias ? raw[alias] : undefined) ?? fallback;
    if (typeof input !== 'number' || !Number.isFinite(input) || input < 0) throw new Error(`Valor no válido para ${key}.`);
    return input;
  };
  const quantity = () => Math.max(1, number('quantity', 1));
  const hours = () => Math.min(MAX_MONTHLY_HOURS, Math.max(1, number('hours', 730)));
  const instance = (id: OriginalPlanningServiceId, fallback: string) => {
    const selected = typeof raw.instanceId === 'string' ? raw.instanceId : fallback;
    if (!serviceOptions.find((option) => option.service === SERVICE_NAMES[id])?.instances.some((option) => option.id === selected)) throw new Error('Clase de instancia no disponible.');
    return selected;
  };
  switch (serviceId) {
    case 'EC2': return {
      serviceId, instanceId: instance('EC2', 't3.micro'),
      pricingModelId: enumValue(raw.pricingModelId, ['on-demand', 'reserved-1y', 'spot'], 'on-demand'),
      osId: enumValue(raw.osId, ['linux', 'rhel', 'windows'], 'linux'),
      storageTypeId: enumValue(raw.storageTypeId, ['gp3', 'gp2', 'io2', 'st1'], 'gp3'),
      quantity: quantity(), hours: hours(), storageGb: number('storageGb', 0), dataTransferGb: number('dataTransferGb', 0), apiRequests: number('apiRequests', 0),
    };
    case 'RDS': return {
      serviceId, engine: enumValue(raw.engine, ['mysql', 'postgresql', 'mariadb'], 'mysql'), instanceId: instance('RDS', 'db.t4g.micro'),
      pricingModelId: enumValue(raw.pricingModelId, ['on-demand', 'reserved-1y'], 'on-demand'),
      quantity: quantity(), hours: hours(), multiAz: raw.multiAz === true,
      // io2/st1 eran opciones compartidas de EBS; RDS se normaliza a gp3.
      storageTypeId: enumValue(raw.storageTypeId, ['gp2', 'gp3'], 'gp3'), storageGb: number('storageGb', 0),
    };
    case 'S3': {
      const classId = typeof raw.classId === 'string' ? raw.classId : typeof raw.instanceId === 'string' ? raw.instanceId : 'standard';
      if (!serviceOptions.find((option) => option.service === SERVICE_NAMES.S3)?.instances.some((option) => option.id === classId)) throw new Error('Clase de S3 no disponible.');
      return {
        serviceId, pricingModelId: 'on-demand', quantity: quantity(), classId, storageGb: number('storageGb', 0),
        // El contador combinado antiguo usaba la tarifa PUT; se conserva en ese grupo.
        putRequests: number('putRequests', 0, 'apiRequests'), getRequests: number('getRequests', 0), dataTransferGb: number('dataTransferGb', 0),
      };
    }
    case 'CloudFront': return {
      serviceId, pricingModelId: 'on-demand', quantity: quantity(), dataTransferGb: number('dataTransferGb', 0),
      httpRequests: number('httpRequests', 0), httpsRequests: number('httpsRequests', 0),
    };
    case 'VPC': {
      // Se conserva la elección antigua etiquetada Gateway Endpoint; ahora es
      // gratuita. No se infiere que fuese interface a partir de su tarifa errónea.
      const previousType = raw.instanceId === 'nat-gateway' ? 'nat-gateway'
        : raw.instanceId === 'vpc-endpoint' || raw.instanceId === 'gateway-endpoint' ? 'gateway-endpoint'
        : raw.instanceId === 'interface-endpoint' ? 'interface-endpoint' : 'vpc';
      return { serviceId, pricingModelId: 'on-demand', resourceType: enumValue(raw.resourceType, ['vpc', 'gateway-endpoint', 'nat-gateway', 'interface-endpoint'], previousType), quantity: quantity(), hours: hours(), processedGb: number('processedGb', 0, 'dataTransferGb') };
    }
    case 'IAM': return { serviceId, pricingModelId: 'on-demand', users: number('users', 0, 'quantity'), roles: number('roles', 0), policies: number('policies', 0) };
    case 'ECS': {
      const vcpu = number('vcpu', 0.25);
      const memoryOptions = FARGATE_MEMORY_OPTIONS[vcpu];
      const memoryGb = number('memoryGb', memoryOptions?.[0] ?? 0.5);
      if (!memoryOptions?.includes(memoryGb)) throw new Error('Combinación de vCPU y memoria no disponible en Fargate.');
      return { serviceId, pricingModelId: 'on-demand', quantity: quantity(), hours: hours(), vcpu, memoryGb, architecture: 'x86' };
    }
    case 'EKS': return { serviceId, pricingModelId: 'on-demand', quantity: quantity(), hours: hours(), support: enumValue(raw.support, ['standard', 'extended'], 'standard') };
    case 'Lambda': return {
      serviceId, pricingModelId: 'on-demand', quantity: quantity(), invocations: number('invocations', 1_000_000), durationMs: number('durationMs', 200), memoryMb: number('memoryMb', 512), architecture: enumValue(raw.architecture, ['x86', 'arm'], 'x86'),
    };
    case 'Route 53': return {
      serviceId, pricingModelId: 'on-demand', hostedZones: number('hostedZones', 1), queries: number('queries', 1_000_000), routingType: enumValue(raw.routingType, ['standard', 'latency', 'geolocation'], 'standard'), healthChecks: number('healthChecks', 0),
    };
    default: throw new Error('Servicio no disponible.');
  }
}

export function estimateCostConfig(value: unknown) {
  const config = normalizeCostConfig(value);
  let compute = 0;
  let storage = 0;
  let transfer = 0;
  let requestsCost = 0;
  let effectiveRate: number | null = null;
  const discount = pricingModels.find((option) => option.id === config.pricingModelId)?.discount ?? 0;
  switch (config.serviceId) {
    case 'EC2': {
      const instance = serviceOptions.find((option) => option.service === SERVICE_NAMES.EC2)!.instances.find((option) => option.id === config.instanceId)!;
      const license = osOptions.find((option) => option.id === config.osId)!.licensePerVcpuHour * Math.max(1, instance.vcpu);
      compute = (instance.hourlyRate + license) * config.quantity * config.hours * (1 - discount);
      storage = storageTypeOptions.find((option) => option.id === config.storageTypeId)!.perGb * config.storageGb;
      transfer = config.dataTransferGb * DATA_TRANSFER_OUT_PER_GB;
      break;
    }
    case 'RDS': {
      const instance = serviceOptions.find((option) => option.service === SERVICE_NAMES.RDS)!.instances.find((option) => option.id === config.instanceId)!;
      const replicas = config.multiAz ? 2 : 1;
      compute = instance.hourlyRate * config.quantity * config.hours * (1 - discount) * replicas;
      storage = config.storageGb * SERVICE_RATES.rds.storageGbMonth * replicas;
      break;
    }
    case 'S3': {
      const selected = serviceOptions.find((option) => option.service === SERVICE_NAMES.S3)!.instances.find((option) => option.id === config.classId)!;
      storage = config.storageGb * selected.storagePerGb;
      requestsCost = config.putRequests / 1000 * SERVICE_RATES.s3.putPerThousand + config.getRequests / 1000 * SERVICE_RATES.s3.getPerThousand;
      transfer = config.dataTransferGb * DATA_TRANSFER_OUT_PER_GB;
      break;
    }
    case 'CloudFront':
      transfer = config.dataTransferGb * SERVICE_RATES.cloudFront.outputGb;
      requestsCost = config.httpRequests / 10000 * SERVICE_RATES.cloudFront.httpPerTenThousand + config.httpsRequests / 10000 * SERVICE_RATES.cloudFront.httpsPerTenThousand;
      break;
    case 'VPC': {
      if (config.resourceType === 'nat-gateway' || config.resourceType === 'interface-endpoint') {
        const hourly = config.resourceType === 'nat-gateway' ? SERVICE_RATES.vpc.natHour : SERVICE_RATES.vpc.interfaceHour;
        const perGb = config.resourceType === 'nat-gateway' ? SERVICE_RATES.vpc.natGb : SERVICE_RATES.vpc.interfaceGb;
        compute = config.quantity * config.hours * hourly;
        transfer = config.processedGb * perGb;
      }
      break;
    }
    case 'IAM': break;
    case 'ECS':
      compute = config.quantity * config.hours * (config.vcpu * EXTENDED_RATES.fargate.perVcpuHour + config.memoryGb * EXTENDED_RATES.fargate.perGbHour);
      break;
    case 'EKS':
      compute = config.quantity * config.hours * (config.support === 'standard' ? EXTENDED_RATES.eks.standardClusterHour : EXTENDED_RATES.eks.extendedClusterHour);
      break;
    case 'Lambda': {
      const invocations = config.quantity * config.invocations;
      const gbSeconds = invocations * (config.durationMs / 1000) * (config.memoryMb / 1024);
      compute = gbSeconds * (config.architecture === 'x86' ? EXTENDED_RATES.lambda.x86GbSecond : EXTENDED_RATES.lambda.armGbSecond);
      requestsCost = invocations / 1_000_000 * EXTENDED_RATES.lambda.perMillionRequests;
      break;
    }
    case 'Route 53': {
      const routing = extendedServiceOptions['Route 53'].routingOptions.find((option) => option.id === config.routingType)!;
      const rates = EXTENDED_RATES.route53;
      compute = Math.min(config.hostedZones, rates.firstZoneCount) * rates.firstZoneMonthly
        + Math.max(0, config.hostedZones - rates.firstZoneCount) * rates.additionalZoneMonthly;
      requestsCost = Math.min(config.queries, rates.firstQueryCount) / 1_000_000 * routing.perMillion
        + Math.max(0, config.queries - rates.firstQueryCount) / 1_000_000 * routing.perMillion * rates.additionalQueryRateFactor;
      compute += config.healthChecks * rates.healthCheckMonthly;
      break;
    }
  }
  const subtotal = compute + storage + transfer + requestsCost;
  if (!Number.isFinite(subtotal)) throw new Error('El costo calculado no es un número finito.');
  if ('hours' in config && 'quantity' in config && !(config.serviceId === 'VPC' && (config.resourceType === 'vpc' || config.resourceType === 'gateway-endpoint'))) effectiveRate = subtotal / (config.quantity * config.hours);
  return { compute, storage, transfer, requestsCost, subtotal, effectiveRate };
}

export function computeLineCost(config: unknown): { monthly: number; annual: number } {
  const monthly = estimateCostConfig(config).subtotal;
  return { monthly, annual: monthly * 12 };
}

export function normalizeCostLine(line: CostLine): NormalizedCostLine {
  const config = normalizeCostConfig(line.config, line.planningServiceId);
  return { ...line, config, ...computeLineCost(config) };
}

export function buildDefaultCostLines(serviceIds: string[]): NormalizedCostLine[] {
  // Una línea por servicio, sin asignar tarifas inventadas a ids desconocidos.
  return [...new Set(serviceIds)].filter((id) => Object.prototype.hasOwnProperty.call(DEFAULT_COST_CONFIGS, id)).map((id) => {
    const planningServiceId = id as PlanningServiceId;
    const config: CostConfig = { ...DEFAULT_COST_CONFIGS[planningServiceId] };
    return {
      id: crypto.randomUUID(), planningServiceId, serviceName: SERVICE_NAMES[planningServiceId],
      config, ...computeLineCost(config),
    };
  });
}

export function isCostLine(value: unknown): value is CostLine {
  if (!value || typeof value !== 'object') return false;
  const line = value as Partial<CostLine>;
  if (typeof line.id !== 'string' || typeof line.serviceName !== 'string'
    || !line.config || typeof line.config !== 'object'
    || line.planningServiceId !== line.config.serviceId
    || typeof line.monthly !== 'number' || !Number.isFinite(line.monthly) || line.monthly < 0
    || typeof line.annual !== 'number' || !Number.isFinite(line.annual) || line.annual < 0) return false;
  try {
    computeLineCost(line.config);
    return true;
  } catch {
    return false;
  }
}

// Descripción para las vistas: no modifica tarifas, configuración ni cálculos.
export function describeCostLine(line: CostLine): { quantity: number; option: string } {
  const config = normalizeCostConfig(line.config, line.planningServiceId);
  switch (config.serviceId) {
    case 'EC2':
      return { quantity: config.quantity, option: config.instanceId };
    case 'RDS':
      return { quantity: config.quantity, option: `${config.instanceId} · ${config.engine} · ${config.multiAz ? 'Multi-AZ' : 'Single-AZ'} · ${config.storageTypeId}` };
    case 'S3':
      return { quantity: config.quantity, option: `${serviceOptions.find((service) => service.service === SERVICE_NAMES.S3)!.instances.find((instance) => instance.id === config.classId)!.label} · ${config.storageGb} GB` };
    case 'CloudFront':
      return { quantity: config.quantity, option: `${config.dataTransferGb} GB de salida · ${config.httpRequests.toLocaleString('en-US')} HTTP / ${config.httpsRequests.toLocaleString('en-US')} HTTPS` };
    case 'VPC': {
      const labels = { vpc: 'VPC (sin cargo)', 'gateway-endpoint': 'Gateway Endpoint (sin cargo)', 'nat-gateway': 'NAT Gateway', 'interface-endpoint': 'Interface Endpoint' };
      return { quantity: config.quantity, option: `${labels[config.resourceType]}${config.resourceType === 'nat-gateway' || config.resourceType === 'interface-endpoint' ? ` · ${config.processedGb} GB procesados` : ''}` };
    }
    case 'IAM':
      return { quantity: 1, option: 'Las identidades IAM se definen en Seguridad e IAM.' };
    case 'ECS':
      return {
        quantity: config.quantity,
        option: extendedServiceOptions.ECS.instances.find((instance) => instance.vcpu === config.vcpu && instance.memoryGb === config.memoryGb)?.label
          ?? `${config.vcpu} vCPU / ${config.memoryGb} GB`,
      };
    case 'EKS':
      return {
        quantity: config.quantity,
        option: extendedServiceOptions.EKS.instances.find((instance) => instance.id === config.support)?.label ?? config.support,
      };
    case 'Lambda':
      return {
        quantity: config.quantity,
        option: `${config.architecture} · ${config.memoryMb} MB · ${config.durationMs} ms · ${(config.invocations * config.quantity).toLocaleString('en-US')} solicitudes totales/mes`,
      };
    case 'Route 53':
      return {
        quantity: config.hostedZones,
        option: `Zonas alojadas · ${extendedServiceOptions['Route 53'].routingOptions.find((option) => option.id === config.routingType)?.label ?? config.routingType} · ${config.queries.toLocaleString('en-US')} consultas/mes · ${config.healthChecks} health checks`,
      };
  }
}

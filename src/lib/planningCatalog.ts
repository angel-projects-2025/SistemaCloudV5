import type { CostLine } from './costEngine';

export interface NetworkPlan {
  vpcCidr: string;
  availabilityZones: number;
  publicSubnets: number;
  privateSubnets: number;
  natGateways: number;
  enableWaf: boolean;
  enableFlowLogs: boolean;
  enableTransit: boolean;
}

export interface CloudPlan {
  solutionName: string;
  applicationType: string;
  region: string;
  estimatedUsers: string;
  availabilityLevel: string;
  awsServices: string[];
  migrationGoal: string;
}

export type IamIdentity = {
  id: string;
  name: string;
  permissions: string[];
} & (
  | { type: 'usuario'; requireMfa: boolean }
  | { type: 'rol'; requireMfa?: never }
);

export interface SavedPlanning {
  id: string;
  savedAt: string;
  plan: CloudPlan;
  network: NetworkPlan;
  selectedGoals: string[];
  goalText: string;
  costLines?: CostLine[];
  iamIdentities?: IamIdentity[];
}

export type PlanningChanges = Pick<SavedPlanning, 'plan' | 'network' | 'selectedGoals' | 'goalText'>;

export type ServiceCategory = 'Cómputo' | 'Serverless' | 'Contenedores' | 'Almacenamiento' | 'Bases de datos' | 'Redes' | 'Seguridad';

// Los componentes de iconos permanecen en Planning.tsx; el catálogo no depende de React.
export interface ServiceCardDef {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  iconClass: string;
}

export const SERVICES: ServiceCardDef[] = [
  { id: 'EC2', name: 'Amazon EC2', category: 'Cómputo', description: 'Instancias virtuales para cargas de trabajo generales con escalado horizontal.', iconClass: 'bg-orange-500/10 text-orange-500 dark:text-orange-400' },
  { id: 'Lambda', name: 'AWS Lambda', category: 'Serverless', description: 'Ejecución de funciones sin servidor para aplicaciones orientadas a eventos.', iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { id: 'ECS', name: 'Amazon ECS', category: 'Contenedores', description: 'Orquestación de contenedores gestionada con Fargate o EC2.', iconClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { id: 'EKS', name: 'Amazon EKS', category: 'Contenedores', description: 'Kubernetes gestionado para microservicios de alta escala.', iconClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  { id: 'S3', name: 'Amazon S3', category: 'Almacenamiento', description: 'Almacenamiento de objetos durable, con versionado y lifecycle.', iconClass: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { id: 'RDS', name: 'Amazon RDS', category: 'Bases de datos', description: 'Bases de datos relacionales administradas con réplicas multi-AZ.', iconClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  { id: 'VPC', name: 'Amazon VPC', category: 'Redes', description: 'Red privada virtual aislada con subredes públicas y privadas.', iconClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  { id: 'Route 53', name: 'Amazon Route 53', category: 'Redes', description: 'DNS administrado con enrutamiento de latencia y failover.', iconClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  { id: 'CloudFront', name: 'Amazon CloudFront', category: 'Redes', description: 'CDN global con caché de borde y protección DDoS integrada.', iconClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { id: 'IAM', name: 'AWS IAM', category: 'Seguridad', description: 'Control de identidad y acceso con principios de mínimo privilegio.', iconClass: 'bg-red-500/10 text-red-600 dark:text-red-400' },
];

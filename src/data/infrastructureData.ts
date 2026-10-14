export interface Region {
  id: string;
  name: string;
  location: string;
  services: string[];
  latency: number;
  status: 'operational' | 'degraded' | 'down';
}

export const infrastructureData: Region[] = [
  {
    id: 'us-east-1',
    name: 'us-east-1',
    location: 'N. Virginia',
    services: ['EC2', 'RDS', 'S3', 'CloudFront', 'VPC'],
    latency: 12,
    status: 'operational'
  },
  {
    id: 'eu-west-1',
    name: 'eu-west-1',
    location: 'Irlanda',
    services: ['EC2', 'S3', 'CloudFront'],
    latency: 45,
    status: 'operational'
  },
  {
    id: 'ap-southeast-1',
    name: 'ap-southeast-1',
    location: 'Singapur',
    services: ['EC2', 'RDS', 'S3'],
    latency: 89,
    status: 'operational'
  }
];

export const securityData = {
  sharedResponsibility: {
    aws: ['Seguridad de la nube', 'Seguridad de los servicios', 'Protección de infraestructura'],
    customer: ['Seguridad en la nube', 'Configuración de servicios', 'Gestión de datos']
  },
  iam: {
    users: 15,
    roles: 8,
    policies: 24,
    mfaEnabled: 12,
    mfaTotal: 15
  },
  compliance: [
    { id: 1, name: 'ISO 27001', status: 'approved' as const },
    { id: 2, name: 'SOC 2', status: 'approved' as const },
    { id: 3, name: 'GDPR', status: 'review' as const },
    { id: 4, name: 'HIPAA', status: 'alert' as const }
  ]
} as const;

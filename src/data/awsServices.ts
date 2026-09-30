export interface AWSService {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  status: 'active' | 'inactive';
}

export const awsServices: AWSService[] = [
  {
    id: 'ec2',
    name: 'Amazon EC2',
    category: 'Cómputo',
    description: 'Servidores virtuales escalables en la nube',
    icon: 'Server',
    status: 'active'
  },
  {
    id: 's3',
    name: 'Amazon S3',
    category: 'Almacenamiento',
    description: 'Almacenamiento de objetos escalable',
    icon: 'HardDrive',
    status: 'active'
  },
  {
    id: 'rds',
    name: 'Amazon RDS',
    category: 'Base de datos',
    description: 'Servicio de base de datos relacional',
    icon: 'Database',
    status: 'active'
  },
  {
    id: 'iam',
    name: 'AWS IAM',
    category: 'Seguridad',
    description: 'Gestión de identidades y accesos',
    icon: 'Shield',
    status: 'active'
  },
  {
    id: 'vpc',
    name: 'Amazon VPC',
    category: 'Redes',
    description: 'Nube privada virtual aislada',
    icon: 'Network',
    status: 'active'
  },
  {
    id: 'route53',
    name: 'Amazon Route 53',
    category: 'Redes',
    description: 'Servicio de DNS en la nube',
    icon: 'Globe',
    status: 'active'
  },
  {
    id: 'cloudfront',
    name: 'Amazon CloudFront',
    category: 'Redes',
    description: 'Red de entrega de contenido (CDN)',
    icon: 'Zap',
    status: 'active'
  },
  {
    id: 'lambda',
    name: 'AWS Lambda',
    category: 'Cómputo',
    description: 'Ejecución de código serverless según eventos',
    icon: 'Code',
    status: 'active'
  },
  {
    id: 'dynamodb',
    name: 'Amazon DynamoDB',
    category: 'Base de datos',
    description: 'Base de datos NoSQL rápida y flexible',
    icon: 'Table',
    status: 'active'
  },
  {
    id: 'cloudwatch',
    name: 'Amazon CloudWatch',
    category: 'Monitoreo',
    description: 'Observabilidad y monitoreo de recursos',
    icon: 'Eye',
    status: 'active'
  },
  {
    id: 'kms',
    name: 'AWS KMS',
    category: 'Seguridad',
    description: 'Gestión centralizada de claves de cifrado',
    icon: 'KeyRound',
    status: 'active'
  }
];

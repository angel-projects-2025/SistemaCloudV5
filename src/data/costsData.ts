export interface CostItem {
  service: string;
  quantity: number;
  estimatedHours: number;
  hourlyRate: number;
  monthlyTotal: number;
  annualTotal: number;
}

export const costsData: CostItem[] = [
  {
    service: 'Amazon EC2',
    quantity: 5,
    estimatedHours: 730,
    hourlyRate: 0.12,
    monthlyTotal: 438,
    annualTotal: 5256
  },
  {
    service: 'Amazon RDS',
    quantity: 2,
    estimatedHours: 730,
    hourlyRate: 0.25,
    monthlyTotal: 365,
    annualTotal: 4380
  },
  {
    service: 'Amazon S3',
    quantity: 1,
    estimatedHours: 730,
    hourlyRate: 0.023,
    monthlyTotal: 16.79,
    annualTotal: 201.48
  },
  {
    service: 'Amazon CloudFront',
    quantity: 1,
    estimatedHours: 730,
    hourlyRate: 0.085,
    monthlyTotal: 62.05,
    annualTotal: 744.6
  },
  {
    service: 'Amazon VPC',
    quantity: 1,
    estimatedHours: 730,
    hourlyRate: 0.05,
    monthlyTotal: 36.5,
    annualTotal: 438
  },
  {
    service: 'AWS IAM',
    quantity: 1,
    estimatedHours: 730,
    hourlyRate: 0.02,
    monthlyTotal: 14.6,
    annualTotal: 175.2
  }
];

export const costDistribution = [
  { name: 'EC2', value: 5256, color: '#2563EB' },
  { name: 'RDS', value: 4380, color: '#16A34A' },
  { name: 'S3', value: 201.48, color: '#F59E0B' },
  { name: 'CloudFront', value: 744.6, color: '#DC2626' }
];

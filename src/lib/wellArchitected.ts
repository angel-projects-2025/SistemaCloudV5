import type { NetworkPlan } from './planningCatalog';

export type PillarStatus = 'Conforme' | 'En revisión' | 'Requiere atención';

export interface PillarEval {
  pillar: string;
  score: number;
  status: PillarStatus;
  notes: string;
}

export function buildPillars(services: string[], network: NetworkPlan) {
  const has = (id: string) => services.includes(id);
  const definitions = [
    { pillar: 'Excelencia Operacional', score: 50 + (network.enableFlowLogs ? 15 : 0) + (services.length >= 6 ? 15 : services.length >= 4 ? 8 : 0) + (has('Route 53') ? 10 : 0) + (network.availabilityZones >= 3 ? 10 : 5), notes: network.enableFlowLogs ? 'VPC Flow Logs habilitados para observabilidad y trazabilidad operacional.' : 'Habilite VPC Flow Logs para diagnóstico y trazabilidad operacional.' },
    { pillar: 'Seguridad', score: 48 + 22 + (network.enableWaf ? 18 : 0) + (network.enableFlowLogs ? 12 : 0), notes: network.enableWaf ? 'IAM aplica mínimo privilegio y WAF protege el perímetro de la aplicación.' : 'Refuerce las políticas de mínimo privilegio y la protección perimetral con IAM y WAF.' },
    { pillar: 'Fiabilidad', score: 45 + (network.availabilityZones >= 3 ? 25 : network.availabilityZones === 2 ? 15 : 5) + (network.natGateways >= 2 ? 12 : network.natGateways === 1 ? 6 : 0) + (network.publicSubnets + network.privateSubnets >= 6 ? 10 : 5) + (has('CloudFront') ? 8 : 0), notes: `Diseño con ${network.availabilityZones} zonas y ${network.natGateways} NAT Gateways. Revise la redundancia y los puntos únicos de fallo.` },
    { pillar: 'Eficiencia de Rendimiento', score: 50 + (has('CloudFront') ? 18 : 0) + (has('EKS') || has('ECS') ? 15 : 0) + (has('Lambda') ? 12 : 0) + (has('RDS') ? 10 : 5), notes: has('CloudFront') ? 'CloudFront acerca el contenido al usuario final mediante distribución global.' : 'Evalúe distribución de contenido en el borde y escalado de recursos según la carga.' },
    { pillar: 'Optimización de Recursos', score: 58 + (has('Lambda') ? 14 : 0) + (services.length <= 5 ? 12 : services.length <= 8 ? 6 : 0) + (network.natGateways <= 2 ? 8 : 0) + (has('S3') ? 6 : 0), notes: has('Lambda') && network.natGateways <= 2 ? 'Cómputo serverless y NAT Gateways dimensionados según el uso de la aplicación.' : 'Revise el dimensionamiento, los VPC Endpoints y las políticas de retención de S3.' },
  ];
  const pillars: PillarEval[] = definitions.map((definition) => {
    const score = Math.min(100, Math.max(0, definition.score));
    return { ...definition, score, status: score >= 85 ? 'Conforme' : score >= 70 ? 'En revisión' : 'Requiere atención' };
  });
  return { pillars, overall: Math.round(pillars.reduce((sum, pillar) => sum + pillar.score, 0) / pillars.length) };
}

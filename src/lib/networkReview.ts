import { describeCostLine, normalizeCostConfig } from './costEngine';
import type { CostLine } from './costEngine';
import type { SavedPlanning } from './planningCatalog';
import { buildNetworkDiagram, NETWORK_NODE_IDS } from './networkDiagram';
import type { NetworkNodeId } from './networkDiagram';

export interface NetworkReviewRow {
  id: string;
  from: string;
  port: string;
  to: string;
  protocol: string;
  configuration: string;
}

export interface NetworkReviewCheck {
  id: string;
  title: string;
  status: 'Recomendación' | 'Correcto';
  message: string;
  values: string;
}

export function vpcIpv4AddressCount(cidr: string | undefined): number | null {
  if (!cidr) return null;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(cidr);
  if (!match) return null;
  if (match.slice(1, 5).some((octet) => Number(octet) > 255)) return null;
  const prefix = Number(match[5]);
  return prefix >= 16 && prefix <= 28 ? 2 ** (32 - prefix) : null;
}

export function vpcIpv4AddressLabel(cidr: string | undefined): string {
  const count = vpcIpv4AddressCount(cidr);
  return count === null ? '—' : count.toLocaleString('es-ES', { useGrouping: 'always' });
}

// Planning guarda el objetivo con porcentaje: 99.0%, 99.9%, 99.99% o 99.999%.
function availabilityPercentage(value: string): number | null {
  const match = /^(\d{1,3}(?:\.\d+)?)%$/.exec(value.trim());
  const percentage = match ? Number(match[1]) : NaN;
  return Number.isFinite(percentage) && percentage >= 0 && percentage <= 100 ? percentage : null;
}

const SERVICE_FOR_NODE: Partial<Record<NetworkNodeId, string>> = {
  route53: 'Route 53', cloudfront: 'CloudFront', vpc: 'VPC', ec2: 'EC2', rds: 'RDS',
  lambda: 'Lambda', ecs: 'ECS', eks: 'EKS', s3: 'S3', iam: 'IAM',
};

export function buildNetworkReview(planning: SavedPlanning | null, lines: CostLine[] = planning?.costLines ?? []) {
  if (!planning) return null;
  const { network, plan } = planning;
  const nodes = buildNetworkDiagram(planning, lines);
  const rows: NetworkReviewRow[] = [];
  for (const id of NETWORK_NODE_IDS) {
    const node = nodes[id];
    if (!node.included) continue;
    const matchingLines = id === 'nat'
      ? lines.filter((line) => line.planningServiceId === 'VPC')
        .filter((line) => {
          const config = normalizeCostConfig(line.config, 'VPC');
          return config.serviceId === 'VPC' && config.resourceType === 'nat-gateway';
        })
      : lines.filter((line) => line.planningServiceId === SERVICE_FOR_NODE[id]);
    const configurations: (CostLine | undefined)[] = matchingLines.length ? matchingLines : [undefined];
    for (const line of configurations) {
      let port = 'No definido';
      let protocol = 'No definido';
      let configuration = line ? (() => {
        const description = describeCostLine(line);
        const option = description.option.replace(/\s*\(sin cargo\)/g, '');
        return id === 'iam' ? option : `${description.quantity.toLocaleString('es-ES')} × ${option}`;
      })() : 'Seleccionado; sin líneas de recursos definidas';
      if (id === 'route53') { port = '53 (estándar de referencia)'; protocol = 'DNS (UDP/TCP)'; }
      if (id === 'cloudfront' || id === 's3') { port = '443 (estándar de referencia)'; protocol = 'HTTPS'; }
      if (id === 'rds' && line && 'engine' in line.config) {
        if (line.config.engine === 'postgresql') { port = '5432'; protocol = 'PostgreSQL'; }
        if (line.config.engine === 'mysql') { port = '3306'; protocol = 'MySQL'; }
        if (line.config.engine === 'mariadb') { port = '3306'; protocol = 'MariaDB'; }
      }
      if (id === 'waf') configuration = 'WAF incluido en el diseño de red';
      if (id === 'nat') configuration = `${configuration === 'Seleccionado; sin líneas de recursos definidas' ? '' : `${configuration}; `}cantidad de la red: ${network.natGateways} NAT`;
      if (id === 'iam') {
        port = '—'; protocol = 'Control de identidad';
        if (!line) configuration = 'Servicio de identidad seleccionado; no representa un salto de tráfico';
      }
      rows.push({
        id: `${id}:${line?.id ?? 'planning'}`,
        from: id === 'iam' ? 'Control de identidad' : node.detalles.route.from,
        port, to: node.name, protocol, configuration,
      });
    }
  }

  const target = availabilityPercentage(plan.availabilityLevel);
  const cloudFrontIncluded = nodes.cloudfront.included;
  const makeCheck = (id: string, title: string, recommend: boolean, recommendation: string, correct: string, values: string): NetworkReviewCheck => ({
    id, title, status: recommend ? 'Recomendación' : 'Correcto', message: recommend ? recommendation : correct, values,
  });
  const checks = [
    makeCheck('availability', 'Objetivo de disponibilidad y zonas', target !== null && target >= 99.99 && network.availabilityZones < 3,
      'Para un objetivo de 99.99% se suele diseñar con 3 o más zonas',
      target === null ? 'No se activa la regla local: el formato del objetivo no permite comparar; revisa ese dato.' : 'No se activa la regla local. La cantidad de zonas no acredita la disponibilidad real.',
      `Objetivo: ${plan.availabilityLevel}; zonas planificadas: ${network.availabilityZones}`),
    makeCheck('nat-zones', 'NAT y zonas', network.natGateways > 0 && network.natGateways < network.availabilityZones,
      'Evalúa un NAT por zona para evitar depender de uno compartido entre zonas.',
      'No se activa la regla local. Las cantidades no verifican cómo se distribuyen los NAT.',
      `NAT: ${network.natGateways}; zonas planificadas: ${network.availabilityZones}`),
    makeCheck('private-egress', 'Salida de subredes privadas', network.privateSubnets > 0 && network.natGateways === 0,
      'Las subredes privadas no tendrían salida a internet mediante NAT; revisa si necesitan otra vía. Puede ser un diseño intencional sin salida a Internet.',
      'No se activa la regla local; no se verifica la configuración de rutas ni la salida efectiva.',
      `Subredes privadas: ${network.privateSubnets}; NAT: ${network.natGateways}`),
    makeCheck('waf', 'Protección web con CloudFront', cloudFrontIncluded && !network.enableWaf,
      'CloudFront está incluido sin WAF. Evalúa protección web según las entradas de la aplicación.',
      'No se activa la regla local para CloudFront y WAF; no acredita reglas de protección desplegadas.',
      `CloudFront incluido: ${cloudFrontIncluded ? 'Sí' : 'No'}; WAF incluido: ${network.enableWaf ? 'Sí' : 'No'}`),
    makeCheck('flow-logs', 'Registros de tráfico', !network.enableFlowLogs,
      'Evalúa incluir VPC Flow Logs para revisar conexiones y diagnosticar el diseño de red.',
      'Flow Logs está incluido en el diseño; su destino y retención deben configurarse al implementarlo.',
      `Flow Logs incluido: ${network.enableFlowLogs ? 'Sí' : 'No'}`),
  ];
  return {
    planningId: planning.id,
    metrics: {
      ipv4Addresses: vpcIpv4AddressLabel(network.vpcCidr),
      zones: network.availabilityZones,
      nat: network.natGateways,
      publicSubnets: network.publicSubnets,
      privateSubnets: network.privateSubnets,
      natBelowZones: network.natGateways < network.availabilityZones,
      waf: network.enableWaf, flowLogs: network.enableFlowLogs, transit: network.enableTransit,
    },
    rows, checks,
  };
}

export type NetworkReviewData = NonNullable<ReturnType<typeof buildNetworkReview>>;

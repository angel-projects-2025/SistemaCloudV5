import { describeCostLine, normalizeCostConfig } from './costEngine';
import type { CostLine } from './costEngine';
import type { SavedPlanning } from './planningCatalog';

export const NETWORK_NODE_IDS = ['internet', 'route53', 'waf', 'cloudfront', 'alb', 'vpc', 'ec2', 'nat', 'rds', 's3ep', 'lambda', 'ecs', 'eks', 's3', 'iam'] as const;
export type NetworkNodeId = typeof NETWORK_NODE_IDS[number];

interface NodeReference {
  name: string;
  icon: 'Globe' | 'ChevronRight' | 'ShieldAlert' | 'Zap' | 'Network' | 'Server' | 'Wifi' | 'Database' | 'HardDrive' | 'Layers' | 'Shield';
  category: string;
  serviceId?: string;
  description: string;
  from: string;
  to: string;
  port?: string;
  characteristics: string[];
}

const REFERENCES: Record<NetworkNodeId, NodeReference> = {
  internet: { name: 'Internet', icon: 'Globe', category: 'Perimetro', description: 'Origen ilustrativo de clientes y solicitudes públicas. No representa tráfico medido.', from: 'Cliente', to: 'Servicios públicos', port: 'HTTPS 443 / DNS 53', characteristics: ['Permite representar el acceso desde redes externas.', 'No define protocolos ni restricciones de la aplicación.'] },
  route53: { name: 'Route 53', icon: 'ChevronRight', category: 'Perimetro', serviceId: 'Route 53', description: 'Servicio DNS administrado para resolver nombres. La resolución DNS no es un salto de tráfico HTTP.', from: 'Cliente DNS', to: 'Route 53', port: 'DNS 53', characteristics: ['Permite definir registros DNS y políticas de enrutamiento.', 'Permite configurar comprobaciones de estado; no se presupone su configuración.'] },
  waf: { name: 'AWS WAF', icon: 'ShieldAlert', category: 'Perimetro', description: 'Permite filtrar solicitudes web mediante reglas. Incluir WAF en el diseño no acredita reglas desplegadas.', from: 'Cliente web', to: 'Aplicación protegida', port: 'HTTPS 443', characteristics: ['Permite evaluar reglas para solicitudes HTTP y HTTPS.', 'Permite definir límites y filtros según la aplicación.'] },
  cloudfront: { name: 'CloudFront CDN', icon: 'Zap', category: 'Perimetro', serviceId: 'CloudFront', description: 'Servicio global de distribución de contenido. El origen y sus conexiones no están definidos por la selección del servicio.', from: 'Cliente web', to: 'CloudFront', port: 'HTTPS 443', characteristics: ['Permite distribuir contenido mediante una red de entrega.', 'Permite configurar caché, HTTPS y restricciones de acceso.'] },
  alb: { name: 'Application LB', icon: 'Network', category: 'Entrada VPC', description: 'Referencia de un balanceador de aplicaciones. La planificación no define este componente ni sus listeners.', from: 'Cliente u origen', to: 'Application LB', port: 'HTTPS 443', characteristics: ['Permite distribuir solicitudes entre destinos configurados.', 'Permite configurar listeners y reglas; no se presupone su existencia.'] },
  vpc: { name: 'VPC', icon: 'Network', category: 'Entrada VPC', serviceId: 'VPC', description: 'Representa el diseño de red de la planificación. Las ubicaciones y conexiones de los recursos son ilustrativas.', from: 'Redes conectadas', to: 'VPC', characteristics: ['Permite organizar subredes y rutas.', 'Permite definir aislamiento y controles de acceso de red.'] },
  ec2: { name: 'EC2', icon: 'Server', category: 'Recursos en la VPC', serviceId: 'EC2', description: 'Instancias virtuales. La planificación no asigna cada instancia a una subred ni define sus listeners.', from: 'Cliente o aplicación', to: 'EC2', characteristics: ['Permite ejecutar aplicaciones con control del sistema operativo.', 'Permite configurar red y permisos según la carga.'] },
  nat: { name: 'NAT Gateway', icon: 'Wifi', category: 'Subred Publica', description: 'Referencia de salida desde redes privadas mediante un NAT Gateway público. No se define su asignación individual a una subred o zona.', from: 'Recurso privado', to: 'Red externa', characteristics: ['Permite traducir direcciones para conexiones de salida.', 'No sustituye un balanceador ni permite conexiones entrantes no solicitadas.'] },
  rds: { name: 'RDS', icon: 'Database', category: 'Recursos en la VPC', serviceId: 'RDS', description: 'Base de datos relacional administrada. La selección no define su subred, reglas de acceso, cifrado ni copias.', from: 'Aplicación', to: 'RDS', characteristics: ['Permite elegir motor y disponibilidad según la configuración.', 'Permite definir copias y controles de acceso; no se presume su implementación.'] },
  s3ep: { name: 'S3 VPC Endpoint', icon: 'HardDrive', category: 'Recursos en la VPC', description: 'Referencia de un endpoint de VPC. Las líneas de endpoints no identifican el servicio destino; no se asume que sea S3.', from: 'Recurso en la VPC', to: 'Servicio destino no definido', characteristics: ['Permite representar una opción de acceso a servicios mediante endpoints.', 'El tipo de endpoint no identifica por sí solo su servicio destino.'] },
  lambda: { name: 'Lambda', icon: 'Zap', category: 'Servicios regionales', serviceId: 'Lambda', description: 'Funciones sin administración de servidores. No se presupone una integración con la VPC.', from: 'Evento o aplicación', to: 'Lambda', characteristics: ['Permite ejecutar código en respuesta a eventos.', 'Permite configurar permisos y conexiones según la función.'] },
  ecs: { name: 'ECS', icon: 'Layers', category: 'Recursos en la VPC', serviceId: 'ECS', description: 'Orquestación de contenedores. Su posición es ilustrativa: las subredes de las tareas no están definidas.', from: 'Aplicación', to: 'Tarea ECS', characteristics: ['Permite ejecutar contenedores con Fargate o EC2.', 'Permite configurar imágenes, permisos y red.'] },
  eks: { name: 'EKS', icon: 'Layers', category: 'Recursos en la VPC', serviceId: 'EKS', description: 'Kubernetes administrado. No se define la asignación del clúster o sus nodos a subredes.', from: 'Aplicación', to: 'Aplicación en EKS', characteristics: ['Permite usar un plano de control administrado.', 'El cliente define las aplicaciones, permisos y nodos de trabajo.'] },
  s3: { name: 'S3', icon: 'HardDrive', category: 'Servicios regionales', serviceId: 'S3', description: 'Almacenamiento de objetos. Su selección no acredita un endpoint privado ni políticas de acceso.', from: 'Aplicación', to: 'S3', port: 'HTTPS 443', characteristics: ['Permite almacenar objetos y configurar su acceso.', 'Permite definir cifrado, versionado y retención.'] },
  iam: { name: 'IAM · Identidad y acceso', icon: 'Shield', category: 'Identidad y acceso', serviceId: 'IAM', description: 'Servicio global de identidad y acceso. No es un salto de tráfico ni queda limitado a una región.', from: 'Identidad autorizada', to: 'Control de permisos', characteristics: ['Permite diseñar usuarios, roles y políticas de permisos.', 'Las identidades de diseño no acreditan recursos creados en AWS.'] },
};

export interface NetworkDiagramNode {
  id: NetworkNodeId;
  name: string;
  icon: NodeReference['icon'];
  category: string;
  included: boolean;
  detalles: {
    description: string;
    route: { from: string; fromPort: string; to: string; toPort: string };
    specs: { label: string; value: string }[];
    characteristics: string[];
    planningLines: { id: string; text: string; region: string }[];
    message: string;
    notes: string[];
  };
}

// El Catálogo no exporta su criterio de inclusión: se usa plan.awsServices, como pide este módulo.
export function buildNetworkDiagram(planning: SavedPlanning | null, lines: CostLine[] = planning?.costLines ?? []): Record<NetworkNodeId, NetworkDiagramNode> {
  const network = planning?.network;
  const vpcConfigs = planning ? lines.filter((line) => line.planningServiceId === 'VPC').map((line) => normalizeCostConfig(line.config, 'VPC')).filter((config) => config.serviceId === 'VPC') : [];
  const natConfigs = vpcConfigs.filter((config) => config.resourceType === 'nat-gateway');
  const costNat = natConfigs.reduce((sum, config) => sum + config.quantity, 0);
  const endpointConfigs = vpcConfigs.filter((config) => config.resourceType === 'gateway-endpoint' || config.resourceType === 'interface-endpoint');
  const endpointCount = endpointConfigs.reduce((sum, config) => sum + config.quantity, 0);
  const undefinedPort = 'No definido en la planificación';
  const entries = NETWORK_NODE_IDS.map((id): [NetworkNodeId, NetworkDiagramNode] => {
    const reference = REFERENCES[id];
    const included = !!planning && (id === 'waf' ? !!network?.enableWaf : id === 'nat' ? (network?.natGateways ?? 0) > 0 : !!reference.serviceId && planning.plan.awsServices.includes(reference.serviceId));
    const matchingLines = planning && reference.serviceId ? lines.filter((line) => line.planningServiceId === reference.serviceId) : [];
    let port = reference.port ? `${reference.port} (estándar de referencia)` : undefinedPort;
    if (id === 'rds') {
      const ports = matchingLines.map((line) => normalizeCostConfig(line.config, 'RDS')).filter((config) => config.serviceId === 'RDS')
        .map((config) => config.engine === 'postgresql' ? 'PostgreSQL 5432' : config.engine === 'mariadb' ? 'MariaDB 3306' : 'MySQL 3306');
      port = ports.length ? [...new Set(ports)].join(' / ') : undefinedPort;
    }
    const specs: NetworkDiagramNode['detalles']['specs'] = [];
    if (network && id === 'vpc') specs.push(
      ...(network.vpcCidr ? [{ label: 'CIDR de la VPC', value: network.vpcCidr }] : []),
      { label: 'Zonas de disponibilidad', value: String(network.availabilityZones) },
      { label: 'Subredes públicas', value: String(network.publicSubnets) },
      { label: 'Subredes privadas', value: String(network.privateSubnets) },
      { label: 'NAT Gateways', value: String(network.natGateways) },
      { label: 'WAF', value: network.enableWaf ? 'Sí' : 'No' },
      { label: 'Flow Logs', value: network.enableFlowLogs ? 'Sí' : 'No' },
      { label: 'Transit Gateway', value: network.enableTransit ? 'Sí' : 'No' },
    );
    if (network && id === 'nat') specs.push({ label: 'NAT Gateways de la red', value: String(network.natGateways) });
    if (network && id === 'waf') specs.push({ label: 'WAF incluido en el diseño', value: network.enableWaf ? 'Sí' : 'No' });
    const planningLines = id === 'iam' ? [] : matchingLines.map((line) => {
      const description = describeCostLine(line);
      return { id: line.id, text: `${description.quantity.toLocaleString('es-ES')} × ${description.option.replace(/\s*\(sin cargo\)/g, '')}`, region: planning!.plan.region };
    });
    let message = included ? 'Incluido en el diseño; las conexiones no están definidas en la planificación.' : 'Este servicio no está en tu planificación';
    const notes: string[] = [];
    if (id === 'alb' || id === 's3ep') message = 'La planificación no define este componente';
    if (id === 'internet') message = 'Origen de referencia; no es un recurso de la planificación.';
    if (network && id === 'nat') {
      message = `NAT Gateways de la red: ${network.natGateways}`;
      if (natConfigs.length && costNat !== network.natGateways) notes.push(`Costos indica ${costNat}; puede diferir`);
    }
    if (planning && id === 'iam') {
      const identities = planning.iamIdentities ?? [];
      notes.push(`Identidades de diseño: ${identities.filter((identity) => identity.type === 'usuario').length} usuarios y ${identities.filter((identity) => identity.type === 'rol').length} roles.`);
    }
    if (planning && id === 's3ep' && endpointConfigs.length) notes.push(`Endpoints en la planificación: ${endpointCount} (el servicio destino no está definido)`);
    if (included && reference.serviceId && id !== 'iam' && !matchingLines.length) notes.push('No hay líneas de recursos para este servicio.');
    return [id, { id, name: reference.name, icon: reference.icon, category: reference.category, included, detalles: {
      description: reference.description,
      route: { from: reference.from, fromPort: id === 'rds' ? undefinedPort : port, to: reference.to, toPort: port },
      specs, characteristics: [...reference.characteristics], planningLines, message, notes,
    } }];
  });
  return Object.fromEntries(entries) as Record<NetworkNodeId, NetworkDiagramNode>;
}

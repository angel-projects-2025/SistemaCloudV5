import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import {
  Globe, ChevronRight, Zap, Server, Database,
  Shield, Network as NetworkIcon, HardDrive,
  Wifi, ShieldAlert, Layers, CheckCircle2
} from 'lucide-react';

interface NetworkNode {
  id: string;
  name: string;
  icon: any;
  category: string;
  status: 'active' | 'inactive' | 'warning';
  description: string;
  trafficRoute: { from: string; fromPort: string; to: string; toPort: string };
  networkSpecs: { cidr: string; protocol: string; latency: string };
  details: string[];
}

const networkNodes: NetworkNode[] = [
  {
    id: 'internet',
    name: 'Internet',
    icon: Globe,
    category: 'Perimetro',
    status: 'active',
    description: 'Trafico publico global entrante hacia la infraestructura AWS.',
    trafficRoute: { from: 'Cliente', fromPort: 'Port 443', to: 'Route 53', toPort: 'Port 53' },
    networkSpecs: { cidr: '0.0.0.0/0', protocol: 'TLS 1.3 / HTTPS', latency: '50-200 ms' },
    details: ['Trafico HTTPS encriptado', 'Resolucion DNS publica', 'Acceso global sin restricciones', 'Origen de todas las solicitudes']
  },
  {
    id: 'route53',
    name: 'Route 53',
    icon: ChevronRight,
    category: 'Perimetro',
    status: 'active',
    description: 'Servicio DNS gestionado que resuelve dominios y enruta solicitudes a los endpoints correctos.',
    trafficRoute: { from: 'Internet', fromPort: 'Port 53', to: 'CloudFront', toPort: 'Port 443' },
    networkSpecs: { cidr: 'N/A', protocol: 'DNS (UDP/TCP)', latency: '2-5 ms' },
    details: ['Resolucion de dominios autoritativa', 'Routing geografico y por latencia', 'Health checks con failover automatico', 'Alias records para endpoints AWS']
  },
  {
    id: 'waf',
    name: 'AWS WAF',
    icon: ShieldAlert,
    category: 'Perimetro',
    status: 'active',
    description: 'Firewall de aplicaciones web que protege contra exploits y bots maliciosos.',
    trafficRoute: { from: 'Route 53', fromPort: 'Port 443', to: 'CloudFront', toPort: 'Port 443' },
    networkSpecs: { cidr: 'N/A', protocol: 'HTTPS (WAF Rules)', latency: '1-3 ms' },
    details: ['Reglas contra inyeccion SQL y XSS', 'Rate limiting y bloqueo de IPs', 'Integracion nativa con CloudFront', 'Log de todas las solicitudes bloqueadas']
  },
  {
    id: 'cloudfront',
    name: 'CloudFront CDN',
    icon: Zap,
    category: 'Perimetro',
    status: 'active',
    description: 'Red de entrega de contenido global con mas de 400 edge locations para baja latencia.',
    trafficRoute: { from: 'AWS WAF', fromPort: 'Port 443', to: 'ALB', toPort: 'Port 80' },
    networkSpecs: { cidr: 'N/A', protocol: 'TLS 1.3 / HTTPS', latency: '1-10 ms' },
    details: ['Cache de contenido estatico y dinamico', 'Compresion automatica gzip/brotli', 'Lambda@Edge para logica en el borde', 'Origen failover con Origin Groups']
  },
  {
    id: 'alb',
    name: 'Application LB',
    icon: NetworkIcon,
    category: 'Entrada VPC',
    status: 'active',
    description: 'Application Load Balancer que distribuye trafico HTTP/HTTPS entre multiples targets.',
    trafficRoute: { from: 'CloudFront', fromPort: 'Port 80', to: 'EC2 / NAT GW', toPort: 'Port 80' },
    networkSpecs: { cidr: '10.0.0.0/16', protocol: 'HTTP/HTTPS (L7)', latency: '1-2 ms' },
    details: ['Routing basado en host/path/headers', 'Target groups con health checks', 'SSL termination en el balanceador', 'Sticky sessions y WebSocket support']
  },
  {
    id: 'ec2',
    name: 'EC2 (Publica)',
    icon: Server,
    category: 'Subred Publica',
    status: 'active',
    description: 'Instancias de servidores web en subred publica con acceso directo a Internet via NAT.',
    trafficRoute: { from: 'ALB', fromPort: 'Port 80', to: 'RDS / S3', toPort: 'Port 3306 / 443' },
    networkSpecs: { cidr: '10.0.1.0/24', protocol: 'HTTP / App Layer', latency: '2-5 ms' },
    details: ['Servidores web con Auto Scaling Group', 'Security Group: inbound 80/443 desde ALB', 'Outbound via NAT Gateway', 'AMI personalizada con hardening CIS']
  },
  {
    id: 'nat',
    name: 'NAT Gateway',
    icon: Wifi,
    category: 'Subred Publica',
    status: 'active',
    description: 'Gateway que permite instancias en subred privada acceder a Internet sin exponerlas.',
    trafficRoute: { from: 'EC2 / Private', fromPort: 'Ephemeral', to: 'Internet', toPort: 'Port 443' },
    networkSpecs: { cidr: '10.0.1.0/24', protocol: 'NAT (SNAT)', latency: '1-3 ms' },
    details: ['Direccionamiento de puertos automatico', 'Escalable automaticamente a 55 Gbps', 'Costo por hora + datos transferidos', 'Alojado en subred publica']
  },
  {
    id: 'rds',
    name: 'RDS (Privada)',
    icon: Database,
    category: 'Subred Privada',
    status: 'active',
    description: 'Base de datos relacional en subred privada, sin acceso directo desde Internet.',
    trafficRoute: { from: 'EC2', fromPort: 'Port 3306', to: 'RDS Primary', toPort: 'Port 3306' },
    networkSpecs: { cidr: '10.0.2.0/24', protocol: 'MySQL / TLS', latency: '1-3 ms' },
    details: ['Multi-AZ para alta disponibilidad', 'Automated backups con point-in-time recovery', 'Read replicas para escalabilidad de lectura', 'Encryption at rest con KMS']
  },
  {
    id: 's3ep',
    name: 'S3 VPC Endpoint',
    icon: HardDrive,
    category: 'Subred Privada',
    status: 'active',
    description: 'Endpoint VPC Gateway para acceder a S3 sin traversar Internet ni NAT Gateway.',
    trafficRoute: { from: 'EC2 / RDS', fromPort: 'Port 443', to: 'Amazon S3', toPort: 'Port 443' },
    networkSpecs: { cidr: 'pl-xxxxxx (Prefix)', protocol: 'HTTPS via GW Endpoint', latency: '1-2 ms' },
    details: ['Conexion privada via Amazon backbone', 'Sin costo adicional por endpoint', 'Politicas VPC Endpoint para acceso', 'Soporte para todas las regiones']
  }
];

const categoryColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Perimetro':         { bg: 'bg-blue-50 dark:bg-blue-500/15',   text: 'text-blue-700 dark:text-blue-300',   border: 'border-blue-200 dark:border-blue-500/30',   dot: 'bg-blue-500' },
  'Entrada VPC':       { bg: 'bg-amber-50 dark:bg-amber-500/15',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-500/30',  dot: 'bg-amber-500' },
  'Subred Publica':    { bg: 'bg-green-50 dark:bg-green-500/15',  text: 'text-green-700 dark:text-green-300',  border: 'border-green-200 dark:border-green-500/30',  dot: 'bg-green-500' },
  'Subred Privada':    { bg: 'bg-purple-50 dark:bg-purple-500/15', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-500/30', dot: 'bg-purple-500' },
};

const nodeColorMap: Record<string, string> = {
  internet: 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600',
  route53:  'bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/40',
  waf:      'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40',
  cloudfront:'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40',
  alb:      'bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/40',
  ec2:      'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40',
  nat:      'bg-teal-50 dark:bg-teal-500/10 border-teal-300 dark:border-teal-500/40',
  rds:      'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40',
  s3ep:     'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/40',
};

const diagnosticHops = [
  { hop: 1, from: 'Cliente', fromPort: 'Port 443', to: 'Route 53', protocol: 'DNS (UDP/TCP)', latency: 1, status: 'ok' as const },
  { hop: 2, from: 'Route 53', fromPort: 'Port 53', to: 'AWS WAF', protocol: 'Inspeccion L7', latency: 3, status: 'ok' as const },
  { hop: 3, from: 'AWS WAF', fromPort: 'Port 443', to: 'CloudFront CDN', protocol: 'Edge Location', latency: 4, status: 'ok' as const },
  { hop: 4, from: 'CloudFront CDN', fromPort: 'Port 443', to: 'Application LB', protocol: 'HTTPS (L7)', latency: 2, status: 'ok' as const },
  { hop: 5, from: 'Application LB', fromPort: 'Port 80', to: 'EC2 Target Group', protocol: 'HTTP', latency: 2, status: 'ok' as const },
  { hop: 6, from: 'EC2', fromPort: 'Port 5432', to: 'RDS PostgreSQL', protocol: 'Subred Privada', latency: 1, status: 'ok' as const },
];

export function Network() {
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<null | { hops: typeof diagnosticHops; totalLatency: number }>(null);

  useEffect(() => {}, []);

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: '', visible: false }), 3000);
  };

  const runDiagnostic = () => {
    if (diagnosing) return;
    setDiagnosing(true);
    setDiagnosticResult(null);
    setTimeout(() => {
      const totalLatency = diagnosticHops.reduce((sum, h) => sum + h.latency, 0);
      setDiagnosticResult({ hops: diagnosticHops, totalLatency });
      setDiagnosing(false);
      showToast(`Analisis de alcanzabilidad completado: Ruta 100% operativa (${totalLatency}ms latencia total)`);
    }, 1000);
  };

  const DiagramNode = ({ node, className = '' }: { node: NetworkNode; className?: string }) => {
    const isSelected = selectedNode?.id === node.id;
    const catColor = categoryColors[node.category] || categoryColors['Perimetro'];
    const baseColor = nodeColorMap[node.id] || 'bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600';
    return (
      <div
        onClick={() => setSelectedNode(node)}
        className={`relative flex flex-col items-center p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 ${baseColor} ${
          isSelected
            ? '!border-blue-500 !bg-blue-50/40 dark:!bg-blue-500/20 ring-2 ring-blue-400/50 scale-105 shadow-sm'
            : 'hover:shadow-md hover:scale-[1.03]'
        } ${className}`}
      >
        <node.icon size={28} className="text-slate-800 dark:text-slate-200" />
        <p className="text-xs font-semibold mt-1.5 text-center leading-tight text-slate-900 dark:text-slate-100">{node.name}</p>
        <span className={`absolute -top-2 -right-2 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${catColor.dot}`} />
      </div>
    );
  };

  const VArrow = () => (
    <div className="flex justify-center my-1">
      <div className="w-0.5 h-5 bg-primary/40 relative dark:bg-blue-400/40">
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-transparent border-t-primary/40 dark:border-t-blue-400/40" />
      </div>
    </div>
  );

  return (
    <>
      <Header title="Arquitectura de Red" />

      <main className="p-4 md:p-8 bg-background min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* DIAGRAMA */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-textMain">Diagrama de Arquitectura</h3>
              <div className="flex items-center gap-4 text-xs text-textSecondary">
                {Object.entries(categoryColors).map(([cat, c]) => (
                  <span key={cat} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto pr-2 rounded-lg border border-cardBorder/50 bg-slate-50/30 dark:bg-slate-800/30 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="p-4 space-y-0">
                {/* Internet */}
                <div className="flex justify-center">
                  <DiagramNode node={networkNodes[0]} />
                </div>
                <VArrow />

                {/* Route 53 */}
                <div className="flex justify-center">
                  <DiagramNode node={networkNodes[1]} />
                </div>
                <VArrow />

                {/* WAF */}
                <div className="flex justify-center">
                  <DiagramNode node={networkNodes[2]} />
                </div>
                <VArrow />

                {/* CloudFront */}
                <div className="flex justify-center">
                  <DiagramNode node={networkNodes[3]} />
                </div>
                <VArrow />

                {/* ALB */}
                <div className="flex justify-center">
                  <DiagramNode node={networkNodes[4]} />
                </div>
                <VArrow />

                {/* VPC container */}
                <div className="border-2 border-dashed border-cardBorder rounded-xl p-4">
                  <p className="text-xs font-semibold text-textSecondary text-center mb-3 uppercase tracking-wider">VPC 10.0.0.0/16</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Public subnet */}
                    <div className="border border-dashed border-green-300 dark:border-green-500/40 rounded-lg p-3 bg-green-50/40 dark:bg-green-500/10">
                      <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 text-center mb-2 uppercase tracking-wide">Subred Publica 10.0.1.0/24</p>
                      <div className="space-y-2">
                        <DiagramNode node={networkNodes[5]} />
                        <DiagramNode node={networkNodes[6]} />
                      </div>
                    </div>
                    {/* Private subnet */}
                    <div className="border border-dashed border-purple-300 dark:border-purple-500/40 rounded-lg p-3 bg-purple-50/40 dark:bg-purple-500/10">
                      <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 text-center mb-2 uppercase tracking-wide">Subred Privada 10.0.2.0/24</p>
                      <div className="space-y-2">
                        <DiagramNode node={networkNodes[7]} />
                        <DiagramNode node={networkNodes[8]} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL LATERAL */}
          <div className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-textMain mb-4">Detalles del Nodo</h3>

            {selectedNode ? (
              <div className="space-y-5">
                {/* Header del nodo */}
                <div className={`flex items-center gap-3 p-4 rounded-xl ${categoryColors[selectedNode.category]?.bg ?? 'bg-blue-50 dark:bg-blue-500/10'} border ${categoryColors[selectedNode.category]?.border ?? 'border-blue-200 dark:border-blue-500/30'}`}>
                  <div className={`p-2 rounded-lg ${categoryColors[selectedNode.category]?.bg ?? 'bg-blue-100 dark:bg-blue-500/20'}`}>
                    <selectedNode.icon size={24} className={categoryColors[selectedNode.category]?.text ?? 'text-blue-600'} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-textMain">{selectedNode.name}</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${categoryColors[selectedNode.category]?.bg} ${categoryColors[selectedNode.category]?.text}`}>
                      {selectedNode.category}
                    </span>
                  </div>
                  <span className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 shadow ${selectedNode.status === 'active' ? 'bg-statusGreen' : selectedNode.status === 'warning' ? 'bg-statusAmber' : 'bg-gray-400'}`} />
                </div>

                <p className="text-sm text-textSecondary leading-relaxed">{selectedNode.description}</p>

                {/* Ruta de Trafico */}
                <div>
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Ruta de Trafico</p>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 border border-cardBorder space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/15 px-2 py-0.5 rounded uppercase">From</span>
                      <span className="text-sm font-medium text-textMain">{selectedNode.trafficRoute.from}</span>
                      <span className="text-xs text-textSecondary ml-auto font-mono">{selectedNode.trafficRoute.fromPort}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/15 px-2 py-0.5 rounded uppercase">To</span>
                      <span className="text-sm font-medium text-textMain">{selectedNode.trafficRoute.to}</span>
                      <span className="text-xs text-textSecondary ml-auto font-mono">{selectedNode.trafficRoute.toPort}</span>
                    </div>
                  </div>
                </div>

                {/* Especificaciones de Red */}
                <div>
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Especificaciones de Red</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                      <span className="text-xs text-textSecondary">CIDR / IP</span>
                      <span className="text-xs font-semibold text-textMain font-mono">{selectedNode.networkSpecs.cidr}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-500/10 rounded-lg">
                      <span className="text-xs text-textSecondary">Protocolo</span>
                      <span className="text-xs font-semibold text-textMain">{selectedNode.networkSpecs.protocol}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                      <span className="text-xs text-textSecondary">Latencia</span>
                      <span className="text-xs font-semibold text-textMain">{selectedNode.networkSpecs.latency}</span>
                    </div>
                  </div>
                </div>

                {/* Caracteristicas */}
                <div>
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Caracteristicas</p>
                  <ul className="space-y-1.5">
                    {selectedNode.details.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-textSecondary">
                        <span className="text-primary mt-0.5 text-xs">&#9679;</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Server size={40} className="text-gray-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-textSecondary">Selecciona un nodo en el diagrama para ver sus detalles tecnicos</p>
              </div>
            )}
          </div>
        </div>

        {/* PANEL DE RENDIMIENTO DE RED */}
        <div className="mt-6 bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-textMain">Panel de Rendimiento de Red</h3>
              <p className="text-xs text-textSecondary mt-0.5">AWS Reachability Analyzer — Analisis de alcanzabilidad VPC</p>
            </div>
            <button
              onClick={runDiagnostic}
              disabled={diagnosing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                diagnosing
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-blue-700 shadow-sm hover:shadow-md active:scale-95'
              }`}
            >
              {diagnosing ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-300 dark:border-slate-600 border-t-primary rounded-full animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Wifi size={16} />
                  Ejecutar Diagnostico VPC
                </>
              )}
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
              <p className="text-xs text-textSecondary mb-1">Ancho de Banda</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">1.4 GB/s</p>
              <p className="text-[10px] text-textSecondary mt-1">Promedio ultima hora</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/30">
              <p className="text-xs text-textSecondary mb-1">Latencia Media</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">12 ms</p>
              <p className="text-[10px] text-textSecondary mt-1">P95: 28ms</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30">
              <p className="text-xs text-textSecondary mb-1">Peticiones/seg</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">4,850</p>
              <p className="text-[10px] text-textSecondary mt-1">RPS actual</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/30">
              <p className="text-xs text-textSecondary mb-1">Filtrado WAF</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">142/min</p>
              <p className="text-[10px] text-textSecondary mt-1">Bloqueos activos</p>
            </div>
          </div>

          {/* TABLA DE DIAGNOSTICO */}
          <div>
            <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">Trazabilidad de Solicitud — Ruta Completa</p>

            {!diagnosticResult && !diagnosing && (
              <div className="text-center py-10 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-cardBorder">
                <ShieldAlert size={32} className="text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-textSecondary">Haz clic en &quot;Ejecutar Diagnostico VPC&quot; para iniciar el analisis de alcanzabilidad</p>
              </div>
            )}

            {diagnosing && (
              <div className="text-center py-10 bg-blue-50/50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
                <span className="w-8 h-8 border-3 border-blue-200 dark:border-blue-500/40 border-t-primary rounded-full animate-spin inline-block mb-3" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Ejecutando analisis de alcanzabilidad...</p>
                <p className="text-xs text-textSecondary mt-1">Verificando saltos de red y politicas de seguridad</p>
              </div>
            )}

            {diagnosticResult && (
              <div className="rounded-xl border border-cardBorder overflow-hidden">
                <div className="overflow-x-auto">
                <div className="min-w-[720px]">
                {/* Header de la tabla */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-cardBorder text-[10px] font-semibold text-textSecondary uppercase tracking-wider">
                  <div className="col-span-1">Hop</div>
                  <div className="col-span-3">Origen</div>
                  <div className="col-span-1 text-center">Puerto</div>
                  <div className="col-span-3">Destino</div>
                  <div className="col-span-2">Protocolo</div>
                  <div className="col-span-1 text-center">Latencia</div>
                  <div className="col-span-1 text-center">Estado</div>
                </div>

                {/* Filas */}
                {diagnosticResult.hops.map((h, i) => (
                  <div
                    key={h.hop}
                    className={`grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm border-b border-cardBorder/50 transition-colors duration-200 ${
                      i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50/50 dark:bg-slate-800/50'
                    } hover:bg-blue-50/30 dark:hover:bg-blue-500/10`}
                  >
                    <div className="col-span-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-blue-400 text-xs font-bold">{h.hop}</span>
                    </div>
                    <div className="col-span-3 font-medium text-textMain">{h.from}</div>
                    <div className="col-span-1 text-center font-mono text-xs text-textSecondary">{h.fromPort}</div>
                    <div className="col-span-3 font-medium text-textMain">{h.to}</div>
                    <div className="col-span-2 text-xs text-textSecondary">{h.protocol}</div>
                    <div className="col-span-1 text-center font-mono text-xs font-semibold text-textMain">{h.latency}ms</div>
                    <div className="col-span-1 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 text-[10px] font-semibold">
                        <CheckCircle2 size={10} />
                        OK
                      </span>
                    </div>
                  </div>
                ))}

                {/* Footer resumen */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-cardBorder items-center">
                  <div className="col-span-7 text-xs font-semibold text-textSecondary uppercase tracking-wider">Total</div>
                  <div className="col-span-2 text-xs text-textSecondary">6 saltos</div>
                  <div className="col-span-1 text-center text-sm font-bold text-primary">{diagnosticResult.totalLatency}ms</div>
                  <div className="col-span-1 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300 text-[10px] font-semibold">
                      <CheckCircle2 size={10} />
                      100%
                    </span>
                  </div>
                </div>
                </div>
                </div>
              </div>
            )}
          </div>

          {/* Metricas resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-cardBorder">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <Layers size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-textSecondary">Direccion</p>
                <p className="text-sm font-medium text-textMain">Inbound &rarr; Outbound</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-cardBorder">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                <Shield size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-textSecondary">Encriptacion</p>
                <p className="text-sm font-medium text-textMain">TLS 1.3 E2E</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-cardBorder">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <Wifi size={16} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-textSecondary">Saltos de Red</p>
                <p className="text-sm font-medium text-textMain">{diagnosticResult ? `${diagnosticResult.hops.length} hops / ${diagnosticResult.totalLatency}ms` : '6 hops / 13ms'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* TOAST */}
      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 animate-[fadeIn_0.2s_ease-out]">
          <CheckCircle2 size={18} className="text-statusGreen shrink-0" />
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}
    </>
  );
}

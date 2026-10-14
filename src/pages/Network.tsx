import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { usePlanning } from '../context/PlanningContext';
import { buildNetworkDiagram } from '../lib/networkDiagram';
import type { NetworkDiagramNode, NetworkNodeId } from '../lib/networkDiagram';
import { buildNetworkReview } from '../lib/networkReview';
import type { NetworkReviewData } from '../lib/networkReview';
import type { SavedPlanning } from '../lib/planningCatalog';
import type { CostLine } from '../lib/costEngine';
import './NetworkDiagram.css';
import {
  Globe, ChevronRight, Zap, Server, Database,
  Shield, Network as NetworkIcon, HardDrive,
  Wifi, ShieldAlert, Layers, CheckCircle2
} from 'lucide-react';

const nodeIcons = { Globe, ChevronRight, ShieldAlert, Zap, Network: NetworkIcon, Server, Wifi, Database, HardDrive, Layers, Shield };

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
  vpc:      'bg-white dark:bg-slate-900 border-cardBorder',
  lambda:   'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40',
  ecs:      'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40',
  eks:      'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/40',
  s3:       'bg-green-50 dark:bg-green-500/10 border-green-300 dark:border-green-500/40',
  iam:      'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/40',
};

function NodeBadge({ included }: { included: boolean }) {
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${included
    ? 'bg-green-100 text-statusGreen border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30'
    : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>{included ? 'En tu planificación' : 'Solo referencia'}</span>;
}

function DiagramNode({ node, selected, onSelect }: { node: NetworkDiagramNode; selected: boolean; onSelect: (id: NetworkNodeId) => void }) {
  const Icon = nodeIcons[node.icon];
  return <button type="button" onClick={() => onSelect(node.id)} aria-pressed={selected}
    className={`network-diagram-node relative flex flex-col items-center gap-1 p-3 rounded-xl cursor-pointer transition-all duration-200 border-2 w-full ${nodeColorMap[node.id]} ${node.included ? 'network-node--included' : 'network-node--reference'} ${selected ? 'network-node--selected shadow-sm' : 'hover:shadow-md'}`}>
    <Icon size={28} className="text-slate-800 dark:text-slate-200" />
    <p className="text-xs font-semibold mt-1.5 text-center leading-tight text-slate-900 dark:text-slate-100">{node.name}</p>
    <NodeBadge included={node.included} />
  </button>;
}

function VArrow({ active, index }: { active: boolean; index: number }) {
  return <div aria-hidden="true" className={`network-connector ${active ? 'network-connector--active' : 'network-connector--inactive'}`} style={{ '--connector-index': index } as CSSProperties}><div className="network-connector__line" /></div>;
}

function NetworkReviewPanel({ planning, lines }: { planning: SavedPlanning | null; lines: CostLine[] }) {
  const data = useMemo(() => buildNetworkReview(planning, lines), [planning, lines]);
  const [result, setResult] = useState<{ planningId: string; signature: string; checks: NetworkReviewData['checks'] } | null>(null);
  const signature = data ? JSON.stringify(data.checks) : '';
  const visibleResult = result?.planningId === planning?.id && result?.signature === signature ? result : null;
  const review = () => {
    if (data) setResult({ planningId: data.planningId, signature, checks: data.checks });
  };
  return (
    <div className="mt-6 bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-textMain">Revisión del Diseño de Red</h3>
          <p className="text-xs text-textSecondary mt-0.5">Revisión local de la planificación; no es una medición ni un análisis de AWS</p>
        </div>
        <button type="button" onClick={review} disabled={!data} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${!data
          ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
          : 'bg-primary text-white hover:bg-blue-700 shadow-sm hover:shadow-md active:scale-95'}`}>
          <Wifi size={16} />Revisar red
        </button>
      </div>
      {!data ? <div className="text-center py-10 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-cardBorder">
        <ShieldAlert size={32} className="text-gray-300 dark:text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-textSecondary">Seleccione una planificación para revisar su diseño de red</p>
        <Link to="/planning" className="inline-flex items-center gap-2 text-sm font-medium text-primary dark:text-blue-400 mt-3 hover:underline">Ir a Planificación<ChevronRight size={16} /></Link>
      </div> : <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
            <p className="text-xs text-textSecondary mb-1">Direcciones IPv4 del bloque VPC</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.metrics.ipv4Addresses}</p>
            <p className="text-[10px] text-textSecondary mt-1">Total del bloque; no indica IPs libres</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/30">
            <p className="text-xs text-textSecondary mb-1">Zonas planificadas</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{data.metrics.zones}</p>
            <p className="text-[10px] text-textSecondary mt-1">Cantidad diseñada, no verificada</p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/30">
            <p className="text-xs text-textSecondary mb-1">NAT / zonas</p>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{data.metrics.nat} NAT / {data.metrics.zones} zonas</p>
            <p className="text-[10px] text-textSecondary mt-1">{data.metrics.natBelowZones ? 'NAT menor que zonas: revisa necesidades y redundancia' : 'Comparación de cantidades; no verifica distribución'}</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/30">
            <p className="text-xs text-textSecondary mb-1">Subredes públicas / privadas</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.metrics.publicSubnets} públicas / {data.metrics.privateSubnets} privadas</p>
            <p className="text-[10px] text-textSecondary mt-1">Cantidades definidas en la planificación</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">Servicios y rutas de referencia de la planificación</p>
          <p className="text-xs text-textSecondary mb-3">Rutas de referencia; no es tráfico medido ni conectividad verificada.</p>
          <p className="text-xs text-textSecondary mb-3">N° indica el orden de fila, no saltos. Las interacciones son independientes; no se enlazan como una ruta completa. IAM es control de identidad.</p>
          {!data.rows.length ? <div className="text-center py-10 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-cardBorder"><p className="text-sm text-textSecondary">Esta planificación no incluye servicios ni componentes de red para mostrar.</p></div> :
            <div className="rounded-xl border border-cardBorder overflow-hidden"><div className="overflow-x-auto"><div className="min-w-[720px]">
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-cardBorder text-[10px] font-semibold text-textSecondary uppercase tracking-wider">
                <div className="col-span-1">N°</div><div className="col-span-2">Origen</div><div className="col-span-2">Puerto</div><div className="col-span-2">Destino</div><div className="col-span-2">Protocolo</div><div className="col-span-3">En tu planificación</div>
              </div>
              {data.rows.map((row, index) => <div key={row.id} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm border-b border-cardBorder/50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-gray-50/50 dark:bg-slate-800/50'} hover:bg-blue-50/30 dark:hover:bg-blue-500/10`}>
                <div className="col-span-1"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary dark:text-blue-400 text-xs font-bold">{index + 1}</span></div>
                <div className="col-span-2 font-medium text-textMain break-words">{row.from}</div>
                <div className="col-span-2 font-mono text-xs text-textSecondary break-words">{row.port}</div>
                <div className="col-span-2 font-medium text-textMain break-words">{row.to}</div>
                <div className="col-span-2 text-xs text-textSecondary break-words">{row.protocol}</div>
                <div className="col-span-3 text-xs text-textSecondary break-words">{row.configuration}</div>
              </div>)}
            </div></div></div>}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">Resultado de la revisión local</p>
          {!visibleResult ? <div className="text-center py-10 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-cardBorder">
            <ShieldAlert size={32} className="text-gray-300 dark:text-slate-600 mx-auto mb-2" /><p className="text-sm text-textSecondary">Haz clic en “Revisar red” para comprobar las cinco reglas del diseño.</p>
          </div> : <div className="space-y-3">
            <p className="text-xs text-textSecondary">Correcto significa que no se activa la regla local; no es una validación de AWS.</p>
            {visibleResult.checks.map((check) => <div key={check.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-cardBorder">
              {check.status === 'Correcto' ? <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0 mt-1" /> : <ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-1" />}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-textMain">{check.title}</p><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${check.status === 'Correcto' ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'}`}>{check.status}</span></div>
                <p className="text-xs text-textSecondary mt-2">{check.message}</p><p className="text-xs text-textSecondary mt-2">Valores usados: {check.values}</p>
              </div>
            </div>)}
          </div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-cardBorder"><div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center"><Layers size={16} className="text-blue-600 dark:text-blue-400" /></div><div><p className="text-xs text-textSecondary">WAF</p><p className="text-sm font-medium text-textMain">{data.metrics.waf ? 'Incluido' : 'No incluido'}</p></div></div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-cardBorder"><div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center"><Shield size={16} className="text-green-600 dark:text-green-400" /></div><div><p className="text-xs text-textSecondary">Flow Logs</p><p className="text-sm font-medium text-textMain">{data.metrics.flowLogs ? 'Incluido' : 'No incluido'}</p></div></div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-cardBorder"><div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center"><Wifi size={16} className="text-amber-600 dark:text-amber-400" /></div><div><p className="text-xs text-textSecondary">Transit Gateway</p><p className="text-sm font-medium text-textMain">{data.metrics.transit ? 'Incluido' : 'No incluido'}</p></div></div>
        </div>
      </>}
    </div>
  );
}

export function Network() {
  const { activePlanning, activeCostLines } = usePlanning();
  const nodes = useMemo(() => buildNetworkDiagram(activePlanning, activeCostLines), [activePlanning, activeCostLines]);
  const [selectedNodeId, setSelectedNodeId] = useState<NetworkNodeId | null>(null);
  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;
  const SelectedIcon = selectedNode ? nodeIcons[selectedNode.icon] : Server;
  const diagramChain: NetworkNodeId[] = ['internet', 'route53', 'waf', 'cloudfront', 'alb'];
  const network = activePlanning?.network;

  return (
    <>
      <Header title="Arquitectura de Red" />

      <main className="p-4 md:p-8 bg-background min-h-screen">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* DIAGRAMA */}
          <div className="lg:col-span-2 min-w-0 bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h3 className="text-lg font-semibold text-textMain">Diagrama de Arquitectura</h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-textSecondary">
                {Object.entries(categoryColors).map(([cat, c]) => (
                  <span key={cat} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    {cat}
                  </span>
                ))}
                <NodeBadge included /><NodeBadge included={false} />
              </div>
            </div>
            <p className="text-xs text-textSecondary mb-4">Esquema ilustrativo: no representa tráfico medido ni conectividad verificada.</p>
            {!activePlanning && <div className="flex flex-wrap items-center gap-3 p-3 mb-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-sm text-textSecondary">
              Sin planificación activa: se muestra la arquitectura de referencia
              <Link to="/planning" className="font-medium text-primary dark:text-blue-400 hover:underline">Ir a Planificación</Link>
            </div>}

            <div className="max-h-[600px] overflow-y-auto pr-2 rounded-lg border border-cardBorder/50 bg-slate-50/30 dark:bg-slate-800/30 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              <div className="p-4 space-y-0">
                {diagramChain.map((id, index) => {
                  const nextId = diagramChain[index + 1] ?? 'vpc';
                  const active = (id === 'internet' ? !!activePlanning : nodes[id].included) && nodes[nextId].included;
                  return <div key={id}>
                    <div className="mx-auto w-full max-w-[190px]"><DiagramNode node={nodes[id]} selected={selectedNodeId === id} onSelect={setSelectedNodeId} /></div>
                    <VArrow active={active} index={index} />
                  </div>;
                })}

                {/* VPC container */}
                <div className={`network-diagram-node network-diagram-vpc border-2 border-dashed border-cardBorder rounded-xl p-4 ${nodes.vpc.included ? 'network-node--included' : 'network-node--reference'} ${selectedNodeId === 'vpc' ? 'network-node--selected' : ''}`}>
                  <button type="button" onClick={() => setSelectedNodeId('vpc')} aria-pressed={selectedNodeId === 'vpc'} className="network-vpc-heading flex flex-wrap items-center justify-center gap-2 w-full mb-3 text-xs font-semibold text-textSecondary uppercase tracking-wider rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                    <NetworkIcon size={18} /> VPC <NodeBadge included={nodes.vpc.included} />
                  </button>
                  <div className="flex flex-wrap justify-center gap-2 mb-4 text-[11px] text-textSecondary">
                    {network ? [
                      ...(network.vpcCidr ? [`CIDR ${network.vpcCidr}`] : []), `${network.availabilityZones} zonas`,
                      `Flow Logs: ${network.enableFlowLogs ? 'Sí' : 'No'}`, `Transit: ${network.enableTransit ? 'Sí' : 'No'}`,
                    ].map((chip) => <span key={chip} className="px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-800 break-all">{chip}</span>) : <span>Red no definida en una planificación activa</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Public subnet */}
                    <div className="border border-dashed border-green-300 dark:border-green-500/40 rounded-lg p-3 bg-green-50/40 dark:bg-green-500/10">
                      <p className="text-[10px] font-semibold text-green-600 dark:text-green-400 text-center mb-2 uppercase tracking-wide">Subredes públicas: {network ? network.publicSubnets : 'No definidas'}</p>
                      <div className="space-y-2">
                        <DiagramNode node={nodes.nat} selected={selectedNodeId === 'nat'} onSelect={setSelectedNodeId} />
                      </div>
                    </div>
                    {/* Private subnet */}
                    <div className="border border-dashed border-purple-300 dark:border-purple-500/40 rounded-lg p-3 bg-purple-50/40 dark:bg-purple-500/10">
                      <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 text-center mb-2 uppercase tracking-wide">Subredes privadas: {network ? network.privateSubnets : 'No definidas'}</p>
                      <p className="text-xs text-textSecondary text-center">No hay asignación de recursos a subredes concretas.</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-textSecondary mt-4 mb-3">Recursos en la VPC</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {(['ec2', 'ecs', 'eks', 'rds', 's3ep'] as NetworkNodeId[]).map((id) => <DiagramNode key={id} node={nodes[id]} selected={selectedNodeId === id} onSelect={setSelectedNodeId} />)}
                  </div>
                  <p className="text-[11px] text-textSecondary mt-3">Ubicación ilustrativa; la planificación no asigna estos recursos a una subred concreta.</p>
                </div>
                <p className="text-xs font-semibold text-textSecondary mt-5 mb-3">Servicios regionales</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['lambda', 's3', 'iam'] as NetworkNodeId[]).map((id) => <DiagramNode key={id} node={nodes[id]} selected={selectedNodeId === id} onSelect={setSelectedNodeId} />)}
                </div>
                <p className="text-[11px] text-textSecondary mt-3">IAM es global y se muestra como bloque de identidad y acceso, sin conectores.</p>
              </div>
            </div>
          </div>

          {/* PANEL LATERAL */}
          <div className="min-w-0 bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-textMain mb-4">Detalles del Nodo</h3>

            {selectedNode ? (
              <div className="space-y-5">
                {/* Header del nodo */}
                <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${categoryColors[selectedNode.category]?.bg ?? 'bg-blue-50 dark:bg-blue-500/10'} border ${categoryColors[selectedNode.category]?.border ?? 'border-blue-200 dark:border-blue-500/30'}`}>
                  <div className={`p-2 rounded-lg ${categoryColors[selectedNode.category]?.bg ?? 'bg-blue-100 dark:bg-blue-500/20'}`}>
                    <SelectedIcon size={24} className={categoryColors[selectedNode.category]?.text ?? 'text-blue-600 dark:text-blue-300'} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-textMain">{selectedNode.name}</p>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${categoryColors[selectedNode.category]?.bg ?? 'bg-blue-50 dark:bg-blue-500/10'} ${categoryColors[selectedNode.category]?.text ?? 'text-blue-700 dark:text-blue-300'}`}>
                      {selectedNode.category}
                    </span>
                  </div>
                  <NodeBadge included={selectedNode.included} />
                </div>

                <p className="text-sm text-textSecondary leading-relaxed">{selectedNode.detalles.description}</p>

                {/* Ruta de Trafico */}
                <div>
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Ruta de referencia</p>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 border border-cardBorder space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/15 px-2 py-0.5 rounded uppercase">From</span>
                      <span className="text-sm font-medium text-textMain">{selectedNode.detalles.route.from}</span>
                      <span className="text-xs text-textSecondary ml-auto font-mono">{selectedNode.detalles.route.fromPort}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/15 px-2 py-0.5 rounded uppercase">To</span>
                      <span className="text-sm font-medium text-textMain">{selectedNode.detalles.route.to}</span>
                      <span className="text-xs text-textSecondary ml-auto font-mono">{selectedNode.detalles.route.toPort}</span>
                    </div>
                  </div>
                </div>

                {/* Especificaciones de Red */}
                <div>
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Especificaciones de Red</p>
                  <div className="space-y-2">
                    {selectedNode.detalles.specs.map((spec, index) => <div key={spec.label} className={`flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg ${index % 3 === 0 ? 'bg-blue-50 dark:bg-blue-500/10' : index % 3 === 1 ? 'bg-green-50 dark:bg-green-500/10' : 'bg-amber-50 dark:bg-amber-500/10'}`}>
                      <span className="text-xs text-textSecondary">{spec.label}</span><span className="text-xs font-semibold text-textMain font-mono break-all">{spec.value}</span>
                    </div>)}
                    {!selectedNode.detalles.specs.length && <p className="text-xs text-textSecondary">No definido en la planificación.</p>}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">En tu planificación</p>
                  <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-3 border border-cardBorder space-y-3">
                    <p className="text-sm text-textSecondary">{selectedNode.detalles.message}</p>
                    {selectedNode.detalles.planningLines.map((line) => <div key={line.id}><p className="text-sm font-medium text-textMain break-words">{line.text}</p><p className="text-xs text-textSecondary mt-1">Región: {line.region}</p></div>)}
                    {selectedNode.detalles.notes.map((note) => <p key={note} className="text-xs text-textSecondary">{note}</p>)}
                  </div>
                </div>

                {/* Caracteristicas */}
                <div>
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Caracteristicas</p>
                  <ul className="space-y-1.5">
                    {selectedNode.detalles.characteristics.map((d, i) => (
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

        {/* REVISIÓN DEL DISEÑO DE RED */}
        <NetworkReviewPanel key={activePlanning?.id ?? 'no-planning'} planning={activePlanning} lines={activeCostLines} />
      </main>

    </>
  );
}

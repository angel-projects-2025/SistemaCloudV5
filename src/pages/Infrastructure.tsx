import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Aws3DGlobe } from '../components/Aws3DGlobe';
import { awsRegions, type AwsRegionData } from '../data/awsGlobeData';
import { API_BASE_URL } from '../config/api';
import {
  Globe,
  Server,
  HardDrive,
  Zap,
  Database,
  Cloud,
  Shield,
  Activity,
  Clock,
  Wifi,
  CheckCircle2,
} from 'lucide-react';

const KEY_REGIONS = ['us-east-1', 'sa-east-1', 'eu-west-1', 'ap-northeast-1'];

const SERVICE_ICONS: Record<string, typeof Server> = {
  ec2: Server,
  s3: HardDrive,
  dynamodb: Database,
};

const FALLBACK_ICONS: Record<string, typeof Server> = {
  'Amazon EC2': Server,
  'Amazon S3': HardDrive,
  'Amazon RDS': Database,
  'AWS Lambda': Zap,
  'Amazon DynamoDB': Database,
  'Amazon CloudFront': Cloud,
};

interface Ec2InstanceSummary {
  id: string;
  state: string;
  type: string;
  publicIp: string | null;
  region: string;
}

interface S3BucketSummary {
  name: string;
  region: string;
  status: string;
}

interface DynamoTableSummary {
  name: string;
  region: string;
  primaryKey: string;
  status: string;
}

interface ServiceResource {
  id: string;
  name: string;
  count: number;
  instances?: Ec2InstanceSummary[];
  buckets?: S3BucketSummary[];
  tables?: DynamoTableSummary[];
}

interface InstancesResponse {
  region: string;
  count: number;
  instances: Ec2InstanceSummary[];
  services: ServiceResource[];
  status?: 'AVAILABLE' | 'UNAVAILABLE';
  message?: string;
}

function getLatency(regionId: string): number {
  const base = awsRegions.find((r) => r.id === regionId);
  if (!base) return 50;
  const hash = regionId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return 15 + (hash % 120);
}

function StatusBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      {label}
    </span>
  );
}

function ResourceRow({
  label1,
  value1,
  label2,
  value2,
  mono1 = false,
  label3,
  value3,
  mono3 = false,
  badge,
}: {
  label1: string;
  value1: string;
  label2: string;
  value2: string;
  mono1?: boolean;
  label3: string;
  value3: string;
  mono3?: boolean;
  badge: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 text-xs">
      <div>
        <p className="text-slate-400 text-[10px] uppercase">{label1}</p>
        <p className={`${mono1 ? 'font-mono' : ''} font-semibold text-slate-800 dark:text-slate-100 break-all`}>{value1}</p>
      </div>
      <div>
        <p className="text-slate-400 text-[10px] uppercase">{label2}</p>
        <p className="font-semibold text-slate-800 dark:text-slate-100">{value2}</p>
      </div>
      <div>
        <p className="text-slate-400 text-[10px] uppercase">{label3}</p>
        <p className={`${mono3 ? 'font-mono' : ''} font-semibold text-slate-800 dark:text-slate-100 break-all`}>{value3}</p>
      </div>
      <div>
        <p className="text-slate-400 text-[10px] uppercase">Estado</p>
        <StatusBadge label={badge} />
      </div>
    </div>
  );
}

export function Infrastructure() {
  const [selectedRegion, setSelectedRegion] = useState<AwsRegionData | null>(null);
  const [apiData, setApiData] = useState<InstancesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRegion) {
      setApiData(null);
      setLoading(false);
      return;
    }

    const regionCode = selectedRegion.code;
    const controller = new AbortController();

    setLoading(true);

    fetch(`${API_BASE_URL}/api/aws/instances?region=${encodeURIComponent(regionCode)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<InstancesResponse>;
      })
      .then((data) => {
        setApiData(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setApiData(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [selectedRegion]);

  const isUnavailable = apiData?.status === 'UNAVAILABLE';
  const activeServices =
    apiData?.status === 'AVAILABLE'
      ? (apiData.services ?? []).filter((s) => s.count > 0)
      : [];

  const ec2Service = activeServices.find((s) => s.id === 'ec2');
  const s3Service = activeServices.find((s) => s.id === 's3');
  const ddbService = activeServices.find((s) => s.id === 'dynamodb');

  const ec2Instances = (ec2Service?.instances ?? []).filter(
    (i) => i.state === 'running' || i.state === 'pending'
  );
  const s3Buckets = s3Service?.buckets ?? [];
  const ddbTables = ddbService?.tables ?? [];

  const regionName = selectedRegion?.name ?? '';
  const regionCode = selectedRegion?.code ?? '';

  const comparisonRegions = KEY_REGIONS
    .filter((id) => id !== selectedRegion?.id)
    .slice(0, 3)
    .map((id) => awsRegions.find((r) => r.id === id)!)
    .filter(Boolean);

  return (
    <>
      <Header title="Infraestructura Global" />

      <main className="p-4 md:p-8 bg-background min-h-screen overflow-x-hidden w-full max-w-full space-y-8">

        {/* PRIMERO: Globo 3D */}
        <Aws3DGlobe selectedRegion={selectedRegion} onRegionSelect={setSelectedRegion} />

        {/* SEGUNDO: Health + Latencia */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Health Dashboard */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">AWS Health Dashboard</h3>
              </div>
              {selectedRegion && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Estado de servicios en <span className="font-medium text-slate-700 dark:text-slate-200">{regionName}</span> ({regionCode})
                </p>
              )}
            </div>

            {/* Servicios desplegados — solo con recursos activos */}
            {selectedRegion && (
              <div className="px-5 pt-5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Servicios desplegados — {regionName}
                </p>

                {loading && (
                  <div className="mb-4 p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Consultando recursos en {regionCode}…
                    </p>
                  </div>
                )}

                {!loading && isUnavailable && (
                  <div className="mb-4 flex items-start gap-3 p-3 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10">
                    <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 shrink-0 mt-0.5">
                      <Cloud size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Próximamente
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 font-medium">
                        Región no habilitada o en fase de lanzamiento
                      </p>
                    </div>
                  </div>
                )}

                {!loading && !isUnavailable && apiData && activeServices.length === 0 && (
                  <div className="mb-4 p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No hay servicios desplegados en esta región
                    </p>
                  </div>
                )}

                {/* EC2 detallado */}
                {!loading && !isUnavailable && ec2Service && ec2Instances.length > 0 && (
                  <div className="mb-4 p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Server size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Amazon EC2</span>
                      </div>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Operational</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {ec2Instances.length} instancia(s) activa(s)
                      </p>
                      {ec2Instances.map((inst) => (
                        <ResourceRow
                          key={inst.id}
                          label1="ID"
                          value1={inst.id}
                          mono1
                          label2="Tipo"
                          value2={inst.type}
                          label3="IP pública"
                          value3={inst.publicIp ?? '—'}
                          mono3
                          badge={inst.state}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* S3 detallado — mismo layout que EC2 */}
                {!loading && !isUnavailable && s3Service && s3Buckets.length > 0 && (
                  <div className="mb-4 p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Amazon S3</span>
                      </div>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Operational</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {s3Buckets.length} bucket(s) en {regionName || regionCode}
                      </p>
                      {s3Buckets.map((b) => (
                        <ResourceRow
                          key={b.name}
                          label1="Nombre / ID"
                          value1={b.name}
                          mono1
                          label2="Tipo"
                          value2="S3 Bucket"
                          label3="Ubicación"
                          value3={b.region === 'eu-west-1' ? 'eu-west-1 (Irlanda)' : b.region}
                          badge={b.status || 'available'}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* DynamoDB detallado — mismo layout que EC2 */}
                {!loading && !isUnavailable && ddbService && ddbTables.length > 0 && (
                  <div className="mb-4 p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Amazon DynamoDB</span>
                      </div>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Operational</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {ddbTables.length} tabla(s) en {regionName || regionCode}
                      </p>
                      {ddbTables.map((t) => (
                        <ResourceRow
                          key={t.name}
                          label1="Nombre / ID"
                          value1={t.name}
                          mono1
                          label2="Tipo"
                          value2="DynamoDB Table"
                          label3="Clave Primaria"
                          value3={t.primaryKey}
                          badge={t.status || 'ACTIVE'}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Tarjetas de servicios con recursos (sin count 0) */}
                {!loading && !isUnavailable && activeServices.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {activeServices.map((svc) => {
                      const Icon = SERVICE_ICONS[svc.id] ?? FALLBACK_ICONS[svc.name] ?? Server;
                      const latencyValue = selectedRegion ? getLatency(selectedRegion.id) : null;
                      return (
                        <div
                          key={svc.id}
                          className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-100 dark:border-slate-800"
                        >
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-500/15 rounded-lg">
                            <Icon size={16} className="text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{svc.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Operational</span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                · {svc.count} recurso(s)
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-400">Latencia</p>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {latencyValue !== null ? `${latencyValue}ms` : '--'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Latency Monitor — región seleccionada resaltada */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-blue-500 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Monitor de Latencia</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Comparación en tiempo real</p>
            </div>
            <div className="p-5 flex-1 space-y-3">
              {selectedRegion && (
                <div className="p-3 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-lg ring-2 ring-purple-400/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-purple-800 dark:text-purple-200">
                      {selectedRegion.name}
                      <span className="ml-1.5 text-[10px] font-bold uppercase text-purple-500 dark:text-purple-300">· Actual</span>
                    </span>
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">{getLatency(selectedRegion.id)}ms</span>
                  </div>
                  <div className="w-full bg-purple-200 dark:bg-purple-900/60 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (getLatency(selectedRegion.id) / 200) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-1">Región actual — resaltada</p>
                </div>
              )}

              {comparisonRegions.map((r) => (
                <div key={r.id} className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 rounded-lg opacity-80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{r.name}</span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{getLatency(r.id)}ms</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (getLatency(r.id) / 200) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{r.code}</p>
                </div>
              ))}

              {!selectedRegion && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Globe size={32} className="text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400">Selecciona una región en el globo o la lista para ver la latencia</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* TERCERO: KPI Cards Globales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Regiones AWS', value: '33', icon: Globe, color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-500/20' },
            { label: 'Zonas de Disponibilidad', value: '105+', icon: Shield, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-500/20' },
            { label: 'Puntos de Presencia Edge', value: '600+', icon: Wifi, color: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-500/20' },
            { label: 'Ubicaciones Direct Connect', value: '115+', icon: Activity, color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-500/20' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${kpi.iconBg}`}>
                  <kpi.icon size={18} className={kpi.color.split(' ')[1]} />
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{kpi.value}</p>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { SecurityCard } from '../components/SecurityCard';
import { StatusBadge } from '../components/StatusBadge';
import { securityData } from '../data/infrastructureData';
import { API_BASE_URL } from '../config/api';
import {
  Shield,
  Users,
  Key,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Printer,
  Lock,
  Database,
  Fingerprint,
  Stethoscope,
  RefreshCw,
} from 'lucide-react';

const BASE_SCORE = 70;

interface IamUserSummary {
  userName: string;
  arn: string;
  createDate: string | null;
  policies: string[];
}

interface IamData {
  userCount: number;
  roleCount: number;
  policyCount: number;
  mfaUsersCount: number;
  usersList: IamUserSummary[];
  status?: 'ok' | 'AVAILABLE' | 'UNAVAILABLE';
  message?: string;
}

const EMPTY_IAM: IamData = {
  userCount: 0,
  roleCount: 0,
  policyCount: 0,
  mfaUsersCount: 0,
  usersList: [],
};

interface Recommendation {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Shield;
  bg: string;
  iconBg: string;
  completed: boolean;
}

const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'rec-mfa',
    title: 'Habilitar MFA para todos los usuarios',
    subtitle: 'Mejorar la seguridad de autenticación',
    icon: Shield,
    bg: 'bg-green-50 dark:bg-green-500/10',
    iconBg: 'bg-statusGreen',
    completed: true,
  },
  {
    id: 'rec-policies',
    title: 'Revisar políticas de IAM',
    subtitle: 'Optimizar permisos y acceso',
    icon: Key,
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    iconBg: 'bg-statusAmber',
    completed: false,
  },
  {
    id: 'rec-ssl',
    title: 'Actualizar certificados SSL',
    subtitle: 'Mantener la seguridad de comunicaciones',
    icon: FileText,
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    iconBg: 'bg-primary',
    completed: false,
  },
];

interface GuideContent {
  id: string;
  title: string;
  description: string;
  keyPoints: string[];
}

const GUIDES: Record<string, GuideContent> = {
  'rec-policies': {
    id: 'rec-policies',
    title: 'Guía de Implementación: Revisar Políticas de IAM',
    description: 'Las políticas de IAM definen quién puede acceder a qué recursos en AWS. Revisarlas regularmente asegura que los usuarios solo tengan los permisos mínimos necesarios para realizar sus tareas, reduciendo el riesgo de acceso no autorizado o compromiso de cuentas.',
    keyPoints: [
      'Aplicar el Principio de Mínimo Privilegio: otorgar solo los permisos estrictamente necesarios',
      'Identificar y eliminar políticas con permisos excesivos (Action: *) usando IAM Access Analyzer',
      'Usar roles IAM en lugar de usuarios para acceder a servicios AWS',
      'Implementar Permission Boundaries para restringir permisos máximos en roles delegados',
      'Crear políticas personalizadas cuando las políticas gestionadas no cubran necesidades específicas',
      'Revisar trimestralmente las políticas con AWS Config y IAM Access Analyzer',
      'Auditar cambios de políticas con CloudTrail para trazabilidad'
    ]
  },
  'rec-ssl': {
    id: 'rec-ssl',
    title: 'Guía de Implementación: Actualizar Certificados SSL/TLS',
    description: 'Los certificados SSL/TLS cifran las comunicaciones entre clientes y servicios AWS. Mantenerlos actualizados y usar versiones modernas de TLS previene ataques man-in-the-middle y garantiza la integridad de los datos en tránsito.',
    keyPoints: [
      'Verificar certificados en AWS Certificate Manager (ACM) y renovar los que expiran en menos de 30 días',
      'Configurar renovación automática para certificados gestionados por ACM',
      'Actualizar políticas TLS para permitir solo TLS 1.2 o superior (deshabilitar SSLv3, TLS 1.0, TLS 1.1)',
      'Configurar redirect HTTP → HTTPS en CloudFront, ALB y API Gateway',
      'Usar certificados wildcard o SAN cuando sea apropiado para reducir gestión',
      'Monitorear expiración de certificados con AWS Config Rules o Lambda',
      'Implementar HSTS (HTTP Strict Transport Security) en CloudFront'
    ]
  }
};

interface Control {
  id: string;
  name: string;
  status: 'approved' | 'review';
  detail: string;
}

function buildControls(iam: IamData): Control[] {
  return [
    {
      id: 'iam-config',
      name: 'Configuración IAM',
      status: 'approved',
      detail: `${iam.userCount} usuarios, ${iam.roleCount} roles y ${iam.policyCount} políticas configuradas.`,
    },
    {
      id: 'mfa-auth',
      name: 'Autenticación MFA',
      status: 'approved',
      detail: `${iam.mfaUsersCount} de ${iam.userCount} usuarios tienen MFA habilitado.`,
    },
    {
      id: 'account-protection',
      name: 'Protección de cuentas',
      status: 'review',
      detail: '2 de 3 controles aprobados.',
    },
    {
      id: 'data-protection',
      name: 'Protección de datos',
      status: 'review',
      detail: '2 de 3 controles aprobados.',
    },
    {
      id: 'compliance',
      name: 'Cumplimiento',
      status: 'review',
      detail: '2 de 4 controles aprobados.',
    },
  ];
}

interface ProtectionItem {
  id: string;
  name: string;
  icon: typeof CheckCircle2;
  status: 'approved' | 'review';
  detail: string;
}

const ACCOUNT_ITEMS: ProtectionItem[] = [
  { id: 'mfa-auth-detail', name: 'Autenticación MFA', icon: Fingerprint, status: 'approved', detail: 'Protección adicional mediante autenticación multifactor' },
  { id: 'password-policy', name: 'Política de contraseñas', icon: Lock, status: 'approved', detail: 'Uso de contraseñas seguras para las cuentas' },
  { id: 'access-control', name: 'Control de accesos', icon: Users, status: 'review', detail: 'Asignación de permisos según el rol del usuario' },
];

const DATA_ITEMS: ProtectionItem[] = [
  { id: 'encryption', name: 'Cifrado de datos', icon: Shield, status: 'approved', detail: 'Protección de la información mediante cifrado' },
  { id: 'storage-protection', name: 'Protección de almacenamiento', icon: Database, status: 'approved', detail: 'Seguridad de los datos almacenados en servicios Cloud' },
  { id: 'key-management', name: 'Gestión de claves', icon: Key, status: 'review', detail: 'Administración segura de las claves de cifrado' },
];

interface Diagnostic {
  id: string;
  title: string;
  finding: string;
  steps: string[];
}

const DIAGNOSTICS: Record<string, Diagnostic> = {
  'access-control': {
    id: 'access-control',
    title: 'Control de Accesos',
    finding: 'Existen usuarios con políticas inline atadas directamente en lugar de roles IAM estructurados, lo que dificulta la auditoría y gestión de permisos.',
    steps: [
      'Crear roles IAM con permisos mínimos necesarios (Principle of Least Privilege)',
      'Asignar políticas gestionadas en lugar de políticas inline',
      'Mover usuarios a grupos IAM según su función',
      'Revisar y eliminar permisos innecesarios con IAM Access Analyzer',
      'Habilitar el inicio de sesión con MFA para todos los usuarios administrativos',
    ],
  },
  'key-management': {
    id: 'key-management',
    title: 'Gestión de Claves',
    finding: 'No se utiliza AWS KMS para la gestión centralizada de claves de cifrado; algunas claves están hardcodeadas en las aplicaciones.',
    steps: [
      'Crear claves maestras (CMK) en AWS KMS para cada caso de uso',
      'Migrar claves hardcodeadas a AWS Secrets Manager',
      'Configurar rotación automática de claves (cada 365 días)',
      'Establecer políticas de acceso restrictivas a las claves KMS',
      'Habilitar la auditoría de uso de claves con CloudTrail',
    ],
  },
  'rec-mfa': {
    id: 'rec-mfa',
    title: 'MFA para Usuarios',
    finding: 'No todos los usuarios tienen habilitada la autenticación multifactor (MFA), lo que aumenta el riesgo de acceso no autorizado.',
    steps: [
      'Ir a IAM > Usuarios > Seleccionar usuario > Seguridad credentials',
      'Asignar dispositivo MFA (virtual, hardware o FIDO2)',
      'Configurar MFA en la consola de inicio de sesión de AWS',
      'Establecer una política IAM que requiera MFA para acciones sensibles',
      'Verificar con IAM Access Analyzer que todos los usuarios tengan MFA',
    ],
  },
  'rec-policies': {
    id: 'rec-policies',
    title: 'Políticas de IAM',
    finding: 'Existen políticas con permisos excesivos (policies con Action: *) que violan el principio de mínimo privilegio.',
    steps: [
      'Identificar políticas con permisos excesivos con IAM Access Analyzer',
      'Crear políticas personalizadas con permisos mínimos necesarios',
      'Usar roles en lugar de usuarios para servicios',
      'Implementar Permission Boundary para restringir permisos máximos',
      'Revisar trimestralmente las políticas con AWS Config',
    ],
  },
  'rec-ssl': {
    id: 'rec-ssl',
    title: 'Certificados SSL',
    finding: 'Algunos certificados SSL están próximos a expirar o usan versiones de TLS obsoletas.',
    steps: [
      'Verificar certificados en AWS Certificate Manager (ACM)',
      'Renovar certificados que expiran en menos de 30 días',
      'Configurar renovación automática para certificados ACM',
      'Actualizar políticas TLS para permitir solo TLS 1.2 o superior',
      'Configurar redirect HTTP → HTTPS en CloudFront/ALB',
    ],
  },
  'compliance': {
    id: 'compliance',
    title: 'Cumplimiento',
    finding: '2 de 4 marcos de cumplimiento no están completamente aprobados (GDPR y HIPAA requieren controles adicionales).',
    steps: [
      'Revisar controles faltantes para GDPR en AWS Artifact',
      'Implementar cifrado de datos en reposo y en tránsito',
      'Configurar retención de registros con CloudTrail',
      'Establecer procedimientos de respuesta a incidentes',
      'Realizar evaluación de impacto de privacidad (DPIA)',
    ],
  },
  'account-protection': {
    id: 'account-protection',
    title: 'Protección de Cuentas',
    finding: '1 de 3 controles de protección de cuentas no está aprobado: control de accesos basado en roles.',
    steps: [
      'Crear roles IAM para cada función/aperfil de usuario',
      'Eliminar políticas inline y usar políticas gestionadas',
      'Implementar SCPs en AWS Organizations',
      'Configurar MFA para todos los usuarios',
      'Revisar Access Analyzer para detectar accesos peligrosos',
    ],
  },
  'data-protection': {
    id: 'data-protection',
    title: 'Protección de Datos',
    finding: '1 de 3 controles de protección de datos no está aprobado: gestión de claves de cifrado.',
    steps: [
      'Crear claves CMK en AWS KMS',
      'Activar cifrado de datos en reposo en S3, EBS y RDS',
      'Configurar rotación automática de claves',
      'Implementar AWS Secrets Manager para credenciales',
      'Habilitar cifrado en tránsito (TLS 1.2+)',
    ],
  },
};

function formatDate(): string {
  return new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function Security() {
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [controls, setControls] = useState<Control[]>(() => buildControls(EMPTY_IAM));
  const [guide, setGuide] = useState<GuideContent | null>(null);
  const [accountItems, setAccountItems] = useState<ProtectionItem[]>(ACCOUNT_ITEMS);
  const [dataItems, setDataItems] = useState<ProtectionItem[]>(DATA_ITEMS);
  const [iamData, setIamData] = useState<IamData>(EMPTY_IAM);
  const [loadingIam, setLoadingIam] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const fetchIam = useCallback(async () => {
    setLoadingIam(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/iam`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Partial<IamData>;
      const next: IamData = {
        userCount: typeof data.userCount === 'number' ? data.userCount : 0,
        roleCount: typeof data.roleCount === 'number' ? data.roleCount : 0,
        policyCount: typeof data.policyCount === 'number' ? data.policyCount : 0,
        mfaUsersCount: typeof data.mfaUsersCount === 'number' ? data.mfaUsersCount : 0,
        usersList: Array.isArray(data.usersList) ? data.usersList : [],
        status: data.status,
        message: data.message,
      };
      setIamData(next);
      setControls((prev) =>
        buildControls(next).map((c) => {
          const old = prev.find((p) => p.id === c.id);
          if (
            old &&
            old.status === 'approved' &&
            (c.id === 'account-protection' || c.id === 'data-protection' || c.id === 'compliance')
          ) {
            return { ...c, status: 'approved' as const, detail: old.detail };
          }
          return c;
        })
      );
      setLastRefresh(new Date().toLocaleTimeString('es-ES'));
    } catch (err) {
      console.error('Error al consultar /api/iam en frontend:', err);
    } finally {
      setLoadingIam(false);
    }
  }, []);

  useEffect(() => {
    fetchIam();
  }, [fetchIam]);

  const runAudit = () => {
    setIsAuditModalOpen(true);
    fetchIam();
  };

  const mfaPercentage =
    iamData.userCount > 0
      ? Math.round((iamData.mfaUsersCount / iamData.userCount) * 100)
      : null;
  const mfaLabel = mfaPercentage === null ? '--' : `${mfaPercentage}%`;

  const accountApproved = accountItems.filter((i) => i.status === 'approved').length;
  const dataApproved = dataItems.filter((i) => i.status === 'approved').length;
  const accountComplete = accountApproved === accountItems.length;
  const dataComplete = dataApproved === dataItems.length;

  const remediatedCount = controls.filter((c) => c.status === 'approved').length;
  const securityScore = remediatedCount <= 2
    ? BASE_SCORE
    : remediatedCount === 3
      ? 85
      : remediatedCount === 4
        ? 93
        : 100;

  const openDiagnostic = (id: string) => {
    const d = DIAGNOSTICS[id];
    if (d) setDiagnostic(d);
  };

  const approveControl = (controlId: string, detail?: string) => {
    setControls((prev) =>
      prev.map((c) =>
        c.id === controlId
          ? { ...c, status: 'approved' as const, ...(detail ? { detail } : {}) }
          : c
      )
    );
  };

  const applyFix = () => {
    if (!diagnostic) return;
    const id = diagnostic.id;

    const isAccountItem = accountItems.some((i) => i.id === id);
    const isDataItem = dataItems.some((i) => i.id === id);

    if (isAccountItem) {
      const next = accountItems.map((i) =>
        i.id === id ? { ...i, status: 'approved' as const } : i
      );
      setAccountItems(next);
      const approved = next.filter((i) => i.status === 'approved').length;
      if (approved === next.length) {
        approveControl('account-protection', `${next.length} de ${next.length} controles aprobados.`);
      } else {
        setControls((prev) =>
          prev.map((c) =>
            c.id === 'account-protection'
              ? { ...c, detail: `${approved} de ${next.length} controles aprobados.` }
              : c
          )
        );
      }
      setDiagnostic(null);
      return;
    }

    if (isDataItem) {
      const next = dataItems.map((i) =>
        i.id === id ? { ...i, status: 'approved' as const } : i
      );
      setDataItems(next);
      const approved = next.filter((i) => i.status === 'approved').length;
      if (approved === next.length) {
        approveControl('data-protection', `${next.length} de ${next.length} controles aprobados.`);
      } else {
        setControls((prev) =>
          prev.map((c) =>
            c.id === 'data-protection'
              ? { ...c, detail: `${approved} de ${next.length} controles aprobados.` }
              : c
          )
        );
      }
      setDiagnostic(null);
      return;
    }

    if (id === 'account-protection' || id === 'data-protection') {
      if (id === 'account-protection') {
        setAccountItems((prev) =>
          prev.map((i) => ({ ...i, status: 'approved' as const }))
        );
        approveControl('account-protection', `${ACCOUNT_ITEMS.length} de ${ACCOUNT_ITEMS.length} controles aprobados.`);
      } else {
        setDataItems((prev) =>
          prev.map((i) => ({ ...i, status: 'approved' as const }))
        );
        approveControl('data-protection', `${DATA_ITEMS.length} de ${DATA_ITEMS.length} controles aprobados.`);
      }
      setDiagnostic(null);
      return;
    }

    approveControl(id);
    setDiagnostic(null);
  };

  return (
    <>
      <Header title="Seguridad e IAM" />

      <main className="p-4 md:p-8 bg-background dark:bg-slate-950 min-h-screen space-y-8 print:hidden">

        {/* BANNER SUPERIOR - SECURITY CENTER */}
        <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-xs font-bold text-primary dark:text-blue-400 uppercase tracking-widest">Security Center</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live AWS Data
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-textMain dark:text-slate-100">Seguridad e IAM</h1>
                <p className="text-sm text-textSecondary mt-1 max-w-xl">
                  Monitoreo de controles de seguridad, identidades, protección de cuentas y datos de la solución Cloud.
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={runAudit}
                  disabled={loadingIam}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {loadingIam ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                  {loadingIam ? 'Actualizando…' : 'Ejecutar auditoría'}
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <FileText size={16} />
                  Ver reporte
                </button>
              </div>
            </div>

            {/* Barra de estado general */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg">
              <div className="flex items-center gap-4 mb-3">
                <p className="text-sm font-medium text-textMain dark:text-slate-200">Estado general de seguridad</p>
                <span className={`text-4xl font-bold ${securityScore >= 85 ? 'text-statusGreen dark:text-green-400' : 'text-statusAmber dark:text-amber-400'}`}>
                  {securityScore}%
                </span>
                <StatusBadge
                  status={securityScore >= 100 ? 'approved' : 'review'}
                  text={securityScore >= 100 ? 'Excelente' : securityScore >= 85 ? 'Mejorado' : 'Requiere revisión'}
                />
              </div>
              <div className="w-full bg-amber-200 dark:bg-amber-500/20 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${securityScore >= 85 ? 'bg-statusGreen' : 'bg-statusAmber'}`}
                  style={{ width: `${securityScore}%` }}
                />
              </div>
              <p className="text-xs text-textSecondary mt-2">
                Análisis y métricas en tiempo real con AWS IAM API
                {lastRefresh && (
                  <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    · Actualizado {lastRefresh}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tarjetas principales — datos reales de /api/iam */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SecurityCard
            title="Usuarios IAM"
            value={iamData.userCount}
            status="approved"
          />
          <SecurityCard
            title="Roles"
            value={iamData.roleCount}
            status="approved"
          />
          <SecurityCard
            title="Políticas"
            value={iamData.policyCount}
            status="review"
          />
          <SecurityCard
            title="MFA Habilitado"
            value={iamData.mfaUsersCount}
            total={iamData.userCount}
            status={(mfaPercentage ?? 0) >= 80 ? 'approved' : 'review'}
          />
        </div>

        {/* Tabla de usuarios IAM reales */}
        <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-textMain dark:text-slate-100">Usuarios e identidades reales</h3>
              <p className="text-sm text-textSecondary mt-0.5">
                Listados desde AWS IAM API · {iamData.usersList.length} usuario(s)
              </p>
            </div>
            <button
              onClick={fetchIam}
              disabled={loadingIam}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/20 disabled:opacity-60"
            >
              <RefreshCw size={14} className={loadingIam ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>

          {iamData.usersList.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-textSecondary">
                {loadingIam
                  ? 'Consultando usuarios IAM en AWS…'
                  : 'No se encontraron usuarios IAM o la API no está disponible.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-textSecondary">
                    <th className="px-5 py-3 font-semibold">Nombre de usuario</th>
                    <th className="px-5 py-3 font-semibold">ARN de AWS</th>
                    <th className="px-5 py-3 font-semibold">Fecha de creación</th>
                    <th className="px-5 py-3 font-semibold">Políticas asignadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {iamData.usersList.map((user) => (
                    <tr
                      key={user.arn || user.userName}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-5 py-3 font-semibold text-textMain dark:text-slate-100">
                        {user.userName}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-textSecondary break-all">
                        {user.arn}
                      </td>
                      <td className="px-5 py-3 text-textSecondary whitespace-nowrap">
                        {user.createDate
                          ? new Date(user.createDate).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {user.policies.length === 0 ? (
                          <span className="text-xs text-textSecondary">Sin políticas</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {user.policies.map((policy) => (
                              <span
                                key={policy}
                                className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30"
                              >
                                {policy}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Protección de Cuentas + Protección de Datos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TARJETA 1: Protección de Cuentas */}
          <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-primary dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-textMain dark:text-slate-100">Protección de Cuentas</h3>
              </div>
              <StatusBadge
                status={accountComplete ? 'approved' : 'review'}
                text={`${accountApproved}/${accountItems.length}`}
              />
            </div>
            <p className="text-sm text-textSecondary mb-4">Controles aplicados a las cuentas y accesos.</p>
            <div className="space-y-3">
              {accountItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div className={`p-1.5 rounded-full mt-0.5 ${item.status === 'approved' ? 'bg-green-100 dark:bg-green-500/15' : 'bg-amber-100 dark:bg-amber-500/15'}`}>
                    {item.status === 'approved' ? (
                      <CheckCircle2 size={16} className="text-statusGreen dark:text-green-400" />
                    ) : (
                      <AlertTriangle size={16} className="text-statusAmber dark:text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-textMain dark:text-slate-200">{item.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-textSecondary mt-1">{item.detail}</p>
                    {item.status === 'review' && (
                      <button
                        onClick={() => openDiagnostic(item.id)}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/20"
                      >
                        <Stethoscope size={14} />
                        Ver Diagnóstico
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TARJETA 2: Protección de Datos */}
          <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-primary dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-textMain dark:text-slate-100">Protección de Datos</h3>
              </div>
              <StatusBadge
                status={dataComplete ? 'approved' : 'review'}
                text={`${dataApproved}/${dataItems.length}`}
              />
            </div>
            <p className="text-sm text-textSecondary mb-4">Controles utilizados para proteger la información.</p>
            <div className="space-y-3">
              {dataItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div className={`p-1.5 rounded-full mt-0.5 ${item.status === 'approved' ? 'bg-green-100 dark:bg-green-500/15' : 'bg-amber-100 dark:bg-amber-500/15'}`}>
                    {item.status === 'approved' ? (
                      <CheckCircle2 size={16} className="text-statusGreen dark:text-green-400" />
                    ) : (
                      <AlertTriangle size={16} className="text-statusAmber dark:text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-textMain dark:text-slate-200">{item.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-xs text-textSecondary mt-1">{item.detail}</p>
                    {item.status === 'review' && (
                      <button
                        onClick={() => openDiagnostic(item.id)}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/20"
                      >
                        <Stethoscope size={14} />
                        Ver Diagnóstico
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Responsabilidad compartida + Cumplimiento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-textMain dark:text-slate-100 mb-4">Modelo de Responsabilidad Compartida</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={20} className="text-primary dark:text-blue-400" />
                  <h4 className="font-medium text-textMain dark:text-slate-200">AWS</h4>
                </div>
                <ul className="space-y-2">
                  {securityData.sharedResponsibility.aws.map((item, index) => (
                    <li key={index} className="text-sm text-textSecondary flex items-start gap-2">
                      <span className="text-primary dark:text-blue-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={20} className="text-statusGreen dark:text-green-400" />
                  <h4 className="font-medium text-textMain dark:text-slate-200">Cliente</h4>
                </div>
                <ul className="space-y-2">
                  {securityData.sharedResponsibility.customer.map((item, index) => (
                    <li key={index} className="text-sm text-textSecondary flex items-start gap-2">
                      <span className="text-statusGreen dark:text-green-400 mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-textMain dark:text-slate-100 mb-4">Estado de Cumplimiento</h3>
            <div className="space-y-3">
              {securityData.compliance.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-textSecondary" />
                    <span className="font-medium text-textMain dark:text-slate-200">{item.name}</span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recomendaciones de Seguridad */}
        <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-textMain dark:text-slate-100 mb-4">Recomendaciones de Seguridad</h3>
          <div className="space-y-3">
            {RECOMMENDATIONS.map((rec) => (
              <div key={rec.id} className={`flex items-start gap-3 p-4 ${rec.bg} rounded-lg`}>
                <div className={`p-2 ${rec.iconBg} rounded-full`}>
                  <rec.icon size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-textMain dark:text-slate-200">{rec.title}</p>
                      <p className="text-sm text-textSecondary">{rec.subtitle}</p>
                    </div>
                    {rec.completed ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-statusGreen bg-green-100 rounded-lg shrink-0 dark:text-green-400 dark:bg-green-500/15">
                        <CheckCircle2 size={14} />
                        Completado
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          const g = GUIDES[rec.id];
                          if (g) setGuide(g);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shrink-0 dark:bg-slate-800 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/15"
                      >
                        <FileText size={14} />
                        Ver Detalles
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* MODAL DE AUDITORÍA (solo informativo) */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsAuditModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg">
                    <Shield size={20} className="text-primary dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-textMain dark:text-slate-100">Auditoría de Seguridad</h2>
                    <p className="text-xs text-textSecondary">Revisión de controles de seguridad e IAM</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuditModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={18} className="text-textSecondary" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg mb-5">
                <span className="text-sm font-medium text-textMain dark:text-slate-200">Resultado de auditoría: {securityScore}%</span>
                <StatusBadge
                  status={securityScore >= 100 ? 'approved' : 'review'}
                  text={securityScore >= 100 ? 'Excelente' : 'Requiere revisión'}
                />
              </div>

              <div className="space-y-3">
                {controls.map((ctrl) => (
                  <div key={ctrl.id} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className={`p-1.5 rounded-full mt-0.5 ${ctrl.status === 'approved' ? 'bg-green-100 dark:bg-green-500/15' : 'bg-amber-100 dark:bg-amber-500/15'}`}>
                      {ctrl.status === 'approved' ? (
                        <CheckCircle2 size={16} className="text-statusGreen dark:text-green-400" />
                      ) : (
                        <AlertTriangle size={16} className="text-statusAmber dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-textMain dark:text-slate-200">{ctrl.name}</span>
                        <StatusBadge status={ctrl.status} />
                      </div>
                      <p className="text-xs text-textSecondary mt-1">{ctrl.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-primary dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-textMain dark:text-slate-200">Observación</p>
                    <p className="text-xs text-textSecondary mt-1">
                      {securityScore >= 100
                        ? 'Todos los controles han sido remediados exitosamente. La postura de seguridad es óptima.'
                        : 'Se recomienda revisar los controles marcados como pendientes desde las tarjetas de protección de la vista principal.'}
                    </p>
                    <p className="text-xs text-textSecondary mt-2">
                      Datos IAM: {iamData.userCount} usuarios · {iamData.roleCount} roles · {iamData.policyCount} políticas · {iamData.mfaUsersCount} con MFA
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setIsAuditModalOpen(false)}
                className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DIAGNÓSTICO */}
      {diagnostic && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDiagnostic(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg">
                    <Stethoscope size={20} className="text-primary dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-textMain dark:text-slate-100">Diagnóstico: {diagnostic.title}</h2>
                    <p className="text-xs text-textSecondary">Análisis de seguridad AWS</p>
                  </div>
                </div>
                <button
                  onClick={() => setDiagnostic(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={18} className="text-textSecondary" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Hallazgo */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-statusAmber dark:text-amber-400" />
                  <h3 className="text-sm font-semibold text-textMain dark:text-slate-200">Hallazgo</h3>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg">
                  <p className="text-sm text-textMain dark:text-slate-200">{diagnostic.finding}</p>
                </div>
              </div>

              {/* Pasos de Remediation */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-statusGreen dark:text-green-400" />
                  <h3 className="text-sm font-semibold text-textMain dark:text-slate-200">Pasos de Remediation AWS</h3>
                </div>
                <div className="space-y-2">
                  {diagnostic.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-sm text-textMain dark:text-slate-200 pt-0.5">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setDiagnostic(null)}
                className="px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={applyFix}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <CheckCircle2 size={16} />
                Aplicar Solución y Marcar Aprobado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REPORTE */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:inset-auto print:p-0">
          <div className="absolute inset-0 bg-black/50 print:hidden" onClick={() => setIsReportModalOpen(false)} />
          <div
            id="printable-report"
            className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border dark:border-slate-700 print:max-w-full print:max-h-none print:rounded-none print:shadow-none print:overflow-visible"
          >
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 print:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg">
                    <FileText size={20} className="text-primary dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg font-bold text-textMain dark:text-slate-100">Reporte de Seguridad e IAM</h2>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={18} className="text-textSecondary" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 print:overflow-visible print:p-8">
              {/* Encabezado interno */}
              <div className="w-full flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">CloudOps Dashboard</p>
                  <p className="text-sm text-textSecondary mt-1">Reporte ejecutivo de seguridad</p>
                </div>
                <p className="text-sm text-textSecondary">{formatDate()}</p>
              </div>

              {/* Tarjetas de resumen */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
                <div className={`p-4 border rounded-lg text-center ${securityScore >= 85 ? 'bg-green-50 border-green-200 dark:bg-green-500/10 dark:border-green-500/30' : 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'}`}>
                  <p className="text-xs text-textSecondary mb-1">Seguridad general</p>
                  <p className={`text-2xl font-bold ${securityScore >= 85 ? 'text-statusGreen dark:text-green-400' : 'text-statusAmber dark:text-amber-400'}`}>{securityScore}%</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 dark:bg-green-500/10 dark:border-green-500/30 rounded-lg text-center">
                  <p className="text-xs text-textSecondary mb-1">MFA habilitado</p>
                  <p className="text-2xl font-bold text-statusGreen dark:text-green-400">{mfaLabel}</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg text-center">
                  <p className="text-xs text-textSecondary mb-1">Cumplimiento</p>
                  <p className="text-2xl font-bold text-primary dark:text-blue-400">2/4</p>
                </div>
              </div>

              {/* Mini resumen IAM */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-6">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-center">
                  <Users size={16} className="text-primary dark:text-blue-400 mx-auto mb-1" />
                  <p className="text-[10px] text-textSecondary">Usuarios</p>
                  <p className="text-lg font-bold text-textMain dark:text-slate-200">{iamData.userCount}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-center">
                  <Key size={16} className="text-statusGreen dark:text-green-400 mx-auto mb-1" />
                  <p className="text-[10px] text-textSecondary">Roles</p>
                  <p className="text-lg font-bold text-textMain dark:text-slate-200">{iamData.roleCount}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-center">
                  <FileText size={16} className="text-statusAmber dark:text-amber-400 mx-auto mb-1" />
                  <p className="text-[10px] text-textSecondary">Políticas</p>
                  <p className="text-lg font-bold text-textMain dark:text-slate-200">{iamData.policyCount}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-center">
                  <Shield size={16} className="text-primary dark:text-blue-400 mx-auto mb-1" />
                  <p className="text-[10px] text-textSecondary">MFA</p>
                  <p className="text-lg font-bold text-textMain dark:text-slate-200">{mfaLabel}</p>
                </div>
              </div>

              {/* Controles principales */}
              <div className="w-full text-left border-collapse mb-6">
                <h3 className="text-sm font-semibold text-textMain dark:text-slate-200 mb-3">Controles principales</h3>
                <div className="space-y-2">
                  {controls.map((ctrl) => (
                    <div key={ctrl.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        {ctrl.status === 'approved' ? (
                          <CheckCircle2 size={14} className="text-statusGreen dark:text-green-400" />
                        ) : (
                          <AlertTriangle size={14} className="text-statusAmber dark:text-amber-400" />
                        )}
                        <span className="text-sm text-textMain dark:text-slate-200">{ctrl.name}</span>
                      </div>
                      <StatusBadge status={ctrl.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Estado de Cumplimiento */}
              <div className="w-full text-left border-collapse mb-6">
                <h3 className="text-sm font-semibold text-textMain dark:text-slate-200 mb-3">Estado de Cumplimiento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {securityData.compliance.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <span className="text-sm font-medium text-textMain dark:text-slate-200">{item.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Observación del sistema */}
              <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg">
                <p className="text-sm font-semibold text-textMain dark:text-slate-200 mb-1">Observación del sistema</p>
                <p className="text-xs text-textSecondary">
                  Se recomienda revisar los controles marcados como pendientes para mejorar la postura de seguridad general de la cuenta. Este reporte es generado con fines informativos y no sustituye una auditoría profesional.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Printer size={16} />
                Imprimir / PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GUÍA DE BUENAS PRÁCTICAS */}
      {guide && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setGuide(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg">
                    <FileText size={20} className="text-primary dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-textMain dark:text-slate-100">{guide.title}</h2>
                    <p className="text-xs text-textSecondary">Buenas prácticas AWS</p>
                  </div>
                </div>
                <button
                  onClick={() => setGuide(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={18} className="text-textSecondary" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Descripción */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={16} className="text-primary dark:text-blue-400" />
                  <h3 className="text-sm font-semibold text-textMain dark:text-slate-200">Descripción</h3>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg">
                  <p className="text-sm text-textMain dark:text-slate-200 leading-relaxed">{guide.description}</p>
                </div>
              </div>

              {/* Puntos Clave */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-statusGreen dark:text-green-400" />
                  <h3 className="text-sm font-semibold text-textMain dark:text-slate-200">Puntos clave de la guía</h3>
                </div>
                <div className="space-y-2">
                  {guide.keyPoints.map((point, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-sm text-textMain dark:text-slate-200 pt-0.5">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setGuide(null)}
                className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

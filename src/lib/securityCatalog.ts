import type { CostLine } from './costEngine';
import { SERVICES } from './planningCatalog';
import type { IamIdentity, SavedPlanning } from './planningCatalog';
import { buildPillars } from './wellArchitected';
import { awsRegions } from '../data/awsGlobeData';

export type SecurityState = 'Incluido en la planificación' | 'No incluido' | 'Recomendado';

export interface SecurityControl {
  id: string;
  name: string;
  status: SecurityState;
  detail: string;
  steps: string[];
}

export interface SecurityGuide {
  id: string;
  title: string;
  description: string;
  keyPoints: string[];
}

export const SECURITY_NOTE = 'Estimación local basada en la planificación; no es una auditoría de AWS';
export const NO_IDENTITIES_NOTE = 'Esta planificación no define identidades. Toda cuenta de AWS incluye IAM; se recomienda definir roles con permisos mínimos.';
export const IDENTITY_DESIGN_NOTE = 'Identidades de diseño; no se guardan contraseñas, claves de acceso ni secretos.';

const GENERAL_POLICIES = ['AdministratorAccess', 'PowerUserAccess', 'ReadOnlyAccess', 'ViewOnlyAccess', 'SecurityAudit', 'Billing'];
const SERVICE_POLICIES: Record<string, string[]> = {
  EC2: ['AmazonEC2ReadOnlyAccess', 'AmazonEC2FullAccess'],
  S3: ['AmazonS3ReadOnlyAccess', 'AmazonS3FullAccess'],
  RDS: ['AmazonRDSReadOnlyAccess', 'AmazonRDSFullAccess'],
  Lambda: ['AWSLambda_ReadOnlyAccess', 'AWSLambda_FullAccess'],
};
const ALL_POLICIES = new Set([...GENERAL_POLICIES, ...Object.values(SERVICE_POLICIES).flat()]);

export function availableIamPolicies(serviceIds: string[], retainedPermissions: string[] = []): string[] {
  return [...new Set([...GENERAL_POLICIES, ...serviceIds.flatMap((id) => SERVICE_POLICIES[id] ?? []), ...retainedPermissions.filter((permission) => ALL_POLICIES.has(permission))])];
}

export function validateIamIdentities(value: unknown): asserts value is IamIdentity[] {
  if (!Array.isArray(value)) throw new Error('La lista de identidades no es válida.');
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('La identidad no es válida.');
    const identity = entry as Record<string, unknown>;
    if (typeof identity.id !== 'string' || !identity.id || ids.has(identity.id)) throw new Error('Las identidades deben tener identificadores únicos.');
    if (identity.type !== 'usuario' && identity.type !== 'rol') throw new Error('Selecciona Usuario o Rol.');
    if (typeof identity.name !== 'string' || !identity.name.length) throw new Error('El nombre de la identidad es obligatorio.');
    if (identity.name.length > 64) throw new Error('El nombre debe tener como máximo 64 caracteres.');
    if (!/^[A-Za-z0-9+=,.@_-]+$/.test(identity.name)) throw new Error('Usa solo letras A–Z, números y + = , . @ _ - en el nombre, sin espacios.');
    const nameKey = `${identity.type}:${identity.name.toLowerCase()}`;
    if (names.has(nameKey)) throw new Error('Ya existe una identidad de ese tipo con el mismo nombre (sin distinguir mayúsculas).');
    if (!Array.isArray(identity.permissions) || !identity.permissions.every((permission) => typeof permission === 'string' && ALL_POLICIES.has(permission))) throw new Error('Selecciona permisos del catálogo de políticas disponible.');
    if (new Set(identity.permissions).size !== identity.permissions.length) throw new Error('Una identidad no puede repetir el mismo permiso.');
    if (identity.type === 'usuario' ? typeof identity.requireMfa !== 'boolean' : identity.requireMfa !== undefined) throw new Error('Exigir MFA solo se define para usuarios, con Sí o No.');
    const allowedKeys = identity.type === 'usuario' ? ['id', 'type', 'name', 'permissions', 'requireMfa'] : ['id', 'type', 'name', 'permissions'];
    if (Object.keys(identity).some((key) => !allowedKeys.includes(key))) throw new Error('Las identidades de diseño no admiten otros campos ni secretos.');
    ids.add(identity.id);
    names.add(nameKey);
  }
}

export function isIamIdentityList(value: unknown): value is IamIdentity[] {
  try { validateIamIdentities(value); return true; } catch { return false; }
}

export function summarizeIamIdentities(identities: IamIdentity[] = []) {
  const users = identities.filter((identity) => identity.type === 'usuario');
  const mfaRequired = users.filter((identity) => identity.requireMfa).length;
  return {
    users: users.length,
    roles: identities.filter((identity) => identity.type === 'rol').length,
    policies: new Set(identities.flatMap((identity) => identity.permissions)).size,
    mfaRequired,
    mfaLabel: users.length ? `${mfaRequired}/${users.length}` : '—',
    allUsersRequireMfa: users.length > 0 && mfaRequired === users.length,
  };
}

export const SHARED_RESPONSIBILITY = {
  aws: ['Seguridad de la nube', 'Seguridad de los servicios', 'Protección de infraestructura'],
  customer: ['Seguridad en la nube', 'Configuración de servicios', 'Gestión de datos'],
};

const RESPONSIBILITIES: Record<string, { aws: string; customer: string; scope: 'Global' | 'Regional' }> = {
  EC2: { scope: 'Regional', aws: 'Hardware, red y virtualización.', customer: 'Sistema operativo y parches, aplicaciones, grupos de seguridad, cifrado de discos y accesos.' },
  Lambda: { scope: 'Regional', aws: 'Servidores, sistema operativo y entorno de ejecución.', customer: 'Código, permisos del rol de ejecución y datos que procesa.' },
  ECS: { scope: 'Regional', aws: 'Infraestructura y servidores de Fargate.', customer: 'Imágenes de contenedor, permisos, red y datos.' },
  EKS: { scope: 'Regional', aws: 'Plano de control administrado.', customer: 'Nodos de trabajo y sus parches, permisos del clúster, aplicaciones y red.' },
  S3: { scope: 'Regional', aws: 'Infraestructura y durabilidad.', customer: 'Quién accede, cifrado, versionado y bloqueo de acceso público.' },
  RDS: { scope: 'Regional', aws: 'Hardware, sistema operativo y parches del motor; disponibilidad Multi-AZ cuando se configura.', customer: 'Datos, usuarios de la base, red, cifrado y configuración de copias.' },
  VPC: { scope: 'Regional', aws: 'Red física.', customer: 'Subredes, rutas, grupos de seguridad y registros de tráfico (Flow Logs).' },
  'Route 53': { scope: 'Global', aws: 'Servidores DNS globales y su disponibilidad.', customer: 'Registros y accesos a la zona.' },
  CloudFront: { scope: 'Global', aws: 'Red global de entrega.', customer: 'Certificados y HTTPS, restricciones de acceso al contenido, WAF y qué expones del origen.' },
  IAM: { scope: 'Global', aws: 'El servicio y su disponibilidad.', customer: 'Usuarios, permisos mínimos, MFA y revisión de accesos.' },
};

export const ACCOUNT_CONTROLS: SecurityControl[] = [
  {
    id: 'mfa', name: 'Autenticación MFA', status: 'Recomendado',
    detail: 'La planificación no define MFA. Añade un segundo factor para proteger los accesos.',
    steps: ['Activa MFA para el usuario raíz y los usuarios con acceso a la consola.', 'Prefiere claves de seguridad o métodos resistentes al phishing.', 'No uses el usuario raíz para tareas habituales.'],
  },
  {
    id: 'passwords', name: 'Política de contraseñas', status: 'Recomendado',
    detail: 'La planificación no define una política de contraseñas. Usa contraseñas largas y únicas.',
    steps: ['Define una política de contraseñas adecuada para los usuarios IAM de consola.', 'Evita reutilizar contraseñas y utiliza un gestor de contraseñas.', 'Combina las contraseñas con MFA y considera acceso federado.'],
  },
  {
    id: 'access', name: 'Control de accesos', status: 'Recomendado',
    detail: 'Los conteos de IAM no demuestran permisos mínimos. Define roles según cada función.',
    steps: ['Concede solo las acciones y recursos necesarios para cada tarea.', 'Usa roles y credenciales temporales para aplicaciones y servicios.', 'Revisa permisos y accesos externos con IAM Access Analyzer.'],
  },
];

export const DATA_CONTROLS: SecurityControl[] = [
  {
    id: 'encryption', name: 'Cifrado de datos', status: 'Recomendado',
    detail: 'La planificación no registra la configuración de cifrado. Revisa los datos en reposo y en tránsito.',
    steps: ['Verifica el cifrado de S3, discos EBS y bases RDS según los servicios elegidos.', 'Usa TLS para proteger las comunicaciones.', 'Define quién puede usar las claves y cómo se recuperan los datos.'],
  },
  {
    id: 'storage', name: 'Protección de almacenamiento', status: 'Recomendado',
    detail: 'La planificación no define permisos de almacenamiento, versionado ni políticas de retención.',
    steps: ['Mantén bloqueado el acceso público de S3 salvo que exista una necesidad explícita.', 'Limita el acceso a datos y copias de seguridad.', 'Define versionado, retención y recuperación según el uso de la aplicación.'],
  },
  {
    id: 'keys', name: 'Gestión de claves', status: 'Recomendado',
    detail: 'La planificación no define la gestión de claves. Evita incluir secretos en el código.',
    steps: ['Evalúa AWS KMS para las claves de cifrado y restringe su uso.', 'Gestiona credenciales con un servicio de secretos y roles de acceso.', 'Define rotación y registra el uso de las claves según tus necesidades.'],
  },
];

export const COMPLIANCE = [
  { id: 'iso', name: 'ISO 27001', label: 'Parte de AWS', detail: 'AWS mantiene esta certificación. Consulta su alcance en AWS Artifact; no certifica tu aplicación.' },
  { id: 'soc', name: 'SOC 2', label: 'Parte de AWS', detail: 'AWS publica informes SOC 2 en AWS Artifact. Sus controles no cubren automáticamente tu aplicación.' },
  { id: 'gdpr', name: 'GDPR', label: 'Depende de tu región', detail: 'La región ayuda a planificar la residencia de datos, pero el cumplimiento también depende de los datos, las personas y su tratamiento.' },
  { id: 'hipaa', name: 'HIPAA', label: 'Depende de tu tipo de aplicación', detail: 'Si tratas información sanitaria sujeta a HIPAA, necesitas un acuerdo con AWS y servicios elegibles, además de tus propios controles.' },
] as const;

function residencyNote(code: string): string {
  if (code.startsWith('eu-')) return 'Considera GDPR para datos personales; elegir una región europea no garantiza el cumplimiento.';
  if (code === 'sa-east-1') return 'Considera la LGPD de Brasil para el tratamiento de datos personales.';
  if (code.startsWith('ca-')) return 'Considera PIPEDA de Canadá y los requisitos provinciales aplicables.';
  if (code === 'af-south-1') return 'Considera POPIA de Sudáfrica para la protección de datos personales.';
  if (code.startsWith('us-')) return 'No hay una ley única de protección de datos; los requisitos dependen del sector y de las leyes aplicables.';
  return 'Revisa la normativa local';
}

export function buildSecurityData(planning: SavedPlanning, lines: CostLine[]) {
  const { plan, network } = planning;
  const serviceIds = [...new Set([...plan.awsServices, ...lines.map((line) => line.planningServiceId)])];
  const hasService = (id: string) => serviceIds.includes(id);
  const identities = planning.iamIdentities ?? [];
  const iam = summarizeIamIdentities(identities);
  const accountControls = ACCOUNT_CONTROLS.map((control): SecurityControl => {
    if (control.id === 'mfa') return {
      ...control,
      status: iam.allUsersRequireMfa ? 'Incluido en la planificación' : 'Recomendado',
      detail: iam.users ? `${iam.mfaRequired} de ${iam.users} usuarios exigen MFA en el diseño. Esto no acredita MFA habilitado en AWS.` : 'No hay usuarios diseñados. Se recomienda exigir MFA para los accesos de usuarios y proteger el usuario raíz.',
    };
    if (control.id === 'access') return { ...control, detail: 'Los permisos asignados forman parte del diseño. Revisa su alcance para aplicar mínimo privilegio; una política seleccionada no acredita una configuración desplegada.' };
    return control;
  });
  // La misma entrada y fórmula que el Dashboard; los conteos no acreditan controles de acceso.
  const securityPillar = buildPillars(plan.awsServices, network).pillars.find((pillar) => pillar.pillar === 'Seguridad')!;
  const networkControls: SecurityControl[] = [
    { id: 'waf', name: 'WAF', status: network.enableWaf ? 'Incluido en la planificación' : 'No incluido', detail: network.enableWaf ? 'WAF está incluido en el diseño; sus reglas aún deben configurarse.' : 'WAF no está incluido en el diseño.', steps: ['Evalúa WAF para las entradas HTTP de la aplicación.', 'Define y revisa las reglas adecuadas para el tráfico esperado.'] },
    { id: 'flow-logs', name: 'VPC Flow Logs', status: network.enableFlowLogs ? 'Incluido en la planificación' : 'No incluido', detail: network.enableFlowLogs ? 'Se han incluido registros de tráfico de VPC en el diseño.' : 'No se han incluido registros de tráfico de VPC.', steps: ['Define qué tráfico registrar y dónde conservar los registros.', 'Revisa la retención, los permisos y el uso de los registros para diagnóstico.'] },
    { id: 'transit', name: 'Transit Gateway', status: network.enableTransit ? 'Incluido en la planificación' : 'No incluido', detail: network.enableTransit ? 'El diseño incluye un hub para conectar redes.' : 'Transit Gateway no está incluido; su necesidad depende de las redes que debas conectar.', steps: ['Evalúa Transit Gateway cuando necesites conectar varias VPC o redes externas.', 'Revisa rutas y segmentación para evitar accesos innecesarios.'] },
    { id: 'private-subnets', name: 'Subredes privadas', status: network.privateSubnets > 0 ? 'Incluido en la planificación' : 'No incluido', detail: `${network.privateSubnets} subredes privadas definidas en el diseño.`, steps: ['Ubica bases de datos y componentes internos en subredes privadas.', 'Revisa rutas, grupos de seguridad y la salida necesaria a Internet.'] },
  ];

  const recommendations: (SecurityGuide & { subtitle: string; style: 'green' | 'amber' | 'blue'; icon: 'shield' | 'key' | 'file' })[] = [];
  const add = (id: string, title: string, subtitle: string, description: string, keyPoints: string[], style: 'green' | 'amber' | 'blue' = 'amber', icon: 'shield' | 'key' | 'file' = 'shield') => {
    recommendations.push({ id, title, subtitle, description, keyPoints, style, icon });
  };
  if (!network.enableWaf) add('rec-waf', 'Evaluar WAF', 'WAF no está incluido en la planificación', 'WAF ayuda a filtrar solicitudes HTTP maliciosas. Evalúa su uso según las entradas de tu aplicación.', networkControls[0].steps);
  if (!network.enableFlowLogs) add('rec-flow-logs', 'Incluir VPC Flow Logs', 'El diseño no incluye registros de tráfico', 'Los registros de tráfico ayudan a investigar conexiones y revisar el diseño de red; no contienen el contenido completo de los paquetes.', networkControls[1].steps);
  if (network.privateSubnets === 0) add('rec-private-subnets', 'Definir subredes privadas', 'No hay subredes privadas en el diseño', 'Los componentes internos no deberían exponerse directamente a Internet. Una subred privada necesita rutas y permisos adecuados.', networkControls[3].steps);
  if (hasService('S3') || hasService('RDS')) add('rec-encryption', 'Cifrar datos en reposo', 'Revisar el cifrado de S3 o RDS', 'La selección de S3 o RDS no registra la configuración de cifrado. Verifica el cifrado y los permisos de uso de claves.', DATA_CONTROLS[0].steps, 'blue', 'key');
  if (hasService('RDS')) add('rec-rds-backups', 'Planificar copias y red privada para RDS', 'Definir recuperación y acceso a la base de datos', 'Configura copias de seguridad y una base de datos en subredes privadas; la selección de RDS por sí sola no demuestra estos controles.', ['Define copias automáticas, retención y pruebas de restauración.', 'Usa un grupo de subredes privadas para la base.', 'Limita los grupos de seguridad a los componentes que necesitan conectarse.'], 'blue', 'file');
  if (hasService('CloudFront')) add('rec-https', 'Usar HTTPS con CloudFront', 'Proteger las comunicaciones y el origen', 'HTTPS protege los datos en tránsito. Define certificados y políticas de acceso para usuarios y origen.', ['Configura un certificado válido y redirección de HTTP a HTTPS.', 'Protege también la conexión hacia el origen.', 'Revisa qué contenido puede accederse y cómo se restringe.'], 'blue', 'file');
  if (!identities.length) add('rec-identities', 'Definir identidades de la planificación', 'IAM existe aunque no esté seleccionado como servicio', NO_IDENTITIES_NOTE, ['Diseña los usuarios y roles necesarios en Seguridad e IAM.', 'Asigna únicamente los permisos que necesita cada función.']);
  if (!iam.allUsersRequireMfa) add('rec-mfa', 'Exigir MFA para todos los usuarios', 'Mejorar la seguridad de autenticación', accountControls[0].detail, ACCOUNT_CONTROLS[0].steps, 'green');
  for (const identity of identities) {
    if (identity.permissions.includes('AdministratorAccess')) add(`rec-admin-${identity.id}`, 'Evita AdministratorAccess; usa permisos mínimos', `Identidad: ${identity.name}`, `La identidad ${identity.name} tiene AdministratorAccess en el diseño. Esta política concede acceso administrativo amplio; evalúa permisos más limitados según su función.`, ACCOUNT_CONTROLS[2].steps, 'amber', 'key');
    if (identity.type === 'usuario' && !identity.requireMfa) add(`rec-user-mfa-${identity.id}`, `Exigir MFA a ${identity.name}`, 'Este usuario no exige MFA en el diseño', 'Añade un segundo factor a los accesos de este usuario. Marcarlo como exigido forma parte del diseño; después debe implementarse en AWS.', ACCOUNT_CONTROLS[0].steps, 'green');
  }
  add('rec-permissions', 'Definir permisos de mínimo privilegio', 'Usar roles con los permisos necesarios', accountControls[2].detail, ACCOUNT_CONTROLS[2].steps, 'amber', 'key');

  const identityControl: SecurityControl = {
    id: 'identities', name: 'Identidades diseñadas', status: identities.length ? 'Incluido en la planificación' : 'No incluido',
    detail: identities.length ? `${iam.users} usuarios, ${iam.roles} roles y ${iam.policies} permisos distintos en uso. Son identidades de diseño, no identidades desplegadas en AWS.` : NO_IDENTITIES_NOTE,
    steps: ['Define los roles que necesita tu aplicación y los permisos de cada función.'],
  };
  const complianceControls: SecurityControl[] = COMPLIANCE.map((item) => ({ id: item.id, name: item.name, status: 'Recomendado', detail: `${item.label}. ${item.detail}`, steps: ['Revisa los requisitos de tu aplicación y el alcance de las responsabilidades del cliente.'] }));
  const recommendationControls: SecurityControl[] = recommendations.map((item) => ({
    id: item.id, name: item.title, status: 'Recomendado', detail: item.description, steps: item.keyPoints,
  }));
  const region = awsRegions.find((entry) => entry.code === plan.region);
  return {
    identities, iam, accountControls, securityPillar, networkControls, recommendations,
    areas: [
      { id: 'identities', name: 'Identidades', controls: [identityControl, accountControls[0], ...recommendationControls.filter((item) => item.id === 'rec-identities' || item.id.startsWith('rec-admin-') || item.id.startsWith('rec-user-mfa-'))] },
      { id: 'accounts', name: 'Protección de cuentas', controls: accountControls },
      { id: 'data', name: 'Protección de datos', controls: [...DATA_CONTROLS, ...recommendationControls.filter((item) => item.id === 'rec-encryption' || item.id === 'rec-rds-backups')] },
      { id: 'network', name: 'Red', controls: [...networkControls, ...recommendationControls.filter((item) => ['rec-waf', 'rec-flow-logs', 'rec-private-subnets', 'rec-https'].includes(item.id))] },
      { id: 'compliance', name: 'Cumplimiento', controls: complianceControls },
    ],
    responsibilities: serviceIds.map((id) => ({ id, name: SERVICES.find((service) => service.id === id)?.name ?? lines.find((line) => line.planningServiceId === id)?.serviceName ?? id, responsibility: RESPONSIBILITIES[id] })),
    region: {
      code: plan.region,
      location: region?.name ?? 'Ubicación no disponible en el catálogo',
      label: region ? `${region.name} (${plan.region})` : plan.region,
      note: residencyNote(plan.region),
    },
  };
}

export type SecurityPlanningData = ReturnType<typeof buildSecurityData>;

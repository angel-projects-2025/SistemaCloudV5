import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { NoPlanningState } from '../components/NoPlanningState';
import { usePlanning } from '../context/PlanningContext';
import {
  DATA_CONTROLS, COMPLIANCE, SHARED_RESPONSIBILITY,
  SECURITY_NOTE, NO_IDENTITIES_NOTE, IDENTITY_DESIGN_NOTE, buildSecurityData,
  availableIamPolicies, validateIamIdentities,
} from '../lib/securityCatalog';
import type { SecurityControl, SecurityGuide, SecurityPlanningData, SecurityState } from '../lib/securityCatalog';
import type { PillarStatus } from '../lib/wellArchitected';
import type { IamIdentity } from '../lib/planningCatalog';
import {
  Shield, Users, Key, FileText, Search, CheckCircle2, AlertTriangle,
  X, Printer, Lock, Database, Stethoscope, Plus, Pencil, Trash2,
} from 'lucide-react';

function stateStyle(state: SecurityState): 'approved' | 'review' {
  return state === 'Incluido en la planificación' ? 'approved' : 'review';
}

function pillarStyle(status: PillarStatus): 'approved' | 'review' | 'alert' {
  return status === 'Conforme' ? 'approved' : status === 'En revisión' ? 'review' : 'alert';
}

// El mismo marcado y paleta que SecurityCard, con valores ausentes y textos informativos.
function PlanningSecurityCard({ title, value, state }: { title: string; value: number | string; state: SecurityState }) {
  const included = state === 'Incluido en la planificación';
  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 ${included
      ? 'bg-green-50 border-statusGreen hover:border-green-300 dark:bg-green-500/10 dark:border-green-500/40 dark:hover:border-green-400'
      : 'bg-amber-50 border-statusAmber hover:border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/40 dark:hover:border-amber-400'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-lg font-semibold text-textMain">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${included ? 'bg-statusGreen text-white' : 'bg-statusAmber text-white'}`}>{state}</span>
      </div>
      <div className="text-3xl font-bold text-textMain">{value}</div>
    </div>
  );
}

function ControlList({ controls, onDetail }: { controls: SecurityControl[]; onDetail?: (control: SecurityControl) => void }) {
  return (
    <div className="space-y-3">
      {controls.map((control) => {
        const included = control.status === 'Incluido en la planificación';
        return (
          <div key={control.id} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div className={`p-1.5 rounded-full mt-0.5 ${included ? 'bg-green-100 dark:bg-green-500/15' : 'bg-amber-100 dark:bg-amber-500/15'}`}>
              {included ? <CheckCircle2 size={16} className="text-statusGreen dark:text-green-400" /> : <AlertTriangle size={16} className="text-statusAmber dark:text-amber-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-textMain dark:text-slate-200">{control.name}</span>
                <StatusBadge status={stateStyle(control.status)} text={control.status} />
              </div>
              <p className="text-xs text-textSecondary mt-1 break-words">{control.detail}</p>
              {onDetail && (
                <button onClick={() => onDetail(control)} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors dark:bg-blue-500/10 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/20">
                  <Stethoscope size={14} />Ver detalle
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComplianceRows() {
  return (
    <div className="space-y-3">
      {COMPLIANCE.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-textSecondary shrink-0" />
            <span className="font-medium text-textMain dark:text-slate-200">{item.name}</span>
          </div>
          <StatusBadge status={item.label === 'Parte de AWS' ? 'approved' : 'review'} text={item.label} />
          <p className="w-full text-xs text-textSecondary">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

function ResidencyBlock({ region }: { region: SecurityPlanningData['region'] }) {
  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg">
      <h4 className="text-sm font-semibold text-textMain dark:text-slate-200">Residencia de datos</h4>
      <p className="text-sm text-textSecondary mt-2 break-words">{region.code} · {region.location}</p>
      <p className="text-xs text-textSecondary mt-2">{region.note}</p>
      <p className="text-xs text-textSecondary mt-2">Los servicios globales no tienen su ámbito limitado a esta región. Revisa también copias y transferencias de datos.</p>
      <p className="text-xs text-textSecondary mt-2">Orientativo; no es asesoría legal.</p>
    </div>
  );
}

function ReviewAreas({ areas }: { areas: SecurityPlanningData['areas'] }) {
  return (
    <div className="space-y-5">
      {areas.map((area) => (
        <section key={area.id}>
          <h3 className="text-sm font-semibold text-textMain dark:text-slate-200 mb-3">{area.name}</h3>
          <ControlList controls={area.controls} />
        </section>
      ))}
    </div>
  );
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

function IdentityTable({ identities, onEdit, onDelete, isSaving = false }: {
  identities: IamIdentity[];
  onEdit?: (identity: IamIdentity) => void;
  onDelete?: (id: string) => void;
  isSaving?: boolean;
}) {
  if (!identities.length) return <p className="text-sm text-textSecondary text-center py-6">Aún no hay identidades definidas en la planificación.</p>;
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[650px] text-left text-sm print:min-w-0">
        <thead><tr className="bg-gray-50 dark:bg-slate-800 text-xs uppercase tracking-wide text-textSecondary">
          {['Nombre', 'Tipo', 'Permisos', 'MFA exigido'].map((label) => <th key={label} scope="col" className="px-5 py-3 font-semibold">{label}</th>)}
          {(onEdit || onDelete) && <th scope="col" className="px-5 py-3 font-semibold">Acciones</th>}
        </tr></thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {identities.map((identity) => <tr key={identity.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
            <td className="px-5 py-3 font-semibold text-textMain dark:text-slate-100 break-all">{identity.name}</td>
            <td className="px-5 py-3 text-textSecondary">{identity.type === 'usuario' ? 'Usuario' : 'Rol'}</td>
            <td className="px-5 py-3"><div className="flex flex-wrap gap-1.5">
              {identity.permissions.length ? identity.permissions.map((permission) => <span key={permission} className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30 break-all">{permission}</span>) : <span className="text-xs text-textSecondary">Sin permisos asignados</span>}
            </div></td>
            <td className="px-5 py-3 text-textSecondary">{identity.type === 'usuario' ? identity.requireMfa ? 'Sí' : 'No' : '—'}</td>
            {(onEdit || onDelete) && <td className="px-5 py-3 whitespace-nowrap">
              {onEdit && <button type="button" disabled={isSaving} onClick={() => onEdit(identity)} title="Editar identidad" aria-label={`Editar ${identity.name}`} className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-primary dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Pencil size={17} /></button>}
              {onDelete && <button type="button" disabled={isSaving} onClick={() => onDelete(identity.id)} title="Borrar identidad" aria-label={`Borrar ${identity.name}`} className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 size={17} /></button>}
            </td>}
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}

function IdentityEditor({ planningId, identities, serviceIds }: { planningId: string; identities: IamIdentity[]; serviceIds: string[] }) {
  const { updateActiveIamIdentities } = usePlanning();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<'usuario' | 'rol'>('usuario');
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [requireMfa, setRequireMfa] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const editing = identities.find((identity) => identity.id === editingId);
  const policies = availableIamPolicies(serviceIds, editing?.permissions);
  const reset = useCallback(() => {
    if (saving.current) return;
    setIsModalOpen(false);
    setEditingId(null); setType('usuario'); setName(''); setPermissions([]); setRequireMfa(true); setError('');
  }, []);
  useEffect(() => {
    if (!isModalOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isModalOpen, reset]);
  const edit = (identity: IamIdentity) => {
    setEditingId(identity.id); setType(identity.type); setName(identity.name); setPermissions([...identity.permissions]);
    setRequireMfa(identity.type === 'usuario' ? identity.requireMfa : true); setError('');
    setIsModalOpen(true);
  };
  const apply = async () => {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    try {
      if (editingId && !editing) throw new Error('La identidad que estabas editando ya no está en esta planificación.');
      const common = { id: editingId ?? crypto.randomUUID(), name, permissions: [...permissions] };
      const identity: IamIdentity = type === 'usuario' ? { ...common, type, requireMfa } : { ...common, type };
      const next = editingId ? identities.map((entry) => entry.id === editingId ? identity : entry) : [...identities, identity];
      validateIamIdentities(next);
      await updateActiveIamIdentities(next, planningId);
      saving.current = false;
      reset();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo actualizar la identidad.'); }
    finally { saving.current = false; setIsSaving(false); }
  };
  const remove = async (id: string) => {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    try {
      await updateActiveIamIdentities(identities.filter((entry) => entry.id !== id), planningId);
      saving.current = false;
      if (editingId === id) reset(); else setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo borrar la identidad.'); }
    finally { saving.current = false; setIsSaving(false); }
  };
  const fieldClass = 'w-full px-3 py-2.5 border border-cardBorder rounded-lg text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary';
  return (
    <>
      <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-textMain dark:text-slate-100">Identidades de la planificación</h3>
          <p className="text-sm text-textSecondary mt-0.5">{IDENTITY_DESIGN_NOTE}</p>
          {!identities.length && <p className="text-sm text-textSecondary mt-2">{NO_IDENTITIES_NOTE}</p>}
        </div>
        <button type="button" disabled={isSaving} onClick={() => { reset(); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shrink-0">
          <Plus size={16} />Agregar identidad
        </button>
      </div>
      <div className="p-6">
        {!isModalOpen && error && <p role="alert" className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <IdentityTable identities={identities} onEdit={edit} onDelete={remove} isSaving={isSaving} />
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden" role="dialog" aria-modal="true" aria-labelledby="identity-modal-title">
          <div className="absolute inset-0 bg-black/50" onClick={reset} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg shrink-0"><Users size={20} className="text-primary dark:text-blue-400" /></div>
                  <h2 id="identity-modal-title" className="text-lg font-bold text-textMain dark:text-slate-100">{editingId ? 'Editar identidad' : 'Agregar identidad'}</h2>
                </div>
                <button type="button" onClick={reset} aria-label="Cerrar identidad" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} className="text-textSecondary" /></button>
              </div>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); apply(); }} noValidate className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1 min-h-0">
                <p className="text-sm text-textSecondary mb-4">{IDENTITY_DESIGN_NOTE}</p>
                {error && <p role="alert" className="mb-4 p-3 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label htmlFor="identity-type" className="block text-sm font-medium text-textMain mb-2">Tipo</label><select id="identity-type" autoFocus value={type} onChange={(event) => setType(event.target.value as 'usuario' | 'rol')} className={fieldClass}><option value="usuario">Usuario</option><option value="rol">Rol</option></select></div>
                  <div><label htmlFor="identity-name" className="block text-sm font-medium text-textMain mb-2">Nombre</label><input id="identity-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={64} required autoComplete="off" className={fieldClass} aria-describedby="identity-name-help" /><p id="identity-name-help" className="text-xs text-textSecondary mt-2">Máximo 64 caracteres: letras A–Z, números y + = , . @ _ -; sin espacios.</p></div>
                  {type === 'usuario' && <div><label htmlFor="identity-mfa" className="block text-sm font-medium text-textMain mb-2">Exigir MFA</label><select id="identity-mfa" value={String(requireMfa)} onChange={(event) => setRequireMfa(event.target.value === 'true')} className={fieldClass}><option value="true">Sí</option><option value="false">No</option></select></div>}
                </div>
                <fieldset className="mt-4 p-4 rounded-lg border border-cardBorder bg-gray-50 dark:bg-slate-800/40">
                  <legend className="text-sm font-medium text-textMain px-1">Permisos: políticas administradas de AWS</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{policies.map((policy) => <label key={policy} className="flex items-start gap-2 text-sm text-textMain min-w-0"><input type="checkbox" checked={permissions.includes(policy)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, policy] : current.filter((permission) => permission !== policy))} className="mt-1 shrink-0 accent-primary" /><span className="break-all">{policy}</span></label>)}</div>
                  <p className="text-xs text-textSecondary mt-3">Puedes diseñar una identidad sin permisos. Los permisos ya asignados se conservan aunque se quite su servicio de la planificación.</p>
                </fieldset>
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex flex-wrap justify-end gap-3 shrink-0">
                <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">Aceptar</button>
                <button type="button" disabled={isSaving} onClick={reset} className="px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function Security() {
  const { activePlanning } = usePlanning();
  if (!activePlanning) {
    return <><Header title="Seguridad e IAM" /><main className="p-4 md:p-8 bg-background dark:bg-slate-950 min-h-screen space-y-8"><NoPlanningState /></main></>;
  }
  return <PlanningSecurity key={activePlanning.id} />;
}

function PlanningSecurity() {
  const { activePlanning, activeCostLines } = usePlanning();
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [diagnostic, setDiagnostic] = useState<SecurityControl | null>(null);
  const [guide, setGuide] = useState<SecurityGuide | null>(null);
  const data = useMemo(() => activePlanning ? buildSecurityData(activePlanning, activeCostLines) : null, [activePlanning, activeCostLines]);
  if (!activePlanning || !data) return null;
  const { iam, securityPillar } = data;
  const securityScore = securityPillar.score;
  const scoreColor = securityPillar.status === 'Conforme' ? 'text-statusGreen dark:text-green-400'
    : securityPillar.status === 'En revisión' ? 'text-statusAmber dark:text-amber-400' : 'text-statusRed dark:text-red-400';
  const scoreBar = securityPillar.status === 'Conforme' ? 'bg-statusGreen' : securityPillar.status === 'En revisión' ? 'bg-statusAmber' : 'bg-statusRed';
  const recommendationStyles = {
    green: { bg: 'bg-green-50 dark:bg-green-500/10', iconBg: 'bg-statusGreen' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', iconBg: 'bg-statusAmber' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', iconBg: 'bg-primary' },
  };
  const recommendationIcons = { shield: Shield, key: Key, file: FileText };

  return (
    <>
      <Header title="Seguridad e IAM" />
      <main className="p-4 md:p-8 bg-background dark:bg-slate-950 min-h-screen space-y-8 print:hidden">
        {/* BANNER SUPERIOR - SECURITY CENTER */}
        <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-xs font-bold text-primary dark:text-blue-400 uppercase tracking-widest">Security Center</p>
                </div>
                <h1 className="text-2xl font-bold text-textMain dark:text-slate-100">Seguridad e IAM</h1>
                <p className="text-sm text-textSecondary mt-1 max-w-xl">Diseño de seguridad, identidades, protección de cuentas y datos de la planificación.</p>
              </div>
              <div className="flex flex-wrap gap-3 shrink-0">
                <button onClick={() => setIsAuditModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
                  <Search size={16} />Revisar planificación
                </button>
                <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <FileText size={16} />Ver reporte
                </button>
              </div>
            </div>
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <p className="text-sm font-medium text-textMain dark:text-slate-200">Estado general de seguridad</p>
                <span className={`text-4xl font-bold ${scoreColor}`}>{securityScore}%</span>
                <StatusBadge status={pillarStyle(securityPillar.status)} text={securityPillar.status} />
              </div>
              <div className="w-full bg-amber-200 dark:bg-amber-500/20 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all duration-500 ${scoreBar}`} style={{ width: `${securityScore}%` }} />
              </div>
              <p className="text-xs text-textSecondary mt-2">{SECURITY_NOTE}</p>
            </div>
          </div>
        </div>

        {/* Conteos de las identidades de diseño */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <PlanningSecurityCard title="Usuarios IAM" value={iam.users} state={iam.users > 0 ? 'Incluido en la planificación' : 'No incluido'} />
          <PlanningSecurityCard title="Roles" value={iam.roles} state={iam.roles > 0 ? 'Incluido en la planificación' : 'No incluido'} />
          <PlanningSecurityCard title="Políticas" value={iam.policies} state={iam.policies > 0 ? 'Incluido en la planificación' : 'No incluido'} />
          <PlanningSecurityCard title="MFA exigido" value={iam.mfaLabel} state={iam.allUsersRequireMfa ? 'Incluido en la planificación' : 'Recomendado'} />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
          <IdentityEditor planningId={activePlanning.id} identities={data.identities} serviceIds={data.responsibilities.map((service) => service.id)} />
        </div>

        {/* Protección de Cuentas + Protección de Datos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2"><Lock size={18} className="text-primary dark:text-blue-400" /><h3 className="text-lg font-semibold text-textMain dark:text-slate-100">Protección de Cuentas</h3></div>
              <StatusBadge status="review" text={`${data.accountControls.filter((control) => control.status === 'Recomendado').length} recomendados`} />
            </div>
            <p className="text-sm text-textSecondary mb-4">Buenas prácticas y requisitos diseñados para las cuentas y accesos; no acreditan controles desplegados.</p>
            <ControlList controls={data.accountControls} onDetail={setDiagnostic} />
          </div>
          <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2"><Database size={18} className="text-primary dark:text-blue-400" /><h3 className="text-lg font-semibold text-textMain dark:text-slate-100">Protección de Datos</h3></div>
              <StatusBadge status="review" text="3 recomendados" />
            </div>
            <p className="text-sm text-textSecondary mb-4">Buenas prácticas para la información; no se han definido estos controles.</p>
            <ControlList controls={DATA_CONTROLS} onDetail={setDiagnostic} />
          </div>
        </div>

        {/* Responsabilidad compartida + Cumplimiento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="min-w-0 bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-textMain dark:text-slate-100 mb-4">Modelo de Responsabilidad Compartida</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-3"><Shield size={20} className="text-primary dark:text-blue-400" /><h4 className="font-medium text-textMain dark:text-slate-200">AWS</h4></div>
                <ul className="space-y-2">{SHARED_RESPONSIBILITY.aws.map((item) => <li key={item} className="text-sm text-textSecondary flex items-start gap-2"><span className="text-primary dark:text-blue-400 mt-1">•</span>{item}</li>)}</ul>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-3"><Users size={20} className="text-statusGreen dark:text-green-400" /><h4 className="font-medium text-textMain dark:text-slate-200">Cliente</h4></div>
                <ul className="space-y-2">{SHARED_RESPONSIBILITY.customer.map((item) => <li key={item} className="text-sm text-textSecondary flex items-start gap-2"><span className="text-statusGreen dark:text-green-400 mt-1">•</span>{item}</li>)}</ul>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {data.responsibilities.length === 0 && <p className="text-sm text-textSecondary">Esta planificación no tiene servicios seleccionados.</p>}
              {data.responsibilities.map((service) => (
                <div key={service.id} className="min-w-0 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-textMain dark:text-slate-200 break-words">{service.name}</h4>
                    {service.responsibility && <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30">{service.responsibility.scope}</span>}
                  </div>
                  {service.responsibility ? <div className="space-y-2 text-xs text-textSecondary break-words">
                    <p><span className="font-semibold text-textMain dark:text-slate-200">AWS: </span>{service.responsibility.aws}</p>
                    <p><span className="font-semibold text-textMain dark:text-slate-200">Tú: </span>{service.responsibility.customer}</p>
                  </div> : <p className="text-xs text-textSecondary">No hay una descripción de responsabilidades en el catálogo para este servicio.</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-textMain dark:text-slate-100 mb-4">Estado de Cumplimiento</h3>
            <ComplianceRows />
            <ResidencyBlock region={data.region} />
          </div>
        </div>

        {/* Red y recomendaciones, dentro del contenedor existente */}
        <div className="bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-textMain dark:text-slate-100 mb-4">Recomendaciones de Seguridad</h3>
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-textMain dark:text-slate-200 mb-3">Red de la planificación</h4>
            <ControlList controls={data.networkControls} onDetail={setDiagnostic} />
          </div>
          <div className="space-y-3">
            {data.recommendations.map((rec) => {
              const style = recommendationStyles[rec.style];
              const Icon = recommendationIcons[rec.icon];
              return (
                <div key={rec.id} className={`flex items-start gap-3 p-4 ${style.bg} rounded-lg`}>
                  <div className={`p-2 ${style.iconBg} rounded-full`}><Icon size={16} className="text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0"><p className="font-medium text-textMain dark:text-slate-200 break-words">{rec.title}</p><p className="text-sm text-textSecondary">{rec.subtitle}</p></div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status="review" text="Recomendado" />
                        <button onClick={() => setGuide(rec)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors shrink-0 dark:bg-slate-800 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/15"><FileText size={14} />Ver Detalles</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Revisión local de la planificación */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsAuditModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg"><Shield size={20} className="text-primary dark:text-blue-400" /></div>
                  <div><h2 className="text-lg font-bold text-textMain dark:text-slate-100">Revisión de la planificación</h2><p className="text-xs text-textSecondary">Revisión local del diseño de seguridad e IAM</p></div>
                </div>
                <button onClick={() => setIsAuditModalOpen(false)} aria-label="Cerrar revisión" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} className="text-textSecondary" /></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg mb-5">
                <span className="text-sm font-medium text-textMain dark:text-slate-200">Pilar Seguridad: {securityScore}%</span>
                <StatusBadge status={pillarStyle(securityPillar.status)} text={securityPillar.status} />
              </div>
              <ReviewAreas areas={data.areas} />
              <div className="mt-5 p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-primary dark:text-blue-400 mt-0.5 shrink-0" />
                  <div><p className="text-sm font-semibold text-textMain dark:text-slate-200">Observación</p><p className="text-xs text-textSecondary mt-1">{SECURITY_NOTE}. Incluir un componente no demuestra que sus controles estén implementados.</p></div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end"><button onClick={() => setIsAuditModalOpen(false)} className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">Cerrar</button></div>
          </div>
        </div>
      )}

      {/* Detalles informativos, sin marcar aprobaciones */}
      {diagnostic && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDiagnostic(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg"><Stethoscope size={20} className="text-primary dark:text-blue-400" /></div><div><h2 className="text-lg font-bold text-textMain dark:text-slate-100">Detalle: {diagnostic.name}</h2><p className="text-xs text-textSecondary">Buenas prácticas para el diseño de seguridad</p></div></div>
                <button onClick={() => setDiagnostic(null)} aria-label="Cerrar detalle" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} className="text-textSecondary" /></button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-2"><AlertTriangle size={16} className="text-statusAmber dark:text-amber-400" /><h3 className="text-sm font-semibold text-textMain dark:text-slate-200">En la planificación</h3></div>
                <div className="p-4 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg"><StatusBadge status={stateStyle(diagnostic.status)} text={diagnostic.status} /><p className="text-sm text-textMain dark:text-slate-200 mt-2">{diagnostic.detail}</p></div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={16} className="text-statusGreen dark:text-green-400" /><h3 className="text-sm font-semibold text-textMain dark:text-slate-200">Buenas prácticas AWS</h3></div>
                <div className="space-y-2">{diagnostic.steps.map((step, index) => <div key={step} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">{index + 1}</span><p className="text-sm text-textMain dark:text-slate-200 pt-0.5">{step}</p></div>)}</div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setDiagnostic(null)} className="px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Cerrar</button>
              <button onClick={() => setDiagnostic(null)} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"><CheckCircle2 size={16} />Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* Reporte del mismo modelo local, con impresión/PDF */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:inset-auto print:p-0">
          <div className="absolute inset-0 bg-black/50 print:hidden" onClick={() => setIsReportModalOpen(false)} />
          <div id="printable-report" className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border dark:border-slate-700 print:max-w-full print:max-h-none print:rounded-none print:shadow-none print:overflow-visible">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 print:hidden">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg"><FileText size={20} className="text-primary dark:text-blue-400" /></div><h2 className="text-lg font-bold text-textMain dark:text-slate-100">Reporte de Seguridad e IAM</h2></div><button onClick={() => setIsReportModalOpen(false)} aria-label="Cerrar reporte" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} className="text-textSecondary" /></button></div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 print:overflow-visible print:p-8">
              <div className="w-full flex flex-wrap justify-between items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-slate-700"><div><p className="text-xs font-bold text-primary uppercase tracking-widest">CloudOps Dashboard</p><p className="text-sm text-textSecondary mt-1">Reporte del diseño de seguridad de la planificación</p></div><p className="text-sm text-textSecondary">{formatDate()}</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
                <div className="p-4 bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-lg text-center"><p className="text-xs text-textSecondary mb-1">Pilar Seguridad</p><p className={`text-2xl font-bold ${scoreColor}`}>{securityScore}%</p><StatusBadge status={pillarStyle(securityPillar.status)} text={securityPillar.status} /></div>
                <div className="min-w-0 p-4 bg-green-50 border border-green-200 dark:bg-green-500/10 dark:border-green-500/30 rounded-lg text-center"><p className="text-xs text-textSecondary mb-1">Planificación</p><p className="text-2xl font-bold text-textMain dark:text-slate-200 break-words">{activePlanning.plan.solutionName}</p></div>
                <div className="min-w-0 p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg text-center"><p className="text-xs text-textSecondary mb-1">Región</p><p className="text-2xl font-bold text-primary dark:text-blue-400 break-words">{data.region.label}</p></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-6">
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-center"><Users size={16} className="text-primary dark:text-blue-400 mx-auto mb-1" /><p className="text-[10px] text-textSecondary">Usuarios diseñados</p><p className="text-lg font-bold text-textMain dark:text-slate-200">{iam.users}</p></div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-center"><Key size={16} className="text-statusGreen dark:text-green-400 mx-auto mb-1" /><p className="text-[10px] text-textSecondary">Roles diseñados</p><p className="text-lg font-bold text-textMain dark:text-slate-200">{iam.roles}</p></div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-center"><FileText size={16} className="text-statusAmber dark:text-amber-400 mx-auto mb-1" /><p className="text-[10px] text-textSecondary">Permisos distintos</p><p className="text-lg font-bold text-textMain dark:text-slate-200">{iam.policies}</p></div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg text-center"><Shield size={16} className="text-primary dark:text-blue-400 mx-auto mb-1" /><p className="text-[10px] text-textSecondary">MFA exigido</p><p className="text-lg font-bold text-textMain dark:text-slate-200">{iam.mfaLabel}</p></div>
              </div>
              <p className="text-xs text-textSecondary mb-6">{SECURITY_NOTE}. {IDENTITY_DESIGN_NOTE}</p>
              <div className="w-full mb-6"><h3 className="text-sm font-semibold text-textMain dark:text-slate-200 mb-3">Identidades de la planificación</h3><IdentityTable identities={data.identities} /></div>
              <div className="w-full text-left border-collapse mb-6"><ReviewAreas areas={data.areas} /></div>
              <div className="w-full text-left border-collapse mb-6"><h3 className="text-sm font-semibold text-textMain dark:text-slate-200 mb-3">Estado de Cumplimiento</h3><ComplianceRows /><ResidencyBlock region={data.region} /></div>
              <div className="w-full text-left mb-6"><h3 className="text-sm font-semibold text-textMain dark:text-slate-200 mb-3">Recomendaciones de Seguridad</h3><div className="space-y-2">{data.recommendations.map((rec) => <div key={rec.id} className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"><div className="flex flex-wrap justify-between gap-2"><span className="text-sm font-medium text-textMain dark:text-slate-200">{rec.title}</span><StatusBadge status="review" text="Recomendado" /></div><p className="text-xs text-textSecondary mt-2">{rec.description}</p></div>)}</div></div>
              <div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg"><p className="text-sm font-semibold text-textMain dark:text-slate-200 mb-1">Observación del diseño</p><p className="text-xs text-textSecondary">Revisa las recomendaciones antes de implementar la solución. Este reporte no acredita controles desplegados ni cumplimiento de tu aplicación.</p></div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3 print:hidden"><button onClick={() => setIsReportModalOpen(false)} className="px-5 py-2.5 border border-cardBorder dark:border-slate-700 text-textMain dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Cerrar</button><button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"><Printer size={16} />Imprimir / PDF</button></div>
          </div>
        </div>
      )}

      {/* Guías de buenas prácticas */}
      {guide && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setGuide(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border dark:border-slate-700">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 dark:bg-blue-500/15 rounded-lg"><FileText size={20} className="text-primary dark:text-blue-400" /></div><div><h2 className="text-lg font-bold text-textMain dark:text-slate-100">{guide.title}</h2><p className="text-xs text-textSecondary">Buenas prácticas AWS</p></div></div><button onClick={() => setGuide(null)} aria-label="Cerrar guía" className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><X size={18} className="text-textSecondary" /></button></div></div>
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div><div className="flex items-center gap-2 mb-2"><Shield size={16} className="text-primary dark:text-blue-400" /><h3 className="text-sm font-semibold text-textMain dark:text-slate-200">Descripción</h3></div><div className="p-4 bg-blue-50 border border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 rounded-lg"><p className="text-sm text-textMain dark:text-slate-200 leading-relaxed">{guide.description}</p></div></div>
              <div><div className="flex items-center gap-2 mb-2"><CheckCircle2 size={16} className="text-statusGreen dark:text-green-400" /><h3 className="text-sm font-semibold text-textMain dark:text-slate-200">Puntos clave de la guía</h3></div><div className="space-y-2">{guide.keyPoints.map((point, index) => <div key={point} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">{index + 1}</span><p className="text-sm text-textMain dark:text-slate-200 pt-0.5">{point}</p></div>)}</div></div>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end"><button onClick={() => setGuide(null)} className="px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">Entendido</button></div>
          </div>
        </div>
      )}
    </>
  );
}

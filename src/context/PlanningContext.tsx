import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { IamIdentity, PlanningChanges, SavedPlanning } from '../lib/planningCatalog';
import { isIamIdentityList, validateIamIdentities } from '../lib/securityCatalog';
import { buildDefaultCostLines, computeLineCost, isCostLine, normalizeCostLine } from '../lib/costEngine';
import type { CostLine } from '../lib/costEngine';
import { get, post, put, del } from '../api/client';
import { useAuth } from './AuthContext';

interface PlanningState {
  savedPlannings: SavedPlanning[];
  activePlanningId: string | null;
  ownerId: string | null;
  isLoading: boolean;
  loadError: string | null;
}

interface PlanningContextValue {
  savedPlannings: SavedPlanning[];
  activePlanning: SavedPlanning | null;
  activeCostLines: CostLine[];
  isLoading: boolean;
  loadError: string | null;
  setActivePlanningId: (id: string) => Promise<void>;
  savePlanning: (entry: SavedPlanning) => Promise<SavedPlanning>;
  updatePlanning: (id: string, changes: PlanningChanges) => Promise<void>;
  deletePlanning: (id: string) => Promise<void>;
  updateActiveCostLines: (lines: CostLine[], expectedPlanningId?: string) => Promise<void>;
  updateActiveIamIdentities: (identities: IamIdentity[], expectedPlanningId: string) => Promise<void>;
}

const PlanningContext = createContext<PlanningContextValue | null>(null);

interface Scope { ownerId: string; generation: number; signal: AbortSignal }

function includeIam(services: string[]): string[] {
  return [...new Set([...services, 'IAM'])];
}

function isSavedPlanning(value: unknown): value is SavedPlanning {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<SavedPlanning>;
  const plan = entry.plan;
  const network = entry.network;
  return typeof entry.id === 'string' && typeof entry.savedAt === 'string'
    && Number.isFinite(Date.parse(entry.savedAt))
    && !!plan && typeof plan === 'object'
    && ['solutionName', 'applicationType', 'region', 'estimatedUsers', 'availabilityLevel', 'migrationGoal']
      .every((key) => typeof (plan as unknown as Record<string, unknown>)[key] === 'string')
    && Array.isArray(plan.awsServices) && plan.awsServices.every((service) => typeof service === 'string')
    && !!network && typeof network === 'object' && typeof network.vpcCidr === 'string'
    && ['availabilityZones', 'publicSubnets', 'privateSubnets', 'natGateways']
      .every((key) => Number.isInteger((network as unknown as Record<string, unknown>)[key]))
    && ['enableWaf', 'enableFlowLogs', 'enableTransit']
      .every((key) => typeof (network as unknown as Record<string, unknown>)[key] === 'boolean')
    && Array.isArray(entry.selectedGoals) && entry.selectedGoals.every((goal) => typeof goal === 'string')
    && typeof entry.goalText === 'string'
    && (entry.costLines === undefined || (Array.isArray(entry.costLines) && entry.costLines.every(isCostLine)))
    && (entry.iamIdentities === undefined || isIamIdentityList(entry.iamIdentities));
}

function mostRecentPlanning(plannings: SavedPlanning[]): SavedPlanning | null {
  return plannings.reduce<SavedPlanning | null>((latest, entry) =>
    !latest || Date.parse(entry.savedAt) > Date.parse(latest.savedAt) ? entry : latest,
  null);
}

function normalizePlanning(value: unknown): SavedPlanning {
  if (!isSavedPlanning(value)) throw new Error('El servidor devolvió una planificación no válida.');
  // Compatibilidad solo en memoria: no se realiza ningún PUT al leer.
  return { ...value, plan: { ...value.plan, awsServices: includeIam(value.plan.awsServices) } };
}

export function PlanningProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const ownerId = user?.id ?? null;
  const latestOwner = useRef(ownerId);
  useLayoutEffect(() => { latestOwner.current = ownerId; }, [ownerId]);
  const [state, setState] = useState<PlanningState>({ savedPlannings: [], activePlanningId: null, ownerId: null, isLoading: true, loadError: null });
  const stateRef = useRef(state);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const commit = useCallback((next: PlanningState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const assertScope = useCallback((scope: Scope) => {
    if (latestOwner.current !== scope.ownerId || generation.current !== scope.generation || scope.signal.aborted) {
      throw new Error('La sesión cambió. Vuelve a intentarlo.');
    }
  }, []);

  useEffect(() => {
    controller.current?.abort();
    const currentController = new AbortController();
    controller.current = currentController;
    const currentGeneration = ++generation.current;
    queue.current = Promise.resolve();
    const load = async () => {
      await Promise.resolve();
      if (latestOwner.current !== ownerId || generation.current !== currentGeneration || currentController.signal.aborted) return;
      commit({ savedPlannings: [], activePlanningId: null, ownerId, isLoading: !!ownerId && !authLoading, loadError: null });
      if (!ownerId || authLoading) return;
      const scope = { ownerId, generation: currentGeneration, signal: currentController.signal };
      try {
        const response = await get<{ plannings: unknown[]; activeId: string | null }>('plannings', { signal: scope.signal });
        assertScope(scope);
        if (!response || !Array.isArray(response.plannings) || (response.activeId !== null && typeof response.activeId !== 'string')) {
          throw new Error('El servidor devolvió un historial no válido.');
        }
        const savedPlannings = response.plannings.map(normalizePlanning);
        const activePlanningId = savedPlannings.some((entry) => entry.id === response.activeId)
          ? response.activeId : mostRecentPlanning(savedPlannings)?.id ?? null;
        commit({ savedPlannings, activePlanningId, ownerId, isLoading: false, loadError: null });
      } catch (error) {
        if (latestOwner.current !== ownerId || generation.current !== currentGeneration || scope.signal.aborted) return;
        commit({ savedPlannings: [], activePlanningId: null, ownerId, isLoading: false, loadError: error instanceof Error ? error.message : 'No se pudo cargar el historial.' });
      }
    };
    void load();
    return () => { currentController.abort(); };
  }, [ownerId, authLoading, assertScope, commit]);

  const enqueue = useCallback(<T,>(work: (scope: Scope) => Promise<T>): Promise<T> => {
    const id = latestOwner.current;
    const currentController = controller.current;
    if (!id || !currentController || stateRef.current.ownerId !== id || stateRef.current.isLoading || stateRef.current.loadError) {
      return Promise.reject(new Error('Espere a que se carguen las planificaciones antes de modificarlas.'));
    }
    const scope = { ownerId: id, generation: generation.current, signal: currentController.signal };
    const operation = queue.current.then(async () => {
      assertScope(scope);
      const result = await work(scope);
      assertScope(scope);
      return result;
    });
    queue.current = operation.catch(() => {});
    return operation;
  }, [assertScope]);

  const persistPlanning = useCallback(async (updated: SavedPlanning, scope: Scope) => {
    const response = normalizePlanning(await put<unknown>(`plannings/${encodeURIComponent(updated.id)}`, updated, { signal: scope.signal }));
    assertScope(scope);
    if (response.id !== updated.id || response.savedAt !== updated.savedAt) throw new Error('El servidor cambió la identidad de la planificación.');
    const current = stateRef.current;
    commit({ ...current, savedPlannings: current.savedPlannings.map((entry) => entry.id === response.id ? response : entry) });
  }, [assertScope, commit]);

  const setActivePlanningId = useCallback(async (id: string) => enqueue(async (scope) => {
    const current = stateRef.current;
    if (!current.savedPlannings.some((entry) => entry.id === id)) return;
    const response = await put<{ activeId: string | null }>('plannings/active', { id }, { signal: scope.signal });
    assertScope(scope);
    if (response.activeId !== id) throw new Error('No se pudo confirmar la planificación activa.');
    commit({ ...current, activePlanningId: id });
  }), [assertScope, commit, enqueue]);

  const savePlanning = useCallback(async (entry: SavedPlanning) => {
    if (!isSavedPlanning(entry)) throw new Error('La planificación no tiene un formato válido.');
    const snapshot: SavedPlanning = {
      ...entry,
      plan: { ...entry.plan, awsServices: includeIam(entry.plan.awsServices) },
      network: { ...entry.network },
      selectedGoals: [...entry.selectedGoals],
      costLines: entry.costLines?.map((line) => ({ ...line, config: { ...line.config } }))
        ?? buildDefaultCostLines(includeIam(entry.plan.awsServices)),
      ...(entry.iamIdentities !== undefined ? { iamIdentities: entry.iamIdentities.map((identity) => ({ ...identity, permissions: [...identity.permissions] })) } : {}),
    };
    return enqueue(async (scope) => {
      const saved = normalizePlanning(await post<unknown>('plannings', snapshot, { signal: scope.signal }));
      assertScope(scope);
      commit({ ...stateRef.current, savedPlannings: [saved, ...stateRef.current.savedPlannings], activePlanningId: saved.id });
      return saved;
    });
  }, [assertScope, commit, enqueue]);

  const updatePlanning = useCallback(async (id: string, changes: PlanningChanges) => {
    const snapshot = structuredClone(changes);
    return enqueue(async (scope) => {
    const current = stateRef.current;
    const active = current.savedPlannings.find((entry) => entry.id === id);
    if (!active || current.activePlanningId !== id) {
      throw new Error('La planificación activa cambió. Vuelve a abrir la planificación para modificarla.');
    }
    const services = includeIam(snapshot.plan.awsServices);
    const existingLines = active.costLines ?? buildDefaultCostLines(active.plan.awsServices);
    const addedServices = services.filter((service) => !active.plan.awsServices.includes(service));
    const costLines = [
      ...existingLines.filter((line) => services.includes(line.planningServiceId))
        .map((line) => ({ ...line, config: { ...line.config } })),
      ...buildDefaultCostLines(addedServices),
    ];
    const updated: SavedPlanning = {
      ...active,
      plan: { ...snapshot.plan, awsServices: services },
      network: { ...snapshot.network },
      selectedGoals: [...snapshot.selectedGoals],
      goalText: snapshot.goalText,
      costLines,
    };
    if (!isSavedPlanning(updated)) throw new Error('La planificación no tiene un formato válido.');
    await persistPlanning(updated, scope);
    });
  }, [enqueue, persistPlanning]);

  const deletePlanning = useCallback(async (id: string) => enqueue(async (scope) => {
    const current = stateRef.current;
    const savedPlannings = current.savedPlannings.filter((entry) => entry.id !== id);
    const wasActive = current.activePlanningId === id;
    await del(`plannings/${encodeURIComponent(id)}`, { signal: scope.signal });
    assertScope(scope);
    commit({ ...current, savedPlannings, activePlanningId: wasActive ? null : current.activePlanningId });
    const replacement = wasActive ? mostRecentPlanning(savedPlannings)?.id : undefined;
    if (replacement) {
      const response = await put<{ activeId: string | null }>('plannings/active', { id: replacement }, { signal: scope.signal });
      assertScope(scope);
      if (response.activeId !== replacement) throw new Error('No se pudo confirmar la planificación activa.');
      commit({ ...stateRef.current, activePlanningId: replacement });
    }
  }), [assertScope, commit, enqueue]);

  const updateActiveCostLines = useCallback(async (lines: CostLine[], expectedPlanningId?: string) => {
    const snapshot = structuredClone(lines);
    return enqueue(async (scope) => {
    const current = stateRef.current;
    const active = current.savedPlannings.find((entry) => entry.id === current.activePlanningId);
    if (!active) throw new Error('Seleccione una planificación para modificar sus recursos.');
    if (expectedPlanningId !== undefined && active.id !== expectedPlanningId) {
      throw new Error('La planificación activa cambió. Vuelve a seleccionar el recurso.');
    }
    if (!snapshot.every(isCostLine) || new Set(snapshot.map((line) => line.id)).size !== snapshot.length) {
      throw new Error('Las líneas de costo no tienen un formato válido o contienen identificadores duplicados.');
    }
    const costLines = snapshot.map((line) => ({
      ...line,
      config: { ...line.config },
      ...computeLineCost(line.config),
    }));
    const updated: SavedPlanning = {
      ...active,
      plan: { ...active.plan, awsServices: includeIam(costLines.map((line) => line.planningServiceId)) },
      costLines,
    };
    await persistPlanning(updated, scope);
    });
  }, [enqueue, persistPlanning]);

  const updateActiveIamIdentities = useCallback(async (identities: IamIdentity[], expectedPlanningId: string) => {
    const snapshot = structuredClone(identities);
    return enqueue(async (scope) => {
    const current = stateRef.current;
    const active = current.savedPlannings.find((entry) => entry.id === current.activePlanningId);
    if (!active) throw new Error('Seleccione una planificación para modificar sus identidades.');
    if (active.id !== expectedPlanningId) throw new Error('La planificación activa cambió. Vuelve a seleccionar la identidad.');
    validateIamIdentities(snapshot);
    const updated: SavedPlanning = {
      ...active,
      iamIdentities: snapshot.map((identity) => ({ ...identity, permissions: [...identity.permissions] })),
    };
    await persistPlanning(updated, scope);
    });
  }, [enqueue, persistPlanning]);

  const value = useMemo<PlanningContextValue>(() => {
    const current = state.ownerId === ownerId && !authLoading ? state : { ...state, savedPlannings: [], activePlanningId: null, isLoading: !!ownerId || authLoading, loadError: null };
    const storedActive = current.savedPlannings.find((entry) => entry.id === current.activePlanningId);
    // Vista compatible solo en memoria: el estado persistible conserva la ausencia del campo.
    const activePlanning = storedActive ? { ...storedActive, iamIdentities: storedActive.iamIdentities ?? [] } : null;
    return {
      savedPlannings: current.savedPlannings,
      activePlanning,
      isLoading: current.isLoading,
      loadError: current.loadError,
      // Las entradas antiguas se calculan solo en memoria, sin migrar el historial.
      activeCostLines: activePlanning
        ? activePlanning.costLines?.map(normalizeCostLine) ?? buildDefaultCostLines(activePlanning.plan.awsServices)
        : [],
      setActivePlanningId,
      savePlanning,
      updatePlanning,
      deletePlanning,
      updateActiveCostLines,
      updateActiveIamIdentities,
    };
  }, [state, ownerId, authLoading, setActivePlanningId, savePlanning, updatePlanning, deletePlanning, updateActiveCostLines, updateActiveIamIdentities]);

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>;
}

export function usePlanning(): PlanningContextValue {
  const context = useContext(PlanningContext);
  if (!context) throw new Error('usePlanning debe usarse dentro de PlanningProvider');
  return context;
}

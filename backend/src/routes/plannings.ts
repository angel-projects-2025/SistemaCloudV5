import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { transaction } from '../db/pool';
import { authenticate } from '../middleware/auth';
import { HttpError } from '../middleware/errors';

// Los campos adicionales se conservan, también dentro de los objetos de diseño.
export const planningConfigSchema = z.object({
  plan: z.object({
    solutionName: z.string(), applicationType: z.string(), region: z.string(),
    estimatedUsers: z.string(), availabilityLevel: z.string(),
    awsServices: z.array(z.string()), migrationGoal: z.string(),
  }).passthrough(),
  network: z.object({
    vpcCidr: z.string(), availabilityZones: z.number().int(), publicSubnets: z.number().int(),
    privateSubnets: z.number().int(), natGateways: z.number().int(),
    enableWaf: z.boolean(), enableFlowLogs: z.boolean(), enableTransit: z.boolean(),
  }).passthrough(),
  selectedGoals: z.array(z.string()),
  goalText: z.string(),
  costLines: z.array(z.unknown()).optional(),
  iamIdentities: z.array(z.unknown()).optional(),
}).passthrough();

interface PlanningRow extends RowDataPacket { id: string; config: unknown; saved_at: string; version: number }
interface UserRow extends RowDataPacket { id: string; active_planning_id: string | null }

function savedPlanning(row: PlanningRow) {
  const config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Configuración inválida.');
  const savedAt = new Date(row.saved_at.replace(' ', 'T') + 'Z').toISOString();
  return { ...config, id: row.id, savedAt, version: row.version };
}

async function userRow(connection: PoolConnection, userId: string, lock = false): Promise<UserRow> {
  const [users] = await connection.execute<UserRow[]>(
    `SELECT id, active_planning_id FROM users WHERE id = ?${lock ? ' FOR UPDATE' : ''}`, [userId],
  );
  if (!users[0]) throw new HttpError(401, 'No autenticado.');
  return users[0];
}

async function planningRow(connection: PoolConnection, userId: string, id: string): Promise<PlanningRow> {
  const [rows] = await connection.execute<PlanningRow[]>(
    'SELECT id, config, saved_at, version FROM plannings WHERE id = ? AND user_id = ?', [id, userId],
  );
  if (!rows[0]) throw new HttpError(404, 'Planificación no encontrada.');
  return rows[0];
}

export function planningRoutes(secret: string): Router {
  const router = Router();
  router.use(authenticate(secret));

  router.get('/', async (req, res, next) => {
    try {
      const result = await transaction(async (connection) => {
        const user = await userRow(connection, req.userId!);
        const [rows] = await connection.execute<PlanningRow[]>(
          'SELECT id, config, saved_at, version FROM plannings WHERE user_id = ? ORDER BY seq DESC', [req.userId!],
        );
        return {
          plannings: rows.map(savedPlanning),
          activeId: rows.some((row) => row.id === user.active_planning_id) ? user.active_planning_id : null,
        };
      });
      res.json(result);
    } catch (error) { next(error); }
  });

  router.post('/', async (req, res, next) => {
    const parsed = planningConfigSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Configuración de planificación no válida.' }); return; }
    try {
      const planning = await transaction(async (connection) => {
        await userRow(connection, req.userId!, true);
        const id = randomUUID();
        await connection.execute('INSERT INTO plannings (id, user_id, config, saved_at, created_at, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))', [id, req.userId!, JSON.stringify(parsed.data)]);
        await connection.execute('UPDATE users SET active_planning_id = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?', [id, req.userId!]);
        return savedPlanning(await planningRow(connection, req.userId!, id));
      });
      res.status(201).json(planning);
    } catch (error) { next(error); }
  });

  // Debe preceder a /:id para que "active" no se interprete como un UUID.
  router.put('/active', async (req, res, next) => {
    const parsed = z.object({ id: z.uuid().nullable() }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Identificador de planificación no válido.' }); return; }
    try {
      await transaction(async (connection) => {
        await userRow(connection, req.userId!, true);
        if (parsed.data.id !== null) await planningRow(connection, req.userId!, parsed.data.id);
        await connection.execute('UPDATE users SET active_planning_id = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?', [parsed.data.id, req.userId!]);
      });
      res.json({ activeId: parsed.data.id });
    } catch (error) { next(error); }
  });

  router.put('/:id', async (req, res, next) => {
    const parsed = planningConfigSchema.safeParse(req.body);
    if (!z.uuid().safeParse(req.params.id).success || !parsed.success) {
      res.status(400).json({ error: 'Configuración o identificador de planificación no válido.' }); return;
    }
    try {
      const planning = await transaction(async (connection) => {
        await userRow(connection, req.userId!, true);
        await planningRow(connection, req.userId!, req.params.id);
        // saved_at, seq e id no se modifican; la fila sigue en su posición original.
        await connection.execute('UPDATE plannings SET config = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND user_id = ?', [JSON.stringify(parsed.data), req.params.id, req.userId!]);
        return savedPlanning(await planningRow(connection, req.userId!, req.params.id));
      });
      res.json(planning);
    } catch (error) { next(error); }
  });

  router.delete('/:id', async (req, res, next) => {
    if (!z.uuid().safeParse(req.params.id).success) { res.status(400).json({ error: 'Identificador de planificación no válido.' }); return; }
    try {
      await transaction(async (connection) => {
        await userRow(connection, req.userId!, true);
        await planningRow(connection, req.userId!, req.params.id);
        await connection.execute('UPDATE users SET active_planning_id = NULL, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND active_planning_id = ?', [req.userId!, req.params.id]);
        await connection.execute('DELETE FROM plannings WHERE id = ? AND user_id = ?', [req.params.id, req.userId!]);
      });
      res.json({ status: 'ok' });
    } catch (error) { next(error); }
  });

  return router;
}

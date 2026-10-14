import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { rateLimit } from 'express-rate-limit';
import { getPool } from '../db/pool';
import { hashPassword, loginSchema, registrationSchema, signToken, verifyPassword } from '../lib/auth';
import { authenticate, SESSION_COOKIE, sessionCookieOptions } from '../middleware/auth';

interface UserRow extends RowDataPacket { id: string; email: string; password_hash: string }
interface CountRow extends RowDataPacket { total: number | string }
interface LockRow extends RowDataPacket { acquired: number | null }

export function invitationMatches(expected: string | undefined, supplied: unknown): boolean {
  if (expected === undefined) return true;
  const expectedHash = createHash('sha256').update(expected).digest();
  const suppliedHash = createHash('sha256').update(typeof supplied === 'string' ? supplied : '').digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export function registrationOpen(count: number, maxUsers: number): boolean {
  return count < maxUsers;
}

export function authRoutes(secret: string, production: boolean, registration: { maxUsers: number; code?: string }): Router {
  const router = Router();
  const cookieOptions = sessionCookieOptions(production);
  const limiter = () => rateLimit({
    windowMs: 15 * 60 * 1000, limit: 10,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Demasiados intentos. Inténtalo más tarde.' },
  });
  const dummyHash = hashPassword(randomBytes(32).toString('hex'));

  router.get('/registration-info', async (_req, res, next) => {
    try {
      const [rows] = await getPool().execute<CountRow[]>('SELECT COUNT(*) AS total FROM users');
      res.set('Cache-Control', 'no-store').json({ codeRequired: registration.code !== undefined, open: registrationOpen(Number(rows[0].total), registration.maxUsers) });
    } catch (error) { next(error); }
  });

  router.post('/register', limiter(), async (req, res, next) => {
    let connection: PoolConnection | undefined;
    let locked = false;
    try {
      connection = await getPool().getConnection();
      // Bloqueo por conexión: el conteo y la inserción no compiten entre registros simultáneos.
      const [locks] = await connection.execute<LockRow[]>("SELECT GET_LOCK('sistemacloud_registration', 5) AS acquired");
      locked = locks[0].acquired === 1;
      if (!locked) { res.status(503).json({ error: 'No se pudo completar el registro. Inténtalo más tarde.' }); return; }
      const [rows] = await connection.execute<CountRow[]>('SELECT COUNT(*) AS total FROM users');
      if (!registrationOpen(Number(rows[0].total), registration.maxUsers)) {
        res.status(403).json({ error: 'El registro está cerrado' }); return;
      }
      if (!invitationMatches(registration.code, req.body?.registrationCode)) {
        res.status(403).json({ error: 'Código de invitación incorrecto' }); return;
      }
      const parsed = registrationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Email válido y contraseña de al menos 8 caracteres (máximo 72 bytes) requeridos.' }); return;
      }
      const id = randomUUID();
      const passwordHash = await hashPassword(parsed.data.password);
      await connection.execute('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))', [id, parsed.data.email, passwordHash]);
      res.cookie(SESSION_COOKIE, signToken(id, secret), { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.status(201).json({ id, email: parsed.data.email });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: 'No se pudo completar el registro' });
      } else { next(error); }
    } finally {
      if (connection && locked) {
        try { await connection.execute("SELECT RELEASE_LOCK('sistemacloud_registration')"); }
        catch { connection.destroy(); connection = undefined; }
      }
      connection?.release();
    }
  });

  router.post('/login', limiter(), async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      return;
    }
    try {
      const [users] = await getPool().execute<UserRow[]>('SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1', [parsed.data.email]);
      const user = users[0];
      const valid = await verifyPassword(parsed.data.password, user?.password_hash ?? await dummyHash);
      if (!user || !valid) {
        res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        return;
      }
      res.cookie(SESSION_COOKIE, signToken(user.id, secret), { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ id: user.id, email: user.email });
    } catch (error) { next(error); }
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.json({ status: 'ok' });
  });

  router.get('/me', authenticate(secret), async (req, res, next) => {
    try {
      const [users] = await getPool().execute<UserRow[]>('SELECT id, email FROM users WHERE id = ? LIMIT 1', [req.userId!]);
      if (!users[0]) { res.status(401).json({ error: 'No autenticado.' }); return; }
      res.json({ id: users[0].id, email: users[0].email });
    } catch (error) { next(error); }
  });
  return router;
}

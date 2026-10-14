import type { RequestHandler, CookieOptions } from 'express';
import { verifyToken } from '../lib/auth';

declare global {
  namespace Express {
    interface Request { userId?: string }
  }
}

export const SESSION_COOKIE = 'cloudops_session';

export function sessionCookieOptions(production: boolean): CookieOptions {
  return { httpOnly: true, secure: production, sameSite: 'lax', path: '/' };
}

export function authenticate(secret: string): RequestHandler {
  return (req, res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    try {
      if (typeof token !== 'string') throw new Error('Sesión ausente.');
      req.userId = verifyToken(token, secret);
      next();
    } catch {
      res.status(401).json({ error: 'No autenticado.' });
    }
  };
}

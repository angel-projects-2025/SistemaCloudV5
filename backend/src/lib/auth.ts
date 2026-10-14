import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const emailSchema = z.string().transform(normalizeEmail).pipe(z.email().max(255));
// bcrypt solo procesa los primeros 72 bytes: se rechazan contraseñas que excedan ese límite.
const passwordSchema = z.string().min(8).refine((password) => Buffer.byteLength(password, 'utf8') <= 72);
export const registrationSchema = z.object({ email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).refine((password) => Buffer.byteLength(password, 'utf8') <= 72) });

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash);

export function signToken(userId: string, secret: string): string {
  return jwt.sign({}, secret, { algorithm: 'HS256', subject: userId, issuer: 'sistemacloud', expiresIn: '7d' });
}

export function verifyToken(token: string, secret: string): string {
  const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'sistemacloud' });
  if (typeof payload === 'string' || !z.uuid().safeParse(payload.sub).success) {
    throw new Error('Sesión inválida.');
  }
  return payload.sub!;
}

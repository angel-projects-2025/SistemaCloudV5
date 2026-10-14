import path from 'node:path';

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) throw new Error(`Falta la variable requerida ${name}.`);
  return value;
}

function port(name: string, fallback: number): number {
  const value = process.env[name] ?? String(fallback);
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(`La variable ${name} debe indicar un puerto válido.`);
  }
  return Number(value);
}

export function databaseSettings(admin = false) {
  const database = required('DB_NAME');
  // También protege los identificadores interpolados por el script de instalación.
  if (!/^[A-Za-z0-9_]{1,64}$/.test(database)) {
    throw new Error('DB_NAME debe contener entre 1 y 64 letras, números o guiones bajos.');
  }
  return {
    host: required('DB_HOST'),
    port: port('DB_PORT', 3306),
    database,
    user: required(admin ? 'DB_ADMIN_USER' : 'DB_USER'),
    password: required(admin ? 'DB_ADMIN_PASSWORD' : 'DB_PASSWORD'),
  };
}

export function applicationSettings() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new Error('NODE_ENV debe ser development, production o test.');
  }
  const jwtSecret = required('JWT_SECRET');
  if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
    throw new Error('JWT_SECRET debe contener al menos 32 bytes.');
  }
  const maxUsers = Number(process.env.MAX_USERS || '20');
  if (!Number.isSafeInteger(maxUsers) || maxUsers < 0) {
    throw new Error('MAX_USERS debe ser un entero no negativo.');
  }
  const registration = { maxUsers, code: process.env.REGISTRATION_CODE || undefined };
  return { port: port('PORT', 3001), nodeEnv, jwtSecret, registration };
}

export function resolveFrontendDist(serverDirectory: string): string {
  return path.resolve(serverDirectory, '../../dist');
}

export function seedSettings() {
  return { email: required('ADMIN_EMAIL'), password: required('ADMIN_PASSWORD') };
}

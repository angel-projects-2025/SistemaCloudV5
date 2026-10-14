import { readFileSync } from 'node:fs';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';
import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';
import { databaseSettings } from '../config';

export function databaseSsl() {
  // src/db y dist/db están a la misma distancia de backend/certs.
  const certificatePath = path.resolve(__dirname, '../../certs/global-bundle.pem');
  let ca: string;
  try {
    ca = readFileSync(certificatePath, 'utf8');
    new X509Certificate(ca);
  } catch {
    throw new Error('Falta o no es válido backend/certs/global-bundle.pem; se requiere SSL verificado.');
  }
  return { ca, rejectUnauthorized: true as const, verifyIdentity: true };
}

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      ...databaseSettings(),
      ssl: databaseSsl(),
      charset: 'utf8mb4',
      connectionLimit: 5,
      waitForConnections: true,
      queueLimit: 20,
      timezone: 'Z',
      dateStrings: true,
      multipleStatements: false,
    });
  }
  return pool;
}

export async function transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch { /* Se conserva el error original. */ }
    throw error;
  } finally {
    connection.release();
  }
}

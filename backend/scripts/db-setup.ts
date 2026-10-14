import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { databaseSettings, seedSettings } from '../src/config';
import { databaseSsl } from '../src/db/pool';
import { CREATE_PLANNINGS, CREATE_USERS } from '../src/db/schema';
import { hashPassword, registrationSchema } from '../src/lib/auth';

async function setup() {
  const admin = databaseSettings(true);
  const application = databaseSettings();
  const seed = registrationSchema.safeParse(seedSettings());
  if (!seed.success) throw new Error('ADMIN_EMAIL o ADMIN_PASSWORD no cumplen los requisitos de registro.');
  if (!/^[A-Za-z0-9_.-]{1,32}$/.test(application.user)) {
    throw new Error('DB_USER debe ser un nombre de usuario dedicado de hasta 32 caracteres.');
  }
  if (application.user.toLowerCase() === admin.user.toLowerCase()) {
    throw new Error('DB_USER debe ser distinto de DB_ADMIN_USER.');
  }
  const { database, ...adminConnection } = admin;
  const connection = await mysql.createConnection({
    ...adminConnection, ssl: databaseSsl(), charset: 'utf8mb4', timezone: 'Z', multipleStatements: false,
  });
  try {
    console.log('Conexión administrativa SSL verificada establecida.');
    // Asegura el modo de escape que utiliza mysql2 al interpolar las cuentas/contraseñas DDL.
    const [modes] = await connection.query<(RowDataPacket & { mode: string })[]>('SELECT @@SESSION.sql_mode AS mode');
    const mode = modes[0].mode.split(',').filter((item) => item !== 'NO_BACKSLASH_ESCAPES').join(',');
    await connection.query('SET SESSION sql_mode = ?', [mode]);
    // DB_NAME se valida antes de usarlo como identificador; los valores usan parámetros.
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('Base de datos disponible.');
    await connection.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ? REQUIRE SSL", [application.user, application.password]);
    await connection.query("ALTER USER ?@'%' IDENTIFIED BY ? REQUIRE SSL", [application.user, application.password]);
    // DB_USER es exclusivo de esta aplicación: repetir elimina privilegios explícitos sobrantes.
    await connection.query("REVOKE ALL PRIVILEGES, GRANT OPTION FROM ?@'%'", [application.user]);
    await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${database}\`.* TO ?@'%'`, [application.user]);
    console.log('Usuario de aplicación preparado con SSL y permisos CRUD.');
    await connection.query(`USE \`${database}\``);
    await connection.query(CREATE_USERS);
    await connection.query(CREATE_PLANNINGS);
    console.log('Tablas disponibles.');
    const [users] = await connection.execute<RowDataPacket[]>('SELECT id FROM users WHERE email = ? LIMIT 1', [seed.data.email]);
    if (!users.length) {
      const passwordHash = await hashPassword(seed.data.password);
      // Si dos instalaciones coinciden, el índice único evita duplicar o cambiar la contraseña.
      await connection.execute('INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE id = id', [randomUUID(), seed.data.email, passwordHash]);
      console.log('Usuario inicial disponible.');
    } else {
      console.log('Usuario inicial ya existente; no se modificó.');
    }
    console.log('Preparación completada.');
  } finally {
    await connection.end();
  }
}

void setup().catch((error: unknown) => {
  // Solo mensajes de validación locales; nunca el mensaje de MySQL con detalles de conexión.
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (code !== undefined) console.error('No se pudo preparar la base de datos; revise conexión, certificado y permisos administrativos.');
  else console.error(error instanceof Error ? error.message : 'No se pudo preparar la base de datos.');
  process.exitCode = 1;
});

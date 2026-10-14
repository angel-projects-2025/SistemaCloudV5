import 'dotenv/config';
import { getPool } from '../src/db/pool';
import { CREATE_PROJECTS } from '../src/db/schema';

async function main() {
  const pool = getPool();

  try {
    await pool.query(CREATE_PROJECTS);
    console.log('Tabla projects creada o ya existente en AWS RDS.');
  } catch (error) {
    console.error('No se pudo crear la tabla projects.');

    if (error instanceof Error) {
      console.error(error.message);
    }

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Error al ejecutar el script:', error);
  process.exitCode = 1;
});
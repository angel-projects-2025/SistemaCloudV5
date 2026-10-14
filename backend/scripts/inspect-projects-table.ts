import 'dotenv/config';
import { getPool } from '../src/db/pool';

async function main() {
  const pool = getPool();

  try {
    const [columns] = await pool.query(
      'DESCRIBE projects',
    );

    console.log('Columnas de la tabla projects:');
    console.table(columns);

    const [projects] = await pool.query(
      `SELECT id, name, description, technologies, status, created_at
       FROM projects
       ORDER BY created_at DESC`,
    );

    console.log('Proyectos guardados:');
    console.table(projects);
  } catch (error) {
    console.error('No se pudo consultar la tabla.');

    if (error instanceof Error) {
      console.error(error.message);
    }

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Error inesperado:', error);
  process.exitCode = 1;
});
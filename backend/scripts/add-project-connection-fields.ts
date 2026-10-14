import 'dotenv/config';
import { getPool } from '../src/db/pool';

async function main() {
  const pool = getPool();

  try {
    const fields = [
      {
        name: 'repository_url',
        sql: 'ALTER TABLE projects ADD COLUMN repository_url VARCHAR(500) NULL',
      },
      {
        name: 'deployment_url',
        sql: 'ALTER TABLE projects ADD COLUMN deployment_url VARCHAR(500) NULL',
      },
      {
        name: 'zip_file_name',
        sql: 'ALTER TABLE projects ADD COLUMN zip_file_name VARCHAR(255) NULL',
      },
      {
        name: 'zip_file_path',
        sql: 'ALTER TABLE projects ADD COLUMN zip_file_path VARCHAR(1000) NULL',
      },
    ];

    for (const field of fields) {
      const [columns] = await pool.query(
        'SHOW COLUMNS FROM projects LIKE ?',
        [field.name],
      );

      if ((columns as unknown[]).length === 0) {
        await pool.query(field.sql);
        console.log(`Columna creada: ${field.name}`);
      } else {
        console.log(`La columna ya existe: ${field.name}`);
      }
    }

    console.log('Actualización de la tabla projects completada.');
  } catch (error) {
    console.error('No se pudieron agregar los campos.');

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
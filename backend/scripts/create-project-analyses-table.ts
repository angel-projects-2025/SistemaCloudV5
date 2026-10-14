import 'dotenv/config';
import { getPool } from '../src/db/pool';

async function main() {
  const pool = getPool();

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_analyses (
        id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
        project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        analysis JSON NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_project_analyses_project (project_id, created_at),
        INDEX idx_project_analyses_user (user_id, created_at),
        CONSTRAINT fk_project_analyses_project
          FOREIGN KEY (project_id)
          REFERENCES projects(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_project_analyses_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB
        DEFAULT CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Tabla project_analyses preparada correctamente.');
  } catch (error) {
    console.error('No se pudo preparar la tabla de análisis.');

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
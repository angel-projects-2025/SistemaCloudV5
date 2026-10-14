import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { z } from 'zod';

import { authenticate } from '../middleware/auth';
import { transaction } from '../db/pool';

const projectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  technologies: z.string().trim().max(500).default(''),
});

const connectionSchema = z.object({
  repository_url: z.string().trim().max(500).default(''),
  deployment_url: z.string().trim().max(500).default(''),
}).refine(
  (data) =>
    [data.repository_url, data.deployment_url].every(
      (url) => url === '' || z.string().url().safeParse(url).success,
    ),
  { message: 'Las URLs deben ser válidas.' },
);

const MAX_ZIP_SIZE = 50 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ZIP_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith('.zip')) {
      callback(new Error('Solo se permiten archivos ZIP.'));
      return;
    }

    callback(null, true);
  },
});

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

if (!region || !bucket) {
  throw new Error(
    'Faltan AWS_REGION o AWS_S3_BUCKET en el archivo .env.',
  );
}

const s3 = new S3Client({ region });

function isZipFile(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  return (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (
      (buffer[2] === 0x03 && buffer[3] === 0x04) ||
      (buffer[2] === 0x05 && buffer[3] === 0x06) ||
      (buffer[2] === 0x07 && buffer[3] === 0x08)
    )
  );
}

function cleanFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() ?? 'proyecto.zip';

  return (
    baseName
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 200) || 'proyecto.zip'
  );
}

function getRouteId(id: string | string[] | undefined): string | null {
  if (typeof id !== 'string' || id.trim().length === 0) {
    return null;
  }

  return id;
}

export function projectRoutes(secret: string): Router {
  const router = Router();

  router.use(authenticate(secret));

  // Listar proyectos del usuario autenticado.
  router.get('/', async (req, res, next) => {
    try {
      const projects = await transaction(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT
             id,
             name,
             description,
             technologies,
             status,
             repository_url,
             deployment_url,
             zip_file_name,
             created_at
           FROM projects
           WHERE user_id = ?
           ORDER BY created_at DESC`,
          [req.userId!],
        );

        return rows;
      });

      res.json({ projects });
    } catch (error) {
      next(error);
    }
  });

  // Registrar un proyecto.
  router.post('/', async (req, res, next) => {
    const parsed = projectSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Los datos del proyecto no son válidos.',
      });
      return;
    }

    try {
      const project = await transaction(async (connection) => {
        const id = randomUUID();

        await connection.execute(
          `INSERT INTO projects
            (id, user_id, name, description, technologies, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            req.userId!,
            parsed.data.name,
            parsed.data.description,
            parsed.data.technologies,
            'Pendiente de análisis',
          ],
        );

        const [rows] = await connection.execute(
          `SELECT
             id,
             name,
             description,
             technologies,
             status,
             repository_url,
             deployment_url,
             zip_file_name,
             created_at
           FROM projects
           WHERE id = ? AND user_id = ?`,
          [id, req.userId!],
        );

        return (rows as Array<Record<string, unknown>>)[0];
      });

      res.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  });

  // Guardar las URL de GitHub y del despliegue.
  router.patch('/:id/connection', async (req, res, next) => {
    const projectId = getRouteId(req.params.id);

    if (!projectId) {
      res.status(400).json({
        error: 'El ID del proyecto no es válido.',
      });
      return;
    }

    const parsed = connectionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Las URLs proporcionadas no son válidas.',
      });
      return;
    }

    try {
      const result = await transaction(async (connection) => {
        const [existing] = await connection.execute(
          `SELECT id FROM projects
           WHERE id = ? AND user_id = ?`,
          [projectId, req.userId!],
        );

        if ((existing as unknown[]).length === 0) {
          return false;
        }

        await connection.execute(
          `UPDATE projects
           SET repository_url = ?, deployment_url = ?
           WHERE id = ? AND user_id = ?`,
          [
            parsed.data.repository_url || null,
            parsed.data.deployment_url || null,
            projectId,
            req.userId!,
          ],
        );

        return true;
      });

      if (!result) {
        res.status(404).json({
          error: 'Proyecto no encontrado.',
        });
        return;
      }

      res.json({
        message: 'Conexiones del proyecto guardadas.',
      });
    } catch (error) {
      next(error);
    }
  });

  // Subir el ZIP de un proyecto a S3.
  router.post(
    '/:id/zip',
    upload.single('file'),
    async (req, res, next) => {
      const projectId = getRouteId(req.params.id);

      if (!projectId) {
        res.status(400).json({
          error: 'El ID del proyecto no es válido.',
        });
        return;
      }

      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: 'Selecciona un archivo ZIP para subir.',
        });
        return;
      }

      if (!isZipFile(file.buffer)) {
        res.status(400).json({
          error: 'El archivo no tiene una firma ZIP válida.',
        });
        return;
      }

      let s3Key: string | undefined;

      try {
        // Verificar que el proyecto pertenezca al usuario.
        const projectExists = await transaction(async (connection) => {
          const [rows] = await connection.execute(
            `SELECT id FROM projects
             WHERE id = ? AND user_id = ?`,
            [projectId, req.userId!],
          );

          return (rows as unknown[]).length > 0;
        });

        if (!projectExists) {
          res.status(404).json({
            error: 'Proyecto no encontrado.',
          });
          return;
        }

        const fileName = cleanFileName(file.originalname);

        s3Key = `projects/${req.userId}/${projectId}/${randomUUID()}.zip`;

        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: file.buffer,
            ContentLength: file.size,
            ContentType: 'application/zip',
            ServerSideEncryption: 'AES256',
            Metadata: {
              originalname: fileName,
              projectid: projectId,
            },
          }),
        );

        try {
          await transaction(async (connection) => {
            await connection.execute(
              `UPDATE projects
               SET zip_file_name = ?, zip_file_path = ?
               WHERE id = ? AND user_id = ?`,
              [fileName, s3Key!, projectId, req.userId!],
            );
          });
        } catch (databaseError) {
          // Si falla MySQL, intentar borrar el ZIP de S3.
          try {
            await s3.send(
              new DeleteObjectCommand({
                Bucket: bucket,
                Key: s3Key!,
              }),
            );
          } catch (deleteError) {
            console.error(
              'No se pudo eliminar el ZIP de S3 tras el error de MySQL:',
              deleteError,
            );
          }

          throw databaseError;
        }

        res.json({
          message: 'Archivo ZIP subido correctamente.',
          fileName,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
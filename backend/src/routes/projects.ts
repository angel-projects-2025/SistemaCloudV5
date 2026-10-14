import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import AdmZip from 'adm-zip';
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
const MAX_ZIP_FILES = 3000;
const MAX_UNCOMPRESSED_SIZE = 100 * 1024 * 1024;
const MAX_TEXT_SIZE = 2 * 1024 * 1024;

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
  throw new Error('Faltan AWS_REGION o AWS_S3_BUCKET en el archivo .env.');
}

const s3 = new S3Client({ region });

type Severity = 'alta' | 'media' | 'baja' | 'informativa';

interface Finding {
  severity: Severity;
  title: string;
  detail: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  technologies: string | null;
  status?: string;
  repository_url?: string | null;
  deployment_url?: string | null;
  zip_file_name?: string | null;
  zip_file_path?: string | null;
  created_at?: string;
}

function isZipFile(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

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
    baseName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) ||
    'proyecto.zip'
  );
}

function getRouteId(id: string | string[] | undefined): string | null {
  if (typeof id !== 'string' || id.trim().length === 0) {
    return null;
  }

  return id;
}

function countBySeverity(findings: Finding[]) {
  return {
    high: findings.filter((item) => item.severity === 'alta').length,
    medium: findings.filter((item) => item.severity === 'media').length,
    low: findings.filter((item) => item.severity === 'baja').length,
    informational: findings.filter(
      (item) => item.severity === 'informativa',
    ).length,
  };
}

function hasAnyTechnology(
  technologies: string[],
  pattern: RegExp,
): boolean {
  return technologies.some((technology) => pattern.test(technology));
}

export function projectRoutes(secret: string): Router {
  const router = Router();

  router.use(authenticate(secret));

  // Listar los proyectos del usuario autenticado.
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

        return (rows as ProjectRow[])[0];
      });

      res.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  });

  // Guardar los enlaces de GitHub y del despliegue.
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
        res.status(404).json({ error: 'Proyecto no encontrado.' });
        return;
      }

      res.json({ message: 'Conexiones del proyecto guardadas.' });
    } catch (error) {
      next(error);
    }
  });

  // Subir el ZIP privado a S3.
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
        const projectExists = await transaction(async (connection) => {
          const [rows] = await connection.execute(
            `SELECT id FROM projects
             WHERE id = ? AND user_id = ?`,
            [projectId, req.userId!],
          );

          return (rows as unknown[]).length > 0;
        });

        if (!projectExists) {
          res.status(404).json({ error: 'Proyecto no encontrado.' });
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

  // Ejecutar análisis estático y guardar el informe.
  router.post('/:id/analyze', async (req, res, next) => {
    const projectId = getRouteId(req.params.id);

    if (!projectId) {
      res.status(400).json({
        error: 'El ID del proyecto no es válido.',
      });
      return;
    }

    try {
      const project = await transaction(async (connection) => {
        const [rows] = await connection.execute(
          `SELECT
             id, name, description, technologies,
             repository_url, deployment_url,
             zip_file_name, zip_file_path
           FROM projects
           WHERE id = ? AND user_id = ?`,
          [projectId, req.userId!],
        );

        return (rows as ProjectRow[])[0] ?? null;
      });

      if (!project) {
        res.status(404).json({ error: 'Proyecto no encontrado.' });
        return;
      }

      const findings: Finding[] = [];
      const detectedFiles: string[] = [];
      const detectedTechnologies = new Set<string>(
        String(project.technologies ?? '')
          .split(/[,;]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      );

      let inspectedFiles = 0;
      let inspectedTextBytes = 0;
      let totalUncompressedBytes = 0;
      let zipAnalyzed = false;

      if (project.zip_file_path) {
        const object = await s3.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: project.zip_file_path,
          }),
        );

        if (!object.Body) {
          throw new Error('No se pudo leer el archivo ZIP de S3.');
        }

        const zipBuffer = Buffer.from(
          await object.Body.transformToByteArray(),
        );

        if (zipBuffer.length > MAX_ZIP_SIZE || !isZipFile(zipBuffer)) {
          res.status(400).json({
            error: 'El ZIP almacenado no es válido o supera el tamaño permitido.',
          });
          return;
        }

        const zip = new AdmZip(zipBuffer);
        const entries = zip.getEntries();

        if (entries.length > MAX_ZIP_FILES) {
          res.status(400).json({
            error: 'El ZIP contiene demasiados archivos para analizarlo.',
          });
          return;
        }

        for (const entry of entries) {
          if (entry.isDirectory) continue;

          const fileName = entry.entryName.replace(/\\/g, '/');

          // No extraer rutas inseguras fuera del ZIP.
          if (
            fileName.startsWith('/') ||
            fileName.split('/').some((part) => part === '..')
          ) {
            findings.push({
              severity: 'media',
              title: 'Ruta sospechosa dentro del ZIP',
              detail: 'Se encontró una ruta que requiere revisión manual.',
            });
            continue;
          }

          inspectedFiles++;

          const size = entry.header.size ?? 0;
          totalUncompressedBytes += size;

          if (totalUncompressedBytes > MAX_UNCOMPRESSED_SIZE) {
            res.status(400).json({
              error: 'El contenido descomprimido supera el límite de análisis.',
            });
            return;
          }

          const lowerName = fileName.toLowerCase();
          const baseName = lowerName.split('/').pop() ?? lowerName;

          const relevantNames = [
            'package.json',
            'package-lock.json',
            'requirements.txt',
            'pyproject.toml',
            'dockerfile',
            'docker-compose.yml',
            'docker-compose.yaml',
            'tsconfig.json',
            'vite.config.ts',
            'vite.config.js',
            'main.py',
            'app.py',
            '.env',
            '.env.production',
            'terraform.tf',
            'main.tf',
            'serverless.yml',
          ];

          if (relevantNames.includes(baseName)) {
            detectedFiles.push(fileName);
          }

          if (/(^|\/)package\.json$/.test(lowerName)) {
            detectedTechnologies.add('Node.js');
          }

          if (
            /(^|\/)(vite\.config\.(ts|js)|tsconfig\.json)$/.test(lowerName)
          ) {
            detectedTechnologies.add('TypeScript');
          }

          if (
            /(^|\/)(requirements\.txt|pyproject\.toml|main\.py|app\.py)$/.test(
              lowerName,
            )
          ) {
            detectedTechnologies.add('Python');
          }

          if (/(^|\/)dockerfile$/.test(lowerName)) {
            detectedTechnologies.add('Docker');
          }

          if (/(^|\/)(terraform\.tf|main\.tf)$/.test(lowerName)) {
            detectedTechnologies.add('Terraform');
          }

          const isRelevantText =
            /(^|\/)(package\.json|requirements\.txt|pyproject\.toml|dockerfile|docker-compose\.ya?ml|\.env(\.[^/]*)?|[^/]+\.tf|serverless\.yml)$/.test(
              lowerName,
            );

          if (
            !isRelevantText ||
            size <= 0 ||
            size > 256 * 1024 ||
            inspectedTextBytes + size > MAX_TEXT_SIZE
          ) {
            continue;
          }

          const content = entry.getData().toString('utf8');
          inspectedTextBytes += Buffer.byteLength(content, 'utf8');

          if (
            /^\.env(?:\.|$)/i.test(baseName) &&
            !/(^|\/)\.env\.example$/i.test(lowerName)
          ) {
            findings.push({
              severity: 'alta',
              title: 'Archivo de entorno incluido en el ZIP',
              detail:
                'Se encontró un archivo .env. Comprueba que no contenga credenciales reales y exclúyelo del repositorio si corresponde.',
            });
          }

          const credentialPatterns = [
            /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
            /\bAKIA[0-9A-Z]{16}\b/,
            /\b(?:password|passwd|secret_access_key|api_key)\s*[:=]\s*["']?[^"' \r\n]{8,}/i,
          ];

          if (credentialPatterns.some((pattern) => pattern.test(content))) {
            findings.push({
              severity: 'alta',
              title: 'Posible credencial expuesta',
              detail:
                'Se detectó un patrón compatible con una clave o credencial. Confirma manualmente si es un secreto real; no se guarda el valor detectado.',
            });
          }

          if (
            baseName === 'package.json' &&
            /"postinstall"\s*:/.test(content)
          ) {
            findings.push({
              severity: 'media',
              title: 'Script postinstall detectado',
              detail:
                'Revisa el contenido de postinstall y las dependencias antes de instalar el proyecto en producción.',
            });
          }
        }

        zipAnalyzed = true;
      } else {
        findings.push({
          severity: 'informativa',
          title: 'Análisis limitado a metadatos',
          detail:
            'El proyecto no tiene un ZIP registrado. No se inspeccionaron archivos fuente.',
        });
      }

      const technologies = [...detectedTechnologies];

      const hasFrontend = hasAnyTechnology(
        technologies,
        /react|vite|angular|vue|next\.js/i,
      );

      const hasBackend = hasAnyTechnology(
        technologies,
        /node\.js|express|fastapi|django|flask|spring|\.net/i,
      );

      const hasDatabase = hasAnyTechnology(
        technologies,
        /postgres|mysql|mariadb|mongodb|sql/i,
      );

      if (!hasDatabase) {
        findings.push({
          severity: 'baja',
          title: 'Base de datos no identificada',
          detail:
            'No se encontró una tecnología de base de datos en los metadatos detectados.',
        });
      }

      if (!zipAnalyzed) {
        findings.push({
          severity: 'informativa',
          title: 'Inspección de código pendiente',
          detail:
            'Para analizar archivos internos debes subir el ZIP del proyecto.',
        });
      }

      const architecture = {
        style:
          hasFrontend && hasBackend
            ? 'Aplicación web con frontend y backend'
            : hasFrontend
              ? 'Aplicación web con frontend identificado'
              : hasBackend
                ? 'Servicio backend identificado'
                : 'Arquitectura por confirmar',
        detectedTechnologies: technologies,
        detectedFiles,
        inspectedFiles,
        zipAnalyzed,
        suggestedServices: [
          ...(hasFrontend ? ['Hosting web o CDN'] : []),
          ...(hasBackend ? ['Servicio de cómputo para la API'] : []),
          ...(hasDatabase ? ['Base de datos administrada'] : []),
          'Monitoreo y registros',
          'Almacenamiento de respaldos',
        ],
        recommendation:
          'Separar las capas según las necesidades del sistema, utilizar HTTPS, proteger los secretos, habilitar registros y configurar respaldos.',
      };

      const security = {
        findings,
        summary: countBySeverity(findings),
        limitations:
          'Análisis estático preliminar. No ejecuta código, no revisa todas las dependencias y no sustituye una auditoría de seguridad.',
      };

      // Estimación mensual ilustrativa, no precios en tiempo real.
      const services = [
        {
          service: 'Hosting web',
          monthlyUsd: hasFrontend ? 10 : 0,
          assumption: hasFrontend ? 'Escenario básico' : 'No incluido',
        },
        {
          service: 'Cómputo para API',
          monthlyUsd: hasBackend ? 25 : 0,
          assumption: hasBackend
            ? 'Instancia pequeña de referencia'
            : 'No incluido',
        },
        {
          service: 'Base de datos administrada',
          monthlyUsd: hasDatabase ? 25 : 0,
          assumption: hasDatabase
            ? 'Instancia pequeña de referencia'
            : 'No incluido',
        },
        {
          service: 'Monitoreo y respaldos',
          monthlyUsd: 10,
          assumption: 'Reserva mensual orientativa',
        },
      ];

      const estimatedMonthlyTotalUsd = services.reduce(
        (total, service) => total + service.monthlyUsd,
        0,
      );

      const cost = {
        currency: 'USD',
        estimatedMonthlyTotalUsd,
        estimatedAnnualTotalUsd: estimatedMonthlyTotalUsd * 12,
        services,
        assumptions: [
          'Estimación ilustrativa, no cotización ni factura de AWS.',
          'No incluye impuestos, transferencia de datos ni alta disponibilidad.',
          'Los precios reales dependen de la región, el tamaño y el consumo.',
        ],
      };

      const analysis = {
        project: {
          id: project.id,
          name: project.name,
          analyzedAt: new Date().toISOString(),
        },
        architecture,
        security,
        cost,
      };

      const analysisId = randomUUID();

      await transaction(async (connection) => {
        await connection.execute(
          `INSERT INTO project_analyses
            (id, project_id, user_id, analysis)
           VALUES (?, ?, ?, ?)`,
          [
            analysisId,
            projectId,
            req.userId!,
            JSON.stringify(analysis),
          ],
        );

        await connection.execute(
          `UPDATE projects
           SET status = ?
           WHERE id = ? AND user_id = ?`,
          ['Análisis completado', projectId, req.userId!],
        );
      });

      res.json({
        message: 'Análisis completado y guardado.',
        analysisId,
        analysis,
      });
    } catch (error) {
      next(error);
    }
  });

  // Consultar el último análisis guardado.
  router.get('/:id/analysis', async (req, res, next) => {
    const projectId = getRouteId(req.params.id);

    if (!projectId) {
      res.status(400).json({
        error: 'El ID del proyecto no es válido.',
      });
      return;
    }

    try {
      const result = await transaction(async (connection) => {
        const [projectRows] = await connection.execute(
          `SELECT id FROM projects
           WHERE id = ? AND user_id = ?`,
          [projectId, req.userId!],
        );

        if ((projectRows as unknown[]).length === 0) {
          return { notFound: true as const };
        }

        const [analysisRows] = await connection.execute(
          `SELECT id, analysis, created_at
           FROM project_analyses
           WHERE project_id = ? AND user_id = ?
           ORDER BY created_at DESC
           LIMIT 1`,
          [projectId, req.userId!],
        );

        return {
          notFound: false as const,
          analysis: (
            analysisRows as Array<Record<string, unknown>>
          )[0] ?? null,
        };
      });

      if (result.notFound) {
        res.status(404).json({ error: 'Proyecto no encontrado.' });
        return;
      }

      if (!result.analysis) {
        res.status(404).json({
          error: 'Este proyecto todavía no tiene análisis.',
        });
        return;
      }

      let analysis = result.analysis.analysis;

      if (typeof analysis === 'string') {
        analysis = JSON.parse(analysis);
      }

      res.json({
        analysisId: result.analysis.id,
        createdAt: result.analysis.created_at,
        analysis,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
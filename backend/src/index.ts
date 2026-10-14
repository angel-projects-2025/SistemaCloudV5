
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { applicationSettings, resolveFrontendDist } from './config';
import { getPool } from './db/pool';
import { authRoutes } from './routes/auth';
import { planningRoutes } from './routes/plannings';
import { projectRoutes } from './routes/projects';
import { handleError, requireJson } from './middleware/errors';

try {
  const settings = applicationSettings();

  // Valida la configuración de la base de datos y el certificado SSL.
  getPool();

  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));

  if (settings.nodeEnv === 'development') {
    app.use(
      cors({
        origin: [
          'http://localhost:5173',
          'http://localhost:5174',
        ],
        credentials: true,
      }),
    );
  }

  app.use('/api', requireJson);
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(
    '/api/auth',
    authRoutes(
      settings.jwtSecret,
      settings.nodeEnv === 'production',
      settings.registration,
    ),
  );

  app.use('/api/plannings', planningRoutes(settings.jwtSecret));

  // Nueva API para registrar y consultar proyectos.
  app.use('/api/projects', projectRoutes(settings.jwtSecret));

  // Respuesta para rutas de API inexistentes.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  const frontendDist = resolveFrontendDist(__dirname);

  if (existsSync(frontendDist)) {
    app.use(
      '/assets',
      express.static(path.join(frontendDist, 'assets'), {
        maxAge: '1y',
        immutable: true,
      }),
    );

    app.use(express.static(frontendDist, { maxAge: 0 }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ error: 'Ruta no encontrada.' });
        return;
      }

      res.set('Cache-Control', 'no-cache');

      res.sendFile(
        path.join(frontendDist, 'index.html'),
        (error) => {
          if (error) next(error);
        },
      );
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  app.use(handleError);

  app.listen(settings.port, '0.0.0.0', () => {
    console.log('Backend iniciado.');
  });
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : 'No se pudo iniciar el backend.',
  );

  process.exitCode = 1;
}

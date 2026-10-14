import type { ErrorRequestHandler, RequestHandler } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const requireJson: RequestHandler = (req, res, next) => {
  const methodsRequiringJson = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (!methodsRequiringJson.includes(req.method)) {
    next();
    return;
  }

  const contentType = req
    .get('Content-Type')
    ?.split(';', 1)[0]
    .trim()
    .toLowerCase();

  // req.path no incluye el prefijo /api porque el middleware
  // está montado mediante app.use('/api', requireJson).
  const isZipUploadRoute =
    req.method === 'POST' &&
    /^\/projects\/[^/]+\/zip\/?$/.test(req.path) &&
    contentType === 'multipart/form-data';

  if (isZipUploadRoute) {
    next();
    return;
  }

  if (contentType !== 'application/json') {
    res.status(415).json({
      error: 'Se requiere Content-Type application/json.',
    });
    return;
  }

  next();
};

export const handleError: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  const type =
    error && typeof error === 'object' && 'type' in error
      ? error.type
      : undefined;

  if (type === 'entity.too.large') {
    res.status(413).json({
      error: 'La solicitud supera el límite de 1 MB.',
    });
  } else if (type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON no válido.' });
  } else {
    res.status(500).json({
      error: 'No se pudo completar la operación.',
    });
  }
};
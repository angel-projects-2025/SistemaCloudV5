export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function mapApiResponse<T>(status: number, payload: unknown): T {
  if (status < 200 || status >= 300) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      && typeof payload.error === 'string' && payload.error.trim()
      ? payload.error : status === 401 ? 'No autenticado. Vuelve a iniciar sesión.'
        : 'No se pudo completar la solicitud.';
    throw new ApiError(status, message);
  }
  return payload as T;
}

let sessionId: string | null = null;
let sessionGeneration = 0;
const unauthorizedListeners = new Set<() => void>();

export function setApiSession(id: string | null) {
  if (sessionId !== id) { sessionId = id; sessionGeneration++; }
}

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => { unauthorizedListeners.delete(listener); };
}

type RequestOptions = { signal?: AbortSignal };

async function request<T>(method: string, route: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  const generation = sessionGeneration;
  let response: Response;
  try {
    response = await fetch(`/api/${route.replace(/^\/+/, '')}`, {
      method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw new ApiError(0, 'La solicitud fue cancelada.');
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'No se pudo conectar con el servidor. Inténtalo de nuevo.');
  }
  let payload: unknown;
  try { payload = response.status === 204 ? undefined : await response.json(); } catch {
    payload = undefined;
  }
  if (generation !== sessionGeneration || options.signal?.aborted) {
    throw new ApiError(409, 'La sesión cambió. Vuelve a intentarlo.');
  }
  if (response.status === 401 && sessionId !== null) {
    unauthorizedListeners.forEach((listener) => listener());
  }
  if (response.ok && response.status !== 204 && payload === undefined) {
    throw new ApiError(502, 'El servidor devolvió una respuesta no válida.');
  }
  return mapApiResponse<T>(response.status, payload);
}

export const get = <T>(route: string, options?: RequestOptions) => request<T>('GET', route, undefined, options);
export const post = <T>(route: string, body: unknown, options?: RequestOptions) => request<T>('POST', route, body, options);
export const put = <T>(route: string, body: unknown, options?: RequestOptions) => request<T>('PUT', route, body, options);
export const del = <T>(route: string, options?: RequestOptions) => request<T>('DELETE', route, undefined, options);

export async function uploadFile<T>(
  route: string,
  file: File,
): Promise<T> {
  const generation = sessionGeneration;
  const formData = new FormData();

  formData.append('file', file);

  let response: Response;

  try {
    response = await fetch(`/api/${route.replace(/^\/+/, '')}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
  } catch {
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Inténtalo de nuevo.',
    );
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (generation !== sessionGeneration) {
    throw new ApiError(409, 'La sesión cambió. Vuelve a intentarlo.');
  }

  if (response.status === 401 && sessionId !== null) {
    unauthorizedListeners.forEach((listener) => listener());
  }

  if (response.ok && payload === undefined) {
    throw new ApiError(502, 'El servidor devolvió una respuesta no válida.');
  }

  return mapApiResponse<T>(response.status, payload);
}
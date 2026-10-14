import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrainCircuit,
  FolderOpen,
  Plus,
  Search,
  ShieldCheck,
  Cloud,
  Boxes,
  ArrowRight,
  GitBranch,
  ExternalLink,
  Upload,
  FileArchive,
  Save,
  LoaderCircle,
} from 'lucide-react';
import { get, post, uploadFile } from '../api/client';

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string;
  status: string;
  repository_url?: string | null;
  deployment_url?: string | null;
  zip_file_name?: string | null;
  created_at?: string;
}

interface ProjectsResponse {
  projects: Project[];
}

interface ProjectResponse {
  project: Project;
}

interface UploadResponse {
  message: string;
  fileName: string;
}

interface ConnectionResponse {
  message?: string;
}

const MAX_ZIP_SIZE = 50 * 1024 * 1024;

function isValidOptionalUrl(value: string): boolean {
  if (!value.trim()) return true;

  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ProjectsAI() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [technologies, setTechnologies] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editingProjectId, setEditingProjectId] = useState<string | null>(
    null,
  );
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [savingConnection, setSavingConnection] = useState(false);

  const [uploadingProjectId, setUploadingProjectId] = useState<string | null>(
    null,
  );
  const [selectedFiles, setSelectedFiles] = useState<
    Record<string, File | null>
  >({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setLoading(true);
      setError('');

      try {
        const response = await get<ProjectsResponse>('/projects');

        if (!cancelled) {
          setProjects(response.projects ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los proyectos.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || saving) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await post<ProjectResponse>('/projects', {
        name: name.trim(),
        description: description.trim(),
        technologies: technologies.trim(),
      });

      setProjects((current) => [response.project, ...current]);

      setName('');
      setDescription('');
      setTechnologies('');
      setShowForm(false);

      setSuccess('Proyecto guardado correctamente en la base de datos.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el proyecto.',
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditingConnection(project: Project) {
    setEditingProjectId(project.id);
    setRepositoryUrl(project.repository_url ?? '');
    setDeploymentUrl(project.deployment_url ?? '');
    setError('');
    setSuccess('');
  }

  async function saveConnection(project: Project) {
    if (savingConnection) return;

    if (
      !isValidOptionalUrl(repositoryUrl) ||
      !isValidOptionalUrl(deploymentUrl)
    ) {
      setError(
        'Introduce URL válidas que comiencen con http:// o https://.',
      );
      return;
    }

    setSavingConnection(true);
    setError('');
    setSuccess('');

    try {
      await postConnection(project.id, {
        repository_url: repositoryUrl.trim(),
        deployment_url: deploymentUrl.trim(),
      });

      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? {
                ...item,
                repository_url: repositoryUrl.trim() || null,
                deployment_url: deploymentUrl.trim() || null,
              }
            : item,
        ),
      );

      setEditingProjectId(null);
      setSuccess(`Enlaces de ${project.name} guardados correctamente.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron guardar los enlaces.',
      );
    } finally {
      setSavingConnection(false);
    }
  }

  async function postConnection(
    projectId: string,
    body: {
      repository_url: string;
      deployment_url: string;
    },
  ): Promise<ConnectionResponse> {
    let response: Response;

    try {
      response = await fetch(
        `/api/projects/${encodeURIComponent(projectId)}/connection`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
    } catch {
      throw new Error(
        'No se pudo conectar con el servidor. Comprueba que el backend esté funcionando.',
      );
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        typeof payload.error === 'string'
          ? payload.error
          : 'No se pudieron guardar los enlaces.';

      throw new Error(message);
    }

    return payload as ConnectionResponse;
  }

  function handleFileSelection(
    projectId: string,
    file: File | undefined,
  ) {
    setError('');
    setSuccess('');

    if (!file) {
      setSelectedFiles((current) => ({
        ...current,
        [projectId]: null,
      }));
      return;
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Selecciona un archivo con extensión .zip.');
      setSelectedFiles((current) => ({
        ...current,
        [projectId]: null,
      }));

      const input = fileInputRefs.current[projectId];
      if (input) input.value = '';

      return;
    }

    if (file.size > MAX_ZIP_SIZE) {
      setError('El archivo supera el límite de 50 MB.');
      setSelectedFiles((current) => ({
        ...current,
        [projectId]: null,
      }));

      const input = fileInputRefs.current[projectId];
      if (input) input.value = '';

      return;
    }

    setSelectedFiles((current) => ({
      ...current,
      [projectId]: file,
    }));
  }

  async function uploadProjectZip(project: Project) {
    const file = selectedFiles[project.id];

    if (!file) {
      setError('Selecciona primero un archivo ZIP.');
      return;
    }

    if (uploadingProjectId !== null) return;

    setUploadingProjectId(project.id);
    setError('');
    setSuccess('');

    try {
      const response = await uploadFile<UploadResponse>(
        `/projects/${encodeURIComponent(project.id)}/zip`,
        file,
      );

      setProjects((current) =>
        current.map((item) =>
          item.id === project.id
            ? {
                ...item,
                zip_file_name: response.fileName,
              }
            : item,
        ),
      );

      setSelectedFiles((current) => ({
        ...current,
        [project.id]: null,
      }));

      const input = fileInputRefs.current[project.id];
      if (input) input.value = '';

      setSuccess(
        `${response.message || 'Archivo subido correctamente.'} (${response.fileName})`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo subir el archivo ZIP.',
      );
    } finally {
      setUploadingProjectId(null);
    }
  }

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        `${project.name} ${project.description} ${project.technologies}`
          .toLowerCase()
          .includes(search.toLowerCase().trim()),
      ),
    [projects, search],
  );

  const pendingCount = projects.filter(
    (project) => project.status === 'Pendiente de análisis',
  ).length;

  return (
    <main className="min-h-screen bg-background p-4 text-textMain md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-primary dark:text-blue-400">
              INTELIGENCIA CLOUD
            </p>

            <h1 className="text-2xl font-bold md:text-3xl">
              Proyectos e IA
            </h1>

            <p className="mt-2 text-sm text-textSecondary">
              Registra proyectos, conecta repositorios y prepara archivos para
              su análisis en la nube.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setError('');
              setSuccess('');
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Nuevo proyecto
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            {success}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<FolderOpen size={22} />}
            label="Proyectos registrados"
            value={projects.length}
            iconClass="bg-blue-50 text-primary dark:bg-blue-500/10 dark:text-blue-400"
          />

          <MetricCard
            icon={<BrainCircuit size={22} />}
            label="Análisis realizados"
            value={0}
            iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/10"
          />

          <MetricCard
            icon={<ShieldCheck size={22} />}
            label="Proyectos analizados"
            value={0}
            iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
          />

          <MetricCard
            icon={<Cloud size={22} />}
            label="Pendientes de análisis"
            value={pendingCount}
            iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10"
          />
        </section>

        {showForm && (
          <section className="rounded-2xl border border-cardBorder bg-white p-6 shadow-sm dark:bg-slate-900">
            <h2 className="mb-5 text-lg font-semibold">
              Registrar proyecto
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-2 block text-sm font-medium"
                >
                  Nombre del proyecto
                </label>

                <input
                  id="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ej. SalesIA Enterprise"
                  required
                  maxLength={120}
                  className="w-full rounded-xl border border-cardBorder bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="mb-2 block text-sm font-medium"
                >
                  Descripción
                </label>

                <textarea
                  id="project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe brevemente el objetivo del proyecto"
                  rows={3}
                  maxLength={2000}
                  className="w-full rounded-xl border border-cardBorder bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="project-technologies"
                  className="mb-2 block text-sm font-medium"
                >
                  Tecnologías utilizadas
                </label>

                <input
                  id="project-technologies"
                  value={technologies}
                  onChange={(event) => setTechnologies(event.target.value)}
                  placeholder="Ej. React, TypeScript, Python, PostgreSQL"
                  maxLength={500}
                  className="w-full rounded-xl border border-cardBorder bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                  className="rounded-xl border border-cardBorder px-5 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle size={16} className="animate-spin" />
                  )}
                  {saving ? 'Guardando...' : 'Guardar proyecto'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-cardBorder bg-white shadow-sm dark:bg-slate-900">
          <div className="flex flex-col justify-between gap-4 border-b border-cardBorder p-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Mis proyectos</h2>
              <p className="mt-1 text-sm text-textSecondary">
                Administra los repositorios, los despliegues y los archivos ZIP.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar proyecto..."
                aria-label="Buscar proyecto"
                className="w-full rounded-xl border border-cardBorder bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center px-6 py-12 text-sm text-textSecondary">
              Cargando proyectos...
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-primary dark:bg-blue-500/10 dark:text-blue-400">
                <Boxes size={30} />
              </div>

              <h3 className="text-lg font-semibold">
                {search
                  ? 'No se encontraron proyectos'
                  : 'Todavía no hay proyectos'}
              </h3>

              <p className="mt-2 max-w-md text-sm text-textSecondary">
                {search
                  ? 'Prueba con otro nombre o tecnología.'
                  : 'Registra tu primer proyecto para comenzar a preparar su análisis cloud.'}
              </p>

              {!search && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary dark:text-blue-400"
                >
                  Registrar primer proyecto
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-cardBorder">
              {filteredProjects.map((project) => (
                <article key={project.id} className="space-y-5 p-5">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">
                        {project.name}
                      </h3>

                      <p className="mt-1 text-sm text-textSecondary">
                        {project.description || 'Sin descripción'}
                      </p>

                      {project.technologies && (
                        <p className="mt-2 break-words text-xs text-textSecondary">
                          Tecnologías: {project.technologies}
                        </p>
                      )}
                    </div>

                    <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      {project.status}
                    </span>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-cardBorder bg-background p-4 md:grid-cols-2">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <GitBranch
                        size={17}
                        className="shrink-0 text-textSecondary"
                      />

                      {project.repository_url ? (
                        <a
                          href={project.repository_url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-primary underline dark:text-blue-400"
                        >
                          Repositorio GitHub
                        </a>
                      ) : (
                        <span className="text-textSecondary">
                          GitHub no conectado
                        </span>
                      )}
                    </div>

                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <ExternalLink
                        size={17}
                        className="shrink-0 text-textSecondary"
                      />

                      {project.deployment_url ? (
                        <a
                          href={project.deployment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate text-primary underline dark:text-blue-400"
                        >
                          Abrir despliegue
                        </a>
                      ) : (
                        <span className="text-textSecondary">
                          Sin despliegue conectado
                        </span>
                      )}
                    </div>
                  </div>

                  {editingProjectId === project.id ? (
                    <div className="space-y-3 rounded-xl border border-cardBorder p-4">
                      <div>
                        <label
                          htmlFor={`github-${project.id}`}
                          className="mb-1.5 block text-sm font-medium"
                        >
                          URL del repositorio de GitHub
                        </label>

                        <input
                          id={`github-${project.id}`}
                          type="url"
                          value={repositoryUrl}
                          onChange={(event) =>
                            setRepositoryUrl(event.target.value)
                          }
                          placeholder="https://github.com/usuario/proyecto"
                          className="w-full rounded-xl border border-cardBorder bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`deployment-${project.id}`}
                          className="mb-1.5 block text-sm font-medium"
                        >
                          URL del despliegue
                        </label>

                        <input
                          id={`deployment-${project.id}`}
                          type="url"
                          value={deploymentUrl}
                          onChange={(event) =>
                            setDeploymentUrl(event.target.value)
                          }
                          placeholder="https://mi-proyecto.vercel.app"
                          className="w-full rounded-xl border border-cardBorder bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                        />
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProjectId(null)}
                          disabled={savingConnection}
                          className="rounded-xl border border-cardBorder px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          onClick={() => void saveConnection(project)}
                          disabled={savingConnection}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {savingConnection ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Save size={16} />
                          )}

                          {savingConnection
                            ? 'Guardando...'
                            : 'Guardar enlaces'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEditingConnection(project)}
                      className="text-sm font-semibold text-primary hover:underline dark:text-blue-400"
                    >
                      {project.repository_url || project.deployment_url
                        ? 'Editar enlaces'
                        : 'Conectar GitHub y despliegue'}
                    </button>
                  )}

                  <div className="rounded-xl border border-cardBorder p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <FileArchive
                            size={18}
                            className="text-primary"
                          />
                          Archivo ZIP del proyecto
                        </div>

                        <p className="mt-1 break-words text-xs text-textSecondary">
                          {project.zip_file_name
                            ? `Archivo guardado: ${project.zip_file_name}`
                            : 'Todavía no se ha subido ningún ZIP.'}
                        </p>

                        <p className="mt-1 text-xs text-textSecondary">
                          Solo ZIP · Máximo 50 MB · Almacenamiento privado en S3
                        </p>
                      </div>

                      <input
                        ref={(element) => {
                          fileInputRefs.current[project.id] = element;
                        }}
                        type="file"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        aria-label={`Seleccionar ZIP para ${project.name}`}
                        className="block w-full max-w-sm text-xs text-textSecondary file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-medium file:text-primary"
                        onChange={(event) =>
                          handleFileSelection(
                            project.id,
                            event.target.files?.[0],
                          )
                        }
                      />
                    </div>

                    {selectedFiles[project.id] && (
                      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <p className="break-all text-xs text-textSecondary">
                          Seleccionado: {selectedFiles[project.id]?.name} (
                          {(
                            (selectedFiles[project.id]?.size ?? 0) /
                            (1024 * 1024)
                          ).toFixed(2)}{' '}
                          MB)
                        </p>

                        <button
                          type="button"
                          onClick={() => void uploadProjectZip(project)}
                          disabled={uploadingProjectId !== null}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {uploadingProjectId === project.id ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Upload size={16} />
                          )}

                          {uploadingProjectId === project.id
                            ? 'Subiendo...'
                            : 'Subir ZIP a S3'}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-textSecondary">
          Los enlaces y los archivos se gestionan mediante el backend. Los
          análisis automáticos de arquitectura, seguridad y costos se
          integrarán en una siguiente etapa.
        </p>
      </div>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconClass: string;
}) {
  return (
    <article className="rounded-2xl border border-cardBorder bg-white p-5 shadow-sm dark:bg-slate-900">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
      >
        {icon}
      </div>

      <p className="text-sm text-textSecondary">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </article>
  );
}
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { get } from '../api/client';

export function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [registrationInfo, setRegistrationInfo] = useState<{ codeRequired: boolean; open: boolean } | null>(null);
  const [registrationCode, setRegistrationCode] = useState('');
  const submittingRef = useRef(false);
  useEffect(() => {
    if (!isRegistering) return;
    const controller = new AbortController();
    void get<{ codeRequired: boolean; open: boolean }>('auth/registration-info', { signal: controller.signal }).then((info) => {
      if (controller.signal.aborted) return;
      if (typeof info?.codeRequired !== 'boolean' || typeof info?.open !== 'boolean') throw new Error('No se pudo consultar el estado del registro.');
      setRegistrationInfo(info);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'No se pudo consultar el estado del registro.');
    });
    return () => { controller.abort(); };
  }, [isRegistering]);
  const toggleMode = () => {
    setIsRegistering((current) => !current);
    setPassword('');
    setConfirmation('');
    setRegistrationCode('');
    setRegistrationInfo(null);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (isRegistering && !registrationInfo?.open) { setError('El registro está cerrado'); return; }
    if (isRegistering && (password.length < 8 || password !== confirmation)) {
      setError(password.length < 8 ? 'La contraseña debe tener al menos 8 caracteres.' : 'Las contraseñas no coinciden.');
      return;
    }

    setError(null);
    setSubmitting(true);
    submittingRef.current = true;
    try {
      const { error: authError } = await (isRegistering ? register(email, password, registrationInfo?.codeRequired ? registrationCode : undefined) : login(email, password));
      if (authError) {
        setError(authError);
        if (isRegistering && authError === 'El registro está cerrado' && registrationInfo) setRegistrationInfo({ ...registrationInfo, open: false });
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo completar la solicitud.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Columna izquierda: branding profesional SaaS (oculta en mobile) */}
      <aside className="hidden md:flex md:w-1/2 relative overflow-hidden flex-col justify-between p-10 lg:p-14 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
        {/* Degradado radial sutil */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 25% 70%, rgba(37,99,235,0.28) 0%, transparent 60%), radial-gradient(ellipse 50% 45% at 85% 15%, rgba(14,165,233,0.16) 0%, transparent 55%)',
          }}
        />
        {/* Líneas diagonales geométricas (grid tecnológico) */}
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="login-diagonal-grid"
              width="56"
              height="56"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-45)"
            >
              <path d="M0 0H56" fill="none" stroke="#93c5fd" strokeWidth="1" />
              <path d="M0 0V56" fill="none" stroke="#93c5fd" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#login-diagonal-grid)" />
        </svg>
        {/* Acento geométrico discreto */}
        <svg
          aria-hidden="true"
          className="absolute -right-20 -bottom-24 w-80 h-80 text-blue-500/15"
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="1" />
          <circle cx="100" cy="100" r="55" stroke="currentColor" strokeWidth="1" />
        </svg>

        {/* Superior izquierda: logo + marca */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img
              src="/cloudlogo.png"
              alt="CloudOps logo"
              className="w-11 h-11 object-contain drop-shadow-md"
            />
            <span className="text-lg font-semibold text-white tracking-tight">
              CloudOps Dashboard
            </span>
          </div>
        </div>

        {/* Centro-izquierda: título grande + descripción formal */}
        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-lg py-10">
          <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight">
            Gestión y Monitoreo Cloud
          </h2>
          <p className="mt-5 text-base lg:text-lg text-slate-300 leading-relaxed">
            Plataforma integral para la gestión, control de costos, infraestructura
            y seguridad en la nube de AWS en tiempo real.
          </p>
        </div>

        {/* Inferior izquierda: copyright profesional */}
        <p className="relative z-10 text-xs text-slate-400">
          © 2026 CloudOps. Todos los derechos reservados.
        </p>
      </aside>

      {/* Columna derecha: formulario (full width en mobile) */}
      <main className="w-full md:w-1/2 bg-white dark:bg-slate-950 flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Logo + título solo en mobile */}
          <div className="md:hidden text-center mb-8">
            <img
              src="/cloudlogo.png"
              alt="CloudOps logo"
              className="w-14 h-14 mx-auto object-contain mb-3"
            />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              CloudOps Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gestión Cloud AWS
            </p>
          </div>

          <div className="mb-8 hidden md:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Acceso seguro
            </p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {isRegistering ? 'Crear cuenta' : 'Inicia sesión'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isRegistering ? 'Introduce tus datos para crear una cuenta' : 'Introduce tus credenciales para continuar'}
            </p>
          </div>

          {isRegistering && !registrationInfo && <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 sm:p-8"><p role={error ? 'alert' : 'status'} className="text-sm text-slate-500 dark:text-slate-400">{error || 'Consultando disponibilidad del registro...'}</p></div>}
          {isRegistering && registrationInfo?.open === false && <div role="status" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 sm:p-8"><p className="text-sm text-slate-500 dark:text-slate-400">El registro está cerrado</p></div>}
          {(!isRegistering || registrationInfo?.open) && <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="password"
                  type="password"
                   autoComplete={isRegistering ? 'new-password' : 'current-password'}
                   minLength={isRegistering ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {isRegistering && <div><label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Confirmar contraseña</label><div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="••••••••" required className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors" /></div><p className="text-xs text-slate-500 dark:text-slate-400 mt-2">La contraseña debe tener al menos 8 caracteres.</p></div>}
            {isRegistering && registrationInfo?.codeRequired && <div><label htmlFor="registration-code" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">Código de invitación</label><div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input id="registration-code" type="password" autoComplete="off" value={registrationCode} onChange={(event) => setRegistrationCode(event.target.value)} required className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors" /></div></div>}

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg px-3 py-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <Cloud size={16} />
               {submitting ? 'Verificando...' : isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>}
          <button type="button" disabled={submitting} onClick={toggleMode} className="w-full mt-5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-60">{isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}</button>
        </div>
      </main>
    </div>
  );
}

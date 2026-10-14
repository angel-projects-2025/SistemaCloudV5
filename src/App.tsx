import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { LoaderCircle, ClipboardList } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider, useSidebar } from './context/SidebarContext';
import { PlanningProvider, usePlanning } from './context/PlanningContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Planning } from './pages/Planning';
import { Costs } from './pages/Costs';
import { Infrastructure } from './pages/Infrastructure';
import { Security } from './pages/Security';
import { Network } from './pages/Network';
import { Services } from './pages/Services';
import { ProjectsAI } from './pages/ProjectsAI';

function LoadingState() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center text-textSecondary">
      <div role="status" className="flex items-center gap-3">
        <LoaderCircle size={24} className="animate-spin text-primary dark:text-blue-400" />
        <span className="text-sm">Cargando...</span>
      </div>
    </main>
  );
}

function AppLayout({ onRetry }: { onRetry: () => void }) {
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { isAuthenticated, isLoading } = useAuth();
  const { isLoading: planningLoading, loadError } = usePlanning();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoading) return <LoadingState />;

  if (isAuthenticated && isLoginPage) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoginPage || !isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (planningLoading) return <LoadingState />;

  if (loadError) {
    return (
      <>
        <Header title="Planificación Cloud" />
        <main className="p-4 md:p-8 bg-background min-h-screen">
          <section
            role="alert"
            className="bg-white dark:bg-slate-900 border border-cardBorder rounded-xl p-8 md:p-12 shadow-sm flex flex-col items-center justify-center text-center min-h-[320px]"
          >
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 mb-5">
              <ClipboardList size={32} className="text-primary dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-textMain">
              No se pudo cargar el historial
            </h3>
            <p className="text-sm text-textSecondary mt-2 max-w-md">{loadError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Reintentar
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-background dark:bg-slate-950">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-black/50 md:hidden print:hidden"
        />
      )}

      <Sidebar />

      <div className="min-w-0 flex-1 w-full md:ml-64">
        <Routes>
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/costs" element={<Costs />} />
          <Route path="/infrastructure" element={<Infrastructure />} />
          <Route path="/security" element={<Security />} />
          <Route path="/network" element={<Network />} />
          <Route path="/services" element={<Services />} />
          <Route path="/projects-ai" element={<ProjectsAI />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [planningAttempt, setPlanningAttempt] = useState(0);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <SidebarProvider>
            <PlanningProvider key={planningAttempt}>
              <AppLayout onRetry={() => setPlanningAttempt((attempt) => attempt + 1)} />
            </PlanningProvider>
          </SidebarProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
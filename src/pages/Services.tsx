import { useState, useEffect, useMemo } from 'react';
import { Header } from '../components/Header';
import { awsServices, type AWSService } from '../data/awsServices';
import {
  Search, Filter, X, CheckCircle, AlertCircle, Server,
  HardDrive, Database, Shield, Network, Globe, Zap,
  Code, Table, Eye, KeyRound, RefreshCw
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Server, HardDrive, Database, Shield, Network, Globe, Zap,
  Code, Table, Eye, KeyRound,
};

const categories = ['Todos', 'Cómputo', 'Almacenamiento', 'Base de datos', 'Seguridad', 'Redes', 'Monitoreo'];

const categoryColors: Record<string, { bar: string; bg: string }> = {
  'Cómputo': { bar: 'bg-primary', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  'Almacenamiento': { bar: 'bg-statusGreen', bg: 'bg-green-50 dark:bg-green-500/10' },
  'Base de datos': { bar: 'bg-statusAmber', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  'Seguridad': { bar: 'bg-statusRed', bg: 'bg-red-50 dark:bg-red-500/10' },
  'Redes': { bar: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  'Monitoreo': { bar: 'bg-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
};

const regionResources: Record<string, Record<string, string>> = {
  'us-east-1': { 'EC2': '5 instancias t3.medium', 'S3': '3 buckets / 1.2 TB', 'RDS': '2 instancias db.t3', 'Lambda': '12 funciones activas', 'DynamoDB': '4 tablas / 12K RCU', 'CloudWatch': '28 alarmas configuradas', 'KMS': '6 claves activas' },
  'us-west-2': { 'EC2': '3 instancias t3.large', 'S3': '2 buckets / 0.8 TB', 'RDS': '1 instancia db.t3', 'Lambda': '8 funciones activas', 'DynamoDB': '2 tablas / 8K RCU', 'CloudWatch': '18 alarmas configuradas', 'KMS': '4 claves activas' },
  'eu-central-1': { 'EC2': '4 instancias m5.large', 'S3': '4 buckets / 1.8 TB', 'RDS': '2 instancias db.r5', 'Lambda': '15 funciones activas', 'DynamoDB': '6 tablas / 20K RCU', 'CloudWatch': '35 alarmas configuradas', 'KMS': '8 claves activas' },
};

const serviceDetails: Record<string, { funcion: string; descripcion: string }> = {
  ec2: { funcion: 'Provisionar servidores virtuales (instancias) bajo demanda con control total del sistema operativo y capacidad de escalamiento horizontal.', descripcion: 'Amazon EC2 proporciona capacidad de cómputo escalable en la nube. Permite lanzar instancias virtuales en diferentes tipos optimizados para cómputo, memoria, almacenamiento o GPU. Soporta Auto Scaling, Balanceo de Carga Elástico y configuración de seguridad granular mediante Security Groups.' },
  s3: { funcion: 'Almacenar y recuperar cualquier cantidad de datos desde cualquier lugar con 11 9s de durabilidad.', descripcion: 'Amazon S3 es un servicio de almacenamiento de objetos que ofrece escalabilidad, disponibilidad y seguridad de clase empresarial. Soporta versionado, lifecycle, replicacion cross-region, encriptacion SSE-S3/SSE-KMS y politicas de acceso a nivel de bucket y objeto.' },
  rds: { funcion: 'Ejecutar bases de datos relacionales en la nube con administración automática de tareas de mantenimiento.', descripcion: 'Amazon RDS administra las tareas tediosas de administración de bases de datos como backups, parches de software, detección de fallos y recuperación. Soporta MySQL, PostgreSQL, MariaDB, Oracle, SQL Server y Amazon Aurora con réplicas de lectura, Multi-AZ y encrypt at rest.' },
  iam: { funcion: 'Controlar de forma segura el acceso a recursos AWS para usuarios, grupos y roles.', descripcion: 'AWS IAM permite gestionar el acceso a servicios y recursos de AWS de forma segura. Define políticas de permisos granulares, autenticación multifactor, credenciales de acceso programático, federación de identidades con SAML 2.0 y rotación automática de credenciales.' },
  vpc: { funcion: 'Aislar lógicamente la infraestructura AWS en una red virtual definida por el usuario.', descripcion: 'Amazon VPC permite crear una red virtual aislada en la nube AWS con subredes públicas y privadas, tablas de enrutamiento, gateways, endpoints VPC, VPN y peering. Controla el tráfico entrante y saliente usando Network ACLs y Security Groups.' },
  route53: { funcion: ' Registrar dominios y dirigir el tráfico de internet a recursos de la nube con DNS altamente disponible.', descripcion: 'Amazon Route 53 es un servicio DNS altamente disponible y escalable. Ofrece routing geográfico, latencia, failover, weighted y multivalue answer. Incluye health checks, registro de dominios y migración de DNS con Migración Automática de DNS.' },
  cloudfront: { funcion: 'Entregar contenido estático y dinámico con baja latencia a usuarios a nivel mundial mediante edge locations.', descripcion: 'Amazon CloudFront es una red de entrega de contenido (CDN) global con más de 400 puntos de presencia. Soporta Streaming, compresión automática, Lambda@Edge, Origin Groups para failover, cookies/headers personalizados y certificados SSL personalizados.' },
  lambda: { funcion: 'Ejecutar código sin provisionar ni administrar servidores, pagando solo por el tiempo de ejecución.', descripcion: 'AWS Lambda ejecuta código en respuesta a eventos sin requerir infraestructura. Soporta Node.js, Python, Java, C#, Go, Ruby y PowerShell. Integra con API Gateway, S3, DynamoDB, SQS, SNS y más. Escala automáticamente desde cero hasta miles de solicitudes por segundo.' },
  dynamodb: { funcion: 'Almacenar y recuperar datos a cualquier escala con tiempos de respuesta de un dígito en milisegundos.', descripcion: 'Amazon DynamoDB es una base de datos NoSQL completamente administrada que ofrece rendimiento de un dígito en milisegundos a cualquier escala. Soporta tablas con clave primaria compuesta, índices secundarios globales (GSI), DynamoDB Streams, punto en el tiempo recovery y on-demand capacity.' },
  cloudwatch: { funcion: 'Monitorear recursos y aplicaciones AWS en tiempo real con métricas, logs y trazas distribuidas.', descripcion: 'Amazon CloudWatch recopila métricas, logs y trazas de más de 70 servicios AWS. Permite crear alarmas, dashboards personalizados, anomalías detectadas por ML, Synthetics canaries y Service Lens para observabilidad completa de aplicaciones distribuidas.' },
  kms: { funcion: 'Crear y gestionar claves criptográficas para cifrar datos en reposo y en tránsito.', descripcion: 'AWS KMS permite crear, rotar y gestionar claves de cifrado simétricas y asimétricas. Se integra con más de 50 servicios AWS y aplicaciones. Soporta cifrado de datos en reposo, firmado de código, generación de tokens HMAC y exportación de claves para uso externo.' },
};

export function Services() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [serviceStates, setServiceStates] = useState<Record<string, 'active' | 'inactive'>>(() => {
    const saved = localStorage.getItem('awsServiceStates');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    const initial: Record<string, 'active' | 'inactive'> = {};
    awsServices.forEach((s) => { initial[s.id] = s.status; });
    return initial;
  });
  const [modalService, setModalService] = useState<AWSService | null>(null);
  const [selectedRegion] = useState('us-east-1');

  useEffect(() => {
    localStorage.setItem('awsServiceStates', JSON.stringify(serviceStates));
  }, [serviceStates]);

  const filteredServices = useMemo(() =>
    awsServices.filter((service) => {
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }),
    [searchTerm, selectedCategory]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    awsServices.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, []);

  const activeCount = useMemo(() =>
    Object.values(serviceStates).filter((s) => s === 'active').length,
    [serviceStates]
  );

  const allActive = activeCount === awsServices.length;

  const toggleStatus = (id: string) => {
    setServiceStates((prev) => ({
      ...prev,
      [id]: prev[id] === 'active' ? 'inactive' : 'active',
    }));
  };

  return (
    <>
      <Header title="Catálogo de Servicios AWS" />

      <main className="p-4 md:p-8 bg-background dark:bg-slate-950 min-h-screen">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-textSecondary" />
            <input
              type="text"
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-cardBorder rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white text-textMain dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={20} className="text-textSecondary" />
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-white text-textMain border border-cardBorder hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const Icon = iconMap[service.icon] || Server;
            const isActive = serviceStates[service.id] === 'active';
            const catColor = categoryColors[service.category] || { bar: 'bg-gray-400', bg: 'bg-gray-50 dark:bg-slate-800' };
            return (
              <div
                key={service.id}
                onClick={() => setModalService(service)}
                className={`relative group bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20 dark:from-slate-900 dark:via-slate-800/50 dark:to-blue-500/10 border border-cardBorder dark:border-slate-700 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:border-primary/40 overflow-hidden`}
              >
                <div className="absolute bottom-3 right-3 opacity-[0.08] group-hover:opacity-[0.15] transition-opacity duration-300">
                  <Icon size={72} className="text-primary dark:text-blue-400" />
                </div>

                <div className="relative flex items-start justify-between mb-4">
                  <div className={`p-4 rounded-xl border ${catColor.bg} border-transparent`}>
                    <Icon size={24} className="text-primary dark:text-blue-400" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    isActive
                      ? 'bg-green-100 text-statusGreen border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30'
                      : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}>
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-textMain dark:text-slate-100 mb-2 relative">{service.name}</h3>
                <p className="text-sm text-textSecondary mb-3 leading-relaxed relative">{service.description}</p>
                <p className={`text-xs font-medium inline-block px-2 py-1 rounded relative ${catColor.bg}`}>
                  {service.category}
                </p>
              </div>
            );
          })}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-textSecondary">No se encontraron servicios que coincidan con la búsqueda</p>
          </div>
        )}

        <div className="mt-8 bg-white dark:bg-slate-900 border border-cardBorder dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-textMain dark:text-slate-100">Resumen de Servicios</h3>
            <div className="flex items-center gap-2 text-xs text-textSecondary">
              <RefreshCw size={14} />
              <span>Última verificación AWS: Hace 2 min</span>
            </div>
          </div>

          <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${
            allActive
              ? 'bg-green-50 border border-green-200 dark:bg-green-500/10 dark:border-green-500/30'
              : 'bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'
          }`}>
            {allActive ? (
              <CheckCircle size={22} className="text-statusGreen dark:text-green-400 shrink-0" />
            ) : (
              <AlertCircle size={22} className="text-statusAmber dark:text-amber-400 shrink-0" />
            )}
            <span className={`text-sm font-medium ${allActive ? 'text-statusGreen dark:text-green-400' : 'text-statusAmber dark:text-amber-400'}`}>
              {allActive ? '100% Operativo — Sin incidencias reportadas en la región' : `${activeCount}/${awsServices.length} servicios activos — Algunos servicios están desactivados`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.filter((c) => c !== 'Todos').map((cat) => {
              const count = categoryCounts[cat] || 0;
              const percent = Math.round((count / awsServices.length) * 100);
              const colors = categoryColors[cat] || { bar: 'bg-gray-400', bg: 'bg-gray-50 dark:bg-slate-800' };
              return (
                <div key={cat} className={`p-4 rounded-xl ${colors.bg} border border-cardBorder dark:border-slate-700`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-textMain dark:text-slate-200">{cat}</span>
                    <span className="text-xs font-bold text-textSecondary">{count} servicios</span>
                  </div>
                  <div className="w-full h-2 bg-white/80 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-textSecondary mt-1">{percent}% del catálogo</p>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
              <p className="text-sm text-textSecondary mb-1">Total Servicios</p>
              <p className="text-2xl font-bold text-primary dark:text-blue-400">{awsServices.length}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-500/10 rounded-xl">
              <p className="text-sm text-textSecondary mb-1">Activos</p>
              <p className="text-2xl font-bold text-statusGreen dark:text-green-400">{activeCount}</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
              <p className="text-sm text-textSecondary mb-1">Categorías</p>
              <p className="text-2xl font-bold text-statusAmber dark:text-amber-400">{categories.length - 1}</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
              <p className="text-sm text-textSecondary mb-1">Filtrados</p>
              <p className="text-2xl font-bold text-primary dark:text-blue-400">{filteredServices.length}</p>
            </div>
          </div>
        </div>
      </main>

      {modalService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col border dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-cardBorder dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                {(() => { const I = iconMap[modalService.icon] || Server; return <I size={24} className="text-primary dark:text-blue-400" />; })()}
                <div>
                  <h3 className="text-lg font-semibold text-textMain dark:text-slate-100">{modalService.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[modalService.category]?.bg ?? 'bg-gray-50 dark:bg-slate-800'} text-textSecondary`}>
                      {modalService.category}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      serviceStates[modalService.id] === 'active'
                        ? 'bg-green-100 text-statusGreen border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30'
                        : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                    }`}>
                      {serviceStates[modalService.id] === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setModalService(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <X size={20} className="text-textSecondary" />
              </button>
            </div>

            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
              <div>
                <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Función Principal</p>
                <p className="text-sm text-textMain dark:text-slate-200 leading-relaxed">{serviceDetails[modalService.id]?.funcion ?? modalService.description}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Descripción Detallada</p>
                <p className="text-sm text-textSecondary leading-relaxed">{serviceDetails[modalService.id]?.descripcion ?? 'Descripción no disponible.'}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Métricas de Uso en Región ({selectedRegion})</p>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 border border-cardBorder dark:border-slate-700">
                  <p className="text-sm text-textMain dark:text-slate-200 font-medium">
                    {regionResources[selectedRegion]?.[modalService.name.split(' ').pop() ?? ''] ?? `${modalService.name} desplegado en ${selectedRegion}`}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-3">Cambiar Estado</p>
                <button
                  onClick={() => toggleStatus(modalService.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${
                    serviceStates[modalService.id] === 'active'
                      ? 'border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-500/10'
                      : 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-6 rounded-full relative transition-colors duration-200 ${
                      serviceStates[modalService.id] === 'active' ? 'bg-statusGreen' : 'bg-gray-300 dark:bg-slate-600'
                    }`}>
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        serviceStates[modalService.id] === 'active' ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`} />
                    </div>
                    <span className="text-sm font-medium text-textMain dark:text-slate-200">
                      {serviceStates[modalService.id] === 'active' ? 'Servicio Activo' : 'Servicio Inactivo'}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-cardBorder dark:border-slate-700 shrink-0">
              <button
                onClick={() => setModalService(null)}
                className="w-full px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

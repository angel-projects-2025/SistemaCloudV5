# CloudOps Dashboard

Una aplicación web de página única (SPA) para gestión y monitoreo de infraestructura en la nube AWS, desarrollada con React, TypeScript y Tailwind CSS.

## Instalación y Ejecución

### Requisitos Previos
- Node.js (v18 o superior)
- npm o yarn

### Pasos de Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Ejecutar en modo desarrollo:**
```bash
npm run dev
```

3. **Construir para producción:**
```bash
npm run build
```

4. **Previsualizar build de producción:**
```bash
npm run preview
```

## Estructura del Proyecto

```
SistemaCloud/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── Sidebar.tsx     # Menú lateral de navegación
│   │   ├── Header.tsx      # Encabezado con título y estado
│   │   ├── StatCard.tsx    # Tarjeta de estadísticas
│   │   ├── ServiceCard.tsx # Tarjeta de servicios AWS
│   │   ├── CostCard.tsx    # Tarjeta de costos
│   │   ├── SecurityCard.tsx# Tarjeta de seguridad
│   │   ├── RegionCard.tsx  # Tarjeta de regiones
│   │   └── StatusBadge.tsx # Badge de estado
│   ├── pages/              # Páginas de la aplicación
│   │   ├── Dashboard.tsx   # Dashboard principal
│   │   ├── Planning.tsx    # Planificación Cloud
│   │   ├── Costs.tsx       # Costos y economía
│   │   ├── Infrastructure.tsx # Infraestructura global
│   │   ├── Security.tsx    # Seguridad e IAM
│   │   ├── Network.tsx     # Arquitectura de red
│   │   └── Services.tsx    # Catálogo de servicios
│   ├── data/               # Datos simulados
│   │   ├── awsServices.ts  # Catálogo de servicios AWS
│   │   ├── costsData.ts    # Datos de costos
│   │   └── infrastructureData.ts # Datos de infraestructura
│   ├── lib/                # Utilidades
│   │   └── utils.ts        # Funciones helper (cn)
│   ├── App.tsx             # Componente principal con rutas
│   ├── index.css           # Estilos globales
│   └── main.tsx            # Punto de entrada
├── public/                 # Archivos estáticos
├── index.html              # HTML principal
├── tailwind.config.js      # Configuración de Tailwind CSS
├── postcss.config.js       # Configuración de PostCSS
├── tsconfig.json           # Configuración de TypeScript
├── vite.config.ts          # Configuración de Vite
└── package.json            # Dependencias del proyecto
```

## Descripción de Componentes

### Componentes Reutilizables (`src/components/`)

- **Sidebar.tsx**: Menú lateral fijo posicionado a la izquierda con navegación a los 7 módulos del sistema. Utiliza iconos de Lucide React y fondo azul oscuro (#0F172A).

- **Header.tsx**: Encabezado ubicado en la parte superior derecha de la barra lateral. Muestra el título del sistema, selector de región y estado del sistema.

- **StatCard.tsx**: Tarjeta para mostrar estadísticas clave con icono, título, valor y tendencia opcional.

- **ServiceCard.tsx**: Tarjeta para mostrar información de servicios AWS con estado, categoría y descripción.

- **CostCard.tsx**: Tarjeta especializada para mostrar desglose de costos por servicio con totales mensuales y anuales.

- **SecurityCard.tsx**: Tarjeta para métricas de seguridad con indicadores de estado (aprobado, revisión, alerta).

- **RegionCard.tsx**: Tarjeta para mostrar información de regiones AWS con ubicación, servicios, latencia y estado operacional.

- **StatusBadge.tsx**: Componente badge para mostrar estados con colores semánticos (verde, ámbar, rojo).

## Módulos y Funcionalidades

### 1. Dashboard (`/dashboard`)
- **StatCards**: Muestra 5 métricas clave:
  - Servicios Activos (7)
  - Región Seleccionada (us-east-1)
  - Costo Mensual Estimado ($1,240)
  - Costo Anual Estimado ($14,880)
  - Salud de Seguridad (94%)
- **BarChart**: Gráfico de barras con Recharts mostrando desglose de costo mensual por servicio
- **Widget de Seguridad**: Estado de componentes de seguridad (Firewall, IAM Roles, Certificados SSL)
- **Resumen de Arquitectura**: Vista general de componentes de cómputo, almacenamiento y red activos

### 2. Planificación Cloud (`/planning`)
- **Formulario Interactivo**: Permite crear propuestas de migración con:
  - Nombre de la solución
  - Tipo de aplicación (Web, Móvil, API, Procesamiento de Datos)
  - Descripción detallada
  - Selección de región AWS
  - Usuarios estimados
  - Nivel de disponibilidad (99.9%, 99.99%, 99.999%)
  - Selección múltiple de servicios AWS
  - Objetivo de migración
- **LocalStorage**: Las propuestas se guardan en localStorage del navegador
- **Visualización Dinámica**: Muestra la propuesta generada en una tarjeta resumen después del envío

### 3. Costos y Economía Cloud (`/costs`)
- **Tabla Detallada**: Desglose de costos por servicio con:
  - Servicio, Cantidad, Horas estimadas, Tarifa por hora
  - Total mensual y anual
- **PieChart Interactivo**: Gráfico circular con Recharts mostrando distribución de costos (EC2, RDS, S3, CloudFront)
- **Resumen de Costos**: Tarjetas con totales mensuales, anuales y cantidad de servicios activos
- **CostCards**: Tarjetas individuales por servicio con desglose de costos

### 4. Infraestructura Global (`/infrastructure`)
- **RegionCards**: Cuadrícula de regiones AWS (us-east-1, eu-west-1, ap-southeast-1) mostrando:
  - Ubicación geográfica
  - Servicios desplegados en cada región
  - Latencia en milisegundos
  - Badges de estado operacional
- **Resumen de Infraestructura**: Métricas globales de regiones activas, servicios totales y latencia promedio
- **Métricas de Rendimiento**: Barras de progreso para disponibilidad, uso de recursos y capacidad de escalamiento

### 5. Seguridad e IAM (`/security`)
- **Tarjetas de IAM**: Métricas de Usuarios, Roles, Políticas y estado de MFA
- **Modelo de Responsabilidad Compartida**: Visualización interactiva del modelo AWS de responsabilidad compartida entre AWS y cliente
- **Estado de Cumplimiento**: Tarjetas de cumplimiento con normativas (ISO 27001, SOC 2, GDPR, HIPAA) con indicadores de estado
- **Resumen de IAM**: Vista detallada de métricas de identidad y acceso
- **Recomendaciones**: Sugerencias de seguridad basadas en el estado actual

### 6. Arquitectura de Red (`/network`)
- **Diagrama Visual 100% CSS**: Diagrama de arquitectura de red utilizando Flexbox/Grid de Tailwind con líneas animadas
- **Flujo de Arquitectura**: INTERNET → Route 53 → CloudFront CDN → VPC (Subredes públicas con EC2 y Subredes privadas con RDS)
- **Nodos Interactivos**: Cada componente del diagrama es clickeable para inspeccionar detalles
- **Panel de Detalles**: Muestra características específicas de cada nodo seleccionado
- **Flujo de Tráfico**: Resumen visual del flujo de tráfico a través de la arquitectura

### 7. Catálogo de Servicios AWS (`/services`)
- **ServiceCards**: Cuadrícula de servicios AWS (EC2, S3, RDS, IAM, VPC, Route 53, CloudFront) con:
  - Iconos de Lucide React
  - Descripción y categoría
  - Estado de actividad
- **Filtros por Categoría**: Filtros para Cómputo, Almacenamiento, Base de datos, Seguridad, Redes
- **Barra de Búsqueda**: Búsqueda en tiempo real por nombre o descripción de servicio
- **Resumen de Servicios**: Métricas de total de servicios, activos, categorías y filtrados

## Sistema de Diseño

### Colores (Tema Claro Exclusivo)
- **Fondo de página**: Gris muy claro (#F8FAFC)
- **Barra lateral**: Azul oscuro / Slate (#0F172A)
- **Color primario**: Azul real (#2563EB)
- **Tarjetas y contenedores**: Blanco puro (#FFFFFF) con bordes suaves (#E2E8F0)
- **Texto principal**: Slate oscuro (#1E293B)
- **Texto secundario**: Gris Slate (#64748B)
- **Indicadores de estado**: Verde (#16A34A), Ámbar (#F59E0B), Rojo (#DC2626)

### Características del Diseño
- Estética empresarial limpia y profesional
- Alto contraste para mejor legibilidad
- Sin modo oscuro (exclusivamente tema claro)
- Diseño responsive con Tailwind CSS
- Iconos de Lucide React para consistencia visual

## Tecnologías Utilizadas

- **React 18**: Biblioteca principal para la interfaz de usuario
- **TypeScript**: Tipado estático para mayor robustez
- **Vite**: Herramienta de build y desarrollo rápido
- **Tailwind CSS v4**: Framework de CSS utilitario con @tailwindcss/postcss
- **React Router DOM**: Enrutamiento cliente para SPA
- **Lucide React**: Biblioteca de iconos
- **Recharts**: Biblioteca de gráficos para visualización de datos
- **clsx + tailwind-merge**: Utilidades para manejo de clases CSS condicionales

## Datos Simulados

Los archivos en `src/data/` proporcionan datos realistas para poblar todas las vistas:

- **awsServices.ts**: Catálogo de 7 servicios AWS principales con categorías y descripciones
- **costsData.ts**: Datos detallados de costos por servicio con tarifas horarias y totales
- **infrastructureData.ts**: Información de regiones AWS, datos de seguridad IAM y estado de cumplimiento

## Notas Técnicas

- La aplicación utiliza un diseño de layout fijo con sidebar izquierdo de 256px (w-64)
- Todas las páginas utilizan el mismo patrón de layout con Header y contenido principal
- Los datos se persisten en localStorage para el módulo de planificación
- Los gráficos de Recharts son completamente interactivos y responsive
- El diagrama de red utiliza animaciones CSS para las líneas de conexión
- No se requiere configuración adicional de entorno para desarrollo local

## Build y Despliegue

El proyecto está configurado para build de producción con Vite. El comando `npm run build` genera archivos optimizados en la carpeta `dist/` listos para despliegue en cualquier servidor de archivos estáticos o plataformas como Vercel, Netlify, o AWS S3 + CloudFront.

# Jikan - Gestor de Horarios Circular 
https://jikan-self.vercel.app/

Alicación web moderna de gestión de horarios que visualiza tus actividades diarias en un formato de rueda interactiva. Planifica tu día de forma visual e intuitiva.

![Jikan Badge](https://img.shields.io/badge/Jikan-Schedule_Manager-blue?style=flat-square)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-7.3.0-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.18-06B6D4?style=flat-square&logo=tailwindcss)

## 📋 Descripción

**Jikan** (時間 - "tiempo" en japonés) es una aplicación de planificación diaria que transforma cómo visualizas tu horario. En lugar de listas lineales, Jikan presenta tus actividades en una rueda circular interactiva, permitiéndote:

- Visualizar el tiempo dedicado a cada actividad en un gráfico circular
- Gestionar horarios para cada día de la semana
- Establecer recordatorios para no olvidar actividades
- Ver estadísticas diarias detalladas
- Cambiar entre modo claro y oscuro
- Sincronización en la nube con Supabase

## Características Principales

- **Visualización Circular**: Rueda visual intuitiva que muestra todas tus actividades del día
- **Gestión de Actividades**: Crear, editar y eliminar actividades con duración personalizada
- **Vista Detallada**: Inspecciona los detalles de cada actividad en una vista ampliada
- **Copiar Horarios**: Duplica el horario de un día a otro con un solo clic
- **Reminders**: Sistema de recordatorios para tus actividades (en desarrollo)
- **Estadísticas**: Dashboard con estadísticas diarias y análisis
- **Responsive**: Funciona perfectamente en desktop, tablet y dispositivos móviles
- **Temas**: Alterna entre tema claro y oscuro según tus preferencias
- **Sincronización en Tiempo Real**: Datos sincronizados con Supabase

## Requisitos Previos

Si quieres tener o abrir el proyecto en local, asegúrate de tener instalado:

- **Node.js** (v16.0.0 o superior)
- **npm** o **yarn** (gestor de paquetes)
- Una cuenta en [Supabase](https://supabase.com)

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/jikan.git
cd jikan
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configuración de Supabase

Crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

Obtén estas credenciales desde tu dashboard de Supabase.

## Uso

### Modo Desarrollo

```bash
npm run dev
```

La aplicación se abrirá en `http://localhost:5173`

### Compilar para Producción

```bash
npm run build
```

### Vista Previa de Producción

```bash
npm run preview
```

## 📁 Estructura del Proyecto

```
src/
├── core/                    # Componentes principales de la aplicación
│   ├── LoginScreen.jsx     # Pantalla de autenticación
│   ├── activities/         # Gestión de actividades
│   │   ├── Card.jsx        # Tarjeta individual de actividad
│   │   └── DetailView.jsx  # Vista detallada de actividad
│   ├── common/             # Componentes compartidos
│   │   ├── Header.jsx      # Encabezado
│   │   ├── DaySelector.jsx # Selector de día
│   │   ├── CopyDayModal.jsx
│   │   └── ThemeToggle.jsx # Cambio de tema
│   ├── stats/              # Estadísticas
│   │   ├── Daily.jsx       # Estadísticas diarias
│   │   └── Reminders.jsx   # Panel de recordatorios
│   └── wheel/              # Visualización circular
│       └── PieChart.jsx    # Gráfico tipo rueda
├── hooks/                   # Hooks personalizados
│   ├── useActivities.js    # Gestión de actividades
│   ├── useSession.js       # Sesión de usuario
│   ├── useTheme.js         # Tema de la aplicación
│   └── useClock.js         # Reloj en tiempo real
├── lib/                     # Librerías y configuración
│   └── supabase.js        # Cliente de Supabase
├── utils/                   # Funciones utilidad
│   ├── dates.js            # Operaciones con fechas
│   └── index.js            # Constantes y funciones
├── styles/                  # Estilos CSS
│   ├── maru/              # Tema Maru
│   └── sei/               # Tema Sei
├── assets/                 # Imágenes y recursos
├── App.jsx                # Componente raíz
├── JikanApp.jsx          # Lógica principal de la aplicación
└── main.jsx              # Punto de entrada
```

## Stack Tecnológico

### Frontend
- **React** 19.2.3 - Librería UI
- **Vite** 7.3.0 - Bundler y dev server
- **Tailwind CSS** 4.1.18 - Framework CSS utilitario
- **Lucide React** 0.562.0 - Iconografía

### Backend & Base de Datos
- **Supabase** - Backend as a Service
  - PostgreSQL para datos
  - Autenticación integrada
  - Realtime subscriptions

### Herramientas de Desarrollo
- **ESLint** - Linter
- **PostCSS** - Procesador de CSS
- **Autoprefixer** - Compatibilidad CSS

## Características de Diseño

El proyecto pronto incluirá múltiples temas:
- **Tema Maru**: Tema principal moderno (actual)
- **Tema Sei**: Tema alternativo

### Componentes de Estilo
- `activity-card.css` - Tarjetas de actividad
- `day-selector.css` - Selector de día
- `wheel.css` - Visualización circular
- `theme-toggle.css` - Cambio de tema
- `scrollbar.css` - Personalización de scrollbar
- `reminders.css` - Panel de recordatorios
- `stats.css` - Estadísticas

## Seguridad

- Autenticación mediante Supabase
- Datos protegidos en base de datos PostgreSQL
- Las credenciales de API se almacenan en variables de entorno

## Responsividad

La aplicación es totalmente responsive y se adapta a:
- Dispositivos móviles (320px+)
- Tablets (768px+)
- Desktop (1024px+)

## Roadmap


VERSIÓN 1.0 (Minimo funcional)
	- [✓] Interfaz adecuada: Responsive para móvil y PC
	- [✓] Modo oscuro/claro manual: Selector independiente
	- [✓] Editor y creador de actividades: Permitir adecuar actividades a las necesidades propias
	- [✓] Sistema de login y registro
	- [✓] Base de datos en nube (Supabase) Sincronización multiplataforma para persistencia de datos
	- [✓] Mejores estadísticas diarias: Diferentes métricas de distribución de tiempo

VERSIÓN 2.0 (Funcionalidades Compentarias)
    - [ ] Integracion de distintos estilos
    - [ ] Crear/eliminar recordatorios básicos
    - [ ] Productividad: Pomodoro Timer integrado en actividades
    - [ ] Opcion de olvidar contraseña
    - [ ] Inicio de sesion con google u otros servicios
	- [ ] Guardar datos localmente (localStorage)
	- [ ] Notificaciones: Notificaciones de navegador (cambio de actividad)
	- [ ] Importación/Exportación: Exportar/importar horarios (xlsx, pdf y otros formatos)

VERSIÓN 3.0 (Extras)
    - [ ] Multilingüe: Selector de idioma (Kanji, Español, Inglés)
    - [ ] Estadísticas Ampliadas: Estadísticas semanales con gráficos
	- [ ] Gráfico de distribución semanal por categorías
    - [ ] Integración con calendario (Google Calendar)
    - [ ] Integracion con notas (Google Keep y/o notion)

..,

## Contribución

Las contribuciones y sugerencias son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commits descriptivos (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

##  Licencia

Este proyecto está bajo la licencia especificada en [LICENSE](LICENSE)
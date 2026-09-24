# AttendApp

PWA para gestión de invitados de bodas con códigos QR, escaneo en tiempo real y despacho de pases.

## Demo

https://attendapp-demo.netlify.app

## Stack

- **Frontend:** Next.js 16, React 19.3, TypeScript
- **Estilos:** Tailwind CSS v4
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **Editor de salón:** Konva + react-konva (canvas interactivo)
- **Mapa:** Leaflet
- **Email:** Resend
- **Push:** Web Push (VAPID)
- **Tours:** Driver.js
- **Escáner:** html5-qrcode
- **Despliegue:** Netlify
- **PWA:** Instalable, offline con Service Worker

## Características

- **Padrón de invitados:** CRUD completo con búsqueda
- **Filtros avanzados:** por mesa, grupo o combinados + export CSV filtrado
- **Cupos por invitado:** límite de acompañantes configurable (`slots`)
- **Grupos familiares:** Organización por mesa y grupo
- **Códigos QR:** Generación de pases únicos por grupo
- **Escáner real:** Cámara con html5-qrcode para validar entradas
- **Historial de escaneos:** Registro de check-ins con filtros
- **Despacho de pases:** Envío real por WhatsApp y correo (Resend), copia de enlace
- **Búsqueda de respaldo:** Validación manual sin QR
- **Editor de salón:** Canvas Konva con zoom, mesas circulares/rectangulares y ocupación
- **Mapa del venue:** Ubicación con Leaflet en Ajustes
- **Roles:** Administrador, Organizador y Portero con permisos diferenciados
- **Gestión de equipo:** Alta y baja de miembros con cambio de rol
- **Notificaciones push:** Suscripción VAPID para recordatorios
- **Tour guiado:** Tutoriales interactivos con Driver.js
- **Dark mode:** Tema claro/oscuro con persistencia
- **Responsive:** BottomNav en móvil, sidebar en escritorio (`md+`)
- **Exportar CSV:** Descarga de lista de invitados
- **Perfil y logout:** Gestión de sesión del organizador

## Estructura

```
src/
├── app/
│   ├── (app)/                 # Rutas autenticadas (AppShell)
│   │   ├── layout.tsx         # DesktopSidebar + BottomNav + rol
│   │   ├── page.tsx           # Dashboard: stats, filtros, padrón
│   │   ├── pases/             # Despacho de invitaciones
│   │   ├── scanner/           # Escáner QR
│   │   │   └── search/        # Búsqueda de respaldo
│   │   ├── salon/             # Editor visual de salón (Konva)
│   │   ├── historial/         # Historial de escaneos
│   │   ├── ajustes/           # Ajustes del evento + mapa
│   │   └── perfil/            # Perfil, equipo, tema, PWA
│   ├── api/                   # checkin, rsvp, pass, team, push, dispatch
│   ├── pase/[uuid]/           # Invitación pública del invitado
│   ├── login/                 # Autenticación
│   ├── layout.tsx             # Root layout (fonts, metadata)
│   ├── manifest.ts            # Manifest PWA
│   └── globals.css            # Tailwind v4 theme + dark vars
├── components/
│   ├── ui/                    # desktop-sidebar, nav-items, bottom-nav, toast...
│   ├── guest-card.tsx         # Tarjeta de invitado
│   ├── dispatch-card.tsx      # Tarjeta de despacho
│   ├── add-guest-modal.tsx    # Modal de alta
│   ├── edit-guest-modal.tsx   # Modal de edición
│   ├── delete-confirm.tsx     # Confirmación de eliminación
│   ├── venue-map.tsx          # Mapa Leaflet
│   ├── install-prompt.tsx     # Prompt de instalación PWA
│   └── push-prompt.tsx        # Prompt de notificaciones push
├── lib/
│   ├── supabase/              # Clientes Supabase
│   ├── roles.ts               # Permisos por rol
│   ├── push.ts                # Web Push (VAPID)
│   ├── use-theme.ts           # Dark mode
│   ├── use-driver-tour.ts     # Hook de tours guiados
│   ├── csv.ts                 # Exportación CSV
│   └── types.ts               # Interfaces TypeScript
└── proxy.ts                   # Middleware de autenticación
supabase/
└── migrations/
    ├── 001_initial.sql        # Esquema base
    └── 002_slots_and_venue.sql # Cupos + tablas de salón
```

## Instalación

```bash
git clone https://github.com/Omyy27/attendapp-webapp.git
cd attendapp-2
npm install
```

## Variables de entorno

Copiar `.env.local.example` a `.env.local` y completar:

```env
# Requerido
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Requerido para equipo (API team) y despacho por email
SUPABASE_SERVICE_ROLE_KEY=

# Opcional: notificaciones push (sin ellas, push queda deshabilitado)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Opcional: envío de email con Resend (sin ellos, solo WhatsApp)
RESEND_API_KEY=
RESEND_FROM=
```

Obtener las claves de Supabase desde el [panel de Supabase](https://supabase.com/dashboard) → Settings → API.

## Base de datos

Ejecutar en orden en el **SQL Editor** de Supabase:

1. `supabase/migrations/001_initial.sql` — esquema base (weddings, guests, groups, organizers…)
2. `supabase/migrations/002_slots_and_venue.sql` — cupos por invitado + tablas de salón

## Desarrollo

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run start    # Iniciar producción
npm run lint     # Verificar código
```

## Despliegue

Automático en Netlify al hacer push a `main`.

## Licencia

MIT

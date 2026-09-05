# AttendApp

PWA para gestión de invitados de bodas con códigos QR, escaneo en tiempo real y despacho de pases.

## Demo

https://attendapp-demo.netlify.app

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Estilos:** Tailwind CSS v4
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **Despliegue:** Netlify
- **PWA:** Instalable en dispositivos móviles

## Características

- **Padrón de invitados:** CRUD completo con búsqueda y filtros
- **Grupos familiares:** Organización por mesa y grupo
- **Códigos QR:** Generación de pases únicos por grupo
- **Escáner real:** Cámara con html5-qrcode para validar entradas
- **Despacho de pases:** Envío por WhatsApp, correo o copia de enlace
- **Búsqueda de respaldo:** Validación manual sin QR
- **Exportar CSV:** Descarga de lista de invitados
- **Tour guiado:** Tutoriales interactivos con Driver.js
- **Perfil y logout:** Gestión de sesión del organizador

## Estructura

```
src/
├── app/
│   ├── page.tsx              # Dashboard principal
│   ├── scanner/              # Escáner QR
│   │   └── search/           # Búsqueda de respaldo
│   ├── pases/                # Despacho de invitaciones
│   ├── pase/[uuid]/          # Pase VIP del invitado
│   ├── perfil/               # Perfil y logout
│   └── login/                # Autenticación
├── components/
│   ├── ui/bottom-nav.tsx     # Navegación inferior
│   ├── user-avatar.tsx       # Avatar con iniciales
│   ├── guest-card.tsx        # Tarjeta de invitado
│   ├── dispatch-card.tsx     # Tarjeta de despacho
│   ├── add-guest-modal.tsx   # Modal de alta
│   ├── edit-guest-modal.tsx  # Modal de edición
│   └── delete-confirm.tsx    # Confirmación de eliminación
├── lib/
│   ├── supabase/             # Clientes Supabase
│   ├── use-driver-tour.ts    # Hook de tours guiados
│   ├── csv.ts                # Exportación CSV
│   └── types.ts              # Interfaces TypeScript
└── proxy.ts                  # Middleware de autenticación
```

## Instalación

```bash
git clone https://github.com/Omyy27/attendapp-webapp.git
cd attendapp-2
npm install
```

## Variables de entorno

Configurar las siguientes variables en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Obtener los valores desde el [panel de Supabase](https://supabase.com/dashboard) → Settings → API.

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

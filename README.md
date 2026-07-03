# Slick

Sistema de reservas para negocios de servicios (clínicas, barberías, talleres, salones,
consultorios). El cliente reserva una cita en línea eligiendo servicio, profesional y un
horario **disponible en tiempo real**, mientras el negocio gestiona su agenda, sus servicios
y sus profesionales, y envía recordatorios automáticos.

> Proyecto de portafolio de **Eduard Bejarano**. Pensado para el contexto de Nicaragua:
> **no depende de pasarelas de pago**. El cobro se hace en el local; el sistema resuelve lo
> difícil, que es **la disponibilidad y la agenda**.

Arquitectura: **monorepo** con una **API REST (Laravel)** y un **frontend separado
(Next.js)** que la consume. Documentación: sistema y backend en
[`ARQUITECTURA.md`](./ARQUITECTURA.md), diseño del frontend en [`DESIGN.md`](./DESIGN.md), y
guía de desarrollo del frontend en [`DESARROLLO.md`](./DESARROLLO.md). Historial de cambios
en [`CHANGELOG.md`](./CHANGELOG.md).

---

## 🗂️ Estructura del monorepo

```
agenda-citas/
├── backend/        # API REST en Laravel 12 (Sanctum, MySQL, Redis) + Dockerfile
├── frontend/       # App Next.js que consume la API (proxy server-side / BFF)
├── README.md
├── CHANGELOG.md
├── ARQUITECTURA.md # diseño del sistema y el backend
├── DESIGN.md       # diseño del frontend (UI/UX, pantallas, componentes)
└── DESARROLLO.md   # guía de desarrollo del frontend
```

Las dos apps se ejecutan por separado y se comunican por **JSON sobre HTTP**. El navegador
**no llama a la API directamente**: el servidor de Next.js actúa de **proxy (BFF)** y es
quien añade el token Bearer (Sanctum) hacia la API. El token viaja en una **cookie
httpOnly** y nunca queda expuesto al JavaScript del navegador.

---

## 👥 Roles

| Rol | Panel / acceso | Puede |
|-----|----------------|-------|
| **Cliente** | Sitio público (`/`, `/reservar`, `/cuenta`) | Reservar (con sesión), ver/cancelar sus citas, editar su perfil |
| **Staff** (profesional) | Panel del negocio (`/negocio`) | Ver su agenda del día y cambiar estados |
| **Dueño** del negocio | Panel del negocio (`/negocio`) | Configurar servicios y profesionales + toda la agenda |
| **Admin** de plataforma | Panel de plataforma (`/admin`) | Crear/gestionar cuentas de dueño y supervisar (solo lectura) |

---

## ✨ Funcionalidades

- **Reserva en línea** (requiere iniciar sesión): servicio → profesional (opcional) →
  horario libre → confirmación instantánea.
- **Autenticación**: registro/login con **correo y contraseña** e **inicio de sesión con
  Google** (OAuth vía Socialite). El cliente puede además **conectar Google** a una cuenta
  ya creada con contraseña.
- **Motor de disponibilidad**: calcula los huecos a partir del horario laboral del
  profesional, su **descanso/almuerzo**, las ausencias y las citas existentes. Los inicios
  se alinean a la duración del servicio (+ margen), sin huecos muertos.
- **Anti doble-reserva**: dos personas no pueden tomar el mismo hueco (bloqueo pesimista → HTTP 409).
- **Una reserva activa por servicio**: un usuario no puede duplicar una cita del mismo
  servicio hasta cancelar la que tiene.
- **Panel del negocio**: agenda del día, cambio de estados (pendiente / confirmada /
  completada / cancelada / no-show) y **CRUD de servicios y profesionales** (con horario
  semanal y descanso).
- **Panel de plataforma**: el admin crea cuentas de dueño y supervisa el negocio.
- **Área de cuenta del cliente**: información personal y listado de sus reservas.
- **Recordatorios automáticos** por email, encolados en Redis y enviados X horas antes.
- **Seguridad**: token en cookie httpOnly, rate limiting por IP (login/registro/reserva),
  expiración de tokens, protección contra open-redirect e IDOR.

### Fuera de alcance (futuro)

- Recordatorios por WhatsApp / SMS.
- Multi-negocio real (multi-tenant con datos aislados) · Pagos en línea · App móvil
  (la API ya está lista para consumirse desde otros clientes).

---

## 🧱 Stack

> **Política de versiones:** todo en su **última versión estable**. Auditar con
> `pnpm audit` y `composer audit`.

### Backend (`backend/`)

| Capa | Tecnología |
|------|-----------|
| Framework | **Laravel 12** (PHP 8.4) |
| Auth API | **Laravel Sanctum** (tokens Bearer) + **Socialite** (Google OAuth) |
| Base de datos | **MySQL 8** |
| Cache + Colas | **Redis** (recordatorios, sesión, caché) |
| Contenedor | **Docker** (imagen de producción lista, ver `backend/Dockerfile`) |
| Tests | **PHPUnit** |

### Frontend (`frontend/`)

| Capa | Tecnología |
|------|-----------|
| Framework | **Next.js 16** (App Router) |
| Lenguaje | **TypeScript** |
| Estilos | **Tailwind CSS v4** (tema claro/oscuro con toggle) |
| Datos | **Proxy server-side** (Route Handlers de Next) que reenvía a la API |
| Auth | Token Sanctum en **cookie httpOnly** (no en `localStorage`) |

---

## 🚀 Puesta en marcha

Necesitas **dos terminales** (una para el backend, otra para el frontend).

### Backend

```bash
cd backend
cp .env.example .env          # configura DB_*, REDIS_*, MAIL_*, GOOGLE_* …
composer install
php artisan key:generate
php artisan migrate --seed    # crea datos demo (ver credenciales abajo)
php artisan serve             # API en http://localhost:8000
```

Procesos de apoyo (en producción los cubre el contenedor con supervisord):

```bash
php artisan queue:work        # worker de recordatorios (Redis)
php artisan schedule:work     # encola los recordatorios cada minuto
```

**Credenciales demo** (tras `--seed`):
- Admin de plataforma → `/admin/login` · `admin@agenda.test` / `password`
- Dueño del negocio → `/negocio/login` · `dueno@agenda.test` / `password`
- Staff (profesional) → `/negocio/login` · `ana@agenda.test` / `password`

> **Google OAuth (opcional):** para probar el login con Google, crea credenciales en Google
> Cloud Console y rellena `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`
> (= `http://localhost:3000/api/auth/google/callback`) en `backend/.env`.

### Frontend

```bash
cd frontend
cp .env.example .env.local    # API_URL=http://localhost:8000/api/v1  (privada, solo servidor)
pnpm install
pnpm dev                      # app en http://localhost:3000
```

> `API_URL` **no** lleva el prefijo `NEXT_PUBLIC_`: solo la usa el servidor de Next (el
> proxy). El navegador nunca la ve ni llama a la API de Laravel directamente.

---

## 🔌 API (resumen)

Base **versionada**: `http://localhost:8000/api/v1`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/booking/services` | — | Servicios activos y sus profesionales |
| GET | `/booking/slots?service_id&date&staff_member_id` | — | Huecos disponibles |
| POST | `/booking` | **sesión** | Crear cita (409 si el hueco se ocupó o ya hay una activa) |
| GET·DELETE | `/booking/{token}` | — | Ver / cancelar una cita por su token |
| POST | `/register` · `/login` | — | Registro / login → `{ token, user }` |
| GET | `/auth/google/redirect` · `/auth/google/callback` | — | Login con Google (OAuth) |
| GET·POST·PUT | `/me` · `/logout` · `/account` | token | Sesión y cuenta del usuario |
| GET | `/admin/dashboard?date` | negocio | Agenda del día (staff/dueño/admin) |
| PATCH | `/admin/appointments/{id}/status` | negocio | Cambiar estado |
| apiResource | `/admin/services` · `/admin/staff` | dueño | CRUD de configuración (lectura: negocio) |
| apiResource | `/platform/owners` | admin | Gestión de cuentas de dueño |

Las rutas protegidas esperan `Authorization: Bearer <token>`. En el frontend, **ese header
lo pone el proxy de Next**, leyendo el token de la cookie httpOnly; el navegador nunca lo
maneja. Todo el grupo lleva rate limiting por IP.

---

## 🧪 Tests (backend)

```bash
cd backend
php artisan test              # BD aislada en SQLite en memoria (no toca tu MySQL)
```

Cubren el motor de disponibilidad (duración, margen, descanso, ausencias), el flujo de
reserva por API, el rechazo de doble-reserva y de reserva duplicada, los roles y permisos,
las cuentas, el login con Google (mockeando Socialite), el rate limiting y los recordatorios.

---

## 📦 Deploy

- **Backend**: imagen Docker de producción lista (`backend/Dockerfile`), pensada para
  **Dokploy** sobre Ubuntu. Un contenedor sirve HTTP (nginx + PHP-FPM), la cola y el
  scheduler (supervisord). Las variables se inyectan por entorno; ver
  [`backend/.env.production.example`](./backend/.env.production.example). Puerto del
  contenedor: **8080**.
- **Frontend**: Vercel o cualquier host de Next.js. `API_URL` (privada, server-only)
  apuntando a la API en producción, y `BFF_SECRET` igual que en el backend. Como el
  navegador solo habla con el servidor de Next, **no hay CORS navegador↔Laravel**.

---

## 📄 Licencia

MIT.

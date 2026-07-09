# Changelog

Todos los cambios notables de **Slick** se documentan aquí.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto
se adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [1.1.0] — 2026-07-09

Personalización de la primera instancia real (Barbería Contreras) y despliegue a
producción: correcciones de infraestructura, autenticación y un cierre de seguridad.

### Añadido
- Marca de la instancia centralizada en `lib/brand.ts`: personalizar un negocio nuevo
  ahora es editar un solo archivo (nombre, eslogan, año), propagado a nav, footer,
  paneles y metadatos.
- Validación y formato automático del teléfono en la reserva: 8 dígitos con guion
  (`8855-9869`), reforzado también en el backend.
- `vercel.json` para el despliegue del frontend (Next.js + pnpm).

### Cambiado
- El flujo de reserva pasa de 4 a 3 pasos: se elimina "elegir profesional" para
  negocios de un solo barbero; la cita se asigna automáticamente.
- Teléfono y email pasan a ser obligatorios al reservar (antes bastaba uno de los dos).
- Los enlaces de los correos de confirmación/recordatorio apuntan al **frontend**
  (`/cita/{token}`) en vez de a la API, y sus datos (servicio/barbero/fecha/hora) ya
  no se colapsan en una sola línea.

### Corregido
- **Seguridad (IDOR):** ver/cancelar una cita por su token exigía solo el token, sin
  sesión ni verificar dueño — cualquiera con el enlace podía ver o cancelar la cita de
  otra persona. Ahora exige sesión y que la cita pertenezca al usuario (o un rol del
  negocio); si no, responde 404 sin revelar su existencia.
- La sesión de Google no persistía tras el login: la cookie se fijaba sobre un
  redirect de forma poco fiable, y el token Sanctum se reenviaba con su `|` mal
  codificado (`%7C`) al backend.
- El helper del BFF fuerza `https` en hosts remotos: una `API_URL` mal configurada en
  `http://` hacía que `fetch` perdiera el header `Authorization` en el redirect a
  `https`, dejando a cualquier usuario sin sesión.
- `supervisord` abortaba al arrancar como no-root (pedía bajar privilegios estando ya
  en `www-data`), dejando el contenedor en `Exited` sin llegar a *healthy*.
- Faltaba `TrustProxies`: detrás del reverse proxy de Dokploy (Traefik), Laravel no
  detectaba las peticiones como HTTPS.

## [1.0.0] — 2026-07-03

Primera versión funcional. Sistema de reservas completo: sitio público de reserva, paneles
de negocio y plataforma, autenticación (incluido Google OAuth) e imagen de producción.

### Añadido

#### Reserva y disponibilidad
- Flujo de reserva público por pasos (servicio → profesional → fecha/hora → confirmación).
- Motor de disponibilidad: calcula huecos según horario laboral, **descanso/almuerzo** del
  profesional, ausencias y citas existentes. Los inicios se alinean a la duración del
  servicio más su margen (sin huecos muertos).
- Protección **anti doble-reserva** con bloqueo pesimista por profesional (HTTP 409).
- Regla de **una reserva activa por servicio** y por usuario.
- Confirmación de cita por token público, con cancelación.

#### Autenticación y cuentas
- Registro e inicio de sesión con **correo y contraseña** (Sanctum, token en cookie httpOnly).
- **Inicio de sesión con Google** (OAuth vía Socialite), con vinculación por correo.
- **Conectar Google** a una cuenta ya creada con contraseña, desde el área de cuenta.
- Área de cuenta del cliente: información personal editable y listado de sus reservas.

#### Roles y paneles
- Cuatro roles: **cliente**, **staff** (profesional), **dueño** del negocio y **admin** de
  plataforma, con login y guard por rol.
- Panel del negocio (`/negocio`): agenda del día, cambio de estados y **CRUD de servicios y
  profesionales** (horario semanal + descanso). El staff solo ve su agenda.
- Panel de plataforma (`/admin`): el admin crea/gestiona cuentas de dueño y supervisa el
  negocio en solo lectura.

#### Recordatorios
- Recordatorios de cita por email, encolados en Redis y disparados por el scheduler.

#### Seguridad
- Rate limiting por IP (general, autenticación y reserva), con IP real reenviada por el BFF
  y validada con un secreto compartido.
- Citas vinculadas al usuario por `user_id` (cierra IDOR por correo modificable).
- Expiración de tokens Sanctum (7 días) y cookie alineada.
- Validación de `next` contra open-redirect; `role`/`staff_member_id` fuera de asignación
  masiva.

#### Frontend
- App Next.js 16 (App Router, TypeScript, Tailwind v4) con patrón **BFF/proxy**.
- Sistema visual propio ("Clinical Precision"), **modo claro/oscuro** con toggle persistente.
- Landing de marketing, asistente de reserva con stepper y resumen, confirmación, y los dos
  paneles con sidebar responsive.
- Componentes compartidos: modal, toasts, diálogo de confirmación, stepper, etc.
- Favicon e íconos propios (`.ico`, `icon.svg`, `apple-icon`).

#### Infraestructura
- Imagen Docker de producción del backend (multi-stage, Alpine no-root, nginx + PHP-FPM +
  supervisord para HTTP, cola y scheduler), lista para **Dokploy**.
- Suite de tests del backend (PHPUnit) sobre SQLite en memoria, aislada de la BD de desarrollo.

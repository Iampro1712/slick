# Slick — Arquitectura del sistema (backend)

Diseño técnico del **sistema y el backend**: arquitectura, modelo de datos, motor de
disponibilidad, API, recordatorios y decisiones. El **diseño del frontend** (UI/UX,
pantallas, componentes) vive en [`DESIGN.md`](./DESIGN.md); la **guía para construir el
frontend** en [`DESARROLLO.md`](./DESARROLLO.md); el arranque general en
[`README.md`](./README.md).

---

## 1. Problema y objetivo

Los negocios de servicios en Nicaragua (barberías, clínicas, talleres, salones) gestionan
sus citas por WhatsApp, llamadas o un cuaderno. Eso provoca **dobles reservas**, olvidos y
tiempo perdido confirmando huecos.

**Objetivo:** que un cliente pueda ver los horarios realmente libres y reservar en menos de
un minuto, y que el negocio gestione todo desde un panel, **sin cobrar en línea** (el pago
es presencial). El valor del producto está en resolver bien **la disponibilidad**, no los
pagos.

### Usuarios

| Rol | Qué hace |
|-----|----------|
| **Cliente** | Reserva una cita desde la web pública. No necesita cuenta. |
| **Staff** (profesional) | Ve su agenda del día, marca citas como completadas/no-show. |
| **Administrador** | Configura servicios, profesionales, horarios; ve todas las citas. |

---

## 2. Arquitectura

**API REST (Laravel) + frontend separado (Next.js)** en un monorepo. Dos apps con
responsabilidades claras que se comunican por **JSON sobre HTTP**. El backend es la única
fuente de verdad (rutas, validación, autorización, persistencia, lógica de negocio); el
frontend solo pinta datos y manda acciones. Las rutas protegidas usan un **token Bearer
(Sanctum)**, que añade el proxy del frontend (no el navegador — ver `DESIGN.md`).

```
┌──────────────────────────────────────────────────────────┐
│              frontend/  ·  Next.js (proxy BFF)             │
└───────────────────────────┬────────────────────────────────┘
                            │  JSON / HTTPS  (server-to-server)
                            ▼
┌──────────────────────────────────────────────────────────┐
│                 backend/  ·  Laravel 12 (API REST)         │
│  routes/api.php ─ Controllers (JSON) ─ FormRequests ─ Sanctum│
│                          │                                  │
│        ┌─────────────────┼──────────────────┐               │
│        ▼                 ▼                  ▼               │
│  AvailabilityService   Eloquent Models     Jobs (cola)      │
│  BookingService                                             │
└────────┬─────────────────┬──────────────────┬──────────────┘
         │                 │                  │
    ┌────▼────┐       ┌────▼────┐        ┌────▼────┐
    │  Redis  │       │  MySQL  │        │  Mailer │
    │ cache + │       │  datos  │        │ (email) │
    │  colas  │       └─────────┘        └─────────┘
    └─────────┘
```

**Componentes clave**

- **API REST**: endpoints bajo `/api/v1` (ver §5). Devuelven JSON; la validación de
  `FormRequest` responde 422 y el conflicto de hueco responde 409.
- **Sanctum**: auth por token. `POST /api/v1/login` devuelve un token Bearer.
- **AvailabilityService / BookingService**: lógica de negocio pura, independiente de la capa
  HTTP y 100% testeable.
- **Redis**: (1) *cola* para los recordatorios (jobs diferidos); (2) *cache* de la
  disponibilidad calculada por día/servicio.
- **Scheduler + Queue worker**: el scheduler revisa cada minuto qué citas necesitan
  recordatorio y encola el job; el worker lo envía.

---

## 3. Modelo de datos

```
services                staff_members            working_hours
─────────               ─────────────            ─────────────
id                      id                       id
name                    name                     staff_member_id  ─┐ (FK)
description             email                     weekday (0-6)     │
duration_min            phone                     start_time        │
buffer_min              is_active                 end_time          │
is_active               timestamps                timestamps        │
timestamps                                                          │
   │                        │  ▲                                    │
   │ (M:N)                  │  └────────────────────────────────────┘
   ▼                        │
service_staff (pivot)       │
─────────────               │
service_id (FK)             │
staff_member_id (FK)        │
                            │
appointments               clients              time_offs
────────────               ───────              ─────────
id                         id                   id
service_id (FK)            name                 staff_member_id (FK, null = todo el negocio)
staff_member_id (FK)       phone                starts_at
client_id (FK)             email                ends_at
starts_at                  timestamps           reason
ends_at                                          timestamps
status (enum)
reminder_sent_at (null)
notes
timestamps
```

### Entidades

- **service** — qué se ofrece. `duration_min` define cuánto ocupa; `buffer_min` es el
  tiempo de limpieza/preparación tras la cita.
- **staff_member** — quién atiende. Un servicio puede ser dado por varios profesionales
  (pivot `service_staff`).
- **working_hours** — horario semanal recurrente por profesional (p. ej. lunes 9–13 y 14–18).
- **time_offs** — excepciones puntuales: vacaciones, feriados, una tarde libre. Si
  `staff_member_id` es null, aplica a todo el negocio.
- **client** — datos de contacto mínimos. Se identifican/crean por teléfono o email.
- **appointment** — la cita. Guarda `starts_at`/`ends_at` ya calculados (incluye buffer).

### Estados de la cita (`status`)

```
pending ──(admin/staff confirma)──▶ confirmed ──(pasa la hora)──▶ completed
   │                                    │
   └──────────── cancelled ◀────────────┘           no_show (no se presentó)
```

---

## 4. Motor de disponibilidad

El corazón del producto. Dado un **servicio**, un **profesional** (o "cualquiera") y un
**día**, devuelve la lista de horas de inicio disponibles.

### Algoritmo

```
slotsDisponibles(servicio, profesional, fecha):
  1. base = working_hours del profesional para ese weekday
     → si no trabaja ese día, return []
  2. ocupado = citas (no canceladas) del profesional ese día
              + time_offs que solapen ese día
  3. duracionBloque = servicio.duration_min + servicio.buffer_min
  4. candidatos = generar inicios cada `step` min (p. ej. 15) dentro de `base`
  5. para cada candidato c:
        bloque = [c, c + duracionBloque)
        si bloque cabe en `base` y NO solapa con nada en `ocupado`:
            añadir c a disponibles
  6. filtrar los que ya pasaron (si fecha == hoy, descartar horas < ahora + margen)
  7. return disponibles
```

- **"Cualquier profesional"**: se calcula la unión de huecos de todos los profesionales que
  dan ese servicio; al reservar se asigna el que esté libre.
- **Cache (Redis)**: el resultado se cachea con clave `avail:{staff}:{service}:{fecha}` y se
  **invalida** al crear/cancelar una cita o cambiar un horario de ese profesional/fecha.
- **Zona horaria**: todo se guarda en UTC en MySQL; se presenta en la zona del negocio
  (`America/Managua`, GMT-6).

### Anti doble-reserva (concurrencia)

Dos clientes pueden ver el mismo hueco a la vez. Para que solo uno lo tome:

1. La confirmación ocurre dentro de una **transacción** con `SELECT ... FOR UPDATE` sobre las
   citas del profesional ese día (bloqueo pesimista), **o**
2. un **índice único** parcial / verificación de solape antes del `INSERT`, devolviendo un
   error 409 si el hueco ya no existe.

Se usa (1) por ser explícito y fácil de testear. El frontend, ante un 409, recarga los
huecos y pide elegir de nuevo.

---

## 5. API (endpoints)

Base **versionada**: `/api/v1`. Cada endpoint devuelve JSON. Las rutas del panel exigen
`Authorization: Bearer <token>` (Sanctum). El versionado permite publicar un `v2` sin romper
a los clientes que usan `v1`.

| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| GET | `/api/v1/booking/services` | Servicios activos + sus profesionales | público |
| GET | `/api/v1/booking/slots` | Huecos disponibles (`service_id`, `date`, `staff_member_id?`) | público |
| POST | `/api/v1/booking` | Crear cita (422 validación · 409 hueco ocupado) | público |
| GET | `/api/v1/booking/{token}` | Ver una cita por su token | público (token) |
| DELETE | `/api/v1/booking/{token}` | Cancelar por token | público (token) |
| POST | `/api/v1/login` | Devuelve `{ token, user }` | público |
| GET | `/api/v1/me` · POST `/api/v1/logout` | Usuario actual · revocar token | token |
| GET | `/api/v1/admin/dashboard` | Agenda del día (`date?`) | token: staff/admin |
| PATCH | `/api/v1/admin/appointments/{id}/status` | Cambiar estado | token: staff/admin |
| apiResource | `/api/v1/admin/services` · `/api/v1/admin/staff` | CRUD de configuración | token: admin |

> **Quién llama a estos endpoints:** no el navegador, sino el **proxy del frontend**. El
> navegador habla con rutas del propio servidor de Next, que reenvían aquí añadiendo el
> token. Detalle del proxy en [`DESIGN.md`](./DESIGN.md).

---

## 6. Recordatorios

```
schedule:run (cada minuto)
   └─▶ busca citas confirmadas con starts_at dentro de la ventana
       (p. ej. 24h antes) y reminder_sent_at = null
        └─▶ encola SendAppointmentReminder (cola Redis)
             └─▶ worker envía email y marca reminder_sent_at = now()
```

- **Idempotente**: `reminder_sent_at` evita reenvíos.
- **Configurable**: la antelación (24h, 2h…) vive en config/.env.
- **Extensible**: WhatsApp/SMS se añaden como otro canal del mismo job (futuro).

---

## 7. Decisiones técnicas (y por qué)

| Decisión | Razón |
|----------|-------|
| API REST versionada (`/api/v1`) + frontend Next.js separado | Dos apps con responsabilidad clara, comunicadas por JSON; el versionado permite evolucionar sin romper clientes y abre la puerta a otros consumidores (móvil). |
| Proxy server-side en Next (BFF) | `API_URL` privada, **sin CORS** navegador↔Laravel, y el token Sanctum fuera del alcance del JS del navegador. |
| Token Sanctum en cookie httpOnly | Mitiga el robo de token por XSS frente a guardarlo en `localStorage`; lo gestiona solo el servidor de Next. |
| Disponibilidad en un Service puro | Lógica crítica aislada y 100% testeable con PHPUnit. |
| Bloqueo pesimista en confirmación | Simple y correcto contra doble-reserva; el volumen no exige optimista. |
| Guardar `ends_at` (con buffer) | Calcular solapes es trivial y rápido en consultas. |
| UTC en BD, GMT-6 en UI | Evita errores de zona horaria y horario de verano. |
| Sin pagos | No hay pasarelas prácticas en NI; el negocio cobra en local. |

---

## 8. Testing

- **Unit:** `AvailabilityService` — casos de día sin horario, día lleno, hueco al borde del
  cierre, buffer entre citas, time-off que parte el día, "cualquier profesional".
- **Feature:** flujo de reserva completo; rechazo de doble-reserva (409); cambios de estado;
  dashboard con Sanctum; solo-admin 403; recordatorios.
- **Concurrencia:** dos requests simultáneas al mismo hueco → solo una crea la cita.

Ejecutar con `php artisan test` (PHPUnit) en `backend/`.

---

## 9. Métricas de éxito del proyecto

- Reservar una cita toma **< 1 minuto** en móvil.
- **0 dobles reservas** bajo concurrencia (cubierto por test).
- Lighthouse **95+** en la página pública de reserva.
- Cobertura de tests del motor de disponibilidad **> 90%**.

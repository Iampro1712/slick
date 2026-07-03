# Slick — Diseño del frontend

Diseño de la **interfaz**: principios, sistema visual, pantallas, componentes, flujos y
estados. Es el plano para **desarrollar el frontend**.

> El **cómo construirlo** (setup, estructura, capa de datos, roadmap) está en
> [`DESARROLLO.md`](./DESARROLLO.md). El **sistema y el backend** (API, modelo de datos,
> motor de disponibilidad) en [`ARQUITECTURA.md`](./ARQUITECTURA.md). El arranque general en
> [`README.md`](./README.md).

---

## 1. Para quién diseñamos

| Usuario | Dónde vive en la UI | Necesita |
|---------|---------------------|----------|
| **Cliente** | Web pública (`/`, `/cita/[token]`) | Reservar en < 1 min, sin cuenta, desde el móvil. |
| **Staff** | Panel (`/admin`) | Ver su agenda del día y cambiar estados rápido. |
| **Admin** | Panel (`/admin/*`) | Lo de staff + configurar servicios y profesionales. |

---

## 2. Principios de diseño

1. **Es una herramienta, no un escaparate.** Prioriza velocidad y claridad sobre el
   lucimiento visual. Cero fricción para reservar.
2. **Móvil primero.** La mayoría reservará desde el teléfono: una columna, objetivos táctiles
   grandes, nada que requiera hover.
3. **Solo se muestra lo reservable.** Nunca se ofrece un horario que no se pueda tomar.
4. **El color comunica estado, no decora.** La superficie es neutra; el color se reserva para
   los estados de la cita.
5. **Nunca una pantalla en blanco.** Toda vista contempla cargando / vacío / error / datos.
6. **Accesible por defecto.** Teclado, foco visible, contraste AA, estado no solo por color.

---

## 3. Sistema visual

Tema **claro**. Implementado con Tailwind v4; abajo van los tokens de referencia.

### Color

| Rol | Valor | Uso |
|-----|-------|-----|
| Fondo | `#f6f7f9` (`zinc-50/100`) | Lienzo de la app. |
| Superficie | `#ffffff` | Tarjetas, formularios, listas. |
| Borde | `zinc-200` | Separadores y bordes de tarjeta. |
| Texto | `zinc-900` / `zinc-500` | Principal / secundario. |
| Acción primaria | `zinc-900` (texto blanco) | Botones de acción principal. |

**Color de estado de cita** (único lugar donde entra el color):

| Estado | Estilo |
|--------|--------|
| Pendiente | ámbar (`amber-100/700`) |
| Confirmada | verde (`emerald-100/700`) |
| Completada | gris (`zinc-200/700`) |
| Cancelada | rojo (`red-100/700`) |
| No-show | rosa (`rose-100/700`) |

### Tipografía y espaciado

- Fuente del sistema / **Geist** (la del scaffold). Tamaños generosos, jerarquía por peso y
  tamaño, no por color.
- Ritmo de espaciado de Tailwind (múltiplos de 4). Mucho aire; las tarjetas respiran.
- Radio: `rounded-lg`/`rounded-xl` en tarjetas y controles. Nada anguloso.

### Componentes base

- **Botón primario**: `bg-zinc-900 text-white`, full-width en móvil, `disabled:opacity-50`.
- **Botón secundario / cancelar**: borde + texto; el de cancelar en rojo.
- **Input / select / textarea**: `border-zinc-300 rounded-lg`, foco visible.
- **Tarjeta**: `bg-white border border-zinc-200 rounded-xl`.
- **Píldora de estado**: fondo + texto del color del estado (tabla de arriba).
- **Chip seleccionable** (servicio, horario): borde neutro → seleccionado invierte a
  `bg-zinc-900 text-white`.

---

## 4. Mapa de pantallas

| Ruta | Acceso | Pantalla |
|------|--------|----------|
| `/` | público | **Landing** de marketing (hero + servicios + CTA). |
| `/reservar` | público | **Reserva** (asistente por pasos + resumen lateral). |
| `/cita/[token]` | público (token) | **Confirmación de cita** + cancelar. |
| `/admin/login` | público | **Login** del panel. |
| `/admin` | token (staff/admin) | **Dashboard**: agenda del día. |
| `/admin/servicios` | token (admin) | **CRUD de servicios** *(pendiente de UI)*. |
| `/admin/profesionales` | token (admin) | **CRUD de profesionales + horarios** *(pendiente)*. |

---

## 5. Diseño de pantallas

### 5.1 Reserva pública (`/`)

Flujo de **4 pasos** en una sola página; cada paso aparece al completar el anterior.

```
┌─ Reserva tu cita ───────────────────────────────┐
│ 1 · Servicio                                     │
│   [ Corte de cabello ] [ Corte + barba ]         │  ← chips; al elegir, sigue
│   [ Tinte ]                                       │
│                                                  │
│ 2 · Profesional            Fecha                 │
│   ( Cualquiera ▾ )         [ 2026-06-29 ]        │
│                                                  │
│ 3 · Horario                                      │
│   [09:00][09:15][09:30][10:00] …                 │  ← solo huecos reales
│                                                  │
│ 4 · Tus datos                                    │
│   Nombre*  [______]                              │
│   Teléfono [____]   Email [____]                 │
│   Notas    [______]                              │
│   [ Confirmar reserva ]                          │
└──────────────────────────────────────────────────┘
```

- **Comportamiento**: al cambiar servicio/profesional/fecha se recargan los horarios.
- **409 al confirmar** (el hueco se ocupó): aviso + recarga de horarios + pedir otra hora.
- **422**: mostrar el primer error de validación junto al formulario.
- **Éxito**: redirige a `/cita/{token}`.
- **Estados de los horarios**: *cargando* ("Buscando horarios libres…"), *vacío* ("No hay
  horarios ese día"), *con datos*.

### 5.2 Detalle de cita (`/cita/[token]`)

Tarjeta única con la píldora de estado arriba, los datos de la cita y, si aplica, el botón
**Cancelar** (solo si `can_cancel`). Enlace para "Reservar otra cita".
Estados: *cargando*, *no encontrada*, *con datos*.

### 5.3 Login (`/admin/login`)

Formulario centrado (email + contraseña). Error de credenciales sobre el formulario. Al
entrar → `/admin`.

### 5.4 Dashboard (`/admin`)

```
┌ Agenda · Panel            [Ana]  [Salir] ┐
│ Agenda del día      [ 2026-06-29 ]        │
│ ───────────────────────────────────────── │
│ 09:00–09:40  Juan Pérez                    │
│   Corte · Ana · 8888-7777   (Pendiente ▾)  │
│ 10:15–11:00  María López                   │
│   Tinte · Ana               (Confirmada ▾) │
└────────────────────────────────────────────┘
```

- Cabecera con nombre, **rol** (Admin/Staff) y salir.
- Selector de **fecha**; lista de citas del día ordenadas por hora.
- Cada cita: hora, cliente, servicio·profesional·teléfono, **píldora de estado** y un
  **selector** para cambiar el estado (PATCH).
- El **staff** ve solo su agenda; el **admin**, la de todos (lo resuelve el backend).
- Estados: *cargando*, *vacío* ("No hay citas para este día"), *con datos*.

### 5.5 CRUD de configuración (`/admin/servicios`, `/admin/profesionales`) — pendiente

Pieza del MVP que **falta por implementar**. Bocetos:

- **Servicios**: tabla (nombre, duración, buffer, activo, nº citas) + formulario de
  crear/editar; borrar solo si no tiene citas (si no, desactivar).
- **Profesionales**: tabla + formulario con servicios que ofrece y **horario semanal**
  (filas por día con inicio/fin). Solo accesible para admin.

---

## 6. Estados transversales

Toda vista que carga datos implementa los **cuatro estados**:

| Estado | Qué se ve |
|--------|-----------|
| Cargando | Texto/skeleton breve ("Cargando…", "Buscando horarios libres…"). |
| Vacío | Mensaje claro ("No hay citas para este día"). |
| Error | Aviso legible; si es acción, permitir reintentar. |
| Con datos | El contenido normal. |

Mapeo de errores de la API a UX: `401` → a login; `409` → recargar huecos y pedir otra hora;
`422` → primer mensaje de validación.

---

## 7. Cómo habla la UI con la API

El navegador **no llama a Laravel directamente**: pega a rutas del propio servidor de Next
(patrón **BFF/proxy**), que reenvían a la API con el token guardado en una **cookie
httpOnly**. Para la UI esto significa:

- Las pantallas llaman a un cliente same-origin (`src/lib/client.ts`) — sin tokens ni URLs de
  Laravel en el navegador.
- **Sesión**: `AuthProvider` expone `user`/`loading`; el layout de `/admin` hace de guard.
- **Zona horaria**: cada hueco llega como `{ value: ISO-UTC, label: "HH:mm" }`; la UI
  **muestra `label`** y **envía `value`**. El front no calcula zonas.

Detalle técnico del proxy y la cookie: [`DESARROLLO.md`](./DESARROLLO.md) §5–6 y
[`ARQUITECTURA.md`](./ARQUITECTURA.md).

---

## 8. Accesibilidad y responsive

- Navegación por teclado y **foco visible** en todos los controles.
- **Contraste AA**; el estado nunca se comunica solo por color (también texto/etiqueta).
- **Una columna en móvil** que se expande en pantallas grandes; objetivos táctiles cómodos.
- Inputs con `label` asociado; mensajes de error vinculados al campo.

---

## 9. Siguientes pasos

Construir la UI siguiendo el **roadmap por fases** de [`DESARROLLO.md`](./DESARROLLO.md). El
flujo público (reserva → cita) y el panel (login → dashboard) ya están implementados; la
pieza pendiente más clara es la **UI del CRUD de servicios y profesionales** (§5.5), cuyos
endpoints ya existen en la API.

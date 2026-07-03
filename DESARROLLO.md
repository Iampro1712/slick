# Desarrollo del frontend — Slick

Guía paso a paso para construir el **frontend** (Next.js) que consume la API REST del
`backend/`. Cubre la arquitectura del cliente, la convención de carpetas, el roadmap por
fases y las prácticas de calidad.

> Diseño del frontend (sistema visual, pantallas, componentes): ver
> [`DESIGN.md`](./DESIGN.md). Sistema y backend (API, modelo de datos): ver
> [`ARQUITECTURA.md`](./ARQUITECTURA.md). Arranque general: ver [`README.md`](./README.md).

---

## 0. Política de herramientas y versiones

- **pnpm para todo.** Nada de `npm`/`yarn`. Instalar, ejecutar scripts, añadir y actualizar
  dependencias siempre con `pnpm`.
- **Últimas versiones estables.** Se instala con `@latest` y se mantiene al día. No se
  fijan versiones antiguas salvo causa justificada.
- **Registro oficial de npm.** El registro global de la máquina apunta a un *mirror* de
  terceros que puede servir versiones "fantasma" (no publicadas en npm oficial). Para
  evitarlo, el frontend fija el registro oficial en un `.npmrc` local:

  ```
  # frontend/.npmrc
  registry=https://registry.npmjs.org/
  ```

  Ante una versión sospechosa, verificar con:
  `pnpm view <paquete> versions --registry=https://registry.npmjs.org/`.

### Mantener el proyecto al día

```bash
pnpm up --latest   # sube todas las deps a su última versión
pnpm audit         # reporta vulnerabilidades conocidas
```

---

## 1. Requisitos previos

```bash
node -v    # >= 20 LTS
pnpm -v    # >= 9   (si no lo tienes: corepack enable pnpm)
```

El **backend debe estar corriendo** para probar el frontend de verdad:

```bash
cd backend && php artisan serve     # API en http://localhost:8000
```

---

## 2. Crear el proyecto

Desde la raíz del monorepo (`agenda-citas/`):

```bash
pnpm create next-app@latest frontend \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-pnpm
```

Esto crea `frontend/` con Next.js (App Router), TypeScript y Tailwind CSS v4. Acto seguido,
fija el registro oficial:

```bash
cd frontend
printf 'registry=https://registry.npmjs.org/\n' > .npmrc
```

> No se necesitan librerías extra para el MVP: con `fetch` nativo y React basta. Añade algo
> solo cuando lo justifique una necesidad real (p. ej. un date-picker accesible).

---

## 3. Variables de entorno

```bash
# frontend/.env.local
API_URL=http://localhost:8000/api/v1
```

- **Sin prefijo `NEXT_PUBLIC_`**: `API_URL` es **privada**, solo la lee el servidor de Next
  (el proxy). El navegador nunca la ve ni llama a Laravel directamente.
- Apunta a la **base versionada** `/api/v1`.
- Crea también `.env.example` con la misma clave (sin valores sensibles) para documentar.
- En producción, apunta a la URL real de la API.

---

## 4. Estructura de carpetas objetivo

```
frontend/
├── .npmrc                       # registro oficial de npm
├── .env.local                   # API_URL (privada, server-only)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # <html lang="es"> + AuthProvider + metadata
│   │   ├── globals.css          # tema claro (Tailwind v4)
│   │   ├── page.tsx             # reserva pública (4 pasos)
│   │   ├── cita/
│   │   │   └── [token]/page.tsx # detalle + cancelar
│   │   ├── admin/
│   │   │   ├── layout.tsx       # guard del panel + cabecera
│   │   │   ├── login/page.tsx   # acceso
│   │   │   ├── page.tsx         # dashboard (agenda del día)
│   │   │   ├── servicios/       # CRUD servicios (fase 8)
│   │   │   └── profesionales/   # CRUD staff (fase 8)
│   │   └── api/                 # ── PROXY (BFF): Route Handlers de Next ──
│   │       ├── auth/            # login / logout / me (gestionan la cookie)
│   │       ├── booking/         # services, slots, [token]…
│   │       └── admin/           # dashboard, appointments, services, staff
│   └── lib/
│       ├── types.ts             # tipos que reflejan el JSON de la API
│       ├── client.ts            # fetch del NAVEGADOR a los Route Handlers (same-origin)
│       ├── auth.tsx             # AuthProvider + useAuth() (solo estado de usuario)
│       └── server/
│           └── laravel.ts       # "server-only": llama a Laravel con API_URL + cookie
└── ...
```

---

## 5. Capa de datos (patrón BFF / proxy)

El navegador **no llama a Laravel directamente**. El servidor de Next.js hace de
*Backend-for-Frontend*: el navegador pega a Route Handlers del propio Next (mismo origen) y
estos reenvían a la API adjuntando el token. Así `API_URL` queda privada, el token nunca
toca el JavaScript del navegador, y no hay CORS navegador↔Laravel.

```
Navegador ──fetch /api/...──▶ Route Handler (servidor Next) ──Bearer──▶ Laravel /api/v1/*
   (cookie httpOnly)              lee cookie, reenvía            (server-to-server)
```

Piezas:

1. **`types.ts`** — un tipo por payload de la API: `Service`, `StaffLite`, `Slot`,
   `AppointmentView`, `User`, `DashboardData`, `BookingInput`. Coinciden **exactamente** con
   el JSON del backend.

2. **`server/laravel.ts`** — *server-only* (empieza con `import "server-only"`). Única
   función que llama a Laravel:
   - Lee `API_URL` (privada) como base.
   - Adjunta `Accept: application/json` y, cuando aplica, `Authorization: Bearer <token>`
     leyendo el token desde la **cookie** (con el helper `cookies()` de `next/headers`).
   - Lanza una clase **`ApiError`** con `status` y `errors` cuando la respuesta no es `ok`.

3. **Route Handlers** (`src/app/api/**/route.ts`) — el proxy que ve el navegador. Cada uno
   reenvía al helper anterior. Ej.: `GET /api/booking/slots` → `laravel('/booking/slots')`;
   `GET /api/admin/dashboard` → reenvía con el token de la cookie. La carga inicial de una
   página también puede resolverse en un **Server Component** llamando al helper directo.

4. **`client.ts`** — fetch del navegador a esos Route Handlers (rutas **relativas**,
   mismo origen). No conoce `API_URL` ni el token; solo habla con su propio servidor.

5. **`auth.tsx`** — `AuthProvider` que expone `user`/`loading` (sin token). Se hidrata con
   `GET /api/auth/me`.

### Manejo de códigos de estado

| Código | Significado | Qué hace el frontend |
|--------|-------------|----------------------|
| `401` | Sesión inválida/ausente | Borrar la cookie y enviar a `/admin/login`. |
| `409` | Hueco ya ocupado | Mostrar aviso, **recargar huecos** y pedir otra hora. |
| `422` | Validación | Mostrar el primer mensaje de `errors`. |
| `2xx` | OK | Renderizar datos. |

### Zona horaria

El backend manda cada hueco como `{ value: ISO-UTC, label: "HH:mm" }`. El frontend
**muestra `label`** y **envía `value`** al reservar. El cliente no calcula zonas horarias.

---

## 6. Autenticación (cookie httpOnly vía proxy)

El token **no se guarda en `localStorage`**: lo gestiona el servidor de Next en una cookie
httpOnly, fuera del alcance del JavaScript del navegador (mitiga el robo por XSS).

- **Login**: el formulario hace `POST /api/auth/login` (Route Handler) → este llama a
  `POST /api/v1/login` en Laravel → recibe el token → lo guarda en una cookie
  **httpOnly, Secure, SameSite=Lax** → responde solo con los datos del usuario.
- **Sesión**: `AuthProvider` se hidrata con `GET /api/auth/me` (que en el servidor valida la
  cookie contra `/api/v1/me`). Expone `user`/`loading`, sin token.
- **Logout**: `POST /api/auth/logout` → llama a `/api/v1/logout` en Laravel y **borra la
  cookie**.
- **Guard**: el **layout de `/admin`** muestra un placeholder mientras `loading`; sin `user`
  redirige a `/admin/login`; con `user` pinta la cabecera (nombre, rol, salir).

---

## 7. Roadmap de desarrollo (fase por fase)

Construir en este orden: cada fase deja algo **funcional y probable en el navegador**.

- [ ] **Fase 0 — Setup**: crear el proyecto, `.npmrc`, `.env.local` (`API_URL`), tema claro en `globals.css`, `pnpm dev` arriba.
- [ ] **Fase 1 — Capa de datos**: `types.ts` + `server/laravel.ts` (helper server-only con `ApiError`) + `client.ts` (fetch a rutas propias).
- [ ] **Fase 2 — Proxy (BFF)**: Route Handlers en `src/app/api/**` que reenvían a `/api/v1/*`, empezando por `auth/login`, `auth/me`, `auth/logout` (gestión de la cookie httpOnly).
- [ ] **Fase 3 — Auth**: `auth.tsx` (AuthProvider/useAuth hidratado con `/api/auth/me`) y envoltura en `layout.tsx`.
- [ ] **Fase 4 — Reserva pública** (`/`): flujo de 4 pasos vía `booking/services`·`slots`·`create`; manejar `409`/`422`; redirigir a `/cita/{token}`.
- [ ] **Fase 5 — Detalle de cita** (`/cita/[token]`): cargar por token, mostrar estado, botón cancelar.
- [ ] **Fase 6 — Login + Dashboard** (`/admin/login`, `/admin`): guard, agenda del día (`date`) y cambio de estado (`PATCH`).
- [x] **Fase 7 — CRUD configuración** (`/admin/servicios`, `/admin/profesionales`): servicios y staff con horarios.
- [ ] **Fase 8 — Pulido**: estados de carga/vacío/error en todas las vistas, accesibilidad, responsive, `metadata`.

---

## 8. Convenciones de UI

- **Cuatro estados por vista** que carga datos: `cargando`, `vacío`, `error`, `con datos`.
  Nunca dejar la pantalla en blanco.
- **Móvil primero**: diseñar para una columna y expandir en pantallas grandes.
- **Color solo para estado** (pendiente/confirmada/cancelada…), nunca como única señal:
  acompañar siempre con texto o etiqueta.
- **Accesibilidad**: labels en inputs, foco visible, navegación por teclado, contraste AA.
- **Componentes pequeños y legibles**; extraer un componente cuando se repita, no antes.

---

## 9. Scripts (pnpm)

```bash
pnpm dev      # desarrollo con HMR  → http://localhost:3000
pnpm build    # build de producción (falla si hay errores de tipos)
pnpm start    # sirve el build
pnpm lint     # ESLint
```

> El `pnpm build` corre TypeScript: si compila, los tipos cuadran con la API. Úsalo como
> red de seguridad antes de subir cambios.

---

## 10. Checklist de calidad

- [ ] `pnpm lint` y `pnpm build` sin errores.
- [ ] Las cuatro vistas manejan carga / vacío / error.
- [ ] La reserva funciona de principio a fin contra el backend real (incl. el caso `409`).
- [ ] El panel está protegido: sin sesión redirige a login; `logout` borra la cookie y vuelve a login.
- [ ] El token va en **cookie httpOnly**; **no** aparece en `localStorage` ni en el JS del navegador.
- [ ] `API_URL` **no** lleva `NEXT_PUBLIC_` y no aparece en el bundle del cliente.
- [ ] Navegable por teclado, con foco visible y contraste AA.
- [ ] `API_URL` configurada por entorno (local y producción).

---

## 11. Deploy (Vercel)

1. Sube el monorepo a GitHub.
2. En Vercel, importa el repo y fija el **Root Directory** en `frontend/`.
3. Vercel detecta Next.js y **pnpm** (por el `pnpm-lock.yaml`).
4. Define `API_URL` (privada, server-only) con la URL de la API en producción, incluyendo
   `/api/v1`.
5. **CORS**: como el navegador solo habla con el servidor de Next, no hay CORS
   navegador↔Laravel; la API recibe llamadas server-to-server del proxy. Restringe el acceso
   a la API por red/firewall si es posible.

```bash
# Alternativa por CLI
pnpm add -g vercel
vercel          # preview
vercel --prod   # producción
```

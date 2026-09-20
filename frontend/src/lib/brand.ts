/**
 * Configuración de marca de la instancia.
 *
 * Slick se despliega como una instancia por negocio (single-tenant): cada
 * barbería/salón tiene su propia copia con su marca. Para personalizar un
 * cliente nuevo basta con definir `NEXT_PUBLIC_BRAND_NAME` (y opcionalmente
 * `NEXT_PUBLIC_BRAND_SHORT`); el nombre, el eslogan y el año se propagan a la
 * barra pública, el panel, el footer y el título del navegador.
 *
 * Las variables `NEXT_PUBLIC_*` se incrustan en el build: si cambias su valor,
 * hay que volver a construir el frontend (en desarrollo, reiniciar `pnpm dev`).
 */
const name = process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || "Slick";

export const BRAND = {
  /** Nombre completo del negocio (barra pública, footer, título de pestaña). */
  name,
  /** Nombre corto para espacios reducidos y frases ("Reserva en {short}"). */
  short: process.env.NEXT_PUBLIC_BRAND_SHORT?.trim() || name,
  /** Eslogan / descripción para el título de la pestaña y metadatos. */
  tagline: "Reserva tu cita en línea, sin llamadas.",
  /** Año que aparece en el footer. */
  year: 2026,
} as const;

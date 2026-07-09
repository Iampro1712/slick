/**
 * Configuración de marca de la instancia.
 *
 * Slick se despliega como una instancia por negocio (single-tenant): cada
 * barbería/salón tiene su propia copia con su marca. Para personalizar un
 * cliente nuevo, edita SOLO este archivo — el nombre, el eslogan y el año se
 * propagan a la barra pública, el panel, el footer y el título del navegador.
 */
export const BRAND = {
  /** Nombre completo del negocio (barra pública, footer, título de pestaña). */
  name: "Barbería Contreras",
  /** Nombre corto para espacios reducidos y frases ("Reserva en {short}"). */
  short: "Contreras",
  /** Eslogan / descripción para el título de la pestaña y metadatos. */
  tagline: "Reserva tu cita en línea, sin llamadas.",
  /** Año que aparece en el footer. */
  year: 2026,
} as const;

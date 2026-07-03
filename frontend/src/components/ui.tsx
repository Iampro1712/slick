/*
 * Primitivas de UI compartidas — sistema "Clinical Precision".
 *
 * Componentes presentacionales (sin estado ni hooks) reutilizables en todas las
 * pantallas. Usan los tokens definidos en globals.css (primary, line, ink…).
 * Al no usar APIs de cliente, sirven tanto en Server como en Client Components.
 */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/** Une clases ignorando valores vacíos/falsy. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Botón ──────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerSolid";
type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition " +
  "disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary shadow-card hover:bg-primary-hover active:translate-y-px",
  secondary:
    "border border-line bg-surface text-primary hover:border-line-strong hover:bg-surface-tint",
  ghost: "text-muted hover:bg-surface-muted hover:text-ink",
  danger:
    "border border-red-200 bg-surface text-red-600 hover:border-red-300 hover:bg-red-50",
  dangerSolid:
    "bg-red-600 text-white shadow-card hover:bg-red-700 active:translate-y-px",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...props}
    />
  );
}

/* ── Tarjeta ────────────────────────────────────────────────────────────── */

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-line bg-surface shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Campos de formulario ───────────────────────────────────────────────── */

const CONTROL =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-faint " +
  "transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CONTROL, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(CONTROL, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(CONTROL, "appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
}

/** Etiqueta + control + error, con asociación accesible por id. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold tracking-tight text-ink"
      >
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

/* ── Estado de cita (píldora) ───────────────────────────────────────────── */

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-emerald-100 text-emerald-800",
  completed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-rose-100 text-rose-700",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600",
        className
      )}
    >
      {label}
    </span>
  );
}

/** Píldora neutra (activo/inactivo, conteos…). */
export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "muted";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-primary-soft text-primary-hover",
    success: "bg-success-soft text-success-ink",
    muted: "bg-surface-muted text-muted",
  } as const;
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

/* ── Marca / identidad ──────────────────────────────────────────────────── */

/** Icono de calendario de la marca, sobre cuadro teal. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "grid place-items-center rounded-xl bg-primary text-on-primary",
        className ?? "size-9"
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[55%]" aria-hidden>
        <path
          d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Avatar con iniciales derivadas del nombre. */
export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary-hover",
        className ?? "size-9 text-sm"
      )}
    >
      {initials || "?"}
    </span>
  );
}

/* ── Métricas (stat cards) ──────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: "primary" | "amber" | "emerald" | "slate";
}) {
  const accents = {
    primary: "bg-primary-soft text-primary-hover",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-200 text-slate-600",
  } as const;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            {value}
          </p>
        </div>
        {icon && (
          <span
            className={cx(
              "grid size-10 place-items-center rounded-xl",
              accents[accent ?? "primary"]
            )}
          >
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}

/* ── Stepper horizontal ─────────────────────────────────────────────────── */

export function Stepper({
  steps,
  current,
}: {
  steps: string[];
  current: number; // índice 0-based del paso activo
}) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div>
      {/* Móvil: compacto con barra de progreso */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink">
            {steps[current]}
          </span>
          <span className="text-xs font-medium text-muted">
            Paso {current + 1} de {steps.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.max(pct, 6)}%` }}
          />
        </div>
      </div>

      {/* Desktop: stepper horizontal completo */}
      <ol className="hidden items-center gap-2 sm:flex">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span
                  className={cx(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition",
                    active && "bg-primary text-on-primary",
                    done && "bg-primary/15 text-primary",
                    !active && !done && "bg-surface-muted text-faint"
                  )}
                >
                  {done ? (
                    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden>
                      <path
                        d="M5 10l3.5 3.5L15 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cx(
                    "text-sm font-medium",
                    active ? "text-ink" : "text-muted"
                  )}
                >
                  {label}
                </span>
              </span>
              {i < steps.length - 1 && (
                <span
                  className={cx(
                    "h-0.5 flex-1 rounded-full",
                    done ? "bg-primary" : "bg-line"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Indicadores ────────────────────────────────────────────────────────── */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cx(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}

/* ── Diálogo modal ──────────────────────────────────────────────────────── */

/**
 * Modal presentacional. El estado de apertura lo controla el padre (cliente);
 * aquí solo se pinta el overlay + panel. Clic en el fondo cierra.
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col rounded-2xl border border-line bg-surface shadow-pop"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1 text-faint transition hover:bg-surface-muted hover:text-ink"
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="size-5"
              aria-hidden="true"
            >
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-3 border-t border-line px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Bloque vacío/placeholder con borde punteado. */
export function EmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-dashed border-line-strong bg-surface/60 p-10 text-center text-muted",
        className
      )}
    >
      {children}
    </div>
  );
}

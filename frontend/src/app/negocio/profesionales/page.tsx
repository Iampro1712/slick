"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/client";
import { ApiError } from "@/lib/errors";
import { useConfirm } from "@/lib/confirm";
import type {
  StaffInput,
  StaffMemberAdmin,
  WorkingHour,
} from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Pill,
  Spinner,
} from "@/components/ui";

type ServiceOption = { id: number; name: string };

// weekday según Carbon dayOfWeek (0=Dom). Se muestra de lunes a domingo.
const WEEKDAYS: { weekday: number; label: string; short: string }[] = [
  { weekday: 1, label: "Lunes", short: "Lun" },
  { weekday: 2, label: "Martes", short: "Mar" },
  { weekday: 3, label: "Miércoles", short: "Mié" },
  { weekday: 4, label: "Jueves", short: "Jue" },
  { weekday: 5, label: "Viernes", short: "Vie" },
  { weekday: 6, label: "Sábado", short: "Sáb" },
  { weekday: 0, label: "Domingo", short: "Dom" },
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  break_start: string; // "HH:mm" o "" si no tiene descanso
  break_minutes: string;
  service_ids: number[];
  hours: WorkingHour[];
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  is_active: true,
  break_start: "",
  break_minutes: "60",
  service_ids: [],
  hours: [],
};

export default function ProfesionalesPage() {
  const confirm = useConfirm();
  const [staff, setStaff] = useState<StaffMemberAdmin[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [editing, setEditing] = useState<StaffMemberAdmin | null | "new">(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [rowError, setRowError] = useState<{ id: number; msg: string } | null>(null);

  function load() {
    setLoading(true);
    setLoadError(false);
    api.admin.staff
      .list()
      .then((data) => {
        setStaff(data.staff);
        setServices(data.services);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(s: StaffMemberAdmin) {
    setForm({
      name: s.name,
      email: s.email ?? "",
      phone: s.phone ?? "",
      is_active: s.is_active,
      break_start: s.break_start ?? "",
      break_minutes: s.break_minutes ? String(s.break_minutes) : "60",
      service_ids: [...s.service_ids],
      hours: s.working_hours.map((h) => ({ ...h })),
    });
    setFormError(null);
    setEditing(s);
  }

  function toggleService(id: number) {
    setForm((f) => ({
      ...f,
      service_ids: f.service_ids.includes(id)
        ? f.service_ids.filter((x) => x !== id)
        : [...f.service_ids, id],
    }));
  }

  function addWindow(weekday: number) {
    setForm((f) => ({
      ...f,
      hours: [...f.hours, { weekday, start_time: "09:00", end_time: "17:00" }],
    }));
  }

  function updateWindow(index: number, patch: Partial<WorkingHour>) {
    setForm((f) => ({
      ...f,
      hours: f.hours.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    }));
  }

  function removeWindow(index: number) {
    setForm((f) => ({ ...f, hours: f.hours.filter((_, i) => i !== index) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const hasBreak = form.break_start.trim() !== "";
    const payload: StaffInput = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      is_active: form.is_active,
      break_start: hasBreak ? form.break_start : null,
      break_minutes: hasBreak ? Number(form.break_minutes) : null,
      service_ids: form.service_ids,
      working_hours: form.hours,
    };

    try {
      if (editing === "new") {
        await api.admin.staff.create(payload);
      } else if (editing) {
        await api.admin.staff.update(editing.id, payload);
      }
      setEditing(null);
      load();
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setFormError(Object.values(err.errors).flat()[0] ?? err.message);
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("No se pudo guardar. Inténtalo de nuevo.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: StaffMemberAdmin) {
    setRowError(null);
    await confirm({
      title: "Eliminar profesional",
      message: `¿Eliminar a "${s.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api.admin.staff.remove(s.id);
          load();
        } catch (err) {
          const msg =
            err instanceof ApiError ? err.message : "No se pudo eliminar.";
          setRowError({ id: s.id, msg });
        }
      },
    });
  }

  function serviceNames(ids: number[]): string {
    const names = services.filter((s) => ids.includes(s.id)).map((s) => s.name);
    return names.length ? names.join(", ") : "Sin servicios asignados";
  }

  function daysSummary(hours: WorkingHour[]): string {
    const days = WEEKDAYS.filter((d) =>
      hours.some((h) => h.weekday === d.weekday)
    ).map((d) => d.short);
    return days.length ? days.join(" · ") : "Sin horario";
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Profesionales
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Quién atiende, qué servicios da y en qué horario.
          </p>
        </div>
        <Button onClick={openCreate}>+ Nuevo profesional</Button>
      </header>

      {loading ? (
        <div className="flex items-center gap-3 text-muted">
          <Spinner /> Cargando profesionales…
        </div>
      ) : loadError ? (
        <EmptyState>
          <p>No se pudieron cargar los profesionales.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
            Reintentar
          </Button>
        </EmptyState>
      ) : staff.length === 0 ? (
        <EmptyState>
          <p>Aún no hay profesionales.</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            Crear el primero
          </Button>
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {staff.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-4 p-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink">{s.name}</span>
                  {s.is_active ? (
                    <Pill tone="success">Activo</Pill>
                  ) : (
                    <Pill tone="muted">Inactivo</Pill>
                  )}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">
                  {serviceNames(s.service_ids)}
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  {daysSummary(s.working_hours)}
                  {s.break_start
                    ? ` · 🍽 ${s.break_start} (${s.break_minutes} min)`
                    : ""}
                  {s.phone ? ` · ${s.phone}` : ""}
                </p>
                {rowError?.id === s.id && (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {rowError.msg}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={s.appointments_count > 0}
                  title={
                    s.appointments_count > 0
                      ? "Tiene citas: desactívalo en lugar de eliminar"
                      : undefined
                  }
                  onClick={() => remove(s)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing !== null && (
        <Modal
          title={editing === "new" ? "Nuevo profesional" : "Editar profesional"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" form="staff-form" disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </>
          }
        >
          <form id="staff-form" onSubmit={save} className="grid gap-5">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <Field label="Nombre" htmlFor="stf-name" required>
              <Input
                id="stf-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ana Martínez"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" htmlFor="stf-email">
                <Input
                  id="stf-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Opcional"
                />
              </Field>
              <Field label="Teléfono" htmlFor="stf-phone">
                <Input
                  id="stf-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Opcional"
                />
              </Field>
            </div>

            {/* Servicios que ofrece */}
            <Field label="Servicios que ofrece">
              {services.length === 0 ? (
                <p className="text-sm text-muted">
                  No hay servicios todavía. Créalos primero.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {services.map((svc) => {
                    const on = form.service_ids.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        aria-pressed={on}
                        className={
                          "rounded-full border px-3 py-1.5 text-sm font-medium transition " +
                          (on
                            ? "border-primary bg-primary text-on-primary"
                            : "border-line bg-surface text-muted hover:border-line-strong")
                        }
                      >
                        {svc.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>

            {/* Descanso / almuerzo */}
            <Field
              label="Descanso / almuerzo"
              hint="Opcional. Se aplica todos los días que trabaja; no se ofrecen huecos en esa franja."
            >
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-muted">
                  Hora
                  <input
                    type="time"
                    value={form.break_start}
                    onChange={(e) => setForm({ ...form, break_start: e.target.value })}
                    className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-muted">
                  Duración
                  <select
                    value={form.break_minutes}
                    onChange={(e) =>
                      setForm({ ...form, break_minutes: e.target.value })
                    }
                    disabled={!form.break_start}
                    className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  >
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                </label>
                {form.break_start && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, break_start: "" })}
                    className="text-sm font-medium text-muted transition hover:text-red-600"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </Field>

            {/* Horario semanal */}
            <Field label="Horario semanal" hint="Añade una o varias franjas por día.">
              <div className="grid gap-2">
                {WEEKDAYS.map((day) => {
                  const windows = form.hours
                    .map((h, i) => ({ h, i }))
                    .filter(({ h }) => h.weekday === day.weekday);
                  return (
                    <div
                      key={day.weekday}
                      className="rounded-lg border border-line bg-surface-muted/50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink">
                          {day.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => addWindow(day.weekday)}
                          className="text-sm font-medium text-primary hover:text-primary-hover"
                        >
                          + Franja
                        </button>
                      </div>
                      {windows.length === 0 ? (
                        <p className="mt-1 text-xs text-faint">Cerrado</p>
                      ) : (
                        <div className="mt-2 grid gap-2">
                          {windows.map(({ h, i }) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="time"
                                value={h.start_time}
                                onChange={(e) =>
                                  updateWindow(i, { start_time: e.target.value })
                                }
                                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <span className="text-muted">–</span>
                              <input
                                type="time"
                                value={h.end_time}
                                onChange={(e) =>
                                  updateWindow(i, { end_time: e.target.value })
                                }
                                className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <button
                                type="button"
                                onClick={() => removeWindow(i)}
                                aria-label="Quitar franja"
                                className="ml-auto rounded-lg p-1.5 text-faint transition hover:bg-red-50 hover:text-red-600"
                              >
                                <svg
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  className="size-4"
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
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Field>

            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="size-4 accent-[var(--color-primary)]"
              />
              Activo (disponible para reservar)
            </label>
          </form>
        </Modal>
      )}
    </div>
  );
}

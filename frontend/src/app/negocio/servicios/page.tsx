"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/client";
import { ApiError } from "@/lib/errors";
import { useConfirm } from "@/lib/confirm";
import type { ServiceAdmin, ServiceInput } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Pill,
  Spinner,
  Textarea,
} from "@/components/ui";

type FormState = {
  name: string;
  description: string;
  duration_min: string;
  buffer_min: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  duration_min: "30",
  buffer_min: "0",
  is_active: true,
};

export default function ServiciosPage() {
  const confirm = useConfirm();
  const [services, setServices] = useState<ServiceAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // null = cerrado; { id: null } = creando; { id } = editando.
  const [editing, setEditing] = useState<ServiceAdmin | null | "new">(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [rowError, setRowError] = useState<{ id: number; msg: string } | null>(null);

  function load() {
    setLoading(true);
    setLoadError(false);
    api.admin.services
      .list()
      .then(({ services }) => setServices(services))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(s: ServiceAdmin) {
    setForm({
      name: s.name,
      description: s.description ?? "",
      duration_min: String(s.duration_min),
      buffer_min: String(s.buffer_min),
      is_active: s.is_active,
    });
    setFormError(null);
    setEditing(s);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const payload: ServiceInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_min: Number(form.duration_min),
      buffer_min: Number(form.buffer_min),
      is_active: form.is_active,
    };

    try {
      if (editing === "new") {
        await api.admin.services.create(payload);
      } else if (editing) {
        await api.admin.services.update(editing.id, payload);
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

  async function remove(s: ServiceAdmin) {
    setRowError(null);
    await confirm({
      title: "Eliminar servicio",
      message: `¿Eliminar el servicio "${s.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api.admin.services.remove(s.id);
          load();
        } catch (err) {
          const msg =
            err instanceof ApiError
              ? err.message
              : "No se pudo eliminar el servicio.";
          setRowError({ id: s.id, msg });
        }
      },
    });
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Servicios
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Define qué ofreces, su duración y el margen entre citas.
          </p>
        </div>
        <Button onClick={openCreate}>+ Nuevo servicio</Button>
      </header>

      {loading ? (
        <div className="flex items-center gap-3 text-muted">
          <Spinner /> Cargando servicios…
        </div>
      ) : loadError ? (
        <EmptyState>
          <p>No se pudieron cargar los servicios.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
            Reintentar
          </Button>
        </EmptyState>
      ) : services.length === 0 ? (
        <EmptyState>
          <p>Aún no hay servicios.</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            Crear el primero
          </Button>
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {services.map((s) => (
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
                  {s.duration_min} min
                  {s.buffer_min > 0 ? ` · +${s.buffer_min} min margen` : ""}
                  {s.description ? ` · ${s.description}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  {s.appointments_count} cita{s.appointments_count === 1 ? "" : "s"}
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
          title={editing === "new" ? "Nuevo servicio" : "Editar servicio"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" form="service-form" disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </>
          }
        >
          <form id="service-form" onSubmit={save} className="grid gap-4">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <Field label="Nombre" htmlFor="svc-name" required>
              <Input
                id="svc-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Corte de cabello"
              />
            </Field>
            <Field label="Descripción" htmlFor="svc-desc">
              <Textarea
                id="svc-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Opcional"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Duración (min)" htmlFor="svc-dur" required>
                <Input
                  id="svc-dur"
                  type="number"
                  min={5}
                  max={600}
                  required
                  value={form.duration_min}
                  onChange={(e) =>
                    setForm({ ...form, duration_min: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Margen (min)"
                htmlFor="svc-buf"
                hint="Tiempo de limpieza/descanso tras la cita."
              >
                <Input
                  id="svc-buf"
                  type="number"
                  min={0}
                  max={240}
                  value={form.buffer_min}
                  onChange={(e) => setForm({ ...form, buffer_min: e.target.value })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="size-4 accent-[var(--color-primary)]"
              />
              Activo (visible para reservar)
            </label>
          </form>
        </Modal>
      )}
    </div>
  );
}

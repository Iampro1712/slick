"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/client";
import { ApiError } from "@/lib/errors";
import { useConfirm } from "@/lib/confirm";
import { useToast } from "@/lib/toast";
import type { OwnerAccount } from "@/lib/types";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Spinner,
} from "@/components/ui";

type FormState = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
};

export default function CuentasPage() {
  const confirm = useConfirm();
  const toast = useToast();

  const [owners, setOwners] = useState<OwnerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [editing, setEditing] = useState<OwnerAccount | null | "new">(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setLoadError(false);
    api.platform.owners
      .list()
      .then(({ owners }) => setOwners(owners))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing("new");
  }

  function openEdit(o: OwnerAccount) {
    setForm({ name: o.name, email: o.email, password: "", password_confirmation: "" });
    setFormError(null);
    setEditing(o);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await api.platform.owners.create(form);
        toast("Cuenta de dueño creada", "success");
      } else if (editing) {
        await api.platform.owners.update(editing.id, {
          name: form.name,
          email: form.email,
          // Solo manda contraseña si se escribió una.
          password: form.password || undefined,
          password_confirmation: form.password_confirmation || undefined,
        });
        toast("Cuenta actualizada", "success");
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

  async function remove(o: OwnerAccount) {
    await confirm({
      title: "Eliminar cuenta",
      message: `¿Eliminar la cuenta de "${o.name}" (${o.email})? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      tone: "danger",
      onConfirm: async () => {
        try {
          await api.platform.owners.remove(o.id);
          toast("Cuenta eliminada", "success");
          load();
        } catch {
          toast("No se pudo eliminar la cuenta", "error");
        }
      },
    });
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Cuentas de dueño
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            Crea y gestiona las cuentas de los dueños de negocio.
          </p>
        </div>
        <Button onClick={openCreate}>+ Nueva cuenta</Button>
      </header>

      {loading ? (
        <div className="flex items-center gap-3 text-muted">
          <Spinner /> Cargando cuentas…
        </div>
      ) : loadError ? (
        <EmptyState>
          <p>No se pudieron cargar las cuentas.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={load}>
            Reintentar
          </Button>
        </EmptyState>
      ) : owners.length === 0 ? (
        <EmptyState>
          <p>Aún no hay cuentas de dueño.</p>
          <Button size="sm" className="mt-4" onClick={openCreate}>
            Crear la primera
          </Button>
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {owners.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-4 p-4 sm:px-5">
              <Avatar name={o.name} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{o.name}</p>
                <p className="truncate text-sm text-muted">{o.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => openEdit(o)}>
                  Editar
                </Button>
                <Button variant="danger" size="sm" onClick={() => remove(o)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {editing !== null && (
        <Modal
          title={editing === "new" ? "Nueva cuenta de dueño" : "Editar cuenta"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="ghost" type="button" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button type="submit" form="owner-form" disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </>
          }
        >
          <form id="owner-form" onSubmit={save} className="grid gap-4">
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <Field label="Nombre" htmlFor="o-name" required>
              <Input
                id="o-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nombre del dueño"
              />
            </Field>
            <Field label="Correo" htmlFor="o-email" required>
              <Input
                id="o-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="dueño@negocio.com"
              />
            </Field>
            <Field
              label={editing === "new" ? "Contraseña" : "Nueva contraseña"}
              htmlFor="o-pass"
              required={editing === "new"}
              hint={
                editing === "new"
                  ? "Mínimo 8 caracteres."
                  : "Déjala en blanco para no cambiarla."
              }
            >
              <Input
                id="o-pass"
                type="password"
                required={editing === "new"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
            </Field>
            <Field label="Confirmar contraseña" htmlFor="o-pass2" required={editing === "new"}>
              <Input
                id="o-pass2"
                type="password"
                required={editing === "new" || form.password.length > 0}
                value={form.password_confirmation}
                onChange={(e) =>
                  setForm({ ...form, password_confirmation: e.target.value })
                }
                placeholder="••••••••"
              />
            </Field>
          </form>
        </Modal>
      )}
    </div>
  );
}

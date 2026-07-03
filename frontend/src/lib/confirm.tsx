"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

import { Button, Modal, Spinner } from "@/components/ui";

/**
 * Diálogo de confirmación custom (reemplaza al `confirm()` nativo del navegador).
 *
 * Uso simple (resuelve true/false y el llamador hace el trabajo):
 *   const confirm = useConfirm();
 *   if (!(await confirm({ message: "¿Seguro?" }))) return;
 *
 * Uso con acción asíncrona (el botón muestra carga y el modal se cierra al
 * terminar la acción):
 *   await confirm({ message: "¿Salir?", onConfirm: async () => { await logout(); } });
 */

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  /** Acción a ejecutar al confirmar; mientras corre, el botón queda cargando. */
  onConfirm?: () => void | Promise<void>;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setBusy(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
    setBusy(false);
  }, []);

  async function handleConfirm() {
    if (options?.onConfirm) {
      setBusy(true);
      try {
        await options.onConfirm();
      } catch {
        // El llamador gestiona sus propios errores; aquí solo cerramos.
      }
    }
    close(true);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <Modal
          title={options.title ?? "Confirmar"}
          onClose={() => {
            if (!busy) close(false);
          }}
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => close(false)}
                disabled={busy}
              >
                {options.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                variant={options.tone === "danger" ? "dangerSolid" : "primary"}
                onClick={handleConfirm}
                disabled={busy}
                autoFocus
              >
                {busy ? (
                  <>
                    <Spinner className="size-4" /> Procesando…
                  </>
                ) : (
                  options.confirmLabel ?? "Aceptar"
                )}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted">{options.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import { cx } from "@/components/ui";

/**
 * Toasts transitorios (avisos breves). A diferencia del modal de confirmación,
 * no bloquean: aparecen, se autodescartan a los ~3s y se apilan.
 *
 *   const toast = useToast();
 *   toast("Sesión cerrada", "success");
 */

type Tone = "success" | "info" | "error";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(
  () => {}
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, tone: Tone = "info") => {
    const id = ++idRef.current;
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
        {toasts.map((t) => (
          <ToastItem key={t.id} tone={t.tone}>
            {t.message}
          </ToastItem>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TONES: Record<Tone, { box: string; icon: React.ReactNode }> = {
  success: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: (
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  info: {
    box: "border-line bg-surface text-ink",
    icon: (
      <path
        d="M12 8h.01M11 12h1v4h1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  error: {
    box: "border-red-200 bg-red-50 text-red-700",
    icon: (
      <path
        d="M12 8v5m0 3h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
};

function ToastItem({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cx(
        "pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-pop",
        "animate-[toast-in_0.2s_ease-out]",
        TONES[tone].box
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5 shrink-0" aria-hidden>
        {TONES[tone].icon}
      </svg>
      {children}
    </div>
  );
}

export const useToast = () => useContext(ToastContext);

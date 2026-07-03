import { ApiError } from "./errors";
import type {
  AccountData,
  AccountUpdateInput,
  AppointmentView,
  BookingInput,
  DashboardData,
  OwnerAccount,
  OwnerCreateInput,
  OwnerUpdateInput,
  Service,
  ServiceAdmin,
  ServiceInput,
  Slot,
  StaffMemberAdmin,
  StaffInput,
  User,
} from "./types";

/** Resumen de servicio (id + nombre) que acompaña al listado de profesionales. */
type ServiceOption = { id: number; name: string };

/**
 * Cliente del NAVEGADOR. Llama a los Route Handlers del propio Next.js (mismo
 * origen, rutas relativas `/api/...`). No conoce `API_URL` ni el token: la
 * cookie httpOnly viaja sola en cada petición same-origin, y es el servidor de
 * Next quien reenvía a Laravel con el Bearer.
 */

type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | null | undefined>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query } = options;

  const url = new URL(path, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { message?: string }).message ?? "Ocurrió un error.",
      (data as { errors?: Record<string, string[]> }).errors,
      (data as { code?: string }).code
    );
  }

  return data as T;
}

export const api = {
  booking: {
    services: () =>
      request<{ services: Service[]; timezone: string }>("/api/booking/services"),
    slots: (serviceId: number, date: string, staffId?: number | null) =>
      request<{ slots: Slot[] }>("/api/booking/slots", {
        query: { service_id: serviceId, date, staff_member_id: staffId },
      }),
    create: (input: BookingInput) =>
      request<{ appointment: AppointmentView }>("/api/booking", {
        method: "POST",
        body: input,
      }),
    show: (token: string) =>
      request<{ appointment: AppointmentView }>(`/api/booking/${token}`),
    cancel: (token: string) =>
      request<{ appointment: AppointmentView }>(`/api/booking/${token}`, {
        method: "DELETE",
      }),
  },
  auth: {
    login: (email: string, password: string) =>
      request<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: { email, password },
      }),
    register: (input: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
    }) =>
      request<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: input,
      }),
    me: () => request<{ user: User }>("/api/auth/me"),
    logout: () => request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  },
  account: {
    get: () => request<AccountData>("/api/account"),
    update: (input: AccountUpdateInput) =>
      request<{ message: string; user: User }>("/api/account", {
        method: "PUT",
        body: input,
      }),
  },
  platform: {
    owners: {
      list: () => request<{ owners: OwnerAccount[] }>("/api/platform/owners"),
      create: (input: OwnerCreateInput) =>
        request<{ message: string; owner: OwnerAccount }>("/api/platform/owners", {
          method: "POST",
          body: input,
        }),
      update: (id: number, input: OwnerUpdateInput) =>
        request<{ message: string; owner: OwnerAccount }>(
          `/api/platform/owners/${id}`,
          { method: "PUT", body: input }
        ),
      remove: (id: number) =>
        request<{ message: string }>(`/api/platform/owners/${id}`, {
          method: "DELETE",
        }),
    },
  },
  admin: {
    dashboard: (date?: string) =>
      request<DashboardData>("/api/admin/dashboard", { query: { date } }),
    updateStatus: (appointmentId: number, status: string) =>
      request<{ message: string }>(
        `/api/admin/appointments/${appointmentId}/status`,
        { method: "PATCH", body: { status } }
      ),
    services: {
      list: () => request<{ services: ServiceAdmin[] }>("/api/admin/services"),
      create: (input: ServiceInput) =>
        request<{ message: string; service: ServiceAdmin }>("/api/admin/services", {
          method: "POST",
          body: input,
        }),
      update: (id: number, input: ServiceInput) =>
        request<{ message: string; service: ServiceAdmin }>(
          `/api/admin/services/${id}`,
          { method: "PUT", body: input }
        ),
      remove: (id: number) =>
        request<{ message: string }>(`/api/admin/services/${id}`, {
          method: "DELETE",
        }),
    },
    staff: {
      list: () =>
        request<{ staff: StaffMemberAdmin[]; services: ServiceOption[] }>(
          "/api/admin/staff"
        ),
      create: (input: StaffInput) =>
        request<{ message: string; staff: StaffMemberAdmin }>("/api/admin/staff", {
          method: "POST",
          body: input,
        }),
      update: (id: number, input: StaffInput) =>
        request<{ message: string; staff: StaffMemberAdmin }>(
          `/api/admin/staff/${id}`,
          { method: "PUT", body: input }
        ),
      remove: (id: number) =>
        request<{ message: string }>(`/api/admin/staff/${id}`, {
          method: "DELETE",
        }),
    },
  },
};

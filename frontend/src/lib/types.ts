export type StaffLite = {
  id: number;
  name: string;
};

export type Service = {
  id: number;
  name: string;
  description: string | null;
  duration_min: number;
  staff: StaffLite[];
};

export type Slot = {
  value: string; // ISO UTC
  label: string; // HH:mm en zona del negocio
};

export type AppointmentView = {
  token: string;
  service: string;
  staff: string;
  client: string;
  status: string;
  status_label: string;
  starts_at: string;
  date: string;
  time: string;
  can_cancel: boolean;
};

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_admin: boolean;
  staff_member_id: number | null;
  google_connected?: boolean;
};

export type StatusOption = {
  value: string;
  label: string;
};

/** Una reserva en el área de cuenta (incluye si ya pasó). */
export type AccountAppointment = AppointmentView & {
  is_past: boolean;
};

export type AccountData = {
  user: User;
  appointments: AccountAppointment[];
};

export type AccountUpdateInput = {
  name: string;
  email: string;
};

/* ── Cuentas de dueño (panel de plataforma, solo admin) ───────────────────── */

export type OwnerAccount = {
  id: number;
  name: string;
  email: string;
  created_at: string | null;
};

export type OwnerCreateInput = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export type OwnerUpdateInput = {
  name: string;
  email: string;
  password?: string;
  password_confirmation?: string;
};

export type DashboardAppointment = {
  id: number;
  service: string;
  staff: string;
  client: string;
  client_phone: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  status_label: string;
};

export type DashboardData = {
  date: string;
  date_label: string;
  appointments: DashboardAppointment[];
  statuses: StatusOption[];
};

export type BookingInput = {
  service_id: number;
  staff_member_id?: number | null;
  starts_at: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

/* ── Configuración del negocio (panel admin, Fase 7) ──────────────────────── */

/** Servicio tal como lo devuelve `/admin/services` (incluye campos de gestión). */
export type ServiceAdmin = {
  id: number;
  name: string;
  description: string | null;
  duration_min: number;
  buffer_min: number;
  is_active: boolean;
  appointments_count: number;
};

export type ServiceInput = {
  name: string;
  description?: string | null;
  duration_min: number;
  buffer_min: number;
  is_active: boolean;
};

/** Una ventana de horario laboral. weekday: 0=Dom … 6=Sáb (Carbon dayOfWeek). */
export type WorkingHour = {
  weekday: number;
  start_time: string; // "HH:mm"
  end_time: string; // "HH:mm"
};

/** Profesional tal como lo devuelve `/admin/staff`. */
export type StaffMemberAdmin = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  break_start: string | null; // "HH:mm" o null si no tiene descanso
  break_minutes: number | null;
  appointments_count: number;
  service_ids: number[];
  working_hours: WorkingHour[];
};

export type StaffInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
  break_start?: string | null;
  break_minutes?: number | null;
  service_ids: number[];
  working_hours: WorkingHour[];
};

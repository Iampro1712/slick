<?php

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Exceptions\DuplicateActiveBookingException;
use App\Exceptions\SlotUnavailableException;
use App\Http\Requests\AvailableSlotsRequest;
use App\Http\Requests\StoreBookingRequest;
use App\Mail\AppointmentConfirmationMail;
use App\Models\Appointment;
use App\Models\Service;
use App\Models\StaffMember;
use App\Services\AvailabilityService;
use App\Services\BookingService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class BookingController extends Controller
{
    private string $timezone;

    public function __construct()
    {
        $this->timezone = (string) config('agenda.timezone');
    }

    /**
     * Servicios activos con sus profesionales (para armar el flujo de reserva).
     */
    public function services(): JsonResponse
    {
        $services = Service::query()
            ->where('is_active', true)
            ->with(['staffMembers' => fn ($q) => $q->where('is_active', true)->orderBy('name')])
            ->orderBy('name')
            ->get()
            ->map(fn (Service $service) => [
                'id' => $service->id,
                'name' => $service->name,
                'description' => $service->description,
                'duration_min' => $service->duration_min,
                'staff' => $service->staffMembers->map(fn (StaffMember $s) => [
                    'id' => $s->id,
                    'name' => $s->name,
                ])->values(),
            ]);

        return response()->json([
            'services' => $services,
            'timezone' => $this->timezone,
        ]);
    }

    /**
     * Huecos disponibles para un servicio, profesional (opcional) y fecha.
     */
    public function slots(AvailableSlotsRequest $request, AvailabilityService $availability): JsonResponse
    {
        $service = Service::findOrFail($request->integer('service_id'));
        $staff = $request->filled('staff_member_id')
            ? StaffMember::findOrFail($request->integer('staff_member_id'))
            : null;

        $date = CarbonImmutable::parse($request->string('date')->toString(), $this->timezone);

        $slots = $availability->slotsFor($service, $staff, $date)
            ->map(fn (CarbonImmutable $slot) => [
                'value' => $slot->utc()->toIso8601String(),
                'label' => $slot->setTimezone($this->timezone)->format('H:i'),
            ])
            ->values();

        return response()->json(['slots' => $slots]);
    }

    /**
     * Crea la cita (con anti doble-reserva en BookingService).
     */
    public function store(StoreBookingRequest $request, BookingService $booking): JsonResponse
    {
        $service = Service::findOrFail($request->integer('service_id'));
        $staff = $request->filled('staff_member_id')
            ? StaffMember::findOrFail($request->integer('staff_member_id'))
            : null;

        try {
            $appointment = $booking->book(
                service: $service,
                staff: $staff,
                startsAt: CarbonImmutable::parse($request->string('starts_at')->toString()),
                clientData: [
                    'name' => $request->string('name')->toString(),
                    'phone' => $request->input('phone'),
                    'email' => $request->input('email'),
                ],
                notes: $request->input('notes'),
                userId: $request->user()->id,
            );
        } catch (DuplicateActiveBookingException $e) {
            // El cliente ya tiene una reserva activa de este servicio.
            return response()->json([
                'message' => $e->getMessage(),
                'code' => 'duplicate_active_booking',
            ], 409);
        } catch (SlotUnavailableException $e) {
            // El hueco se ocupó entre la consulta y la confirmación.
            return response()->json(['message' => $e->getMessage()], 409);
        }

        $appointment->load(['client', 'service', 'staffMember']);
        if ($appointment->client->email) {
            Mail::to($appointment->client->email)->send(new AppointmentConfirmationMail($appointment));
        }

        return response()->json([
            'appointment' => $this->present($appointment),
        ], 201);
    }

    /**
     * Ver una cita por su token. Exige sesión y ser el dueño (o rol del negocio).
     */
    public function show(Request $request, string $token): JsonResponse
    {
        $appointment = $this->findOwnedOrFail($request, $token);

        return response()->json(['appointment' => $this->present($appointment)]);
    }

    /**
     * Cancela una cita. Exige sesión y ser el dueño (o rol del negocio).
     */
    public function cancel(Request $request, string $token): JsonResponse
    {
        $appointment = $this->findOwnedOrFail($request, $token);

        if ($this->isCancellable($appointment)) {
            $appointment->update(['status' => AppointmentStatus::Cancelled]);
            $appointment->refresh()->load(['service', 'staffMember', 'client']);
        }

        return response()->json(['appointment' => $this->present($appointment)]);
    }

    /**
     * Busca la cita por token y autoriza el acceso: el cliente solo puede ver o
     * cancelar SUS propias citas; los roles del negocio (admin, dueño, staff)
     * pueden gestionar cualquiera. Se responde 404 —no 403— cuando no pertenece,
     * para no revelar la existencia de la cita a quien no es su dueño (evita IDOR).
     */
    private function findOwnedOrFail(Request $request, string $token): Appointment
    {
        $appointment = Appointment::query()
            ->where('public_token', $token)
            ->with(['service', 'staffMember', 'client'])
            ->firstOrFail();

        $user = $request->user();
        if (! $user->hasBusinessAccess() && $appointment->user_id !== $user->id) {
            abort(404);
        }

        return $appointment;
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Appointment $appointment): array
    {
        $localStart = CarbonImmutable::parse($appointment->starts_at)->setTimezone($this->timezone);

        return [
            'token' => $appointment->public_token,
            'service' => $appointment->service->name,
            'staff' => $appointment->staffMember->name,
            'client' => $appointment->client->name,
            'status' => $appointment->status->value,
            'status_label' => $appointment->status->label(),
            'starts_at' => CarbonImmutable::parse($appointment->starts_at)->utc()->toIso8601String(),
            'date' => $localStart->isoFormat('dddd D [de] MMMM, YYYY'),
            'time' => $localStart->format('H:i'),
            'can_cancel' => $this->isCancellable($appointment),
        ];
    }

    private function isCancellable(Appointment $appointment): bool
    {
        return in_array($appointment->status, [AppointmentStatus::Pending, AppointmentStatus::Confirmed], true)
            && CarbonImmutable::parse($appointment->starts_at)->isFuture();
    }
}

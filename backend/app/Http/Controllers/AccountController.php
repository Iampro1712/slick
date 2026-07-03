<?php

namespace App\Http\Controllers;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Área de cuenta del usuario autenticado: información personal y sus reservas.
 *
 * Las reservas se vinculan por `user_id` (relación dura con el usuario que las
 * creó), no por correo, para que cambiar el email no exponga citas ajenas.
 */
class AccountController extends Controller
{
    private string $timezone;

    public function __construct()
    {
        $this->timezone = (string) config('agenda.timezone');
    }

    /**
     * Datos del usuario + listado de sus reservas (más recientes primero).
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        // Por relación dura (user_id), no por correo: el usuario solo ve SUS citas
        // aunque cambie su email.
        $appointments = Appointment::query()
            ->where('user_id', $user->id)
            ->with(['service', 'staffMember', 'client'])
            ->orderByDesc('starts_at')
            ->get()
            ->map(fn (Appointment $a) => $this->present($a));

        return response()->json([
            'user' => $user->publicPayload(),
            'appointments' => $appointments,
        ]);
    }

    /**
     * Actualiza la información personal (nombre y correo).
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $user->update($data);

        return response()->json([
            'message' => 'Información actualizada.',
            'user' => $user->refresh()->publicPayload(),
        ]);
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
            'is_past' => CarbonImmutable::parse($appointment->starts_at)->isPast(),
            'can_cancel' => $this->isCancellable($appointment),
        ];
    }

    private function isCancellable(Appointment $appointment): bool
    {
        return in_array($appointment->status, [AppointmentStatus::Pending, AppointmentStatus::Confirmed], true)
            && CarbonImmutable::parse($appointment->starts_at)->isFuture();
    }
}

<?php

namespace App\Services;

use App\Enums\AppointmentStatus;
use App\Exceptions\DuplicateActiveBookingException;
use App\Exceptions\SlotUnavailableException;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Service;
use App\Models\StaffMember;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Crea citas de forma segura frente a la doble reserva.
 *
 * Estrategia (DESIGN §4.3): bloqueo pesimista por profesional. Dentro de una
 * transacción se bloquea la fila del profesional (SELECT ... FOR UPDATE), se
 * re-verifica que el hueco siga libre con el AvailabilityService y recién
 * entonces se inserta la cita. Dos peticiones simultáneas al mismo profesional
 * se serializan sobre esa fila, así que sólo una crea la cita.
 */
class BookingService
{
    public function __construct(
        private readonly AvailabilityService $availability,
        private readonly string $timezone = 'America/Managua',
    ) {}

    /**
     * Reserva una cita.
     *
     * @param  array{name: string, phone?: string|null, email?: string|null}  $clientData
     *
     * @throws SlotUnavailableException
     */
    public function book(
        Service $service,
        ?StaffMember $staff,
        CarbonInterface $startsAt,
        array $clientData,
        ?string $notes = null,
        ?int $userId = null,
    ): Appointment {
        $startsAt = CarbonImmutable::parse($startsAt)->setTimezone($this->timezone);
        $date = $startsAt->startOfDay();

        // Candidatos: el profesional pedido, o todos los activos que dan el servicio.
        $candidates = $staff !== null
            ? collect([$staff])
            : $service->staffMembers()->where('is_active', true)->orderBy('id')->get();

        if ($candidates->isEmpty()) {
            throw new SlotUnavailableException;
        }

        return DB::transaction(function () use ($service, $candidates, $startsAt, $date, $clientData, $notes, $userId) {
            // Bloqueo en orden de id para evitar interbloqueos entre peticiones.
            $ids = $candidates->pluck('id')->sort()->values();

            $locked = StaffMember::query()
                ->whereIn('id', $ids)
                ->lockForUpdate()
                ->orderBy('id')
                ->get();

            foreach ($locked as $member) {
                $slots = $this->availability->slotsForStaff($service, $member, $date);

                $isFree = $slots->contains(fn (CarbonImmutable $slot) => $slot->equalTo($startsAt));

                if ($isFree) {
                    $client = $this->resolveClient($clientData);

                    // Regla: un usuario no puede tener dos reservas activas del
                    // mismo servicio. Debe cancelar la que tiene para reservar otra.
                    if ($userId !== null && $this->hasActiveBookingForService($userId, $service)) {
                        throw new DuplicateActiveBookingException;
                    }

                    return Appointment::create([
                        'service_id' => $service->id,
                        'staff_member_id' => $member->id,
                        'client_id' => $client->id,
                        'user_id' => $userId,
                        'starts_at' => $startsAt->utc(),
                        'ends_at' => $startsAt->addMinutes($service->blockMinutes())->utc(),
                        'status' => \App\Enums\AppointmentStatus::Pending,
                        'notes' => $notes,
                    ]);
                }
            }

            throw new SlotUnavailableException;
        });
    }

    /**
     * ¿El usuario ya tiene una reserva activa (pendiente/confirmada y futura)
     * del mismo servicio?
     */
    private function hasActiveBookingForService(int $userId, Service $service): bool
    {
        return Appointment::query()
            ->where('user_id', $userId)
            ->where('service_id', $service->id)
            ->whereIn('status', [AppointmentStatus::Pending, AppointmentStatus::Confirmed])
            ->where('starts_at', '>', now())
            ->exists();
    }

    /**
     * Encuentra o crea el cliente por teléfono o email (datos de contacto mínimos).
     *
     * @param  array{name: string, phone?: string|null, email?: string|null}  $data
     */
    private function resolveClient(array $data): Client
    {
        $phone = $data['phone'] ?? null;
        $email = $data['email'] ?? null;

        $client = Client::query()
            ->when($phone, fn ($q) => $q->orWhere('phone', $phone))
            ->when($email, fn ($q) => $q->orWhere('email', $email))
            ->first();

        if ($client) {
            // Completa datos que faltaran sin pisar los existentes.
            $client->fill([
                'name' => $data['name'],
                'phone' => $client->phone ?: $phone,
                'email' => $client->email ?: $email,
            ])->save();

            return $client;
        }

        return Client::create([
            'name' => $data['name'],
            'phone' => $phone,
            'email' => $email,
        ]);
    }
}

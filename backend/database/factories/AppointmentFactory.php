<?php

namespace Database\Factories;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Service;
use App\Models\StaffMember;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    protected $model = Appointment::class;

    public function definition(): array
    {
        $startsAt = now()->addDay()->setTime(10, 0);

        return [
            'service_id' => Service::factory(),
            'staff_member_id' => StaffMember::factory(),
            'client_id' => Client::factory(),
            'starts_at' => $startsAt,
            'ends_at' => (clone $startsAt)->addMinutes(60),
            'status' => AppointmentStatus::Confirmed,
            'reminder_sent_at' => null,
            'notes' => null,
            'public_token' => (string) Str::uuid(),
        ];
    }

    public function status(AppointmentStatus $status): static
    {
        return $this->state(fn () => ['status' => $status]);
    }

    /**
     * Posiciona la cita en un rango concreto (en zona del negocio o UTC, según se pase).
     */
    public function between(\DateTimeInterface $start, \DateTimeInterface $end): static
    {
        return $this->state(fn () => [
            'starts_at' => $start,
            'ends_at' => $end,
        ]);
    }
}

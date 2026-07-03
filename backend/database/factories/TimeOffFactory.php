<?php

namespace Database\Factories;

use App\Models\StaffMember;
use App\Models\TimeOff;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TimeOff>
 */
class TimeOffFactory extends Factory
{
    protected $model = TimeOff::class;

    public function definition(): array
    {
        return [
            'staff_member_id' => StaffMember::factory(),
            'starts_at' => now(),
            'ends_at' => now()->addHour(),
            'reason' => fake()->randomElement(['Vacaciones', 'Feriado', 'Cita médica', 'Personal']),
        ];
    }

    /**
     * Ausencia que aplica a todo el negocio (sin profesional asociado).
     */
    public function businessWide(): static
    {
        return $this->state(fn () => ['staff_member_id' => null]);
    }
}

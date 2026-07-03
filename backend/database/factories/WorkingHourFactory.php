<?php

namespace Database\Factories;

use App\Models\StaffMember;
use App\Models\WorkingHour;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkingHour>
 */
class WorkingHourFactory extends Factory
{
    protected $model = WorkingHour::class;

    public function definition(): array
    {
        return [
            'staff_member_id' => StaffMember::factory(),
            'weekday' => fake()->numberBetween(1, 5),
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
        ];
    }

    public function onWeekday(int $weekday): static
    {
        return $this->state(fn () => ['weekday' => $weekday]);
    }

    public function between(string $start, string $end): static
    {
        return $this->state(fn () => ['start_time' => $start, 'end_time' => $end]);
    }
}

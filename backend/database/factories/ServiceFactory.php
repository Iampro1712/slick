<?php

namespace Database\Factories;

use App\Models\Service;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Service>
 */
class ServiceFactory extends Factory
{
    protected $model = Service::class;

    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Corte de cabello', 'Consulta general', 'Limpieza dental', 'Masaje', 'Cambio de aceite']),
            'description' => fake()->sentence(),
            'duration_min' => fake()->randomElement([30, 45, 60, 90]),
            'buffer_min' => fake()->randomElement([0, 10, 15]),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}

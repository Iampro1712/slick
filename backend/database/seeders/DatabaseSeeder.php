<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Models\WorkingHour;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database con la barbería de ejemplo (Barbería
     * Contreras): un solo barbero que atiende únicamente con cita previa.
     */
    public function run(): void
    {
        // Admin de plataforma: crea cuentas de dueño y supervisa (contraseña: password).
        User::factory()->create([
            'name' => 'Admin Demo',
            'email' => 'admin@agenda.test',
            'role' => \App\Enums\UserRole::Admin,
        ]);

        // Dueño del negocio (es el mismo barbero): configura servicios y agenda.
        User::factory()->create([
            'name' => 'Contreras',
            'email' => 'dueno@agenda.test',
            'role' => \App\Enums\UserRole::Owner,
        ]);

        // Servicios típicos de una barbería en Nicaragua.
        $corte = Service::factory()->create([
            'name' => 'Corte de cabello',
            'description' => 'Corte a máquina y tijera, lavado y peinado.',
            'duration_min' => 30,
            'buffer_min' => 10,
        ]);

        $corteBarba = Service::factory()->create([
            'name' => 'Corte + barba',
            'description' => 'Corte completo más perfilado de barba con navaja.',
            'duration_min' => 45,
            'buffer_min' => 10,
        ]);

        $barba = Service::factory()->create([
            'name' => 'Arreglo de barba',
            'description' => 'Perfilado y afeitado de barba con toalla caliente.',
            'duration_min' => 20,
            'buffer_min' => 5,
        ]);

        $nino = Service::factory()->create([
            'name' => 'Corte infantil',
            'description' => 'Corte para niños (menores de 12 años).',
            'duration_min' => 25,
            'buffer_min' => 10,
        ]);

        $diseno = Service::factory()->create([
            'name' => 'Diseño / líneas',
            'description' => 'Corte con diseño a mano alzada (freestyle).',
            'duration_min' => 40,
            'buffer_min' => 10,
        ]);

        // El único barbero del negocio.
        $contreras = StaffMember::factory()->create(['name' => 'Contreras']);

        // Usuario con rol staff vinculado al barbero: verá su agenda del día.
        User::factory()->create([
            'name' => 'Contreras',
            'email' => 'barbero@agenda.test',
            'role' => \App\Enums\UserRole::Staff,
            'staff_member_id' => $contreras->id,
        ]);

        // Horario: lunes a sábado, 8–12 y 13–18 (almuerzo de 12 a 13).
        foreach (range(1, 6) as $weekday) {
            WorkingHour::factory()->for($contreras)->onWeekday($weekday)->between('08:00:00', '12:00:00')->create();
            WorkingHour::factory()->for($contreras)->onWeekday($weekday)->between('13:00:00', '18:00:00')->create();
        }

        // El barbero ofrece todos los servicios.
        $contreras->services()->attach([
            $corte->id,
            $corteBarba->id,
            $barba->id,
            $nino->id,
            $diseno->id,
        ]);

        // Algunos clientes de ejemplo.
        Client::factory(5)->create();
    }
}

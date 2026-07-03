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
     * Seed the application's database con un negocio de ejemplo (una barbería).
     */
    public function run(): void
    {
        // Admin de plataforma: crea cuentas de dueño y supervisa (contraseña: password).
        User::factory()->create([
            'name' => 'Admin Demo',
            'email' => 'admin@agenda.test',
            'role' => \App\Enums\UserRole::Admin,
        ]);

        // Dueño del negocio: configura servicios y profesionales (contraseña: password).
        User::factory()->create([
            'name' => 'Dueño Demo',
            'email' => 'dueno@agenda.test',
            'role' => \App\Enums\UserRole::Owner,
        ]);

        // Servicios que ofrece el negocio.
        $corte = Service::factory()->create([
            'name' => 'Corte de cabello',
            'description' => 'Corte clásico con máquina y tijera.',
            'duration_min' => 30,
            'buffer_min' => 10,
        ]);

        $barba = Service::factory()->create([
            'name' => 'Corte + barba',
            'description' => 'Corte de cabello y arreglo de barba.',
            'duration_min' => 45,
            'buffer_min' => 15,
        ]);

        $tinte = Service::factory()->create([
            'name' => 'Tinte',
            'description' => 'Aplicación de color.',
            'duration_min' => 90,
            'buffer_min' => 15,
        ]);

        // Profesionales y sus horarios (lunes a sábado).
        $ana = StaffMember::factory()->create(['name' => 'Ana Martínez']);
        $luis = StaffMember::factory()->create(['name' => 'Luis Hernández']);

        // Usuario con rol staff vinculado a Ana: verá sólo su agenda (contraseña: password).
        User::factory()->create([
            'name' => 'Ana Martínez',
            'email' => 'ana@agenda.test',
            'role' => \App\Enums\UserRole::Staff,
            'staff_member_id' => $ana->id,
        ]);

        // Ana: lunes a viernes 9–13 y 14–18.
        foreach (range(1, 5) as $weekday) {
            WorkingHour::factory()->for($ana)->onWeekday($weekday)->between('09:00:00', '13:00:00')->create();
            WorkingHour::factory()->for($ana)->onWeekday($weekday)->between('14:00:00', '18:00:00')->create();
        }

        // Luis: martes a sábado 10–19 corrido.
        foreach (range(2, 6) as $weekday) {
            WorkingHour::factory()->for($luis)->onWeekday($weekday)->between('10:00:00', '19:00:00')->create();
        }

        // Qué servicios da cada profesional.
        $ana->services()->attach([$corte->id, $barba->id, $tinte->id]);
        $luis->services()->attach([$corte->id, $barba->id]);

        // Algunos clientes de ejemplo.
        Client::factory(5)->create();
    }
}

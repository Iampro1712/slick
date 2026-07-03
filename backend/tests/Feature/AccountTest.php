<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_invitados_reciben_401_en_la_cuenta(): void
    {
        $this->getJson(route('account.show'))->assertUnauthorized();
    }

    public function test_la_cuenta_devuelve_los_datos_y_las_reservas_del_usuario(): void
    {
        $user = User::factory()->create([
            'email' => 'cliente@example.com',
            'role' => UserRole::Client,
        ]);

        // Reserva del usuario (vinculada por user_id).
        Appointment::factory()->for(Client::factory())->create(['user_id' => $user->id]);

        // Reserva de otra persona (sin user_id): no debe aparecer.
        Appointment::factory()->for(Client::factory())->create();

        Sanctum::actingAs($user);

        $this->getJson(route('account.show'))
            ->assertOk()
            ->assertJsonPath('user.email', 'cliente@example.com')
            ->assertJsonCount(1, 'appointments')
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email'],
                'appointments' => [['token', 'service', 'staff', 'status', 'date', 'time', 'is_past', 'can_cancel']],
            ]);
    }

    public function test_el_usuario_puede_actualizar_su_informacion(): void
    {
        $user = User::factory()->create(['name' => 'Viejo Nombre']);
        Sanctum::actingAs($user);

        $this->putJson(route('account.update'), [
            'name' => 'Nuevo Nombre',
            'email' => $user->email,
        ])->assertOk()->assertJsonPath('user.name', 'Nuevo Nombre');

        $this->assertSame('Nuevo Nombre', $user->refresh()->name);
    }

    public function test_no_puede_usar_un_correo_de_otro_usuario(): void
    {
        User::factory()->create(['email' => 'ocupado@example.com']);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->putJson(route('account.update'), [
            'name' => 'X',
            'email' => 'ocupado@example.com',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }
}

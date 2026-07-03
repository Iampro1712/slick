<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RolesTest extends TestCase
{
    use RefreshDatabase;

    private function serviceData(): array
    {
        return [
            'name' => 'Servicio X',
            'description' => null,
            'duration_min' => 30,
            'buffer_min' => 0,
            'is_active' => true,
        ];
    }

    public function test_el_dueno_puede_crear_servicios(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Owner]));

        $this->postJson(route('admin.services.store'), $this->serviceData())
            ->assertCreated();
    }

    public function test_el_admin_supervisa_pero_no_configura(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));

        // Puede leer (supervisar)…
        $this->getJson(route('admin.services.index'))->assertOk();
        // …pero no escribir.
        $this->postJson(route('admin.services.store'), $this->serviceData())
            ->assertForbidden();
    }

    public function test_el_staff_no_puede_configurar(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Staff]));

        $this->postJson(route('admin.services.store'), $this->serviceData())
            ->assertForbidden();
    }

    public function test_solo_el_admin_gestiona_cuentas_de_dueno(): void
    {
        // El dueño no puede gestionar cuentas.
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Owner]));
        $this->getJson(route('platform.owners.index'))->assertForbidden();
    }

    public function test_el_admin_crea_una_cuenta_de_dueno(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));

        $this->postJson(route('platform.owners.store'), [
            'name' => 'Nuevo Dueño',
            'email' => 'dueno@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertCreated()->assertJsonPath('owner.email', 'dueno@example.com');

        $this->assertDatabaseHas('users', [
            'email' => 'dueno@example.com',
            'role' => UserRole::Owner->value,
        ]);
    }
}

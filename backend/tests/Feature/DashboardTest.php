<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_invitados_reciben_401_en_el_dashboard(): void
    {
        $this->getJson(route('admin.dashboard'))->assertUnauthorized();
    }

    public function test_usuario_autenticado_obtiene_la_agenda_del_dia(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin]));

        $this->getJson(route('admin.dashboard'))
            ->assertOk()
            ->assertJsonStructure(['date', 'date_label', 'appointments', 'statuses']);
    }

    public function test_un_cliente_no_accede_al_panel(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Client]));

        $this->getJson(route('admin.dashboard'))->assertForbidden();
    }
}

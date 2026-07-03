<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_un_cliente_puede_registrarse_con_correo_y_contrasena(): void
    {
        $response = $this->postJson(route('register'), [
            'name' => 'Juan Pérez',
            'email' => 'juan@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role', 'is_admin']])
            ->assertJsonPath('user.role', 'client')
            ->assertJsonPath('user.is_admin', false);

        $user = User::where('email', 'juan@example.com')->first();
        $this->assertNotNull($user);
        $this->assertSame(UserRole::Client, $user->role);
        $this->assertTrue(Hash::check('secret123', $user->password));
    }

    public function test_el_registro_rechaza_correos_duplicados(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson(route('register'), [
            'name' => 'Otro',
            'email' => 'taken@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_el_registro_exige_confirmar_la_contrasena(): void
    {
        $this->postJson(route('register'), [
            'name' => 'Juan',
            'email' => 'juan@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'otra-cosa',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_el_registro_rechaza_contrasenas_cortas(): void
    {
        $this->postJson(route('register'), [
            'name' => 'Juan',
            'email' => 'juan@example.com',
            'password' => 'corta',
            'password_confirmation' => 'corta',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_un_cliente_registrado_puede_iniciar_sesion(): void
    {
        $user = User::factory()->create([
            'email' => 'cliente@example.com',
            'password' => 'secret123',
            'role' => UserRole::Client,
        ]);

        $this->postJson(route('login'), [
            'email' => 'cliente@example.com',
            'password' => 'secret123',
        ])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'email', 'role']])
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_registrarse_por_http_y_luego_iniciar_sesion(): void
    {
        $this->postJson(route('register'), [
            'name' => 'Ana',
            'email' => 'ana@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ])->assertCreated();

        $this->postJson(route('login'), [
            'email' => 'ana@example.com',
            'password' => 'secret123',
        ])->assertOk()->assertJsonPath('user.email', 'ana@example.com');
    }

    public function test_el_login_rechaza_credenciales_incorrectas(): void
    {
        User::factory()->create([
            'email' => 'cliente@example.com',
            'password' => 'secret123',
        ]);

        $this->postJson(route('login'), [
            'email' => 'cliente@example.com',
            'password' => 'incorrecta',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }
}

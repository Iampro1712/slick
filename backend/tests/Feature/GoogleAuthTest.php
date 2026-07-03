<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Laravel\Sanctum\Sanctum;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    private function fakeGoogleUser(string $id, string $email, string $name): void
    {
        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getId')->andReturn($id);
        $socialiteUser->shouldReceive('getEmail')->andReturn($email);
        $socialiteUser->shouldReceive('getName')->andReturn($name);

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    /** Fabrica el `state` cifrado tal como lo emite GoogleController::linkRedirect(). */
    private function linkState(int $userId, int $expiresInMinutes = 10): string
    {
        return Crypt::encryptString(json_encode([
            'purpose' => 'link',
            'user_id' => $userId,
            'exp' => now()->addMinutes($expiresInMinutes)->timestamp,
        ]));
    }

    public function test_crea_un_cliente_nuevo_desde_google(): void
    {
        $this->fakeGoogleUser('g-123', 'nuevo@gmail.com', 'Nuevo Cliente');

        $this->getJson(route('google.callback', ['code' => 'abc']))
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'email', 'role', 'google_connected']])
            ->assertJsonPath('user.email', 'nuevo@gmail.com')
            ->assertJsonPath('user.role', 'client')
            ->assertJsonPath('user.google_connected', true);

        $this->assertDatabaseHas('users', [
            'email' => 'nuevo@gmail.com',
            'google_id' => 'g-123',
            'role' => UserRole::Client->value,
        ]);
    }

    public function test_vincula_una_cuenta_existente_por_correo(): void
    {
        $user = User::factory()->create(['email' => 'ana@gmail.com', 'google_id' => null]);
        $this->fakeGoogleUser('g-999', 'ana@gmail.com', 'Ana');

        $this->getJson(route('google.callback', ['code' => 'abc']))
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $this->assertSame('g-999', $user->fresh()->google_id);
    }

    public function test_login_encuentra_al_usuario_por_google_id_aunque_el_correo_difiera(): void
    {
        $user = User::factory()->create(['email' => 'registrado@example.com', 'google_id' => 'g-777']);
        // El correo de Google puede ser distinto al registrado si ya estaba vinculado.
        $this->fakeGoogleUser('g-777', 'otro@gmail.com', 'Otro Nombre');

        $this->getJson(route('google.callback', ['code' => 'abc']))
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.email', 'registrado@example.com');
    }

    public function test_pide_la_url_de_vinculacion_solo_con_sesion(): void
    {
        $this->getJson(route('google.link-redirect'))->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson(route('google.link-redirect'))
            ->assertOk()
            ->assertJsonStructure(['url']);
    }

    public function test_conecta_google_a_la_cuenta_autenticada_sin_emitir_token(): void
    {
        $user = User::factory()->create(['google_id' => null]);
        $this->fakeGoogleUser('g-555', 'ana.personal@gmail.com', 'Ana');

        $response = $this->getJson(route('google.callback', [
            'code' => 'abc',
            'state' => $this->linkState($user->id),
        ]));

        $response->assertOk()
            ->assertJsonPath('linked', true)
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonMissingPath('token');

        $this->assertSame('g-555', $user->fresh()->google_id);
    }

    public function test_no_permite_conectar_una_cuenta_de_google_ya_usada_por_otro(): void
    {
        User::factory()->create(['google_id' => 'g-taken']);
        $victim = User::factory()->create(['google_id' => null]);
        $this->fakeGoogleUser('g-taken', 'compartido@gmail.com', 'Alguien');

        $this->getJson(route('google.callback', [
            'code' => 'abc',
            'state' => $this->linkState($victim->id),
        ]))->assertStatus(422);

        $this->assertNull($victim->fresh()->google_id);
    }

    public function test_un_state_de_vinculacion_expirado_se_ignora(): void
    {
        $user = User::factory()->create(['google_id' => null]);
        $this->fakeGoogleUser('g-321', 'nuevo2@gmail.com', 'Cliente');

        // Estado ya vencido: cae al flujo normal de login/registro (busca/crea por email).
        $this->getJson(route('google.callback', [
            'code' => 'abc',
            'state' => $this->linkState($user->id, expiresInMinutes: -1),
        ]))
            ->assertOk()
            ->assertJsonStructure(['token']) // emitió token → fue login, no link
            ->assertJsonPath('user.email', 'nuevo2@gmail.com');

        // La cuenta original del usuario autenticado no se tocó.
        $this->assertNull($user->fresh()->google_id);
    }
}

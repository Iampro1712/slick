<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_login_esta_limitado_por_ip(): void
    {
        $limit = (int) config('agenda.rate_limits.auth');

        // Hasta el límite: pasa al controlador (credenciales inválidas → 422).
        for ($i = 0; $i < $limit; $i++) {
            $this->postJson(route('login'), ['email' => 'x@example.com', 'password' => 'mala'])
                ->assertStatus(422);
        }

        // La siguiente petición desde la misma IP se bloquea con 429.
        $this->postJson(route('login'), ['email' => 'x@example.com', 'password' => 'mala'])
            ->assertStatus(429);
    }

    public function test_usa_la_ip_de_cliente_reenviada_por_el_proxy(): void
    {
        $limit = (int) config('agenda.rate_limits.auth');

        // Agotamos el límite para la IP de cliente 1.1.1.1.
        for ($i = 0; $i <= $limit; $i++) {
            $this->withHeader('X-Client-IP', '1.1.1.1')
                ->postJson(route('login'), ['email' => 'x@example.com', 'password' => 'mala']);
        }
        $this->withHeader('X-Client-IP', '1.1.1.1')
            ->postJson(route('login'), ['email' => 'x@example.com', 'password' => 'mala'])
            ->assertStatus(429);

        // Otra IP de cliente no está limitada todavía.
        $this->withHeader('X-Client-IP', '2.2.2.2')
            ->postJson(route('login'), ['email' => 'x@example.com', 'password' => 'mala'])
            ->assertStatus(422);
    }
}

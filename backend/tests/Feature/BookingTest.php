<?php

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
use App\Enums\UserRole;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Models\WorkingHour;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    private const TZ = 'America/Managua';

    private Service $service;

    private StaffMember $staff;

    private CarbonImmutable $date;

    protected function setUp(): void
    {
        parent::setUp();

        // Próximo lunes (siempre en el futuro): coincide con el horario laboral
        // del staff (weekday = 1) y evita que los huecos queden en el pasado.
        $this->date = CarbonImmutable::now(self::TZ)->next(CarbonImmutable::MONDAY);
        $this->service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        $this->staff = StaffMember::factory()->create();
        WorkingHour::factory()->for($this->staff)->create([
            'weekday' => 1,
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
        ]);
        $this->service->staffMembers()->attach($this->staff->id);
    }

    /** Inicio del hueco de las 10:00 (hora del negocio) como ISO en UTC. */
    private function slotAt(string $time): string
    {
        return $this->date->setTimeFromTimeString($time)->utc()->toIso8601String();
    }

    /** Inicia sesión (crear una reserva exige estar autenticado). */
    private function login(): void
    {
        Sanctum::actingAs(User::factory()->create());
    }

    public function test_no_permite_reservar_sin_iniciar_sesion(): void
    {
        $this->postJson(route('booking.store'), [
            'service_id' => $this->service->id,
            'staff_member_id' => $this->staff->id,
            'starts_at' => $this->slotAt('10:00:00'),
            'name' => 'Sin Sesión',
            'phone' => '8888-8888',
        ])->assertUnauthorized();

        $this->assertSame(0, Appointment::count());
    }

    public function test_el_endpoint_de_horarios_devuelve_json(): void
    {
        $response = $this->getJson(route('booking.slots', [
            'service_id' => $this->service->id,
            'staff_member_id' => $this->staff->id,
            'date' => $this->date->format('Y-m-d'),
        ]));

        $response->assertOk()->assertJsonStructure(['slots' => [['value', 'label']]]);
    }

    public function test_un_cliente_puede_reservar_un_hueco_libre(): void
    {
        $this->login();
        $response = $this->postJson(route('booking.store'), [
            'service_id' => $this->service->id,
            'staff_member_id' => $this->staff->id,
            'starts_at' => $this->slotAt('10:00:00'),
            'name' => 'Cliente Prueba',
            'phone' => '8888-8888',
            'email' => 'cliente@prueba.test',
        ]);

        $response->assertCreated()->assertJsonStructure(['appointment' => ['token', 'status']]);
        $this->assertDatabaseHas('appointments', [
            'staff_member_id' => $this->staff->id,
            'service_id' => $this->service->id,
            'status' => AppointmentStatus::Pending->value,
        ]);
        $this->assertDatabaseHas('clients', ['name' => 'Cliente Prueba', 'phone' => '8888-8888']);
    }

    public function test_rechaza_la_doble_reserva_del_mismo_hueco(): void
    {
        // Ya hay una cita confirmada a las 10:00.
        Appointment::factory()
            ->for($this->staff)
            ->for($this->service)
            ->for(Client::factory())
            ->status(AppointmentStatus::Confirmed)
            ->between(
                $this->date->setTimeFromTimeString('10:00:00')->utc(),
                $this->date->setTimeFromTimeString('11:00:00')->utc(),
            )
            ->create();

        $this->login();
        $response = $this->postJson(route('booking.store'), [
            'service_id' => $this->service->id,
            'staff_member_id' => $this->staff->id,
            'starts_at' => $this->slotAt('10:00:00'),
            'name' => 'Segundo Cliente',
            'phone' => '7777-7777',
            'email' => 'segundo@prueba.test',
        ]);

        $response->assertStatus(409);
        // Sólo existe la cita original; la segunda no se creó.
        $this->assertSame(1, Appointment::count());
    }

    public function test_rechaza_una_segunda_reserva_activa_del_mismo_servicio(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        // Reserva activa (pendiente, futura) del usuario para el servicio a las 10:00.
        Appointment::factory()->for($this->staff)->for($this->service)->for(Client::factory())
            ->status(AppointmentStatus::Pending)
            ->between(
                $this->date->setTimeFromTimeString('10:00:00')->utc(),
                $this->date->setTimeFromTimeString('11:00:00')->utc(),
            )->create(['user_id' => $user->id]);

        // Intenta reservar el MISMO servicio en otro hueco.
        $response = $this->postJson(route('booking.store'), [
            'service_id' => $this->service->id,
            'staff_member_id' => $this->staff->id,
            'starts_at' => $this->slotAt('11:00:00'),
            'name' => 'Cliente Prueba',
            'phone' => '8888-8888',
            'email' => 'cliente@prueba.test',
        ]);

        $response->assertStatus(409)->assertJsonPath('code', 'duplicate_active_booking');
        $this->assertSame(1, Appointment::count());
    }

    public function test_tras_cancelar_puede_reservar_el_servicio_de_nuevo(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        // Reserva del usuario ya cancelada → no cuenta como activa.
        Appointment::factory()->for($this->staff)->for($this->service)->for(Client::factory())
            ->status(AppointmentStatus::Cancelled)
            ->between(
                $this->date->setTimeFromTimeString('10:00:00')->utc(),
                $this->date->setTimeFromTimeString('11:00:00')->utc(),
            )->create(['user_id' => $user->id]);

        $this->postJson(route('booking.store'), [
            'service_id' => $this->service->id,
            'staff_member_id' => $this->staff->id,
            'starts_at' => $this->slotAt('11:00:00'),
            'name' => 'Cliente Prueba',
            'phone' => '8888-8888',
            'email' => 'cliente@prueba.test',
        ])->assertCreated();
    }

    public function test_permite_reservar_un_servicio_distinto_con_otra_activa(): void
    {
        $other = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        $other->staffMembers()->attach($this->staff->id);

        $user = User::factory()->create();
        Sanctum::actingAs($user);
        Appointment::factory()->for($this->staff)->for($this->service)->for(Client::factory())
            ->status(AppointmentStatus::Confirmed)
            ->between(
                $this->date->setTimeFromTimeString('10:00:00')->utc(),
                $this->date->setTimeFromTimeString('11:00:00')->utc(),
            )->create(['user_id' => $user->id]);

        // Otro servicio sí se permite, aunque tenga una activa del primero.
        $this->postJson(route('booking.store'), [
            'service_id' => $other->id,
            'staff_member_id' => $this->staff->id,
            'starts_at' => $this->slotAt('11:00:00'),
            'name' => 'Cliente Prueba',
            'phone' => '8888-8888',
            'email' => 'cliente@prueba.test',
        ])->assertCreated();
    }

    public function test_exige_telefono_y_email_al_reservar(): void
    {
        $this->login();
        $base = [
            'service_id' => $this->service->id,
            'staff_member_id' => $this->staff->id,
            'starts_at' => $this->slotAt('10:00:00'),
            'name' => 'Cliente Prueba',
        ];

        // Sin email → 422.
        $this->postJson(route('booking.store'), $base + ['phone' => '8888-8888'])
            ->assertStatus(422)->assertJsonValidationErrorFor('email');

        // Sin teléfono → 422.
        $this->postJson(route('booking.store'), $base + ['email' => 'cliente@prueba.test'])
            ->assertStatus(422)->assertJsonValidationErrorFor('phone');

        $this->assertSame(0, Appointment::count());
    }

    public function test_rechaza_un_telefono_con_formato_invalido(): void
    {
        $this->login();
        $base = [
            'service_id' => $this->service->id,
            'staff_member_id' => $this->staff->id,
            'starts_at' => $this->slotAt('10:00:00'),
            'name' => 'Cliente Prueba',
            'email' => 'cliente@prueba.test',
        ];

        foreach (['88889999', '8888-999', '888-88888', 'abcd-efgh'] as $bad) {
            $this->postJson(route('booking.store'), $base + ['phone' => $bad])
                ->assertStatus(422)->assertJsonValidationErrorFor('phone');
        }

        // El formato correcto (8 dígitos con guion) sí se acepta.
        $this->postJson(route('booking.store'), $base + ['phone' => '8855-9869'])
            ->assertCreated();
    }

    /** Crea una cita a las 10:00 propiedad del usuario dado (o sin dueño). */
    private function appointmentFor(?User $user): Appointment
    {
        return Appointment::factory()
            ->for($this->staff)
            ->for($this->service)
            ->for(Client::factory())
            ->status(AppointmentStatus::Pending)
            ->between(
                $this->date->setTimeFromTimeString('10:00:00')->utc(),
                $this->date->setTimeFromTimeString('11:00:00')->utc(),
            )
            ->create($user ? ['user_id' => $user->id] : []);
    }

    public function test_el_dueno_puede_cancelar_su_cita(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $appointment = $this->appointmentFor($user);

        $this->deleteJson(route('booking.cancel', $appointment->public_token))->assertOk();

        $this->assertSame(AppointmentStatus::Cancelled, $appointment->fresh()->status);
    }

    public function test_el_dueno_puede_ver_su_cita(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $appointment = $this->appointmentFor($user);

        $this->getJson(route('booking.show', $appointment->public_token))
            ->assertOk()
            ->assertJsonPath('appointment.token', $appointment->public_token);
    }

    public function test_no_permite_ver_una_cita_sin_iniciar_sesion(): void
    {
        $appointment = $this->appointmentFor(User::factory()->create());

        $this->getJson(route('booking.show', $appointment->public_token))
            ->assertUnauthorized();
    }

    public function test_no_permite_ver_la_cita_de_otro_usuario(): void
    {
        $owner = User::factory()->create();
        $appointment = $this->appointmentFor($owner);

        // Otro cliente, con el token en mano, no puede verla ni cancelarla (404).
        $intruder = User::factory()->create();
        Sanctum::actingAs($intruder);

        $this->getJson(route('booking.show', $appointment->public_token))->assertNotFound();
        $this->deleteJson(route('booking.cancel', $appointment->public_token))->assertNotFound();
        $this->assertSame(AppointmentStatus::Pending, $appointment->fresh()->status);
    }

    public function test_un_rol_del_negocio_puede_ver_cualquier_cita(): void
    {
        $client = User::factory()->create();
        $appointment = $this->appointmentFor($client);

        $owner = User::factory()->create(['role' => UserRole::Owner]);
        Sanctum::actingAs($owner);

        $this->getJson(route('booking.show', $appointment->public_token))->assertOk();
    }
}

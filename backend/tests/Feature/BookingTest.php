<?php

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
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

        $this->date = CarbonImmutable::parse('2026-07-06', self::TZ); // lunes
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
        ])->assertCreated();
    }

    public function test_se_puede_cancelar_una_cita_por_su_token(): void
    {
        $appointment = Appointment::factory()
            ->for($this->staff)
            ->for($this->service)
            ->for(Client::factory())
            ->status(AppointmentStatus::Pending)
            ->between(
                $this->date->setTimeFromTimeString('10:00:00')->utc(),
                $this->date->setTimeFromTimeString('11:00:00')->utc(),
            )
            ->create();

        $this->deleteJson(route('booking.cancel', $appointment->public_token))->assertOk();

        $this->assertSame(AppointmentStatus::Cancelled, $appointment->fresh()->status);
    }
}

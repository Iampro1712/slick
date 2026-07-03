<?php

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
use App\Jobs\SendAppointmentReminder;
use App\Mail\AppointmentConfirmationMail;
use App\Mail\AppointmentReminderMail;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\User;
use App\Models\WorkingHour;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReminderTest extends TestCase
{
    use RefreshDatabase;

    private Service $service;

    private StaffMember $staff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        $this->staff = StaffMember::factory()->create();
    }

    private function appointmentAt(
        \DateTimeInterface $startsAt,
        ?string $email = 'cliente@correo.test',
        AppointmentStatus $status = AppointmentStatus::Confirmed,
        ?\DateTimeInterface $reminderSentAt = null,
    ): Appointment {
        $client = Client::factory()->create(['email' => $email]);

        return Appointment::factory()
            ->for($this->staff)
            ->for($this->service)
            ->for($client)
            ->status($status)
            ->create([
                'starts_at' => $startsAt,
                'ends_at' => CarbonImmutable::parse($startsAt)->addHour(),
                'reminder_sent_at' => $reminderSentAt,
            ]);
    }

    public function test_el_comando_encola_solo_las_citas_dentro_de_la_ventana(): void
    {
        Queue::fake();

        // Sí: confirmada, con email, dentro de las próximas horas.
        $this->appointmentAt(now()->addHours(2));
        // No: fuera de la ventana (>24h por defecto).
        $this->appointmentAt(now()->addDays(3));
        // No: sin email.
        $this->appointmentAt(now()->addHours(2), email: null);
        // No: ya se le envió recordatorio.
        $this->appointmentAt(now()->addHours(2), reminderSentAt: now());
        // No: cancelada.
        $this->appointmentAt(now()->addHours(2), status: AppointmentStatus::Cancelled);

        $this->artisan('appointments:send-reminders')->assertSuccessful();

        Queue::assertPushed(SendAppointmentReminder::class, 1);
    }

    public function test_el_job_envia_el_recordatorio_y_marca_la_fecha(): void
    {
        Mail::fake();
        $appointment = $this->appointmentAt(now()->addHours(2));

        (new SendAppointmentReminder($appointment->id))->handle();

        Mail::assertQueued(AppointmentReminderMail::class);
        $this->assertNotNull($appointment->fresh()->reminder_sent_at);
    }

    public function test_el_job_es_idempotente_si_ya_se_envio(): void
    {
        Mail::fake();
        $appointment = $this->appointmentAt(now()->addHours(2), reminderSentAt: now());

        (new SendAppointmentReminder($appointment->id))->handle();

        Mail::assertNothingQueued();
    }

    public function test_reservar_con_correo_envia_email_de_confirmacion(): void
    {
        Mail::fake();
        Sanctum::actingAs(User::factory()->create()); // reservar requiere sesión
        WorkingHour::factory()->for($this->staff)->create([
            'weekday' => 1, 'start_time' => '09:00:00', 'end_time' => '17:00:00',
        ]);
        $this->service->staffMembers()->attach($this->staff->id);

        $monday = CarbonImmutable::parse('2026-07-06', 'America/Managua');

        $this->postJson(route('booking.store'), [
            'service_id' => $this->service->id,
            'staff_member_id' => $this->staff->id,
            'starts_at' => $monday->setTimeFromTimeString('10:00:00')->utc()->toIso8601String(),
            'name' => 'Cliente Correo',
            'email' => 'nuevo@correo.test',
        ])->assertCreated();

        Mail::assertQueued(AppointmentConfirmationMail::class);
    }
}

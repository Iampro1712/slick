<?php

namespace Tests\Feature;

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Client;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\TimeOff;
use App\Models\WorkingHour;
use App\Services\AvailabilityService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class AvailabilityServiceTest extends TestCase
{
    use RefreshDatabase;

    private const TZ = 'America/Managua';

    private AvailabilityService $service;

    private CarbonImmutable $date;

    protected function setUp(): void
    {
        parent::setUp();

        // El paso entre inicios = bloque del servicio (duración+margen). Sin
        // antelación mínima → resultados deterministas.
        $this->service = new AvailabilityService(minLeadMinutes: 0, timezone: self::TZ);

        // Un lunes cualquiera en el futuro (evita el filtro de "ya pasó").
        $this->date = CarbonImmutable::parse('2026-07-06', self::TZ);
        $this->assertSame(1, $this->date->dayOfWeek); // 1 = lunes
    }

    /**
     * Crea un profesional con una o varias ventanas de horario para el día indicado.
     *
     * @param  array<int, array{0: string, 1: string}>  $windows
     */
    private function staffWithHours(array $windows, int $weekday): StaffMember
    {
        $staff = StaffMember::factory()->create();

        foreach ($windows as [$start, $end]) {
            WorkingHour::factory()->for($staff)->create([
                'weekday' => $weekday,
                'start_time' => $start,
                'end_time' => $end,
            ]);
        }

        return $staff;
    }

    /**
     * Reserva un bloque ocupado en hora local del negocio (lo guarda en UTC, como en producción).
     */
    private function bookBusy(
        StaffMember $staff,
        Service $service,
        string $from,
        string $to,
        AppointmentStatus $status = AppointmentStatus::Confirmed,
    ): void {
        Appointment::factory()
            ->for($staff)
            ->for($service)
            ->for(Client::factory())
            ->status($status)
            ->between(
                $this->date->setTimeFromTimeString($from)->utc(),
                $this->date->setTimeFromTimeString($to)->utc(),
            )
            ->create();
    }

    /**
     * Devuelve los huecos como strings 'H:i' en hora del negocio, para aserciones legibles.
     *
     * @param  Collection<int, CarbonImmutable>  $slots
     * @return list<string>
     */
    private function times(Collection $slots): array
    {
        return $slots->map(fn (CarbonImmutable $slot) => $slot->setTimezone(self::TZ)->format('H:i'))->all();
    }

    public function test_devuelve_vacio_si_el_profesional_no_trabaja_ese_dia(): void
    {
        $service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        // Horario sólo el martes (2); pedimos un lunes.
        $staff = $this->staffWithHours([['09:00:00', '17:00:00']], weekday: 2);

        $slots = $this->service->slotsForStaff($service, $staff, $this->date);

        $this->assertTrue($slots->isEmpty());
    }

    public function test_genera_huecos_cada_paso_dentro_de_la_ventana(): void
    {
        $service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        $staff = $this->staffWithHours([['09:00:00', '12:00:00']], weekday: 1);

        $slots = $this->service->slotsForStaff($service, $staff, $this->date);

        // Bloques de 60 min, paso 60: 9, 10, 11 (11→12 cabe justo).
        $this->assertSame(['09:00', '10:00', '11:00'], $this->times($slots));
    }

    public function test_los_inicios_se_alinean_a_la_duracion_del_servicio(): void
    {
        // Servicio de 35 min: los inicios van cada 35 min (no en rejilla fija de 15).
        $service = Service::factory()->create(['duration_min' => 35, 'buffer_min' => 0]);
        $staff = $this->staffWithHours([['09:00:00', '11:00:00']], weekday: 1);

        $slots = $this->service->slotsForStaff($service, $staff, $this->date);

        // 9:00→9:35, 9:35→10:10, 10:10→10:45; 10:45→11:20 se pasa del cierre → 3 inicios.
        $this->assertSame(['09:00', '09:35', '10:10'], $this->times($slots));
    }

    public function test_el_margen_aumenta_el_espacio_entre_inicios(): void
    {
        // Mismo servicio de 35 min pero con 15 de margen = bloque 50 → inicios cada 50.
        $service = Service::factory()->create(['duration_min' => 35, 'buffer_min' => 15]);
        $staff = $this->staffWithHours([['09:00:00', '11:00:00']], weekday: 1);

        $slots = $this->service->slotsForStaff($service, $staff, $this->date);

        // 9:00→9:50, 9:50→10:40, 10:40→11:30 (se pasa) → 2 inicios separados 50 min.
        $this->assertSame(['09:00', '09:50'], $this->times($slots));
    }

    public function test_incluye_el_hueco_que_termina_justo_al_cierre(): void
    {
        $service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        $staff = $this->staffWithHours([['09:00:00', '10:00:00']], weekday: 1);

        $slots = $this->service->slotsForStaff($service, $staff, $this->date);

        // 09:00→10:00 cabe exacto; 10:00→11:00 se pasaría del cierre.
        $this->assertSame(['09:00'], $this->times($slots));
    }

    public function test_no_ofrece_huecos_en_un_dia_lleno(): void
    {
        $service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        $staff = $this->staffWithHours([['09:00:00', '10:00:00']], weekday: 1);
        $this->bookBusy($staff, $service, '09:00:00', '10:00:00');

        $slots = $this->service->slotsForStaff($service, $staff, $this->date);

        $this->assertTrue($slots->isEmpty());
    }

    public function test_respeta_el_buffer_de_limpieza(): void
    {
        // Servicio 30 + 15 buffer = bloque de 45 min; el paso entre inicios es 45.
        $service = Service::factory()->create(['duration_min' => 30, 'buffer_min' => 15]);
        $staff = $this->staffWithHours([['09:00:00', '11:00:00']], weekday: 1);

        // Cita 09:00–09:45 (ends_at ya incluye el buffer).
        $this->bookBusy($staff, $service, '09:00:00', '09:45:00');

        $times = $this->times($this->service->slotsForStaff($service, $staff, $this->date));

        // El primer (y único, por la ventana) hueco libre es 09:45, justo cuando
        // termina el bloque ocupado. 10:30 no cabe (10:30+45=11:15 > 11:00).
        $this->assertSame(['09:45'], $times);
    }

    public function test_el_descanso_del_profesional_no_muestra_huecos(): void
    {
        $service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        $staff = $this->staffWithHours([['09:00:00', '17:00:00']], weekday: 1);
        // Almuerzo de 12:00 a 13:00.
        $staff->update(['break_start' => '12:00', 'break_minutes' => 60]);

        $times = $this->times($this->service->slotsForStaff($service, $staff, $this->date));

        $this->assertNotContains('12:00', $times);
        $this->assertContains('11:00', $times); // termina justo al empezar el descanso
        $this->assertContains('13:00', $times); // primer hueco tras el descanso
    }

    public function test_un_time_off_de_negocio_parte_el_dia(): void
    {
        $service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        $staff = $this->staffWithHours([['09:00:00', '17:00:00']], weekday: 1);

        // Cierre general de 12:00 a 13:00 (sin profesional asociado).
        TimeOff::factory()->businessWide()->create([
            'starts_at' => $this->date->setTimeFromTimeString('12:00:00')->utc(),
            'ends_at' => $this->date->setTimeFromTimeString('13:00:00')->utc(),
        ]);

        $times = $this->times($this->service->slotsForStaff($service, $staff, $this->date));

        $this->assertNotContains('12:00', $times);
        $this->assertContains('11:00', $times);
        $this->assertContains('13:00', $times);
    }

    public function test_una_cita_cancelada_libera_su_hueco(): void
    {
        $service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);
        $staff = $this->staffWithHours([['09:00:00', '10:00:00']], weekday: 1);
        $this->bookBusy($staff, $service, '09:00:00', '10:00:00', AppointmentStatus::Cancelled);

        $slots = $this->service->slotsForStaff($service, $staff, $this->date);

        $this->assertSame(['09:00'], $this->times($slots));
    }

    public function test_cualquier_profesional_une_los_huecos(): void
    {
        $service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);

        $ana = $this->staffWithHours([['09:00:00', '10:00:00']], weekday: 1);
        $luis = $this->staffWithHours([['10:00:00', '11:00:00']], weekday: 1);
        $service->staffMembers()->attach([$ana->id, $luis->id]);

        $slots = $this->service->slotsFor($service, null, $this->date);

        // Unión de huecos de Ana (09:00) y Luis (10:00).
        $this->assertSame(['09:00', '10:00'], $this->times($slots));
    }

    public function test_descarta_huecos_que_ya_pasaron_si_es_hoy(): void
    {
        $service = Service::factory()->create(['duration_min' => 60, 'buffer_min' => 0]);

        $today = CarbonImmutable::now(self::TZ)->next(CarbonImmutable::MONDAY);
        $staff = $this->staffWithHours([['09:00:00', '17:00:00']], weekday: $today->dayOfWeek);

        // Tratamos $today como "hoy" pasándolo también como $now a las 12:30.
        $now = $today->setTimeFromTimeString('12:30:00');
        $times = $this->times($this->service->slotsForStaff($service, $staff, $today, $now));

        $this->assertNotContains('09:00', $times);
        $this->assertNotContains('12:00', $times);
        $this->assertContains('13:00', $times);
    }
}

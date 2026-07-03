<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\StaffMember;
use App\Models\TimeOff;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Motor de disponibilidad: dado un servicio, un profesional (o "cualquiera")
 * y una fecha, calcula la lista de horas de inicio realmente reservables.
 *
 * Lógica pura y sin estado: recibe lo que necesita y devuelve resultados,
 * lo que la hace 100% testeable. Todo el cálculo ocurre en la zona horaria
 * del negocio; los datos de la BD se guardan en UTC y se convierten aquí.
 */
class AvailabilityService
{
    public function __construct(
        private readonly int $minLeadMinutes = 0,
        private readonly string $timezone = 'America/Managua',
    ) {}

    /**
     * Huecos disponibles para un servicio en una fecha.
     *
     * Si $staff es null se calcula la unión de huecos de todos los
     * profesionales activos que dan el servicio ("cualquier profesional").
     *
     * @return Collection<int, CarbonImmutable>  inicios disponibles, ordenados
     */
    public function slotsFor(
        Service $service,
        ?StaffMember $staff,
        CarbonInterface $date,
        ?CarbonInterface $now = null,
    ): Collection {
        if ($staff !== null) {
            return $this->slotsForStaff($service, $staff, $date, $now);
        }

        $staffMembers = $service->staffMembers()
            ->where('is_active', true)
            ->get();

        return $staffMembers
            ->flatMap(fn (StaffMember $member) => $this->slotsForStaff($service, $member, $date, $now))
            ->unique(fn (CarbonImmutable $slot) => $slot->getTimestamp())
            ->sort()
            ->values();
    }

    /**
     * Huecos disponibles para un profesional concreto en una fecha.
     *
     * @return Collection<int, CarbonImmutable>
     */
    public function slotsForStaff(
        Service $service,
        StaffMember $staff,
        CarbonInterface $date,
        ?CarbonInterface $now = null,
    ): Collection {
        $date = CarbonImmutable::parse($date)->setTimezone($this->timezone)->startOfDay();

        // 1. Ventanas de horario laboral del profesional para ese día de la semana.
        $windows = $staff->workingHours()
            ->where('weekday', $date->dayOfWeek)
            ->get();

        if ($windows->isEmpty()) {
            return collect();
        }

        // 2. Intervalos ocupados: citas que bloquean + ausencias (time-offs).
        $busy = $this->busyIntervals($staff, $date);

        // 3. Duración del bloque que ocupa una cita (servicio + buffer). Es también
        //    el paso entre inicios: los huecos se ofrecen alineados a lo que dura la
        //    cita (35 min → 9:00, 9:35…; con margen 15 → 9:00, 9:50…), sin huecos
        //    muertos. El dueño regula el espacio entre citas con el "margen" del servicio.
        $blockMinutes = $service->blockMinutes();

        // 4-5. Generar candidatos por ventana (paso = bloque) y descartar los que solapan.
        $slots = collect();

        foreach ($windows as $window) {
            $windowStart = $date->setTimeFromTimeString($window->start_time);
            $windowEnd = $date->setTimeFromTimeString($window->end_time);

            $candidate = $windowStart;

            while ($candidate->addMinutes($blockMinutes)->lessThanOrEqualTo($windowEnd)) {
                $blockEnd = $candidate->addMinutes($blockMinutes);

                if (! $this->overlapsAny($candidate, $blockEnd, $busy)) {
                    $slots->push($candidate);
                }

                $candidate = $candidate->addMinutes($blockMinutes);
            }
        }

        // 6. Descartar huecos que ya pasaron (margen mínimo) si la fecha es hoy.
        $now = $now !== null
            ? CarbonImmutable::parse($now)->setTimezone($this->timezone)
            : CarbonImmutable::now($this->timezone);

        if ($date->isSameDay($now)) {
            $cutoff = $now->addMinutes($this->minLeadMinutes);
            $slots = $slots->filter(fn (CarbonImmutable $slot) => $slot->greaterThanOrEqualTo($cutoff));
        }

        return $slots
            ->unique(fn (CarbonImmutable $slot) => $slot->getTimestamp())
            ->sort()
            ->values();
    }

    /**
     * Intervalos ocupados [inicio, fin) del profesional en el día, en zona del negocio.
     *
     * @return Collection<int, array{0: CarbonImmutable, 1: CarbonImmutable}>
     */
    private function busyIntervals(StaffMember $staff, CarbonImmutable $date): Collection
    {
        $dayStartUtc = $date->startOfDay()->utc();
        $dayEndUtc = $date->endOfDay()->utc();

        $appointments = Appointment::query()
            ->where('staff_member_id', $staff->id)
            ->blocking()
            ->overlapping($dayStartUtc, $dayEndUtc)
            ->get(['starts_at', 'ends_at']);

        // Ausencias propias del profesional o de todo el negocio (staff_member_id null).
        $timeOffs = TimeOff::query()
            ->where(function ($query) use ($staff) {
                $query->whereNull('staff_member_id')
                    ->orWhere('staff_member_id', $staff->id);
            })
            ->where('starts_at', '<', $dayEndUtc)
            ->where('ends_at', '>', $dayStartUtc)
            ->get(['starts_at', 'ends_at']);

        $intervals = $appointments->concat($timeOffs)->map(fn ($interval) => [
            CarbonImmutable::parse($interval->starts_at)->setTimezone($this->timezone),
            CarbonImmutable::parse($interval->ends_at)->setTimezone($this->timezone),
        ])->values();

        // Descanso/almuerzo diario del profesional (hora local del negocio).
        if ($staff->hasBreak()) {
            $breakStart = $date->setTimeFromTimeString((string) $staff->break_start);
            $intervals->push([$breakStart, $breakStart->addMinutes((int) $staff->break_minutes)]);
        }

        return $intervals;
    }

    /**
     * ¿El bloque [start, end) solapa con algún intervalo ocupado?
     *
     * @param  Collection<int, array{0: CarbonImmutable, 1: CarbonImmutable}>  $busy
     */
    private function overlapsAny(CarbonImmutable $start, CarbonImmutable $end, Collection $busy): bool
    {
        foreach ($busy as [$busyStart, $busyEnd]) {
            if ($start->lessThan($busyEnd) && $end->greaterThan($busyStart)) {
                return true;
            }
        }

        return false;
    }
}

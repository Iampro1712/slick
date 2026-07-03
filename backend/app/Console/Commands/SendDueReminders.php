<?php

namespace App\Console\Commands;

use App\Enums\AppointmentStatus;
use App\Jobs\SendAppointmentReminder;
use App\Models\Appointment;
use Illuminate\Console\Command;

/**
 * Busca citas próximas dentro de la ventana de recordatorio y encola un job
 * por cada una. Pensado para correr cada minuto desde el scheduler.
 */
class SendDueReminders extends Command
{
    protected $signature = 'appointments:send-reminders';

    protected $description = 'Encola recordatorios de las citas próximas que aún no se han avisado.';

    public function handle(): int
    {
        $leadHours = (int) config('agenda.reminders.lead_hours');
        $now = now();
        $until = $now->copy()->addHours($leadHours);

        $count = 0;

        Appointment::query()
            ->whereIn('status', [AppointmentStatus::Pending->value, AppointmentStatus::Confirmed->value])
            ->whereNull('reminder_sent_at')
            ->whereBetween('starts_at', [$now, $until])
            ->whereHas('client', fn ($q) => $q->whereNotNull('email'))
            ->each(function (Appointment $appointment) use (&$count) {
                SendAppointmentReminder::dispatch($appointment->id);
                $count++;
            });

        $this->info("Recordatorios encolados: {$count}");

        return self::SUCCESS;
    }
}

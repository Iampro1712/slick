<?php

namespace App\Jobs;

use App\Enums\AppointmentStatus;
use App\Mail\AppointmentReminderMail;
use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

/**
 * Envía el recordatorio por email de una cita y marca reminder_sent_at.
 * Idempotente: si ya se envió o la cita dejó de estar activa, no hace nada.
 */
class SendAppointmentReminder implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $appointmentId) {}

    public function handle(): void
    {
        $appointment = Appointment::with(['client', 'service', 'staffMember'])->find($this->appointmentId);

        if ($appointment === null || $appointment->reminder_sent_at !== null) {
            return;
        }

        $stillActive = in_array($appointment->status, [AppointmentStatus::Pending, AppointmentStatus::Confirmed], true);

        if (! $stillActive || ! $appointment->client->email) {
            return;
        }

        Mail::to($appointment->client->email)->send(new AppointmentReminderMail($appointment));

        $appointment->forceFill(['reminder_sent_at' => now()])->save();
    }
}

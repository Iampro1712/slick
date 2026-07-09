<?php

namespace App\Mail;

use App\Models\Appointment;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Appointment $appointment) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Recordatorio de tu cita');
    }

    public function content(): Content
    {
        $tz = (string) config('agenda.timezone');
        $start = CarbonImmutable::parse($this->appointment->starts_at)->setTimezone($tz);

        // El enlace va al FRONTEND (Next.js), no a la API.
        $frontend = rtrim((string) config('agenda.frontend_url'), '/');

        return new Content(
            markdown: 'mail.appointments.reminder',
            with: [
                'appointment' => $this->appointment,
                'date' => $start->isoFormat('dddd D [de] MMMM, YYYY'),
                'time' => $start->format('H:i'),
                'url' => $frontend.'/cita/'.$this->appointment->public_token,
            ],
        );
    }
}

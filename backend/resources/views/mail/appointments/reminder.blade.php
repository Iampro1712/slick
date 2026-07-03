<x-mail::message>
# Recordatorio de tu cita

Hola {{ $appointment->client->name }}, te recordamos tu próxima cita:

<x-mail::panel>
**Servicio:** {{ $appointment->service->name }}
**Profesional:** {{ $appointment->staffMember->name }}
**Fecha:** {{ $date }}
**Hora:** {{ $time }}
</x-mail::panel>

<x-mail::button :url="$url">
Ver mi cita
</x-mail::button>

Si ya no puedes asistir, cancélala desde el enlace de arriba para liberar el horario.

Gracias,<br>
{{ config('app.name') }}
</x-mail::message>

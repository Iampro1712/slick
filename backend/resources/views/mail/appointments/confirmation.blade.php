<x-mail::message>
# Hemos recibido tu cita

Hola {{ $appointment->client->name }}, tu cita ha quedado registrada con estos datos:

<x-mail::panel>
**Servicio:** {{ $appointment->service->name }}
**Profesional:** {{ $appointment->staffMember->name }}
**Fecha:** {{ $date }}
**Hora:** {{ $time }}
</x-mail::panel>

<x-mail::button :url="$url">
Ver mi cita
</x-mail::button>

Si necesitas cancelarla, puedes hacerlo desde el enlace de arriba.

Gracias,<br>
{{ config('app.name') }}
</x-mail::message>

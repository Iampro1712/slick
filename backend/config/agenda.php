<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Zona horaria del negocio
    |--------------------------------------------------------------------------
    |
    | Todo se guarda en UTC en la base de datos; los horarios laborales y los
    | huecos disponibles se calculan y presentan en esta zona (Nicaragua, GMT-6).
    |
    */
    'timezone' => env('AGENDA_TIMEZONE', 'America/Managua'),

    /*
    |--------------------------------------------------------------------------
    | Motor de disponibilidad
    |--------------------------------------------------------------------------
    |
    | Los inicios candidatos se alinean a la duración del servicio (duración +
    | margen): el "margen" de cada servicio es la palanca para dejar más tiempo
    | entre citas. No hay un paso fijo global.
    |
    | min_lead_minutes: antelación mínima para reservar (descarta huecos
    |                   demasiado cercanos a "ahora" cuando la fecha es hoy).
    |
    */
    'availability' => [
        'min_lead_minutes' => (int) env('AGENDA_MIN_LEAD_MINUTES', 0),
    ],

    /*
    |--------------------------------------------------------------------------
    | Recordatorios
    |--------------------------------------------------------------------------
    |
    | Antelación (en horas) con la que se envía el recordatorio de la cita.
    |
    */
    'reminders' => [
        'lead_hours' => (int) env('AGENDA_REMINDER_LEAD_HOURS', 24),
    ],

    /*
    |--------------------------------------------------------------------------
    | Límites de peticiones (rate limiting) por IP del cliente
    |--------------------------------------------------------------------------
    |
    | Peticiones por minuto y por IP. Como el frontend hace de BFF, la IP real
    | del cliente llega en la cabecera 'X-Client-IP' (la pone el proxy de Next);
    | si no está, se usa la IP de la petición.
    |
    | api:     límite general de la API.
    | auth:    login y registro (más estricto, frena fuerza bruta).
    | booking: crear reservas.
    |
    */
    'rate_limits' => [
        'api' => (int) env('RATE_LIMIT_API', 60),
        'auth' => (int) env('RATE_LIMIT_AUTH', 10),
        'booking' => (int) env('RATE_LIMIT_BOOKING', 20),
    ],

    /*
    |--------------------------------------------------------------------------
    | Secreto del BFF
    |--------------------------------------------------------------------------
    |
    | Si se define (igual aquí y en el frontend), la cabecera 'X-Client-IP' solo
    | se confía cuando llega acompañada de 'X-Bff-Secret' correcto. Evita que un
    | atacante con acceso directo a la API falsee su IP para saltarse el rate
    | limit. Vacío = se confía siempre (cómodo en local).
    |
    */
    'bff_secret' => (string) env('BFF_SECRET', ''),

];

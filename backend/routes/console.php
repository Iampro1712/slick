<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Cada minuto se revisa qué citas necesitan recordatorio y se encolan.
Schedule::command('appointments:send-reminders')
    ->everyMinute()
    ->withoutOverlapping();

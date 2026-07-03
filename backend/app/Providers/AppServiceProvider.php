<?php

namespace App\Providers;

use App\Services\AvailabilityService;
use App\Services\BookingService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(AvailabilityService::class, fn () => new AvailabilityService(
            minLeadMinutes: (int) config('agenda.availability.min_lead_minutes'),
            timezone: (string) config('agenda.timezone'),
        ));

        $this->app->singleton(BookingService::class, fn ($app) => new BookingService(
            availability: $app->make(AvailabilityService::class),
            timezone: (string) config('agenda.timezone'),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Nombres de días/meses en español al formatear fechas para los clientes.
        \Carbon\CarbonImmutable::setLocale('es');
        \Carbon\Carbon::setLocale('es');

        $this->configureRateLimiting();
    }

    /**
     * Limitadores por IP del cliente. La IP real llega en 'X-Client-IP' (la pone
     * el proxy de Next, que es quien ve al cliente); si no, se usa la de la petición.
     */
    private function configureRateLimiting(): void
    {
        $bffSecret = (string) config('agenda.bff_secret');

        // Solo confiamos en la IP reenviada por el BFF si no hay secreto
        // configurado (local) o si el secreto de la cabecera coincide.
        $by = function (Request $request) use ($bffSecret): string {
            $trusted = $bffSecret === ''
                || hash_equals($bffSecret, (string) $request->header('X-Bff-Secret'));

            $clientIp = $trusted ? $request->header('X-Client-IP') : null;

            return $clientIp ?: (string) $request->ip();
        };

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(
            (int) config('agenda.rate_limits.api')
        )->by($by($request)));

        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(
            (int) config('agenda.rate_limits.auth')
        )->by($by($request)));

        RateLimiter::for('booking', fn (Request $request) => Limit::perMinute(
            (int) config('agenda.rate_limits.booking')
        )->by($by($request)));
    }
}

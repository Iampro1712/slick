<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
            'owner' => \App\Http\Middleware\EnsureUserIsOwner::class,
            'business' => \App\Http\Middleware\EnsureBusinessAccess::class,
        ]);

        // El contenedor solo recibe tráfico del reverse proxy de Dokploy
        // (Traefik), que termina el TLS y reenvía HTTP plano puerto 8080. Sin
        // esto, Laravel no detecta la petición original como HTTPS (afecta
        // cookies seguras y URLs generadas fuera de un request, p. ej. en
        // colas). '*' es seguro aquí: no hay tráfico directo a la app.
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO,
        );
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();

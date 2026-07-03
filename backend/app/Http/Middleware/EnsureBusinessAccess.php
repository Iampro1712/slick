<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Permite el acceso al panel del negocio a los roles del lado del negocio
 * (admin, dueño y staff). Deja fuera a los clientes.
 */
class EnsureBusinessAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->hasBusinessAccess()) {
            abort(403, 'No tienes acceso al panel del negocio.');
        }

        return $next($request);
    }
}

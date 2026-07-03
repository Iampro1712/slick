<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Restringe rutas al dueño del negocio (configurar servicios y profesionales).
 * El admin supervisa (puede leer), pero no configura el negocio.
 */
class EnsureUserIsOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->isOwner()) {
            abort(403, 'Solo el dueño del negocio puede configurar esta sección.');
        }

        return $next($request);
    }
}

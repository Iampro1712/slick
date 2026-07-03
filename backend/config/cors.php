<?php

return [

    /*
    |--------------------------------------------------------------------------
    | CORS — permite que el frontend (Next.js) consuma la API
    |--------------------------------------------------------------------------
    |
    | Usamos auth por token Bearer (Sanctum), así que NO necesitamos cookies
    | (supports_credentials = false). Los orígenes permitidos se configuran por
    | env (FRONTEND_URL), con localhost:3000 por defecto en desarrollo.
    |
    */

    'paths' => ['api/*', 'login', 'logout', 'me', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter([
        env('FRONTEND_URL', 'http://localhost:3000'),
    ]),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];

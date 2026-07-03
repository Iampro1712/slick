<?php

use Illuminate\Support\Facades\Route;

// Este proyecto es una API REST (ver routes/api.php). El frontend vive aparte
// (Next.js). La raíz solo informa que la API está viva.
Route::get('/', fn () => response()->json([
    'name' => 'Slick API',
    'docs' => 'Consume los endpoints bajo /api',
]));

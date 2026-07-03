<?php

use App\Http\Controllers\Admin\AppointmentController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ServiceController;
use App\Http\Controllers\Admin\StaffMemberController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\Platform\OwnerAccountController;
use App\Http\Controllers\BookingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
| Todas las rutas viven bajo /api/v1. Versionar permite publicar un v2 en el
| futuro sin romper a los clientes que ya consumen v1. Los nombres de ruta no
| cambian (siguen siendo booking.*, admin.*…); solo cambia la URL.
|
| Todo el grupo lleva un rate limit general por IP ('throttle:api'); login,
| registro y reserva añaden límites más estrictos encima.
*/
Route::prefix('v1')->middleware('throttle:api')->group(function () {
    /*
    |----------------------------------------------------------------------
    | Reserva
    |----------------------------------------------------------------------
    | Servicios, huecos y ver/cancelar por token son públicos. Crear una
    | reserva requiere sesión iniciada (el frontend redirige al login si no).
    */
    Route::prefix('booking')->group(function () {
        Route::get('services', [BookingController::class, 'services'])->name('booking.services');
        Route::get('slots', [BookingController::class, 'slots'])->name('booking.slots');
        Route::post('/', [BookingController::class, 'store'])
            ->middleware(['auth:sanctum', 'throttle:booking'])
            ->name('booking.store');
        Route::get('{token}', [BookingController::class, 'show'])->name('booking.show');
        Route::delete('{token}', [BookingController::class, 'cancel'])->name('booking.cancel');
    });

    /*
    |----------------------------------------------------------------------
    | Autenticación (Sanctum, token Bearer)
    |----------------------------------------------------------------------
    */
    Route::post('register', [AuthController::class, 'register'])
        ->middleware('throttle:auth')->name('register');
    Route::post('login', [AuthController::class, 'login'])
        ->middleware('throttle:auth')->name('login');

    // Inicio de sesión con Google (Socialite, stateless).
    Route::middleware('throttle:auth')->group(function () {
        Route::get('auth/google/redirect', [GoogleController::class, 'redirect'])->name('google.redirect');
        Route::get('auth/google/callback', [GoogleController::class, 'callback'])->name('google.callback');
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me'])->name('me');
        Route::post('logout', [AuthController::class, 'logout'])->name('logout');

        /*
        |------------------------------------------------------------------
        | Cuenta del usuario (cualquier usuario autenticado)
        |------------------------------------------------------------------
        */
        Route::get('account', [AccountController::class, 'show'])->name('account.show');
        Route::put('account', [AccountController::class, 'update'])->name('account.update');

        // Conectar Google a la cuenta ya autenticada (comparte callback con login/registro).
        Route::get('auth/google/link/redirect', [GoogleController::class, 'linkRedirect'])
            ->middleware('throttle:auth')
            ->name('google.link-redirect');

        /*
        |------------------------------------------------------------------
        | Panel del negocio (admin supervisa, dueño configura, staff agenda)
        |------------------------------------------------------------------
        */
        Route::prefix('admin')->name('admin.')->middleware('business')->group(function () {
            // Agenda y estados: cualquier rol del negocio (incl. supervisión admin).
            Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
            Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'updateStatus'])->name('appointments.status');

            // Lectura de la configuración: el admin la usa para supervisar.
            Route::get('services', [ServiceController::class, 'index'])->name('services.index');
            Route::get('staff', [StaffMemberController::class, 'index'])->name('staff.index');

            // Escritura de la configuración: solo el dueño del negocio.
            Route::middleware('owner')->group(function () {
                Route::apiResource('services', ServiceController::class)->only(['store', 'update', 'destroy']);
                Route::apiResource('staff', StaffMemberController::class)->only(['store', 'update', 'destroy']);
            });
        });

        /*
        |------------------------------------------------------------------
        | Plataforma: gestión de cuentas de dueño (solo admin)
        |------------------------------------------------------------------
        */
        Route::prefix('platform')->name('platform.')->middleware('admin')->group(function () {
            Route::apiResource('owners', OwnerAccountController::class)
                ->only(['index', 'store', 'update', 'destroy'])
                ->parameters(['owners' => 'owner']);
        });
    });
});

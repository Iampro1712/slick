<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Se lanza cuando el cliente ya tiene una reserva activa (pendiente o
 * confirmada y futura) del mismo servicio. No se permite reservarlo de nuevo
 * hasta cancelar la que tiene. El controlador la traduce a un 409 con código
 * 'duplicate_active_booking' para que el frontend muestre un toast de error.
 */
class DuplicateActiveBookingException extends RuntimeException
{
    public function __construct(string $message = 'Ya tienes una reserva activa de este servicio. Cancélala para reservar de nuevo.')
    {
        parent::__construct($message);
    }
}

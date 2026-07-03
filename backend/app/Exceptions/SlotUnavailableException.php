<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Se lanza cuando el hueco solicitado ya no está disponible al confirmar
 * (otra persona lo tomó, cae fuera del horario, o ya pasó). El controlador
 * la traduce a un 409 para que el frontend recargue los huecos.
 */
class SlotUnavailableException extends RuntimeException
{
    public function __construct(string $message = 'El horario seleccionado ya no está disponible.')
    {
        parent::__construct($message);
    }
}

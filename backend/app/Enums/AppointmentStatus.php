<?php

namespace App\Enums;

enum AppointmentStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
    case NoShow = 'no_show';

    /**
     * Estados que ocupan un hueco en la agenda (cuentan para solapes).
     * Una cita cancelada o no-show libera su espacio.
     */
    public function blocksSlot(): bool
    {
        return match ($this) {
            self::Pending, self::Confirmed, self::Completed => true,
            self::Cancelled, self::NoShow => false,
        };
    }

    /**
     * Valores que ocupan un hueco, para usar en consultas (whereIn).
     *
     * @return list<string>
     */
    public static function blockingValues(): array
    {
        return array_values(array_map(
            fn (self $status) => $status->value,
            array_filter(self::cases(), fn (self $status) => $status->blocksSlot()),
        ));
    }

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pendiente',
            self::Confirmed => 'Confirmada',
            self::Completed => 'Completada',
            self::Cancelled => 'Cancelada',
            self::NoShow => 'No se presentó',
        };
    }
}

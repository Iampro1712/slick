<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Owner = 'owner';
    case Staff = 'staff';
    case Client = 'client';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrador',
            self::Owner => 'Dueño del negocio',
            self::Staff => 'Profesional',
            self::Client => 'Cliente',
        };
    }

    /**
     * Roles con acceso al panel del negocio (agenda y configuración).
     * Excluye a los clientes.
     *
     * @return list<self>
     */
    public static function businessRoles(): array
    {
        return [self::Admin, self::Owner, self::Staff];
    }
}

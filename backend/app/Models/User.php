<?php

namespace App\Models;

use App\Enums\UserRole;
// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    // 'role' y 'staff_member_id' NO son asignables en masa (privilegios): se
    // fijan explícitamente en el código, nunca desde datos de la petición.
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isOwner(): bool
    {
        return $this->role === UserRole::Owner;
    }

    /** Dueño o admin: pueden gestionar la configuración del negocio. */
    public function managesBusiness(): bool
    {
        return in_array($this->role, [UserRole::Admin, UserRole::Owner], true);
    }

    /** Cualquier rol del lado del negocio (admin, dueño o staff). */
    public function hasBusinessAccess(): bool
    {
        return in_array($this->role, UserRole::businessRoles(), true);
    }

    /**
     * Representación pública del usuario para el frontend. Única fuente de
     * verdad: la usan me/login/register, la cuenta y el flujo de Google, para
     * que el payload no se desincronice entre controladores.
     *
     * @return array<string, mixed>
     */
    public function publicPayload(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'is_admin' => $this->isAdmin(),
            'staff_member_id' => $this->staff_member_id,
            'google_connected' => $this->google_id !== null,
        ];
    }

    /**
     * Profesional vinculado (sólo para usuarios con rol staff).
     *
     * @return BelongsTo<StaffMember, $this>
     */
    public function staffMember(): BelongsTo
    {
        return $this->belongsTo(StaffMember::class);
    }
}

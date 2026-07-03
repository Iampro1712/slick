<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    /** @use HasFactory<\Database\Factories\ServiceFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'duration_min',
        'buffer_min',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'duration_min' => 'integer',
            'buffer_min' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Minutos que ocupa el servicio en la agenda (duración + buffer de limpieza).
     */
    public function blockMinutes(): int
    {
        return $this->duration_min + $this->buffer_min;
    }

    /**
     * @return BelongsToMany<StaffMember, $this>
     */
    public function staffMembers(): BelongsToMany
    {
        return $this->belongsToMany(StaffMember::class, 'service_staff');
    }

    /**
     * @return HasMany<Appointment, $this>
     */
    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}

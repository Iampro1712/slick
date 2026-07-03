<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Descanso/almuerzo del profesional: una franja diaria (hora de inicio + duración)
 * que el motor de disponibilidad trata como tiempo ocupado, para no ofrecer huecos
 * ahí. Nulo = sin descanso.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_members', function (Blueprint $table) {
            $table->time('break_start')->nullable()->after('is_active');
            $table->unsignedSmallInteger('break_minutes')->nullable()->after('break_start');
        });
    }

    public function down(): void
    {
        Schema::table('staff_members', function (Blueprint $table) {
            $table->dropColumn(['break_start', 'break_minutes']);
        });
    }
};

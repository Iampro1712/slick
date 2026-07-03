<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Baja el valor por defecto de `role` de 'admin' a 'client'.
 *
 * Con el registro público de clientes, el default de menor privilegio evita que
 * un usuario creado sin rol explícito quede como administrador por accidente.
 * Los seeders y el registro siguen fijando el rol de forma explícita.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('client')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('admin')->change();
        });
    }
};

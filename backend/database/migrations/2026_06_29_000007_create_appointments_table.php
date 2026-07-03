<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->restrictOnDelete();
            $table->foreignId('staff_member_id')->constrained()->restrictOnDelete();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            // starts_at/ends_at ya incluyen el buffer; se guardan en UTC.
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->string('status', 20)->default('pending');
            $table->dateTime('reminder_sent_at')->nullable();
            $table->text('notes')->nullable();
            // Token público para ver/cancelar la cita por enlace (/cita/{token}).
            $table->uuid('public_token')->unique();
            $table->timestamps();

            // Clave para el cálculo de solapes y el bloqueo por profesional/día.
            $table->index(['staff_member_id', 'starts_at', 'ends_at']);
            $table->index('status');
            $table->index(['reminder_sent_at', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};

<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $timezone = (string) config('agenda.timezone');

        $date = $request->filled('date')
            ? CarbonImmutable::parse($request->string('date')->toString(), $timezone)
            : CarbonImmutable::now($timezone);
        $date = $date->startOfDay();

        $user = $request->user();

        $appointments = Appointment::query()
            ->with(['service', 'staffMember', 'client'])
            // El staff vinculado a un profesional ve sólo su agenda; el admin ve todo.
            ->when($user && ! $user->isAdmin() && $user->staff_member_id, fn ($q) => $q->where('staff_member_id', $user->staff_member_id))
            ->whereBetween('starts_at', [$date->utc(), $date->endOfDay()->utc()])
            ->orderBy('starts_at')
            ->get()
            ->map(fn (Appointment $a) => [
                'id' => $a->id,
                'service' => $a->service->name,
                'staff' => $a->staffMember->name,
                'client' => $a->client->name,
                'client_phone' => $a->client->phone,
                'starts_at' => CarbonImmutable::parse($a->starts_at)->setTimezone($timezone)->format('H:i'),
                'ends_at' => CarbonImmutable::parse($a->ends_at)->setTimezone($timezone)->format('H:i'),
                'status' => $a->status->value,
                'status_label' => $a->status->label(),
            ]);

        return response()->json([
            'date' => $date->format('Y-m-d'),
            'date_label' => $date->isoFormat('dddd D [de] MMMM, YYYY'),
            'appointments' => $appointments,
            'statuses' => collect(AppointmentStatus::cases())->map(fn (AppointmentStatus $s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
        ]);
    }
}

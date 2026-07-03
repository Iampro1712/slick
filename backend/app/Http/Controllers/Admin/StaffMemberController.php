<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StaffMemberRequest;
use App\Models\Service;
use App\Models\StaffMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StaffMemberController extends Controller
{
    public function index(): JsonResponse
    {
        $staff = StaffMember::query()
            ->with(['services:id', 'workingHours'])
            ->withCount('appointments')
            ->orderBy('name')
            ->get()
            ->map(fn (StaffMember $s) => $this->present($s));

        return response()->json([
            'staff' => $staff,
            'services' => Service::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StaffMemberRequest $request): JsonResponse
    {
        $staff = DB::transaction(function () use ($request) {
            $staff = StaffMember::create($request->safe()->only(['name', 'email', 'phone', 'is_active', 'break_start', 'break_minutes']));
            $this->syncRelations($staff, $request);

            return $staff;
        });

        return response()->json([
            'message' => 'Profesional creado.',
            'staff' => $this->present($staff->load(['services:id', 'workingHours'])->loadCount('appointments')),
        ], 201);
    }

    public function update(StaffMemberRequest $request, StaffMember $staff): JsonResponse
    {
        DB::transaction(function () use ($request, $staff) {
            $staff->update($request->safe()->only(['name', 'email', 'phone', 'is_active', 'break_start', 'break_minutes']));
            $this->syncRelations($staff, $request);
        });

        return response()->json([
            'message' => 'Profesional actualizado.',
            'staff' => $this->present($staff->load(['services:id', 'workingHours'])->loadCount('appointments')),
        ]);
    }

    public function destroy(StaffMember $staff): JsonResponse
    {
        if ($staff->appointments()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar un profesional con citas. Desactívalo en su lugar.',
            ], 422);
        }

        $staff->delete();

        return response()->json(['message' => 'Profesional eliminado.']);
    }

    private function syncRelations(StaffMember $staff, StaffMemberRequest $request): void
    {
        $staff->services()->sync($request->input('service_ids', []));

        // Reemplaza el horario semanal por completo.
        $staff->workingHours()->delete();
        $staff->workingHours()->createMany(
            collect($request->input('working_hours', []))->map(fn ($wh) => [
                'weekday' => (int) $wh['weekday'],
                'start_time' => $wh['start_time'],
                'end_time' => $wh['end_time'],
            ])->all(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function present(StaffMember $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'email' => $s->email,
            'phone' => $s->phone,
            'is_active' => $s->is_active,
            'break_start' => $s->break_start ? substr((string) $s->break_start, 0, 5) : null,
            'break_minutes' => $s->break_minutes,
            'appointments_count' => $s->appointments_count ?? 0,
            'service_ids' => $s->services->pluck('id')->values(),
            'working_hours' => $s->workingHours
                ->sortBy([['weekday', 'asc'], ['start_time', 'asc']])
                ->map(fn ($wh) => [
                    'weekday' => $wh->weekday,
                    'start_time' => substr((string) $wh->start_time, 0, 5),
                    'end_time' => substr((string) $wh->end_time, 0, 5),
                ])->values(),
        ];
    }
}

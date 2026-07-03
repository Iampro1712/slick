<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ServiceRequest;
use App\Models\Service;
use Illuminate\Http\JsonResponse;

class ServiceController extends Controller
{
    public function index(): JsonResponse
    {
        $services = Service::query()
            ->withCount('appointments')
            ->orderBy('name')
            ->get()
            ->map(fn (Service $s) => $this->present($s));

        return response()->json(['services' => $services]);
    }

    public function store(ServiceRequest $request): JsonResponse
    {
        $service = Service::create($request->validated());

        return response()->json([
            'message' => 'Servicio creado.',
            'service' => $this->present($service->loadCount('appointments')),
        ], 201);
    }

    public function update(ServiceRequest $request, Service $service): JsonResponse
    {
        $service->update($request->validated());

        return response()->json([
            'message' => 'Servicio actualizado.',
            'service' => $this->present($service->loadCount('appointments')),
        ]);
    }

    public function destroy(Service $service): JsonResponse
    {
        if ($service->appointments()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar un servicio con citas. Desactívalo en su lugar.',
            ], 422);
        }

        $service->delete();

        return response()->json(['message' => 'Servicio eliminado.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Service $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'description' => $s->description,
            'duration_min' => $s->duration_min,
            'buffer_min' => $s->buffer_min,
            'is_active' => $s->is_active,
            'appointments_count' => $s->appointments_count ?? 0,
        ];
    }
}

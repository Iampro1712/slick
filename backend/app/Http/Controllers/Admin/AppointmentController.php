<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AppointmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAppointmentStatusRequest;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;

class AppointmentController extends Controller
{
    public function updateStatus(UpdateAppointmentStatusRequest $request, Appointment $appointment): JsonResponse
    {
        $appointment->update([
            'status' => AppointmentStatus::from($request->string('status')->toString()),
        ]);

        return response()->json([
            'message' => 'Estado de la cita actualizado.',
            'appointment' => [
                'id' => $appointment->id,
                'status' => $appointment->status->value,
                'status_label' => $appointment->status->label(),
            ],
        ]);
    }
}

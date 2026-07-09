<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'staff_member_id' => ['nullable', 'integer', 'exists:staff_members,id'],
            'starts_at' => ['required', 'date'],
            'name' => ['required', 'string', 'max:255'],
            // Teléfono y email son obligatorios: el teléfono para contactar al
            // cliente ante cambios, el email para la confirmación y el recordatorio.
            // El teléfono debe venir en formato "8855-9869" (8 dígitos con guion).
            'phone' => ['required', 'string', 'regex:/^\d{4}-\d{4}$/'],
            'email' => ['required', 'email', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.required' => 'Indica un teléfono de contacto.',
            'phone.regex' => 'El teléfono debe tener 8 dígitos (ej. 8855-9869).',
            'email.required' => 'Indica un correo para la confirmación.',
        ];
    }
}

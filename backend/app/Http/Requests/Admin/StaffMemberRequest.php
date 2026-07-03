<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StaffMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // El acceso ya lo controla el middleware 'admin'.
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'is_active' => ['required', 'boolean'],

            // Descanso/almuerzo (opcional): ambos campos van juntos.
            'break_start' => ['nullable', 'date_format:H:i', 'required_with:break_minutes'],
            'break_minutes' => ['nullable', 'integer', 'min:5', 'max:480', 'required_with:break_start'],

            'service_ids' => ['array'],
            'service_ids.*' => ['integer', 'exists:services,id'],

            'working_hours' => ['array'],
            'working_hours.*.weekday' => ['required', 'integer', 'between:0,6'],
            'working_hours.*.start_time' => ['required', 'date_format:H:i'],
            'working_hours.*.end_time' => ['required', 'date_format:H:i'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            foreach ((array) $this->input('working_hours', []) as $i => $window) {
                $start = $window['start_time'] ?? null;
                $end = $window['end_time'] ?? null;

                if ($start && $end && $end <= $start) {
                    $validator->errors()->add(
                        "working_hours.$i.end_time",
                        'La hora de fin debe ser posterior a la de inicio.',
                    );
                }
            }
        });
    }
}

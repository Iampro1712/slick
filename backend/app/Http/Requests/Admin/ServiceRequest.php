<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ServiceRequest extends FormRequest
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
            'description' => ['nullable', 'string', 'max:1000'],
            'duration_min' => ['required', 'integer', 'min:5', 'max:600'],
            'buffer_min' => ['required', 'integer', 'min:0', 'max:240'],
            'is_active' => ['required', 'boolean'],
        ];
    }
}

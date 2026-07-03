<?php

namespace App\Http\Controllers\Platform;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Gestión de cuentas de dueño de negocio (solo admin de plataforma).
 *
 * El admin crea la cuenta del dueño; luego el dueño configura sus servicios y
 * profesionales desde su propio panel.
 */
class OwnerAccountController extends Controller
{
    public function index(): JsonResponse
    {
        $owners = User::query()
            ->where('role', UserRole::Owner)
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => $this->present($u));

        return response()->json(['owners' => $owners]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $owner = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);
        // El rol se fija aparte (no es asignable en masa).
        $owner->role = UserRole::Owner;
        $owner->save();

        return response()->json([
            'message' => 'Cuenta de dueño creada.',
            'owner' => $this->present($owner),
        ], 201);
    }

    public function update(Request $request, User $owner): JsonResponse
    {
        abort_unless($owner->isOwner(), 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($owner->id)],
            // Contraseña opcional: solo se cambia si se envía.
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ]);

        $owner->fill(['name' => $data['name'], 'email' => $data['email']]);
        if (! empty($data['password'])) {
            $owner->password = $data['password'];
        }
        $owner->save();

        return response()->json([
            'message' => 'Cuenta actualizada.',
            'owner' => $this->present($owner->refresh()),
        ]);
    }

    public function destroy(User $owner): JsonResponse
    {
        abort_unless($owner->isOwner(), 404);

        $owner->delete();

        return response()->json(['message' => 'Cuenta eliminada.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(User $owner): array
    {
        return [
            'id' => $owner->id,
            'name' => $owner->name,
            'email' => $owner->email,
            'created_at' => $owner->created_at?->toIso8601String(),
        ];
    }
}

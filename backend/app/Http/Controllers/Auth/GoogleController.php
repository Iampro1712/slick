<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;

/**
 * Inicio de sesión con Google (Socialite, modo stateless para API).
 *
 * Dos flujos comparten el mismo callback (una sola redirect URI que registrar
 * en Google):
 * - Login/registro (`redirect`): público, crea o vincula por correo/google_id
 *   y emite un token Sanctum.
 * - Conectar (`linkRedirect`): requiere sesión; viaja en `state` (cifrado con
 *   APP_KEY, con expiración) el propósito y el id del usuario, para que el
 *   callback sepa que debe vincular en vez de iniciar sesión. No emite token
 *   nuevo: el usuario ya está logueado.
 */
class GoogleController extends Controller
{
    /** URL de consentimiento para iniciar sesión / registrarse con Google. */
    public function redirect(): JsonResponse
    {
        $url = Socialite::driver('google')->stateless()->redirect()->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /** URL de consentimiento para vincular Google a la cuenta ya autenticada. */
    public function linkRedirect(Request $request): JsonResponse
    {
        $state = Crypt::encryptString(json_encode([
            'purpose' => 'link',
            'user_id' => $request->user()->id,
            'exp' => now()->addMinutes(10)->timestamp,
        ]));

        $url = Socialite::driver('google')->stateless()
            ->with(['state' => $state])
            ->redirect()
            ->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    /** Procesa el `code` del callback: login/registro, o vincula si venía de "Conectar". */
    public function callback(Request $request): JsonResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            report($e); // deja la causa real en el log (p. ej. SSL, code inválido)

            return response()->json(['message' => 'No se pudo autenticar con Google.'], 422);
        }

        $email = $googleUser->getEmail();
        if (! $email) {
            return response()->json(['message' => 'Tu cuenta de Google no tiene correo.'], 422);
        }

        $linkUserId = $this->decodeLinkState((string) $request->query('state', ''));

        return $linkUserId !== null
            ? $this->link($linkUserId, $googleUser)
            : $this->loginOrRegister($email, $googleUser);
    }

    /** Descifra el `state` de un intento de vinculación; null si no aplica/expiró. */
    private function decodeLinkState(string $state): ?int
    {
        if ($state === '') {
            return null;
        }

        try {
            $payload = json_decode(Crypt::decryptString($state), true);
        } catch (DecryptException) {
            return null;
        }

        if (! is_array($payload) || ($payload['purpose'] ?? null) !== 'link') {
            return null;
        }
        if (($payload['exp'] ?? 0) < now()->timestamp) {
            return null;
        }

        return (int) ($payload['user_id'] ?? 0) ?: null;
    }

    private function link(int $userId, SocialiteUser $googleUser): JsonResponse
    {
        $user = User::find($userId);
        if (! $user) {
            return response()->json([
                'message' => 'Tu sesión expiró. Inicia sesión de nuevo e inténtalo otra vez.',
            ], 422);
        }

        $takenByOther = User::where('google_id', $googleUser->getId())
            ->where('id', '!=', $user->id)
            ->exists();
        if ($takenByOther) {
            return response()->json([
                'message' => 'Esa cuenta de Google ya está conectada a otro usuario.',
            ], 422);
        }

        $user->google_id = $googleUser->getId();
        $user->save();

        return response()->json(['linked' => true, 'user' => $user->publicPayload()]);
    }

    private function loginOrRegister(string $email, SocialiteUser $googleUser): JsonResponse
    {
        // Primero por google_id (una cuenta ya vinculada puede tener un correo
        // de Google distinto al registrado); si no, por correo (primer login).
        $user = User::where('google_id', $googleUser->getId())->first()
            ?? User::where('email', $email)->first();

        if ($user) {
            if (! $user->google_id) {
                $user->google_id = $googleUser->getId();
                $user->save();
            }
        } else {
            // Cuenta nueva: cliente, sin contraseña, correo ya verificado por Google.
            $user = new User();
            $user->name = $googleUser->getName() ?: 'Usuario';
            $user->email = $email;
            $user->google_id = $googleUser->getId();
            $user->role = UserRole::Client;
            $user->email_verified_at = now();
            $user->save();
        }

        $token = $user->createToken('google')->plainTextToken;

        return response()->json(['token' => $token, 'user' => $user->publicPayload()]);
    }
}

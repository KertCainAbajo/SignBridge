<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create($request->validated());
            $user->assignRole('user');
            $user->setRelation('preferences', $user->preferences()->create());

            return $user;
        });

        $this->startSession($request, $user);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function login(LoginRequest $request): UserResource
    {
        $guard = Auth::guard('web');

        if (! $guard->attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        /** @var User $user */
        $user = $guard->user();

        if (! $user->is_active) {
            $guard->logout();
            throw ValidationException::withMessages([
                'email' => 'This account has been deactivated. Please contact an administrator.',
            ]);
        }

        $request->session()->regenerate();
        $user->forceFill(['last_active_at' => now()])->saveQuietly();

        return new UserResource($user);
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    private function startSession(Request $request, User $user): void
    {
        Auth::guard('web')->login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_active_at' => now()])->saveQuietly();
    }
}

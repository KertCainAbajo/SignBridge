<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Login/register need a session. Sanctum only starts one for requests whose
 * Origin/Referer is listed in SANCTUM_STATEFUL_DOMAINS. Fail early with a clear
 * message instead of crashing after the account was already created.
 */
class EnsureSpaSession
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->hasSession()) {
            return response()->json([
                'message' => 'This website address is not allowed to sign in. '
                    .'Add it to SANCTUM_STATEFUL_DOMAINS in the backend .env file.',
            ], 403);
        }

        return $next($request);
    }
}

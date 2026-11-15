<?php

use App\Http\Middleware\EnsureSpaSession;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Cookie/session auth for the React SPA (includes CSRF protection).
        $middleware->statefulApi();
        $middleware->throttleApi();

        $middleware->alias([
            'active' => EnsureUserIsActive::class,
            'spa.session' => EnsureSpaSession::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
        ]);

        // API-only backend: unauthenticated API requests get 401 JSON, not a redirect.
        $middleware->redirectGuestsTo(fn (Request $request) => $request->expectsJson() ? null : '/');
        $middleware->redirectUsersTo(fn () => '/');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

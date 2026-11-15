<?php

use App\Http\Controllers\Admin\OverviewController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\PreferenceController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'app' => config('app.name'),
    'time' => now()->toIso8601String(),
]));

// ── Guest auth ──────────────────────────────────────────────
Route::middleware('throttle:auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('guest');
    Route::post('/login', [AuthController::class, 'login'])->middleware('guest');
});

// ── Authenticated users ─────────────────────────────────────
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::get('/preferences', [PreferenceController::class, 'show']);
    Route::patch('/preferences', [PreferenceController::class, 'update']);

    // ── Admin (admin + super_admin) ─────────────────────────
    Route::prefix('admin')->middleware('permission:analytics.view')->group(function () {
        Route::get('/overview', OverviewController::class);
    });
});

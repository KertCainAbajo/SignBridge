<?php

use App\Http\Controllers\Admin\OverviewController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\PreferenceController;
use App\Http\Controllers\TranslationHistoryController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

// ── Auth (rate limited, requires an SPA session) ────────────
Route::middleware(['throttle:auth', 'spa.session'])->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// ── Authenticated users ─────────────────────────────────────
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::get('/preferences', [PreferenceController::class, 'show']);
    Route::patch('/preferences', [PreferenceController::class, 'update']);

    Route::get('/translations', [TranslationHistoryController::class, 'index']);
    Route::post('/translations', [TranslationHistoryController::class, 'store']);
    Route::delete('/translations', [TranslationHistoryController::class, 'clear']);
    Route::delete('/translations/{id}', [TranslationHistoryController::class, 'destroy'])->whereNumber('id');

    // ── Admin (admin + super_admin) ─────────────────────────
    Route::prefix('admin')->group(function () {
        Route::get('/overview', OverviewController::class)->middleware('permission:analytics.view');
    });
});

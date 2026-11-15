<?php

use Illuminate\Support\Facades\Route;

// API-only backend. The website is the React app in /frontend.
Route::get('/', fn () => response()->json([
    'name' => config('app.name'),
    'api' => url('/api'),
]));

<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SignVocabulary;
use App\Models\TranslationHistory;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class OverviewController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => [
                'users_total' => User::count(),
                'users_active_7d' => User::where('last_active_at', '>=', now()->subDays(7))->count(),
                'signs_total' => SignVocabulary::count(),
                'signs_recognizable' => SignVocabulary::where('is_recognizable', true)->count(),
                'translations_30d' => TranslationHistory::where('created_at', '>=', now()->subDays(30))->count(),
            ],
        ]);
    }
}

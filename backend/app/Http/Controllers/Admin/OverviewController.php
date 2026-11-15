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
        // One aggregate query per table instead of one per figure.
        $users = User::toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when last_active_at >= ? then 1 else 0 end) as active', [now()->subDays(7)])
            ->first();

        $signs = SignVocabulary::toBase()
            ->selectRaw('count(*) as total')
            ->selectRaw('sum(case when is_recognizable = ? then 1 else 0 end) as recognizable', [true])
            ->first();

        return response()->json([
            'data' => [
                'users_total' => (int) $users->total,
                'users_active_7d' => (int) $users->active,
                'signs_total' => (int) $signs->total,
                'signs_recognizable' => (int) $signs->recognizable,
                'translations_30d' => TranslationHistory::where('created_at', '>=', now()->subDays(30))->count(),
            ],
        ]);
    }
}

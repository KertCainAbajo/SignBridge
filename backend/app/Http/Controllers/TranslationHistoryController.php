<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTranslationRequest;
use App\Http\Resources\TranslationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/** Every query is scoped to the signed-in user, so users can never see or delete others' history. */
class TranslationHistoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'source' => ['nullable', Rule::in(['sign', 'speech', 'text'])],
            'per_page' => ['nullable', 'integer', 'between:1,50'],
        ]);

        $items = $request->user()->translationHistories()
            ->when($validated['source'] ?? null, fn ($q, $source) => $q->where('source', $source))
            ->latest('created_at')
            ->latest('id')
            ->paginate($validated['per_page'] ?? 20);

        return TranslationResource::collection($items);
    }

    public function store(StoreTranslationRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->preferencesOrDefault()->save_history) {
            return response()->json([
                'message' => 'Saving history is turned off in your settings.',
            ], 409);
        }

        $item = $user->translationHistories()->create($request->validated());

        return (new TranslationResource($item))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, int $id): Response
    {
        $request->user()->translationHistories()->whereKey($id)->firstOrFail()->delete();

        return response()->noContent();
    }

    public function clear(Request $request): Response
    {
        $request->user()->translationHistories()->delete();

        return response()->noContent();
    }
}

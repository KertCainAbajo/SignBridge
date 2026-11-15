<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePreferencesRequest;
use App\Http\Resources\PreferenceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return (new PreferenceResource($request->user()->preferencesOrDefault()))
            ->response()->setStatusCode(200);
    }

    public function update(UpdatePreferencesRequest $request): JsonResponse
    {
        $preferences = $request->user()->preferencesOrDefault();
        $preferences->update($request->validated());

        return (new PreferenceResource($preferences))->response()->setStatusCode(200);
    }
}

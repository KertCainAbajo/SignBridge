<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePreferencesRequest;
use App\Http\Resources\PreferenceResource;
use App\Models\UserPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->respond($request->user()->preferencesOrDefault());
    }

    public function update(UpdatePreferencesRequest $request): JsonResponse
    {
        $preferences = $request->user()->preferencesOrDefault();
        $preferences->update($request->validated());

        return $this->respond($preferences);
    }

    /** Always 200, even when defaults were just created. */
    private function respond(UserPreference $preferences): JsonResponse
    {
        return (new PreferenceResource($preferences))->response()->setStatusCode(200);
    }
}

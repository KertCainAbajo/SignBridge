<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $this->loadAuthPayload();

        // Built from the eager-loaded relations: no extra queries.
        $permissions = $this->permissions
            ->merge($this->roles->flatMap->permissions)
            ->pluck('name')
            ->unique()
            ->sort()
            ->values();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'roles' => $this->roles->pluck('name')->values(),
            'permissions' => $permissions,
            'preferences' => new PreferenceResource($this->preferencesOrDefault()),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\SettingsNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(protected SettingsNotificationService $notificationService)
    {
    }

    public function login(LoginRequest $request)
    {
        $user = User::with('role.permissions')->where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            $this->notificationService->notifyFailedLogin($request->email);
            return response()->json(['message' => 'Email və ya şifrə yanlışdır.'], 422);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'İstifadəçi deaktiv edilib.'], 403);
        }

        return response()->json([
            'token' => $user->createToken($request->device_name ?: 'bestsol-api')->plainTextToken,
            'user' => new UserResource($user),
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Sistemdən çıxış edildi.']);
    }

    public function me(Request $request)
    {
        return new UserResource($request->user()->load('role.permissions'));
    }
}

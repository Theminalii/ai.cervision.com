<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasPermission($permission)) {
            return response()->json([
                'message' => 'Bu əməliyyat üçün icazəniz yoxdur.',
            ], 403);
        }

        return $next($request);
    }
}

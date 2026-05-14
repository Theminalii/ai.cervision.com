<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Operations\StoreWarehouseTransferRequest;
use App\Http\Requests\Operations\UpsertWarehouseRequest;
use App\Http\Resources\WarehouseResource;
use App\Http\Resources\WarehouseTransferResource;
use App\Models\Warehouse;
use App\Models\WarehouseTransfer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $warehouses = Warehouse::query()
            ->when($request->search, fn ($query) => $query
                ->where('name', 'like', '%' . $request->search . '%')
                ->orWhere('code', 'like', '%' . $request->search . '%')
                ->orWhere('address', 'like', '%' . $request->search . '%'))
            ->when($request->status, fn ($query) => $query->where('status', $request->status))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 100));

        return WarehouseResource::collection($warehouses);
    }

    public function store(UpsertWarehouseRequest $request)
    {
        $warehouse = Warehouse::create($request->validated());

        return new WarehouseResource($warehouse);
    }

    public function show(Warehouse $warehouse)
    {
        return new WarehouseResource($warehouse->load([
            'transfersFrom.toWarehouse',
            'transfersTo.fromWarehouse',
        ]));
    }

    public function update(UpsertWarehouseRequest $request, Warehouse $warehouse)
    {
        $data = $request->validated();

        if ((float) $data['used_capacity'] > (float) $data['capacity']) {
            return response()->json([
                'message' => 'İstifadə olunan tutum ümumi tutumdan çox ola bilməz.',
            ], 422);
        }

        $warehouse->update($data);

        return new WarehouseResource($warehouse);
    }

    public function destroy(Warehouse $warehouse)
    {
        if ($warehouse->transfersFrom()->exists() || $warehouse->transfersTo()->exists()) {
            return response()->json([
                'message' => 'Bu anbar üzrə transfer tarixçəsi var. Silmək əvəzinə passiv edin.',
            ], 422);
        }

        $warehouse->delete();

        return response()->json(['message' => 'Anbar silindi.']);
    }

    public function transfers(Request $request)
    {
        $transfers = WarehouseTransfer::with(['fromWarehouse', 'toWarehouse', 'creator'])
            ->when($request->warehouse_id, fn ($query) => $query
                ->where('from_warehouse_id', $request->warehouse_id)
                ->orWhere('to_warehouse_id', $request->warehouse_id))
            ->latest('transfer_date')
            ->latest('id')
            ->paginate($request->integer('per_page', 100));

        return WarehouseTransferResource::collection($transfers);
    }

    public function transfer(StoreWarehouseTransferRequest $request)
    {
        $result = DB::transaction(function () use ($request) {
            $fromWarehouse = Warehouse::findOrFail($request->from_warehouse_id);
            $toWarehouse = Warehouse::findOrFail($request->to_warehouse_id);
            $quantity = (float) $request->quantity;

            if ((float) $fromWarehouse->used_capacity < $quantity) {
                return response()->json([
                    'message' => 'Göndərən anbarda kifayət qədər istifadə olunan tutum yoxdur.',
                ], 422);
            }

            if (((float) $toWarehouse->used_capacity + $quantity) > (float) $toWarehouse->capacity) {
                return response()->json([
                    'message' => 'Qəbul edən anbarda kifayət qədər boş tutum yoxdur.',
                ], 422);
            }

            $fromWarehouse->decrement('used_capacity', $quantity);
            $toWarehouse->increment('used_capacity', $quantity);

            return WarehouseTransfer::create([
                'from_warehouse_id' => $fromWarehouse->id,
                'to_warehouse_id' => $toWarehouse->id,
                'quantity' => $quantity,
                'note' => $request->note,
                'transfer_date' => $request->transfer_date,
                'created_by' => $request->user()?->id,
            ]);
        });

        if ($result instanceof \Illuminate\Http\JsonResponse) {
            return $result;
        }

        return new WarehouseTransferResource($result->load(['fromWarehouse', 'toWarehouse']));
    }
}

<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class StockService
{
    public function __construct(protected SettingsNotificationService $notificationService)
    {
    }

    public function ensureStock(Product $product): Stock
    {
        return Stock::firstOrCreate(
            ['product_id' => $product->id],
            ['minimum_quantity' => $product->minimum_stock]
        );
    }

    public function increase(Product $product, string $stockType, float $quantity, string $movementType, ?Model $reference, ?User $user, ?string $note = null): Stock
    {
        $stock = $this->ensureStock($product);
        $field = $stockType === 'official' ? 'official_quantity' : 'real_quantity';

        $stock->increment($field, $quantity);

        $this->logMovement($product, $movementType, $stockType, $quantity, 'in', $reference, $user, $note);

        return $stock->refresh();
    }

    public function decrease(Product $product, string $stockType, float $quantity, string $movementType, ?Model $reference, ?User $user, ?string $note = null): Stock
    {
        $stock = $this->ensureStock($product);
        $field = $stockType === 'official' ? 'official_quantity' : 'real_quantity';

        if ((float) $stock->{$field} < $quantity) {
            throw new RuntimeException("{$product->name} üçün {$stockType} stok kifayət etmir.");
        }

        $stock->decrement($field, $quantity);

        $this->logMovement($product, $movementType, $stockType, $quantity, 'out', $reference, $user, $note);

        $stock = $stock->refresh();
        $product->setRelation('stock', $stock);
        $this->notificationService->notifyLowStock($product);

        return $stock;
    }

    public function adjust(Product $product, string $stockType, float $quantity, ?User $user, ?string $note = null): Stock
    {
        if ($quantity > 0) {
            return $this->increase($product, $stockType, $quantity, 'adjustment', null, $user, $note);
        }

        return $this->decrease($product, $stockType, abs($quantity), 'adjustment', null, $user, $note);
    }

    protected function logMovement(Product $product, string $type, string $stockType, float $quantity, string $direction, ?Model $reference, ?User $user, ?string $note): StockMovement
    {
        return StockMovement::create([
            'product_id' => $product->id,
            'type' => $type,
            'stock_type' => $stockType,
            'quantity' => $quantity,
            'direction' => $direction,
            'reference_type' => $reference ? $reference::class : null,
            'reference_id' => $reference?->getKey(),
            'note' => $note,
            'created_by' => $user?->id,
        ]);
    }
}

<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class SaleService
{
    public function __construct(
        protected FinanceService $financeService,
        protected StockService $stockService,
        protected DebtService $debtService,
        protected SettingsNotificationService $notificationService,
    ) {
    }

    public function create(array $data, User $user): Sale
    {
        return DB::transaction(function () use ($data, $user): Sale {
            $customer = null;
            if (! empty($data['customer_id'])) {
                $customer = Customer::query()->findOrFail($data['customer_id']);

                if ($user->isSalesRepresentative() && (int) $customer->assigned_user_id !== (int) $user->id) {
                    throw ValidationException::withMessages([
                        'customer_id' => 'Yalnız sizə təhkim olunmuş müştərilər üçün satış yarada bilərsiniz.',
                    ]);
                }
            }

            $lineItems = collect($data['items'])->map(function (array $item) use ($data) {
                $product = Product::with('stock')->findOrFail($item['product_id']);
                $unitPrice = (float) ($item['unit_price'] ?? ($data['sale_type'] === 'official' ? $product->official_sale_price : $product->cash_sale_price));
                $quantity = (float) $item['quantity'];

                return [
                    'product' => $product,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'total_price' => round($unitPrice * $quantity, 2),
                    'stock_type' => $item['stock_type'] ?? ($data['sale_type'] === 'official' ? 'official' : 'real'),
                ];
            });

            $subtotal = round($lineItems->sum('total_price'), 2);
            $paidAmount = $data['payment_status'] === 'paid' ? $subtotal : (float) ($data['paid_amount'] ?? 0);
            $debtAmount = round($subtotal - $paidAmount, 2);

            $sale = Sale::create([
                'sale_number' => $this->nextNumber(),
                'customer_id' => $customer?->id,
                'user_id' => $user->id,
                'sale_type' => $data['sale_type'],
                'payment_status' => $data['payment_status'],
                'payment_method' => $data['payment_method'],
                'subtotal' => $subtotal,
                'vat_amount' => 0,
                'total_amount' => $subtotal,
                'paid_amount' => $paidAmount,
                'debt_amount' => $debtAmount,
                'stock_output' => (bool) $data['stock_output'],
                'note' => $data['note'] ?? null,
                'sale_date' => $data['sale_date'],
            ]);

            foreach ($lineItems as $lineItem) {
                $sale->items()->create([
                    'product_id' => $lineItem['product']->id,
                    'quantity' => $lineItem['quantity'],
                    'unit_price' => $lineItem['unit_price'],
                    'total_price' => $lineItem['total_price'],
                    'stock_type' => $lineItem['stock_type'],
                ]);

                if ($sale->stock_output && $lineItem['stock_type'] !== 'none') {
                    $this->stockService->decrease(
                        $lineItem['product'],
                        $lineItem['stock_type'],
                        $lineItem['quantity'],
                        'sale',
                        $sale,
                        $user,
                        'Satış çıxışı'
                    );
                }
            }

            if ($paidAmount > 0) {
                $account = $this->financeService->getAccountByType(
                    $this->financeService->resolveAccountTypeForSale($sale->sale_type)
                );

                $this->financeService->increaseBalance(
                    $account,
                    $paidAmount,
                    'sale',
                    $sale->id,
                    "Satış ödənişi {$sale->sale_number}",
                    $sale->sale_date->toDateString()
                );

                $this->notificationService->notifyPayment(
                    'Ödəniş bildirişi',
                    "{$sale->sale_number} üzrə {$paidAmount} AZN ödəniş qəbul edildi."
                );
            }

            if ($debtAmount > 0 && $sale->customer) {
                $this->debtService->createDebt(
                    $sale->customer,
                    $debtAmount,
                    $sale,
                    'Satışdan yaranan borc',
                    $sale->sale_date->toDateString()
                );
            }

            $this->notificationService->notifyNewOrder($sale);

            return $sale->load(['customer', 'user', 'items.product']);
        });
    }

    public function applyPayment(Sale $sale, array $data): Sale
    {
        return DB::transaction(function () use ($sale, $data): Sale {
            $sale->loadMissing('customer');

            $amount = round((float) $data['amount'], 2);
            if ($amount <= 0) {
                throw new RuntimeException('Ödəniş məbləği 0-dan böyük olmalıdır.');
            }

            if ((float) $sale->debt_amount <= 0) {
                throw new RuntimeException('Bu satış üzrə aktiv borc qalmayıb.');
            }

            if ($amount > (float) $sale->debt_amount) {
                throw new RuntimeException('Ödəniş məbləği satış üzrə qalıq borcdan çox ola bilməz.');
            }

            if (!$sale->customer) {
                throw new RuntimeException('Bu satış üçün müştəri bağlı deyil, borc ödənişi tətbiq etmək olmur.');
            }

            $account = $this->financeService->getAccountByType($data['payment_method']);
            $transactionDate = $data['transaction_date'];

            $this->financeService->increaseBalance(
                $account,
                $amount,
                'sale_payment',
                $sale->id,
                "Satış borc ödənişi {$sale->sale_number}",
                $transactionDate
            );

            $this->debtService->payDebt(
                $sale->customer,
                $amount,
                $sale,
                $data['note'] ?? 'Satış borc ödənişi',
                $transactionDate
            );

            $newPaidAmount = round((float) $sale->paid_amount + $amount, 2);
            $newDebtAmount = round((float) $sale->debt_amount - $amount, 2);

            $sale->update([
                'paid_amount' => $newPaidAmount,
                'debt_amount' => $newDebtAmount,
                'payment_status' => $newDebtAmount <= 0 ? 'paid' : 'partial',
            ]);

            $this->notificationService->notifyPayment(
                'Satış üzrə ödəniş',
                "{$sale->sale_number} üzrə {$amount} AZN borc ödənişi qəbul edildi."
            );

            return $sale->fresh(['customer', 'user', 'items.product']);
        });
    }

    protected function nextNumber(): string
    {
        $nextId = (Sale::max('id') ?? 0) + 1;

        return 'SL-' . str_pad((string) $nextId, 6, '0', STR_PAD_LEFT);
    }
}

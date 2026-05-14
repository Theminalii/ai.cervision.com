<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Stock;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ReportService
{
    public function applyDateRange(Builder $query, Request $request, string $column): Builder
    {
        return $query
            ->when($request->date_from, fn (Builder $q) => $q->whereDate($column, '>=', $request->date_from))
            ->when($request->date_to, fn (Builder $q) => $q->whereDate($column, '<=', $request->date_to));
    }

    public function sales(Request $request)
    {
        $query = Sale::with(['customer', 'user', 'items.product'])
            ->when($request->customer_id, fn (Builder $q) => $q->where('customer_id', $request->customer_id))
            ->when($request->sales_representative_id, fn (Builder $q) => $q->where('user_id', $request->sales_representative_id))
            ->when($request->payment_status, fn (Builder $q) => $q->where('payment_status', $request->payment_status))
            ->when($request->category_id, fn (Builder $q) => $q->whereHas('items.product', fn (Builder $p) => $p->where('category_id', $request->category_id)))
            ->when($request->brand_id, fn (Builder $q) => $q->whereHas('items.product', fn (Builder $p) => $p->where('brand_id', $request->brand_id)))
            ->when($request->report_type === 'official', fn (Builder $q) => $q->where('sale_type', 'official'));

        return $this->applyDateRange($query, $request, 'sale_date')->paginate($request->integer('per_page', 15));
    }

    public function purchases(Request $request)
    {
        $query = Purchase::with(['supplier', 'items.product'])
            ->when($request->category_id, fn (Builder $q) => $q->whereHas('items.product', fn (Builder $p) => $p->where('category_id', $request->category_id)))
            ->when($request->brand_id, fn (Builder $q) => $q->whereHas('items.product', fn (Builder $p) => $p->where('brand_id', $request->brand_id)));

        return $this->applyDateRange($query, $request, 'purchase_date')->paginate($request->integer('per_page', 15));
    }

    public function expenses(Request $request)
    {
        $query = Expense::with('category')
            ->when($request->category_id, fn (Builder $q) => $q->where('category_id', $request->category_id))
            ->when($request->payment_status, fn (Builder $q) => $q->where('payment_method', $request->payment_status))
            ->when($request->report_type === 'official', fn (Builder $q) => $q->where('expense_type', 'official'));

        return $this->applyDateRange($query, $request, 'expense_date')->paginate($request->integer('per_page', 15));
    }

    public function stock(Request $request)
    {
        return Stock::with('product.category', 'product.brand')
            ->when($request->category_id, fn (Builder $q) => $q->whereHas('product', fn (Builder $p) => $p->where('category_id', $request->category_id)))
            ->when($request->brand_id, fn (Builder $q) => $q->whereHas('product', fn (Builder $p) => $p->where('brand_id', $request->brand_id)))
            ->paginate($request->integer('per_page', 15));
    }
}

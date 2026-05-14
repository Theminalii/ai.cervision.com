<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\ImportController;
use App\Http\Controllers\Api\MobileController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\PriceCoefficientController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login']);
Route::post('mobile/login', [MobileController::class, 'login']);

Route::middleware(['auth:sanctum', 'active'])->group(function (): void {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    Route::prefix('settings')->group(function (): void {
        Route::get('/', [SettingsController::class, 'index'])->middleware('permission:users_manage');
        Route::put('company', [SettingsController::class, 'updateCompany'])->middleware('permission:users_manage');
        Route::post('company/logo', [SettingsController::class, 'uploadLogo'])->middleware('permission:users_manage');
        Route::put('notifications', [SettingsController::class, 'updateNotifications'])->middleware('permission:users_manage');
        Route::post('notifications/test-email', [SettingsController::class, 'testEmail'])->middleware('permission:users_manage');
        Route::post('notifications/test-telegram', [SettingsController::class, 'testTelegram'])->middleware('permission:users_manage');
        Route::put('appearance', [SettingsController::class, 'updateAppearance'])->middleware('permission:users_manage');
        Route::post('password', [SettingsController::class, 'changePassword']);
        Route::delete('sessions/{tokenId}', [SettingsController::class, 'revokeSession']);
        Route::delete('sessions', [SettingsController::class, 'revokeOtherSessions']);
    });

    Route::prefix('dashboard')->group(function (): void {
        Route::get('summary', [DashboardController::class, 'summary']);
        Route::get('sales-chart', [DashboardController::class, 'salesChart']);
        Route::get('expense-chart', [DashboardController::class, 'expenseChart']);
        Route::get('recent-sales', [DashboardController::class, 'recentSales']);
        Route::get('recent-purchases', [DashboardController::class, 'recentPurchases']);
        Route::get('low-stock', [DashboardController::class, 'lowStock']);
    });

    Route::apiResource('users', UserController::class)->middleware('permission:users_manage');
    Route::get('roles', [RoleController::class, 'index'])->middleware('permission:users_manage');
    Route::post('roles', [RoleController::class, 'store'])->middleware('permission:users_manage');
    Route::put('roles/{role}', [RoleController::class, 'update'])->middleware('permission:users_manage');
    Route::get('permissions', [PermissionController::class, 'index'])->middleware('permission:users_manage');
    Route::post('roles/{role}/permissions', [RoleController::class, 'syncPermissions'])->middleware('permission:users_manage');

    Route::apiResource('products', ProductController::class)->middleware('permission:stock_view');
    Route::post('products/{product}/image', [ProductController::class, 'uploadImage'])->middleware('permission:stock_view');
    Route::get('categories', [CategoryController::class, 'index'])->middleware('permission:stock_view');
    Route::post('categories', [CategoryController::class, 'store'])->middleware('permission:coefficients_manage');
    Route::put('categories/{category}', [CategoryController::class, 'update'])->middleware('permission:coefficients_manage');
    Route::delete('categories/{category}', [CategoryController::class, 'destroy'])->middleware('permission:coefficients_manage');
    Route::get('brands', [BrandController::class, 'index'])->middleware('permission:stock_view');
    Route::post('brands', [BrandController::class, 'store'])->middleware('permission:coefficients_manage');
    Route::put('brands/{brand}', [BrandController::class, 'update'])->middleware('permission:coefficients_manage');
    Route::delete('brands/{brand}', [BrandController::class, 'destroy'])->middleware('permission:coefficients_manage');
    Route::get('price-coefficients', [PriceCoefficientController::class, 'index'])->middleware('permission:coefficients_manage');
    Route::post('price-coefficients', [PriceCoefficientController::class, 'store'])->middleware('permission:coefficients_manage');
    Route::put('price-coefficients/{priceCoefficient}', [PriceCoefficientController::class, 'update'])->middleware('permission:coefficients_manage');
    Route::delete('price-coefficients/{priceCoefficient}', [PriceCoefficientController::class, 'destroy'])->middleware('permission:coefficients_manage');

    Route::get('customers', [CustomerController::class, 'index']);
    Route::get('customers/meta', [CustomerController::class, 'meta']);
    Route::post('customers', [CustomerController::class, 'store']);
    Route::get('customers/{customer}', [CustomerController::class, 'show']);
    Route::put('customers/{customer}', [CustomerController::class, 'update']);
    Route::delete('customers/{customer}', [CustomerController::class, 'destroy']);
    Route::get('customers/{customer}/debts', [CustomerController::class, 'debts']);
    Route::post('customers/{customer}/payment', [CustomerController::class, 'payment']);

    Route::get('suppliers', [SupplierController::class, 'index'])->middleware('permission:purchase_add');
    Route::post('suppliers', [SupplierController::class, 'store'])->middleware('permission:purchase_add');
    Route::get('suppliers/{supplier}', [SupplierController::class, 'show'])->middleware('permission:purchase_add');
    Route::put('suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:purchase_add');
    Route::delete('suppliers/{supplier}', [SupplierController::class, 'destroy'])->middleware('permission:purchase_add');
    Route::get('suppliers/{supplier}/debts', [SupplierController::class, 'debts'])->middleware('permission:purchase_add');
    Route::post('suppliers/{supplier}/payment', [SupplierController::class, 'payment'])->middleware('permission:purchase_add');

    Route::get('sales', [SaleController::class, 'index']);
    Route::post('sales', [SaleController::class, 'store'])->middleware('permission:sales_add');
    Route::get('sales/{sale}', [SaleController::class, 'show']);
    Route::post('sales/{sale}/payment', [SaleController::class, 'payment'])->middleware('permission:sales_add');
    Route::delete('sales/{sale}', [SaleController::class, 'destroy'])->middleware('permission:sales_add');
    Route::get('sales/{sale}/invoice', [SaleController::class, 'invoice']);

    Route::get('purchases', [PurchaseController::class, 'index'])->middleware('permission:purchase_add');
    Route::post('purchases', [PurchaseController::class, 'store'])->middleware('permission:purchase_add');
    Route::get('purchases/{purchase}', [PurchaseController::class, 'show'])->middleware('permission:purchase_add');
    Route::delete('purchases/{purchase}', [PurchaseController::class, 'destroy'])->middleware('permission:purchase_add');

    Route::get('stocks', [StockController::class, 'index'])->middleware('permission:stock_view');
    Route::get('stocks/low-stock', [StockController::class, 'lowStock'])->middleware('permission:stock_view');
    Route::get('stocks/{product}', [StockController::class, 'show'])->middleware('permission:stock_view');
    Route::get('stock-movements', [StockController::class, 'movements'])->middleware('permission:stock_view');
    Route::post('stocks/adjustment', [StockController::class, 'adjustment'])->middleware('permission:stock_view');
    Route::get('warehouses', [WarehouseController::class, 'index'])->middleware('permission:stock_view');
    Route::post('warehouses', [WarehouseController::class, 'store'])->middleware('permission:stock_view');
    Route::get('warehouses/{warehouse}', [WarehouseController::class, 'show'])->middleware('permission:stock_view');
    Route::put('warehouses/{warehouse}', [WarehouseController::class, 'update'])->middleware('permission:stock_view');
    Route::delete('warehouses/{warehouse}', [WarehouseController::class, 'destroy'])->middleware('permission:stock_view');
    Route::get('warehouse-transfers', [WarehouseController::class, 'transfers'])->middleware('permission:stock_view');
    Route::post('warehouses/transfer', [WarehouseController::class, 'transfer'])->middleware('permission:stock_view');

    Route::prefix('finance')->group(function (): void {
        Route::get('summary', [FinanceController::class, 'summary'])->middleware('permission:expense_view');
        Route::get('accounts', [FinanceController::class, 'accounts'])->middleware('permission:expense_view');
        Route::post('accounts', [FinanceController::class, 'storeAccount'])->middleware('permission:expense_view');
        Route::put('accounts/{account}', [FinanceController::class, 'updateAccount'])->middleware('permission:expense_view');
        Route::delete('accounts/{account}', [FinanceController::class, 'destroyAccount'])->middleware('permission:expense_view');
        Route::get('transactions', [FinanceController::class, 'transactions'])->middleware('permission:expense_view');
    });

    Route::apiResource('expenses', ExpenseController::class)->middleware('permission:expense_view');

    Route::prefix('reports')->middleware('permission:reports_view')->group(function (): void {
        Route::get('sales', [ReportController::class, 'sales']);
        Route::get('stock', [ReportController::class, 'stock']);
        Route::get('finance', [ReportController::class, 'finance']);
        Route::get('customer-debts', [ReportController::class, 'customerDebts']);
        Route::get('purchases', [ReportController::class, 'purchases']);
        Route::get('expenses', [ReportController::class, 'expenses']);
        Route::get('cost-prices', [ReportController::class, 'costPrices']);
    });

    Route::prefix('import')->group(function (): void {
        Route::post('products', [ImportController::class, 'products'])->middleware('permission:stock_view');
        Route::post('customers', [ImportController::class, 'customers']);
        Route::post('stocks', [ImportController::class, 'stocks'])->middleware('permission:stock_view');
        Route::post('balances', [ImportController::class, 'balances'])->middleware('permission:expense_view');
        Route::post('debts', [ImportController::class, 'debts'])->middleware('permission:expense_view');
        Route::post('coefficients', [ImportController::class, 'coefficients'])->middleware('permission:coefficients_manage');
    });

    Route::prefix('mobile')->group(function (): void {
        Route::get('products', [MobileController::class, 'products']);
        Route::get('customers', [MobileController::class, 'customers']);
        Route::post('customers', [MobileController::class, 'storeCustomer']);
        Route::post('sales', [MobileController::class, 'storeSale']);
        Route::get('my-sales', [MobileController::class, 'mySales']);
        Route::get('dashboard', [MobileController::class, 'dashboard']);
    });
});

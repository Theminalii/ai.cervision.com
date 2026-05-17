<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AiSettingsController;
use App\Http\Controllers\Api\AiAgentController;
use App\Http\Controllers\Api\BrandController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CrmActivityController;
use App\Http\Controllers\Api\CrmAiController;
use App\Http\Controllers\Api\CrmCompanyController;
use App\Http\Controllers\Api\CrmContactController;
use App\Http\Controllers\Api\CrmCustomerController;
use App\Http\Controllers\Api\CrmDealController;
use App\Http\Controllers\Api\CrmLeadController;
use App\Http\Controllers\Api\CrmOverviewController;
use App\Http\Controllers\Api\CrmTaskController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\ImportController;
use App\Http\Controllers\Api\InstagramController;
use App\Http\Controllers\Api\MobileController;
use App\Http\Controllers\Api\OmnichannelController;
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
use App\Http\Controllers\Api\WhatsAppCloudController;
use App\Http\Controllers\Api\WhatsAppWebController;
use App\Http\Controllers\Api\WarehouseController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'login']);
Route::post('mobile/login', [MobileController::class, 'login']);
Route::post('omnichannel/internal/whatsapp-sync', [OmnichannelController::class, 'syncWhatsApp']);
Route::get('integrations/instagram/webhook', [InstagramController::class, 'verify']);
Route::post('integrations/instagram/webhook', [InstagramController::class, 'webhook']);
Route::get('integrations/whatsapp-cloud/webhook', [WhatsAppCloudController::class, 'verify']);
Route::post('integrations/whatsapp-cloud/webhook', [WhatsAppCloudController::class, 'webhook']);

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
        Route::get('ai', [AiSettingsController::class, 'show'])->middleware('permission:users_manage');
        Route::put('ai', [AiSettingsController::class, 'update'])->middleware('permission:users_manage');
        Route::post('ai/test', [AiSettingsController::class, 'test'])->middleware('permission:users_manage');
        Route::post('ai/validate-token', [AiSettingsController::class, 'validateToken'])->middleware('permission:users_manage');
        Route::get('ai/usage', [AiSettingsController::class, 'usage'])->middleware('permission:users_manage');
        Route::get('ai/logs', [AiSettingsController::class, 'logs'])->middleware('permission:users_manage');
        Route::get('whatsapp', [AiSettingsController::class, 'whatsapp'])->middleware('permission:users_manage');
        Route::put('whatsapp', [AiSettingsController::class, 'updateWhatsapp'])->middleware('permission:users_manage');
        Route::get('instagram', [AiSettingsController::class, 'instagram'])->middleware('permission:users_manage');
        Route::put('instagram', [AiSettingsController::class, 'updateInstagram'])->middleware('permission:users_manage');
        Route::get('gmail', [AiSettingsController::class, 'gmail'])->middleware('permission:users_manage');
        Route::put('gmail', [AiSettingsController::class, 'updateGmail'])->middleware('permission:users_manage');
        Route::post('gmail/sync', [AiSettingsController::class, 'syncGmail'])->middleware('permission:users_manage');
        Route::get('ai-automation', [AiSettingsController::class, 'automation'])->middleware('permission:users_manage');
        Route::put('ai-automation', [AiSettingsController::class, 'updateAutomation'])->middleware('permission:users_manage');
    });

    Route::prefix('dashboard')->group(function (): void {
        Route::get('summary', [DashboardController::class, 'summary']);
        Route::get('sales-chart', [DashboardController::class, 'salesChart']);
        Route::get('expense-chart', [DashboardController::class, 'expenseChart']);
        Route::get('recent-sales', [DashboardController::class, 'recentSales']);
        Route::get('recent-purchases', [DashboardController::class, 'recentPurchases']);
        Route::get('low-stock', [DashboardController::class, 'lowStock']);
        Route::get('notifications', [DashboardController::class, 'notifications']);
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

    Route::get('customers', [CustomerController::class, 'index'])->middleware('permission:sales_add');
    Route::get('customers/meta', [CustomerController::class, 'meta'])->middleware('permission:sales_add');
    Route::post('customers', [CustomerController::class, 'store'])->middleware('permission:sales_add');
    Route::get('customers/{customer}', [CustomerController::class, 'show'])->middleware('permission:sales_add');
    Route::put('customers/{customer}', [CustomerController::class, 'update'])->middleware('permission:sales_add');
    Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->middleware('permission:sales_add');
    Route::get('customers/{customer}/debts', [CustomerController::class, 'debts'])->middleware('permission:sales_add');
    Route::post('customers/{customer}/payment', [CustomerController::class, 'payment'])->middleware('permission:sales_add');

    Route::get('suppliers', [SupplierController::class, 'index'])->middleware('permission:purchase_add');
    Route::post('suppliers', [SupplierController::class, 'store'])->middleware('permission:purchase_add');
    Route::get('suppliers/{supplier}', [SupplierController::class, 'show'])->middleware('permission:purchase_add');
    Route::put('suppliers/{supplier}', [SupplierController::class, 'update'])->middleware('permission:purchase_add');
    Route::delete('suppliers/{supplier}', [SupplierController::class, 'destroy'])->middleware('permission:purchase_add');
    Route::get('suppliers/{supplier}/debts', [SupplierController::class, 'debts'])->middleware('permission:purchase_add');
    Route::post('suppliers/{supplier}/payment', [SupplierController::class, 'payment'])->middleware('permission:purchase_add');

    Route::get('sales', [SaleController::class, 'index'])->middleware('permission:sales_add');
    Route::post('sales', [SaleController::class, 'store'])->middleware('permission:sales_add');
    Route::get('sales/{sale}', [SaleController::class, 'show'])->middleware('permission:sales_add');
    Route::post('sales/{sale}/payment', [SaleController::class, 'payment'])->middleware('permission:sales_add');
    Route::delete('sales/{sale}', [SaleController::class, 'destroy'])->middleware('permission:sales_add');
    Route::get('sales/{sale}/invoice', [SaleController::class, 'invoice'])->middleware('permission:sales_add');

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

    Route::prefix('ai-agent')->middleware('permission:users_manage')->group(function (): void {
        Route::get('overview', [AiAgentController::class, 'overview']);
        Route::get('products', [AiAgentController::class, 'products']);
        Route::get('sales', [AiAgentController::class, 'sales']);
        Route::get('purchases', [AiAgentController::class, 'purchases']);
        Route::get('stocks', [AiAgentController::class, 'stocks']);
        Route::get('employees', [AiAgentController::class, 'employees']);
        Route::get('customers', [AiAgentController::class, 'customers']);
        Route::get('finance', [AiAgentController::class, 'finance']);
        Route::post('chat', [AiAgentController::class, 'chat']);
        Route::post('recommendations', [AiAgentController::class, 'recommendations']);
    });

    Route::prefix('crm')->middleware('permission:crm_view')->group(function (): void {
        Route::get('overview', [CrmOverviewController::class, 'overview']);
        Route::get('reports', [CrmOverviewController::class, 'reports']);

        Route::get('customers', [CrmCustomerController::class, 'index']);
        Route::post('customers', [CrmCustomerController::class, 'store']);
        Route::get('customers/{customer}', [CrmCustomerController::class, 'show']);
        Route::put('customers/{customer}', [CrmCustomerController::class, 'update']);
        Route::delete('customers/{customer}', [CrmCustomerController::class, 'destroy']);

        Route::get('companies', [CrmCompanyController::class, 'index']);
        Route::post('companies', [CrmCompanyController::class, 'store']);
        Route::get('companies/{company}', [CrmCompanyController::class, 'show']);
        Route::put('companies/{company}', [CrmCompanyController::class, 'update']);
        Route::delete('companies/{company}', [CrmCompanyController::class, 'destroy']);

        Route::get('contacts', [CrmContactController::class, 'index']);
        Route::post('contacts', [CrmContactController::class, 'store']);
        Route::put('contacts/{contact}', [CrmContactController::class, 'update']);
        Route::delete('contacts/{contact}', [CrmContactController::class, 'destroy']);

        Route::get('leads', [CrmLeadController::class, 'index']);
        Route::post('leads', [CrmLeadController::class, 'store']);
        Route::put('leads/{lead}', [CrmLeadController::class, 'update']);
        Route::delete('leads/{lead}', [CrmLeadController::class, 'destroy']);
        Route::post('leads/{lead}/convert', [CrmLeadController::class, 'convert']);

        Route::get('deals', [CrmDealController::class, 'index']);
        Route::post('deals', [CrmDealController::class, 'store']);
        Route::put('deals/{deal}', [CrmDealController::class, 'update']);
        Route::delete('deals/{deal}', [CrmDealController::class, 'destroy']);
        Route::patch('deals/{deal}/stage', [CrmDealController::class, 'stage']);

        Route::get('tasks', [CrmTaskController::class, 'index']);
        Route::post('tasks', [CrmTaskController::class, 'store']);
        Route::put('tasks/{task}', [CrmTaskController::class, 'update']);
        Route::delete('tasks/{task}', [CrmTaskController::class, 'destroy']);
        Route::patch('tasks/{task}/status', [CrmTaskController::class, 'status']);

        Route::get('activities', [CrmActivityController::class, 'index']);
        Route::post('activities', [CrmActivityController::class, 'store']);

        Route::get('ai/recommendations', [CrmAiController::class, 'recommendations']);
        Route::post('ai/chat', [CrmAiController::class, 'chat']);
    });

    Route::prefix('omnichannel')->middleware('permission:crm_view')->group(function (): void {
        Route::get('inbox', [OmnichannelController::class, 'inbox']);
        Route::get('conversations/{conversation}', [OmnichannelController::class, 'show']);
        Route::post('conversations/{conversation}/reply', [OmnichannelController::class, 'reply']);
        Route::post('conversations/{conversation}/ai-suggest', [OmnichannelController::class, 'aiSuggest']);
        Route::post('conversations/{conversation}/handoff', [OmnichannelController::class, 'handoff']);
        Route::post('conversations/{conversation}/toggle-ai', [OmnichannelController::class, 'toggleAi']);
        Route::get('settings', [OmnichannelController::class, 'settings']);
        Route::put('settings', [OmnichannelController::class, 'updateSettings']);
        Route::get('logs', [OmnichannelController::class, 'logs']);
    });

    Route::prefix('integrations')->middleware('permission:users_manage')->group(function (): void {
        Route::get('whatsapp-web/status', [WhatsAppWebController::class, 'status']);
        Route::get('whatsapp-web/qr', [WhatsAppWebController::class, 'qr']);
        Route::post('whatsapp-web/connect', [WhatsAppWebController::class, 'connect']);
        Route::post('whatsapp-web/disconnect', [WhatsAppWebController::class, 'disconnect']);
        Route::post('whatsapp-web/send-message', [WhatsAppWebController::class, 'sendMessage']);
        Route::post('whatsapp/send-test', [WhatsAppWebController::class, 'sendMessage']);
        Route::post('whatsapp-cloud/send-message', [WhatsAppCloudController::class, 'sendMessage']);
        Route::post('instagram/send-message', [InstagramController::class, 'sendMessage']);
        Route::post('instagram/send-test', [InstagramController::class, 'sendMessage']);
    });

    Route::prefix('import')->group(function (): void {
        Route::post('products', [ImportController::class, 'products'])->middleware('permission:stock_view');
        Route::post('products/excel', [ImportController::class, 'excelProducts'])->middleware('permission:stock_view');
        Route::post('customers', [ImportController::class, 'customers'])->middleware('permission:sales_add');
        Route::post('stocks', [ImportController::class, 'stocks'])->middleware('permission:stock_view');
        Route::post('balances', [ImportController::class, 'balances'])->middleware('permission:expense_view');
        Route::post('debts', [ImportController::class, 'debts'])->middleware('permission:expense_view');
        Route::post('coefficients', [ImportController::class, 'coefficients'])->middleware('permission:coefficients_manage');
        Route::post('sales/excel', [ImportController::class, 'excelSales'])->middleware('permission:sales_add');
        Route::post('purchases/excel', [ImportController::class, 'excelPurchases'])->middleware('permission:purchase_add');
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

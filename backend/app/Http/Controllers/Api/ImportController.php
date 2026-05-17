<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Import\ExcelImportCommitRequest;
use App\Http\Requests\Import\ImportPayloadRequest;
use App\Services\ImportService;

class ImportController extends Controller
{
    public function __construct(protected ImportService $importService)
    {
    }

    public function products(ImportPayloadRequest $request)
    {
        $this->importService->importProducts($request->data);

        return response()->json(['message' => 'Məhsullar import edildi.']);
    }

    public function customers(ImportPayloadRequest $request)
    {
        $this->importService->importCustomers($request->data);

        return response()->json(['message' => 'Müştərilər import edildi.']);
    }

    public function stocks(ImportPayloadRequest $request)
    {
        $this->importService->importStocks($request->data);

        return response()->json(['message' => 'Stok məlumatları import edildi.']);
    }

    public function balances(ImportPayloadRequest $request)
    {
        $this->importService->importBalances($request->data, $request->user());

        return response()->json(['message' => 'Başlanğıc balanslar import edildi.']);
    }

    public function debts(ImportPayloadRequest $request)
    {
        $this->importService->importDebts($request->data);

        return response()->json(['message' => 'Borclar import edildi.']);
    }

    public function coefficients(ImportPayloadRequest $request)
    {
        $this->importService->importCoefficients($request->data);

        return response()->json(['message' => 'Əmsallar import edildi.']);
    }

    public function excelProducts(ExcelImportCommitRequest $request)
    {
        return response()->json($this->importService->importExcelProducts($request->validated('rows'), $request->user()));
    }

    public function excelSales(ExcelImportCommitRequest $request)
    {
        return response()->json($this->importService->importExcelSales($request->validated('rows'), $request->user()));
    }

    public function excelPurchases(ExcelImportCommitRequest $request)
    {
        return response()->json($this->importService->importExcelPurchases($request->validated('rows'), $request->user()));
    }
}

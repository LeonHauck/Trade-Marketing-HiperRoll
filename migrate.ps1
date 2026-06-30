$dataJs = Get-Content "data.js" -Raw
$dataJs = $dataJs -replace "^const PRODUCTS_DATA = ", ""
$parts = $dataJs -split "const STORES_DATA = "
$productsJsonStr = $parts[0] -replace ";\s*`$", ""
$storesJsonStr = $parts[1] -replace ";\s*`$", ""

$productsJsonStr = $productsJsonStr -replace ",\s*\]", "]" -replace ",\s*\}", "}"
$storesJsonStr = $storesJsonStr -replace ",\s*\]", "]" -replace ",\s*\}", "}"

$products = $productsJsonStr | ConvertFrom-Json
$stores = $storesJsonStr | ConvertFrom-Json

function generateStableId($network, $name) {
    if ([string]::IsNullOrWhiteSpace($network)) { $network = "Geral" }
    if ([string]::IsNullOrWhiteSpace($name)) { $name = "" }
    $raw = "$network-$name"
    $idStr = $raw.Normalize("FormD") -replace "\p{M}", "" -replace "[^a-zA-Z0-9-]", "-" -replace "-+", "-" -replace "^-|-`$", ""
    return $idStr.ToLower()
}

$storeIdMap = @{}
foreach ($store in $stores) {
    $storeIdMap[[string]$store.id] = generateStableId $store.network $store.name
}

$productIdMap = @{}
foreach ($prod in $products) {
    $productIdMap[[string]$prod.id] = generateStableId "" $prod.name
}

$visitsJson = Get-Content "visits.json" -Raw
$visits = $visitsJson | ConvertFrom-Json

foreach ($visit in $visits) {
    if ($null -ne $visit.storeId) {
        $strStoreId = [string]$visit.storeId
        $mapped = $storeIdMap[$strStoreId]
        if ($null -ne $mapped) {
            $visit.storeId = $mapped
        } else {
            $visit.storeId = $strStoreId
        }
    }
    if ($null -ne $visit.ruptures) {
        $newRuptures = @()
        foreach ($rId in $visit.ruptures) {
            $strRId = [string]$rId
            $mapped = $productIdMap[$strRId]
            if ($null -ne $mapped) {
                $newRuptures += $mapped
            } else {
                $newRuptures += $strRId
            }
        }
        $visit.ruptures = $newRuptures
    }
}

$migratedJson = $visits | ConvertTo-Json -Depth 10 -Compress
Set-Content "visits_migrated.json" -Value $migratedJson -Encoding UTF8
Write-Host "Migration completed successfully!"

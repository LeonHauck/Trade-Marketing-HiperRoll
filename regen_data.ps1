$csvPath = "Dados.csv"
$jsPath = "data.js"

$lines = Get-Content $csvPath -Raw
$lines = $lines -split "`n" | Where-Object { $_.Trim() -ne "" }
$headerLine = $lines[0]
$delimiter = if ($headerLine.Contains(";")) { ";" } else { "," }
$headers = $headerLine -split $delimiter | ForEach-Object { $_.Trim().ToLower() }

$colLoja = [array]::IndexOf($headers, ($headers | Where-Object { $_ -match 'loja|unidade|ponto' } | Select-Object -First 1))
$colItem = [array]::IndexOf($headers, ($headers | Where-Object { $_ -match 'item|produto|descri' } | Select-Object -First 1))
$colRede = [array]::IndexOf($headers, ($headers | Where-Object { $_ -match 'rede|bandeira|grupo' } | Select-Object -First 1))
$colStatus = [array]::IndexOf($headers, ($headers | Where-Object { $_ -match 'status|situa' } | Select-Object -First 1))

$stores = @()
$products = @()
$storeMap = @{}
$productMap = @{}

for ($i = 1; $i -lt $lines.Length; $i++) {
    $cols = $lines[$i] -split $delimiter
    if ($cols.Length -lt 2) { continue }

    $storeName = if ($null -ne $cols[$colLoja]) { $cols[$colLoja].Trim() } else { "" }
    $productName = if ($null -ne $cols[$colItem]) { $cols[$colItem].Trim() } else { "" }
    $networkName = if ($colRede -ne -1 -and $null -ne $cols[$colRede]) { $cols[$colRede].Trim() } else { "Geral" }
    $status = if ($colStatus -ne -1 -and $null -ne $cols[$colStatus]) { $cols[$colStatus].Trim() } else { "Ativo" }

    if ($storeName -ne "" -and (-not $storeMap.ContainsKey($storeName.ToLower()))) {
        $id = $stores.Count + 1
        $storeObj = @{ id = $id; name = $storeName; network = $networkName; lastVisit = $null; status = 'pending'; productIds = @() }
        $stores += $storeObj
        $storeMap[$storeName.ToLower()] = $storeObj
    }

    if ($productName -ne "" -and (-not $productMap.ContainsKey($productName.ToLower()))) {
        $id = 100 + $products.Count + 1
        $prodObj = @{ id = $id; name = $productName; network = $networkName; status = $status }
        $products += $prodObj
        $productMap[$productName.ToLower()] = $prodObj
    }

    if ($storeName -ne "" -and $productName -ne "") {
        $sObj = $storeMap[$storeName.ToLower()]
        $pObj = $productMap[$productName.ToLower()]
        if (-not $sObj.productIds.Contains($pObj.id)) {
            $sObj.productIds += $pObj.id
        }
    }
}

function ConvertArrayToJson($arr) {
    if ($arr.Count -eq 1) {
        return "[" + ($arr[0] | ConvertTo-Json -Depth 5) + "]"
    }
    return $arr | ConvertTo-Json -Depth 5
}

$storesJson = ConvertArrayToJson $stores
$productsJson = ConvertArrayToJson $products

$output = "const PRODUCTS_DATA = $productsJson;`r`n`r`nconst STORES_DATA = $storesJson;"
Set-Content -Path $jsPath -Value $output -Encoding UTF8
Write-Output "data.js foi regenerado com sucesso."

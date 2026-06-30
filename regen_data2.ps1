$csvPath = "Dados.csv"
$jsPath = "data.js"

$lines = Get-Content $csvPath -Raw
$lines = $lines -split "`n" | Where-Object { $_.Trim() -ne "" }
$headerLine = $lines[0]
$delimiter = if ($headerLine.Contains(";")) { ";" } else { "," }
$headers = $headerLine -split $delimiter

$colLoja = -1
$colItem = -1
$colRede = -1
$colStatus = -1

for ($i = 0; $i -lt $headers.Length; $i++) {
    $h = $headers[$i].Trim().ToLower()
    if ($h -match 'loja|unidade|ponto') { $colLoja = $i }
    elseif ($h -match 'item|produto|descri') { $colItem = $i }
    elseif ($h -match 'rede|bandeira|grupo') { $colRede = $i }
    elseif ($h -match 'status|situa') { $colStatus = $i }
}

$stores = @()
$products = @()
$storeMap = @{}
$productMap = @{}

for ($i = 1; $i -lt $lines.Length; $i++) {
    $cols = $lines[$i] -split $delimiter
    if ($cols.Length -lt 2) { continue }

    $storeName = if ($colLoja -ne -1 -and $cols.Length -gt $colLoja -and $null -ne $cols[$colLoja]) { $cols[$colLoja].Trim() } else { "" }
    $productName = if ($colItem -ne -1 -and $cols.Length -gt $colItem -and $null -ne $cols[$colItem]) { $cols[$colItem].Trim() } else { "" }
    $networkName = if ($colRede -ne -1 -and $cols.Length -gt $colRede -and $null -ne $cols[$colRede]) { $cols[$colRede].Trim() } else { "Geral" }
    $status = if ($colStatus -ne -1 -and $cols.Length -gt $colStatus -and $null -ne $cols[$colStatus]) { $cols[$colStatus].Trim() } else { "Ativo" }

    if ($storeName -ne "" -and (-not $storeMap.ContainsKey($storeName.ToLower()))) {
        $id = ($networkName + '-' + $storeName).Normalize('FormD') -replace '[\p{M}]', '' -replace '[^a-zA-Z0-9-]', '-' -replace '-+', '-' -replace '^-|-
        $storeObj = @{ id = $id; name = $storeName; network = $networkName; lastVisit = $null; status = 'pending'; productIds = @() }
        $stores += $storeObj
        $storeMap[$storeName.ToLower()] = $storeObj
    }

    if ($productName -ne "" -and (-not $productMap.ContainsKey($productName.ToLower()))) {
        $id = $productName.Normalize('FormD') -replace '[\p{M}]', '' -replace '[^a-zA-Z0-9-]', '-' -replace '-+', '-' -replace '^-|-
        $prodObj = @{ id = $id; name = $productName; network = $networkName; status = $status }
        $products += $prodObj
        $productMap[$productName.ToLower()] = $prodObj
    }

    if ($storeName -ne "" -and $productName -ne "") {
        $sObj = $storeMap[$storeName.ToLower()]
        $pObj = $productMap[$productName.ToLower()]
        if (-not $sObj.productIds.Contains($pObj.id)) {
            $sObj.productIds += @($pObj.id)
        }
    }
}

function ConvertArrayToJson($arr) {
    if ($arr.Count -eq 1) {
        return "[" + ($arr[0] | ConvertTo-Json -Depth 5 -Compress) + "]"
    }
    return $arr | ConvertTo-Json -Depth 5 -Compress
}

$storesJson = ConvertArrayToJson $stores
$productsJson = ConvertArrayToJson $products

$output = "const PRODUCTS_DATA = $productsJson;`r`n`r`nconst STORES_DATA = $storesJson;"
Set-Content -Path $jsPath -Value $output -Encoding UTF8
Write-Output "Regenerated correctly."
, ''; $id = $id.ToLower()
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
            $sObj.productIds += @($pObj.id)
        }
    }
}

function ConvertArrayToJson($arr) {
    if ($arr.Count -eq 1) {
        return "[" + ($arr[0] | ConvertTo-Json -Depth 5 -Compress) + "]"
    }
    return $arr | ConvertTo-Json -Depth 5 -Compress
}

$storesJson = ConvertArrayToJson $stores
$productsJson = ConvertArrayToJson $products

$output = "const PRODUCTS_DATA = $productsJson;`r`n`r`nconst STORES_DATA = $storesJson;"
Set-Content -Path $jsPath -Value $output -Encoding UTF8
Write-Output "Regenerated correctly."
, ''; $id = $id.ToLower()
        $prodObj = @{ id = $id; name = $productName; network = $networkName; status = $status }
        $products += $prodObj
        $productMap[$productName.ToLower()] = $prodObj
    }

    if ($storeName -ne "" -and $productName -ne "") {
        $sObj = $storeMap[$storeName.ToLower()]
        $pObj = $productMap[$productName.ToLower()]
        if (-not $sObj.productIds.Contains($pObj.id)) {
            $sObj.productIds += @($pObj.id)
        }
    }
}

function ConvertArrayToJson($arr) {
    if ($arr.Count -eq 1) {
        return "[" + ($arr[0] | ConvertTo-Json -Depth 5 -Compress) + "]"
    }
    return $arr | ConvertTo-Json -Depth 5 -Compress
}

$storesJson = ConvertArrayToJson $stores
$productsJson = ConvertArrayToJson $products

$output = "const PRODUCTS_DATA = $productsJson;`r`n`r`nconst STORES_DATA = $storesJson;"
Set-Content -Path $jsPath -Value $output -Encoding UTF8
Write-Output "Regenerated correctly."
, ''; $id = $id.ToLower()
        $storeObj = @{ id = $id; name = $storeName; network = $networkName; lastVisit = $null; status = 'pending'; productIds = @() }
        $stores += $storeObj
        $storeMap[$storeName.ToLower()] = $storeObj
    }

    if ($productName -ne "" -and (-not $productMap.ContainsKey($productName.ToLower()))) {
        $id = $productName.Normalize('FormD') -replace '[\p{M}]', '' -replace '[^a-zA-Z0-9-]', '-' -replace '-+', '-' -replace '^-|-
        $prodObj = @{ id = $id; name = $productName; network = $networkName; status = $status }
        $products += $prodObj
        $productMap[$productName.ToLower()] = $prodObj
    }

    if ($storeName -ne "" -and $productName -ne "") {
        $sObj = $storeMap[$storeName.ToLower()]
        $pObj = $productMap[$productName.ToLower()]
        if (-not $sObj.productIds.Contains($pObj.id)) {
            $sObj.productIds += @($pObj.id)
        }
    }
}

function ConvertArrayToJson($arr) {
    if ($arr.Count -eq 1) {
        return "[" + ($arr[0] | ConvertTo-Json -Depth 5 -Compress) + "]"
    }
    return $arr | ConvertTo-Json -Depth 5 -Compress
}

$storesJson = ConvertArrayToJson $stores
$productsJson = ConvertArrayToJson $products

$output = "const PRODUCTS_DATA = $productsJson;`r`n`r`nconst STORES_DATA = $storesJson;"
Set-Content -Path $jsPath -Value $output -Encoding UTF8
Write-Output "Regenerated correctly."
, ''; $id = $id.ToLower()
        $prodObj = @{ id = $id; name = $productName; network = $networkName; status = $status }
        $products += $prodObj
        $productMap[$productName.ToLower()] = $prodObj
    }

    if ($storeName -ne "" -and $productName -ne "") {
        $sObj = $storeMap[$storeName.ToLower()]
        $pObj = $productMap[$productName.ToLower()]
        if (-not $sObj.productIds.Contains($pObj.id)) {
            $sObj.productIds += @($pObj.id)
        }
    }
}

function ConvertArrayToJson($arr) {
    if ($arr.Count -eq 1) {
        return "[" + ($arr[0] | ConvertTo-Json -Depth 5 -Compress) + "]"
    }
    return $arr | ConvertTo-Json -Depth 5 -Compress
}

$storesJson = ConvertArrayToJson $stores
$productsJson = ConvertArrayToJson $products

$output = "const PRODUCTS_DATA = $productsJson;`r`n`r`nconst STORES_DATA = $storesJson;"
Set-Content -Path $jsPath -Value $output -Encoding UTF8
Write-Output "Regenerated correctly."


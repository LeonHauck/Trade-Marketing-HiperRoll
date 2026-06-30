# Verify data.js regeneration
$content = Get-Content 'data.js' -Raw

# Extract first store's product IDs
$match = $content -match '"productIds": \[([\d,\s]+)\]'
if ($match) {
    $firstStore = $matches[0]
    $productIds = $firstStore -replace '"productIds": \[', '' -replace '\]', '' -split ','
    $productCount = $productIds | Where-Object { $_ -match '\d+' } | Measure-Object | Select-Object -ExpandProperty Count
    Write-Host "Primeira loja tem $productCount produtos"
    Write-Host "IDs dos produtos: $(($productIds | Select-Object -First 10) -join ', ')..."
}

# Count total stores
$storeCount = ([regex]::Matches($content, '"id":\s*\d+,') | Measure-Object).Count
Write-Host "Total de lojas em data.js: $storeCount"

# Quick check: verify store 10 has all products
if ($content -match '"name":\s*"10 - [^"]*".*?"productIds":\s*\[([\d,\s]+)\]') {
    $prodIds = $matches[1] -split ',' | ForEach-Object { $_.Trim() }
    Write-Host ""
    Write-Host "Loja 10 tem $($prodIds.Count) produtos (esperado: 26)"
}

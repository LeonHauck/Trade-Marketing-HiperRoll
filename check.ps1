$content = Get-Content 'data.js' -Raw
$json = $content -replace '(?s)^.*?const STORES_DATA = ', '' -replace '];$', ']'
$json = $json -replace '(?s)const PRODUCTS_DATA =.*?];\s*', ''
$json = $json -replace ';$', ''
$stores = $json | ConvertFrom-Json
$bramil = $stores | Where-Object { $_.name -match 'BRAMIL' }
foreach ($b in $bramil) {
    Write-Output "$($b.name) : $($b.productIds.Count) items"
}

$content = Get-Content 'data.js' -Raw -Encoding UTF8

$storesMatch = [regex]::Match($content, '(?s)const STORES_DATA = (\[.*?\]);\s*const VISITS_DATA =')
if (-not $storesMatch.Success) {
    Write-Host "Could not find STORES_DATA block!"
    exit 1
}

$storesText = $storesMatch.Groups[1].Value
$stores = $storesText | ConvertFrom-Json -Depth 10

$storesToUpdate = @(
    "695 ATACADAO - SSA BARRA",
    "835 ATACADAO - SSA CABULA",
    "942 ATACADAO - SSA CAMPINAS BROTAS",
    "618 ATACADAO - SSA GARIBALDI",
    "742 ATACADAO - SSA ITAPUA",
    "851 ATACADAO - SSA MARES",
    "921 ATACADAO - SSA MATA ESCURA",
    "841 ATACADAO - SSA PAU DA LIMA",
    "696 ATACADAO - SSA PITUBA",
    "917 ATACADAO - SSA CAJAZEIRAS",
    "916 ATACADAO - SSA ACM",
    "918 ATACADAO - SSA BONOCO",
    "920 ATACADAO - SSA IGUATEMI",
    "923 ATACADAO - SSA TROBOGY"
)

$idsToRemove = @("sacola-29x39", "sacola-38x48")
$modifiedCount = 0

foreach ($store in $stores) {
    if ($storesToUpdate -contains $store.name -and $store.productIds) {
        $originalLength = $store.productIds.Count
        $store.productIds = $store.productIds | Where-Object { $idsToRemove -notcontains $_ }
        if ($store.productIds.Count -ne $originalLength) {
            $modifiedCount++
            Write-Host "Updated: $($store.name)"
        }
    }
}

$newStoresText = $stores | ConvertTo-Json -Depth 10
$newContent = $content.Replace($storesText, $newStoresText)
$newContent | Set-Content 'data.js' -Encoding UTF8
Write-Host "Successfully updated $modifiedCount stores."

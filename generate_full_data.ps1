# Read the original CSV
$csv = Import-Csv 'Dados.csv' -Delimiter ';'

# Get unique stores (preserving order and network assignment)
$storeMap = @{}
$storeList = @()
$csv | ForEach-Object {
    if (-not $storeMap.ContainsKey($_.LOJA)) {
        $storeMap[$_.LOJA] = $_.Rede
        $storeList += $_.LOJA
    }
}

# Get unique products
$products = $csv | Select-Object -ExpandProperty 'ITEM ' -Unique | Sort-Object

Write-Host "Gerando novo CSV com todos os produtos para todas as lojas..."
Write-Host "Lojas: $($storeList.Count)"
Write-Host "Produtos: $($products.Count)"

# Create new CSV content
$newRows = @()
$newRows += "LOJA;ITEM ;Rede;STATUS "

foreach ($store in $storeList) {
    $rede = $storeMap[$store]
    foreach ($product in $products) {
        $newRows += "$store;$product;$rede;ATIVO "
    }
}

# Write to new CSV
$newRows | Out-File 'Dados_novo.csv' -Encoding UTF8

Write-Host "Arquivo 'Dados_novo.csv' criado com $($newRows.Count - 1) linhas de dados"

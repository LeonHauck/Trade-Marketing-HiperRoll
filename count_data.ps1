# Read the CSV
$csv = Import-Csv 'Dados.csv' -Delimiter ';'

# Get unique stores and products
$stores = $csv | Select-Object -ExpandProperty 'LOJA' -Unique
$products = $csv | Select-Object -ExpandProperty 'ITEM ' -Unique
$redes = $csv | Select-Object -ExpandProperty 'Rede' -Unique

Write-Host "Total de lojas: $($stores.Count)"
Write-Host "Total de produtos: $($products.Count)"
Write-Host "Total de redes: $($redes.Count)"
Write-Host "Linhas esperadas: $($stores.Count * $products.Count)"
Write-Host ""
Write-Host "Redes encontradas:"
$redes | ForEach-Object { Write-Host "  - $_" }

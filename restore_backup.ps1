# Restore from backup
Copy-Item 'Dados_backup_20260616_135150.csv' 'Dados.csv' -Force
Write-Host "Dados.csv restaurado do backup"

# Verify restore
$lineCount = (Get-Content 'Dados.csv' | Measure-Object -Line).Lines
Write-Host "Total de linhas em Dados.csv: $lineCount"

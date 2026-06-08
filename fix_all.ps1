$filePath = "C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\app.js"
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$content = [System.Text.Encoding]::UTF8.GetString($bytes)

# The actual chars in the file for the broken sequence are:
# char(239) = ï, char(191) = ¿, char(189) = ½
# Let's build the marker string from these exact codepoints
$marker = [string]::new([char[]]@([char]239, [char]191, [char]189))

$countBefore = 0
$idx = 0
while (($idx = $content.IndexOf($marker, $idx)) -ge 0) {
    $countBefore++
    $idx++
}
Write-Host "Found $countBefore marker sequences"

# Now do replacements using this marker
$m = $marker

$content = $content.Replace("A${m}${m}es", "Ações")
$content = $content.Replace("Fun${m}o de Notifica${m}o Visual", "Função de Notificação Visual")
$content = $content.Replace("Sincroniza${m}o com o Servidor HostGator (se dispon${m}vel)", "Sincronização com o Servidor HostGator (se disponível)")
$content = $content.Replace("Mant${m}m propor${m}o da imagem", "Mantém proporção da imagem")
$content = $content.Replace("modo edi${m}o ao fechar", "modo edição ao fechar")
$content = $content.Replace("N${m}O ${m} mais persistido", "NÃO é mais persistido")
$content = $content.Replace("S${m} gera score se tiver pelo menos um motivo de aten${m}o", "Só gera score se tiver pelo menos um motivo de atenção")
$content = $content.Replace("requer aten${m}o", "requer atenção")
$content = $content.Replace("no m${m}ximo 60 dias para n${m}o sobrecarregar o gr${m}fico", "no máximo 60 dias para não sobrecarregar o gráfico")
$content = $content.Replace("rede para o gr${m}fico", "rede para o gráfico")
$content = $content.Replace("Persist${m}ncia e sincroniza${m}o", "Persistência e sincronização")
$content = $content.Replace("Valida${m}o simples", "Validação simples")
$content = $content.Replace("N${m}o h${m} dados filtrados", "Não há dados filtrados")
$content = $content.Replace("Op${m}o 2: Apenas itens daquela loja espec${m}fica", "Opção 2: Apenas itens daquela loja específica")
$content = $content.Replace("EDI${m}AO: sobrep${m}e", "EDIÇÃO: sobrepõe")
$content = $content.Replace("DESMARCADAS nesta edi${m}o", "DESMARCADAS nesta edição")
$content = $content.Replace("salvar edi${m}o:", "salvar edição:")
$content = $content.Replace("salvar a edi${m}o. Tente", "salvar a edição. Tente")
$content = $content.Replace("para valida${m}o (em lote", "para validação (em lote")
$content = $content.Replace("para demonstra${m}o,", "para demonstração,")
$content = $content.Replace("bot${m}o de valida${m}o", "botão de validação")
$content = $content.Replace("Fun${m}o chamada pelo input", "Função chamada pelo input")
$content = $content.Replace("t${m}tulo e bot${m}o para indicar modo edi${m}o", "título e botão para indicar modo edição")
$content = $content.Replace("edi${m}o para evitar inconsist${m}ncia", "edição para evitar inconsistência")
$content = $content.Replace("Pr${m}-preenche observa${m}es", "Pré-preenche observações")
$content = $content.Replace("pr${m}-populado com os dados da visita para edi${m}o", "pré-populado com os dados da visita para edição")
$content = $content.Replace("edi${m}o ANTES de qualquer renderiza${m}o", "edição ANTES de qualquer renderização")
$content = $content.Replace("j${m} foi resolvido", "já foi resolvido")
$content = $content.Replace("N${m}O est${m} mais", "NÃO está mais")
$content = $content.Replace("${m} visita sem resolver", "ª visita sem resolver")
$content = $content.Replace("modo edi${m}o se existir", "modo edição se existir")

# Generic H + marker patterns (careful with backticks)
$content = $content.Replace("visita h${m} ", "visita há ")
$hPattern = "H${m} "
$content = $content.Replace($hPattern, "Há ")

# Mode edição with closing paren
$content = $content.Replace("modo edi${m}o)", "modo edição)")

# Count remaining
$countAfter = 0
$idx = 0
while (($idx = $content.IndexOf($marker, $idx)) -ge 0) {
    $countAfter++
    $idx++
}
Write-Host "After: $countAfter marker sequences remaining"

if ($countAfter -gt 0) {
    $idx = 0
    while (($idx = $content.IndexOf($marker, $idx)) -ge 0) {
        $start = [Math]::Max(0, $idx - 20)
        $len = [Math]::Min(60, $content.Length - $start)
        $ctx = $content.Substring($start, $len) -replace "`r`n", " "
        Write-Host "  Remaining at $idx : $ctx"
        $idx++
    }
}

# Save
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
Write-Host "File saved!"

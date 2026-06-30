$filePath = "C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\app.js"
$bytes = [System.IO.File]::ReadAllBytes($filePath)
$content = [System.Text.Encoding]::UTF8.GetString($bytes)

# The actual chars in the file for the broken sequence are:
# char(239) = Ã¯, char(191) = Â¿, char(189) = Â½
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

$content = $content.Replace("A${m}${m}es", "AÃ§Ãµes")
$content = $content.Replace("Fun${m}o de Notifica${m}o Visual", "FunÃ§Ã£o de NotificaÃ§Ã£o Visual")
$content = $content.Replace("Sincroniza${m}o com o Servidor HostGator (se dispon${m}vel)", "SincronizaÃ§Ã£o com o Servidor HostGator (se disponÃ­vel)")
$content = $content.Replace("Mant${m}m propor${m}o da imagem", "MantÃ©m proporÃ§Ã£o da imagem")
$content = $content.Replace("modo edi${m}o ao fechar", "modo ediÃ§Ã£o ao fechar")
$content = $content.Replace("N${m}O ${m} mais persistido", "NÃƒO Ã© mais persistido")
$content = $content.Replace("S${m} gera score se tiver pelo menos um motivo de aten${m}o", "SÃ³ gera score se tiver pelo menos um motivo de atenÃ§Ã£o")
$content = $content.Replace("requer aten${m}o", "requer atenÃ§Ã£o")
$content = $content.Replace("no m${m}ximo 60 dias para n${m}o sobrecarregar o gr${m}fico", "no mÃ¡ximo 60 dias para nÃ£o sobrecarregar o grÃ¡fico")
$content = $content.Replace("rede para o gr${m}fico", "rede para o grÃ¡fico")
$content = $content.Replace("Persist${m}ncia e sincroniza${m}o", "PersistÃªncia e sincronizaÃ§Ã£o")
$content = $content.Replace("Valida${m}o simples", "ValidaÃ§Ã£o simples")
$content = $content.Replace("N${m}o h${m} dados filtrados", "NÃ£o hÃ¡ dados filtrados")
$content = $content.Replace("Op${m}o 2: Apenas itens daquela loja espec${m}fica", "OpÃ§Ã£o 2: Apenas itens daquela loja especÃ­fica")
$content = $content.Replace("EDI${m}AO: sobrep${m}e", "EDIÃ‡ÃƒO: sobrepÃµe")
$content = $content.Replace("DESMARCADAS nesta edi${m}o", "DESMARCADAS nesta ediÃ§Ã£o")
$content = $content.Replace("salvar edi${m}o:", "salvar ediÃ§Ã£o:")
$content = $content.Replace("salvar a edi${m}o. Tente", "salvar a ediÃ§Ã£o. Tente")
$content = $content.Replace("para valida${m}o (em lote", "para validaÃ§Ã£o (em lote")
$content = $content.Replace("para demonstra${m}o,", "para demonstraÃ§Ã£o,")
$content = $content.Replace("bot${m}o de valida${m}o", "botÃ£o de validaÃ§Ã£o")
$content = $content.Replace("Fun${m}o chamada pelo input", "FunÃ§Ã£o chamada pelo input")
$content = $content.Replace("t${m}tulo e bot${m}o para indicar modo edi${m}o", "tÃ­tulo e botÃ£o para indicar modo ediÃ§Ã£o")
$content = $content.Replace("edi${m}o para evitar inconsist${m}ncia", "ediÃ§Ã£o para evitar inconsistÃªncia")
$content = $content.Replace("Pr${m}-preenche observa${m}es", "PrÃ©-preenche observaÃ§Ãµes")
$content = $content.Replace("pr${m}-populado com os dados da visita para edi${m}o", "prÃ©-populado com os dados da visita para ediÃ§Ã£o")
$content = $content.Replace("edi${m}o ANTES de qualquer renderiza${m}o", "ediÃ§Ã£o ANTES de qualquer renderizaÃ§Ã£o")
$content = $content.Replace("j${m} foi resolvido", "jÃ¡ foi resolvido")
$content = $content.Replace("N${m}O est${m} mais", "NÃƒO estÃ¡ mais")
$content = $content.Replace("${m} visita sem resolver", "Âª visita sem resolver")
$content = $content.Replace("modo edi${m}o se existir", "modo ediÃ§Ã£o se existir")

# Generic H + marker patterns (careful with backticks)
$content = $content.Replace("visita h${m} ", "visita hÃ¡ ")
$hPattern = "H${m} "
$content = $content.Replace($hPattern, "HÃ¡ ")

# Mode ediÃ§Ã£o with closing paren
$content = $content.Replace("modo edi${m}o)", "modo ediÃ§Ã£o)")

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


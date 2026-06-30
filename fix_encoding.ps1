$files = @(
    "C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\app.js",
    "C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\index.html"
)

$replacements = @{
    "Ã§Ã£" = "çã"
    "Ã§Ãµ" = "çõ"
    "Ã¡" = "á"
    "Ã©" = "é"
    "Ã­" = "í"
    "Ã³" = "ó"
    "Ãº" = "ú"
    "Ã¢" = "â"
    "Ãª" = "ê"
    "Ã®" = "î"
    "Ã´" = "ô"
    "Ã»" = "û"
    "Ã£" = "ã"
    "Ãµ" = "õ"
    "Ã§" = "ç"
    "Ã " = "à"
    "ï¿½" = "ç"
}

# Add uppercase separately to avoid dictionary duplicate key issues if powershell ignores case in hash keys
# PowerShell hash tables are case-insensitive by default. We should create a case-sensitive one.
$hash = New-Object System.Collections.Hashtable
$hash.Add("Ã§Ã£", "çã")
$hash.Add("Ã§Ãµ", "çõ")
$hash.Add("Ã¡", "á")
$hash.Add("Ã©", "é")
$hash.Add("Ã­", "í")
$hash.Add("Ã³", "ó")
$hash.Add("Ãº", "ú")
$hash.Add("Ã¢", "â")
$hash.Add("Ãª", "ê")
$hash.Add("Ã®", "î")
$hash.Add("Ã´", "ô")
$hash.Add("Ã»", "û")
$hash.Add("Ã£", "ã")
$hash.Add("Ãµ", "õ")
$hash.Add("Ã§", "ç")
$hash.Add("Ã ", "à")
$hash.Add("Ã\x81", "Á")
$hash.Add("Ã\x89", "É")
$hash.Add("Ã\x8D", "Í")
$hash.Add("Ã\x93", "Ó")
$hash.Add("Ã\x9A", "Ú")
$hash.Add("Ã\x82", "Â")
$hash.Add("Ã\x8A", "Ê")
$hash.Add("Ã\x8E", "Î")
$hash.Add("Ã\x94", "Ô")
$hash.Add("Ã\x9B", "Û")
$hash.Add("Ã\x83", "Ã")
$hash.Add("Ã\x95", "Õ")
$hash.Add("Ã\x87", "Ç")
$hash.Add("Ã\x80", "À")

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
        
        # We'll use Regex for case-sensitive replace
        foreach ($key in $hash.Keys) {
            $content = [regex]::Replace($content, [regex]::Escape($key), $hash[$key])
        }
        
        # Fixing specific known words that might have been corrupted differently:
        $content = [regex]::Replace($content, "ediçço", "edição", "IgnoreCase")
        $content = [regex]::Replace($content, "observaçço", "observação", "IgnoreCase")
        $content = [regex]::Replace($content, "observaççes", "observações", "IgnoreCase")
        $content = [regex]::Replace($content, "evoluçço", "evolução", "IgnoreCase")
        $content = [regex]::Replace($content, "resoluçço", "resolução", "IgnoreCase")
        $content = [regex]::Replace($content, "atualizaçço", "atualização", "IgnoreCase")
        $content = [regex]::Replace($content, "validaçço", "validação", "IgnoreCase")
        $content = [regex]::Replace($content, "aÃ§Ã£o", "ação", "IgnoreCase")
        $content = [regex]::Replace($content, "ï¿½", "ç", "IgnoreCase")
        
        $content = $content.Replace("Ã©", "é")
        $content = $content.Replace("Ã¡", "á")
        $content = $content.Replace("Ã³", "ó")
        $content = $content.Replace("Ã§", "ç")
        $content = $content.Replace("Ã£", "ã")
        $content = $content.Replace("Ãµ", "õ")
        $content = $content.Replace("Ã­", "í")
        $content = $content.Replace("Ãº", "ú")
        $content = $content.Replace("Ãª", "ê")
        $content = $content.Replace("Ã´", "ô")
        $content = $content.Replace("Ã¢", "â")
        
        $content = $content.Replace("HistÃ³rico", "Histórico")
        $content = $content.Replace("jÃ¡", "já")
        $content = $content.Replace("atÃ©", "até")
        $content = $content.Replace("observaÃ§Ã£o", "observação")
        
        # Some aggressive replacements for the remaining common ones seen in screenshots
        $content = $content.Replace("ção", "ção").Replace("çõ", "çõ").Replace("çç", "ç")
        
        [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
        Write-Output "Processed: $file"
    }
}

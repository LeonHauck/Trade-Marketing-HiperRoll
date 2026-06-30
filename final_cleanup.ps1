$files = @(
    "C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\app.js",
    "C:\Users\leon.rodrigues\.gemini\antigravity\scratch\trade-marketing-hiperroll\index.html"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
        
        # Strip all the corrupted suffix characters that were appended
        $content = $content -replace '[ǟǭǸǦǜǽ]', ''
        
        [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
        Write-Output "Cleaned: $file"
    }
}

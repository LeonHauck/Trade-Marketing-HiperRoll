# Simple static file server for Windows PowerShell using HttpListener
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1
param(
    [int]$Port = 8000
)

$prefix = "http://localhost:$Port/"
$root = (Get-Location).Path
Write-Host "Serving $root on $prefix" -ForegroundColor Green

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
} catch {
    Write-Host "Failed to start HttpListener: $_" -ForegroundColor Red
    exit 1
}

function Get-ContentType($path) {
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    switch ($ext) {
        '.html' { 'text/html; charset=utf-8' }
        '.htm' { 'text/html; charset=utf-8' }
        '.css' { 'text/css; charset=utf-8' }
        '.js' { 'application/javascript; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.png' { 'image/png' }
        '.jpg' { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.gif' { 'image/gif' }
        '.svg' { 'image/svg+xml' }
        '.pdf' { 'application/pdf' }
        default { 'application/octet-stream' }
    }
}

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    Start-Job -ScriptBlock {
        param($ctx, $root)
        try {
            $req = $ctx.Request
            $res = $ctx.Response
            $urlPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
            if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = 'index.html' }
            $fsPath = Join-Path $root $urlPath

            if (Test-Path $fsPath -PathType Container) {
                # If directory, try index.html
                $index = Join-Path $fsPath 'index.html'
                if (Test-Path $index) { $fsPath = $index } else {
                    # simple directory listing
                    $items = Get-ChildItem -Path $fsPath | Sort-Object -Property Name
                    $html = "<html><body><h2>Index of /$urlPath</h2><ul>"
                    foreach ($it in $items) { $href = [System.Uri]::EscapeUriString(($urlPath + '/' + $it.Name).TrimStart('/')); $html += "<li><a href='/$href'>$($it.Name)</a></li>" }
                    $html += '</ul></body></html>'
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($html)
                    $res.ContentType = 'text/html; charset=utf-8'
                    $res.ContentLength64 = $buffer.Length
                    $res.OutputStream.Write($buffer, 0, $buffer.Length)
                    $res.StatusCode = 200
                    $res.Close()
                    return
                }
            }

            if (-not (Test-Path $fsPath)) {
                $res.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
                $res.ContentLength64 = $msg.Length
                $res.OutputStream.Write($msg, 0, $msg.Length)
                $res.Close()
                return
            }

            $bytes = [System.IO.File]::ReadAllBytes($fsPath)
            $res.ContentType = Get-ContentType $fsPath
            $res.ContentLength64 = $bytes.Length
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.StatusCode = 200
            $res.Close()
        } catch {
            try { $ctx.Response.StatusCode = 500; $ctx.Response.Close() } catch {}
        }
    } -ArgumentList $ctx, $root | Out-Null
}

$listener.Stop()
$listener.Close()

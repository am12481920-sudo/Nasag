$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$rootPrefix = $root + '\'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 8765)
$listener.Start()
Write-Host 'Nusj is running at http://127.0.0.1:8765/'
Write-Host 'Keep this window open while using the store. Press Ctrl+C to stop.'
Start-Process 'http://127.0.0.1:8765/index.html'

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII)
      $requestLine = $reader.ReadLine()
      while ($null -ne ($header = $reader.ReadLine()) -and $header.Length -gt 0) { }

      $status = '200 OK'
      $body = [System.Text.Encoding]::UTF8.GetBytes('Not found')
      $contentType = 'text/plain; charset=utf-8'
      if ($requestLine -match '^GET\s+(\S+)') {
        $relative = [System.Uri]::UnescapeDataString(($Matches[1] -split '\?')[0]).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
        $target = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relative))
        if (-not $target.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
          $status = '403 Forbidden'
          $body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
        } elseif (Test-Path -LiteralPath $target -PathType Leaf) {
          $extension = [System.IO.Path]::GetExtension($target).ToLowerInvariant()
          $contentType = switch ($extension) {
            '.html' { 'text/html; charset=utf-8' }
            '.css'  { 'text/css; charset=utf-8' }
            '.js'   { 'text/javascript; charset=utf-8' }
            '.png'  { 'image/png' }
            '.jpg'  { 'image/jpeg' }
            '.jpeg' { 'image/jpeg' }
            default { 'application/octet-stream' }
          }
          $body = [System.IO.File]::ReadAllBytes($target)
        } else {
          $status = '404 Not Found'
        }
      } else {
        $status = '405 Method Not Allowed'
      }

      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n")
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($body, 0, $body.Length)
    } catch {
      Write-Host $_.Exception.Message
    } finally {
      if ($client) { $client.Close() }
    }
  }
} finally {
  $listener.Stop()
}


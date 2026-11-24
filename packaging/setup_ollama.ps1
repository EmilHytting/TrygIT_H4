$ErrorActionPreference = 'Stop'

function Get-OllamaInfo {
    try {
        $response = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags' -TimeoutSec 5
        if ($null -ne $response.models) { return $response }
    } catch { }
    return $null
}

function Find-Ollama {
    $command = Get-Command 'ollama.exe' -CommandType Application -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    $candidates = @()
    if ($env:LOCALAPPDATA) {
        $candidates += Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'
    }
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    foreach ($directory in ($userPath -split ';')) {
        if ($directory) { $candidates += Join-Path $directory 'ollama.exe' }
    }
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    return $null
}

function Install-Ollama {
    $installer = Join-Path ([IO.Path]::GetTempPath()) ("OllamaSetup-{0}.exe" -f [guid]::NewGuid())
    try {
        Write-Host 'Henter Ollamas officielle installationsprogram...'
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile $installer -UseBasicParsing
        $signature = Get-AuthenticodeSignature -LiteralPath $installer
        if ($signature.Status -ne 'Valid' -or
            $signature.SignerCertificate.Subject -notmatch '(?i)(^|,\s*)(CN|O)\s*=\s*"?Ollama(?:,?\s+Inc\.?|\s+LLC)?\s*"?(,|$)') {
            throw 'Ollamas installationsprogram har ikke en gyldig signatur fra Ollama.'
        }
        Write-Host 'Foelg Ollamas installationsprogram for at fortsaette.'
        $process = Start-Process -FilePath $installer -PassThru
        $process.WaitForExit()
        if ($process.ExitCode -ne 0) { throw 'Ollamas installation blev ikke gennemfoert.' }
    } finally {
        Remove-Item -LiteralPath $installer -Force -ErrorAction SilentlyContinue
    }
}

function Wait-Ollama {
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        $info = Get-OllamaInfo
        if ($info) { return $info }
        Start-Sleep -Seconds 1
    }
    throw 'Ollama kunne ikke startes. Start Ollama og proev installationen igen.'
}

function Setup-Ollama {
    $info = Get-OllamaInfo
    if (-not $info) {
        $ollama = Find-Ollama
        if ($ollama) {
            Write-Host 'Starter den eksisterende Ollama-installation...'
            Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Hidden
        } else {
            Install-Ollama
            if (-not (Get-OllamaInfo)) {
                $ollama = Find-Ollama
                if ($ollama) {
                    Start-Process -FilePath $ollama -ArgumentList 'serve' -WindowStyle Hidden
                }
            }
        }
        $info = Wait-Ollama
    }
    $models = @($info.models | ForEach-Object { $_.name })
    if ($models -notcontains 'llama3.2' -and $models -notcontains 'llama3.2:latest') {
        Write-Host 'Henter Llama 3.2 (cirka 2 GB). Dette kan tage noget tid...'
        $result = Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/pull' -Method Post `
            -ContentType 'application/json' -Body '{"model":"llama3.2","stream":false}' -TimeoutSec 0
        if ($result.status -ne 'success') { throw 'Llama 3.2 blev ikke hentet.' }
    }
    Write-Host 'Ollama og Llama 3.2 er klar.'
}

if ($MyInvocation.InvocationName -ne '.') {
    try {
        Setup-Ollama
    } catch {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "Simon er installeret, men Ollama eller Llama 3.2 kunne ikke klargoeres.`n`n$($_.Exception.Message)`n`nKontroller internetforbindelsen og koer installationen igen.",
            'Ollama kunne ikke klargoeres', 'OK', 'Warning'
        ) | Out-Null
        exit 1
    }
}
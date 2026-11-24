$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

python -m PyInstaller --noconfirm --clean --windowed --name Simon `
  --distpath dist/windows --workpath build/pyinstaller --specpath build `
  --add-data "$PWD/backend/system_prompt.md;backend" `
  --add-data "$PWD/backend/system_info.ps1;backend" `
  --add-data "$PWD/backend/skills;backend/skills" `
  --add-data "$PWD/src/index.html;src" `
  --add-data "$PWD/src/styles.css;src" `
  --add-data "$PWD/src/renderer.js;src" `
  --add-data "$PWD/src/assets/Simon.png;src/assets" launcher.py
if ($LASTEXITCODE -ne 0) { throw 'PyInstaller failed.' }

$compiler = Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6/ISCC.exe'
if (-not (Test-Path $compiler)) { throw 'Install Inno Setup 6 before building the installer.' }
& $compiler packaging/windows.iss
if ($LASTEXITCODE -ne 0) { throw 'Inno Setup failed.' }
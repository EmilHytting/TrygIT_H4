#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

python3 -m PyInstaller --noconfirm --clean --windowed --name Simon \
  --distpath dist/linux --workpath build/pyinstaller --specpath build \
  --hidden-import webview.platforms.gtk \
  --add-data "$PWD/backend/system_prompt.md:backend" \
  --add-data "$PWD/backend/system_info.ps1:backend" \
  --add-data "$PWD/backend/skills:backend/skills" \
  --add-data "$PWD/src/index.html:src" \
  --add-data "$PWD/src/styles.css:src" \
  --add-data "$PWD/src/renderer.js:src" \
  --add-data "$PWD/src/assets/Simon.png:src/assets" launcher.py
python3 packaging/build_deb.py
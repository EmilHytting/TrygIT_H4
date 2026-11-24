[Setup]
AppId={{09B1A775-20E7-4F60-99ED-E63B8E32A276}
AppName=Simon - TrygIT
AppVersion=0.1.0
DefaultDirName={localappdata}\Programs\TrygIT\Simon
DefaultGroupName=TrygIT
PrivilegesRequired=lowest
OutputDir=..\dist\windows
OutputBaseFilename=Simon-Setup-0.1.0
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\Simon.exe

[Files]
Source: "..\dist\windows\Simon\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "setup_ollama.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Simon - TrygIT"; Filename: "{app}\Simon.exe"
Name: "{autodesktop}\Simon - TrygIT"; Filename: "{app}\Simon.exe"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Opret en genvej på skrivebordet"; Flags: unchecked
Name: "setupollama"; Description: "Installer Ollama og Llama 3.2 om nødvendigt (internet og mindst 6 GB ledig plads)"

[Run]
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\setup_ollama.ps1"""; StatusMsg: "Klargør Ollama og Llama 3.2..."; Tasks: setupollama; Flags: runasoriginaluser skipifsilent
Filename: "{app}\Simon.exe"; Description: "Start Simon"; Flags: nowait postinstall skipifsilent
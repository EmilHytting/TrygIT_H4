# Henter computerens specs, drivere og registrerede printere som én linje JSON.
# Køres af backend/server.py (collect_system_info). Kun læsning, ændrer intet.
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8

function Format-Date($value) { if ($value) { $value.ToString('yyyy-MM-dd') } else { '' } }

$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$env:SystemDrive'"
$jobs = @(Get-CimInstance Win32_PrintJob)

$gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object {
    [ordered]@{
        name           = [string]$_.Name
        driver_version = [string]$_.DriverVersion
        driver_date    = Format-Date $_.DriverDate
        error          = [int]$_.ConfigManagerErrorCode
    }
})

# Enheder med en fejl i Enhedshåndtering (45 = ikke tilsluttet lige nu, det er ikke en fejl).
$devices = @(Get-CimInstance Win32_PnPEntity |
    Where-Object { $_.ConfigManagerErrorCode -and $_.ConfigManagerErrorCode -ne 45 } |
    Select-Object -First 10 | ForEach-Object {
        [ordered]@{ name = [string]$_.Name; error = [int]$_.ConfigManagerErrorCode }
    })

$printers = @(Get-CimInstance Win32_Printer | ForEach-Object {
    $name = [string]$_.Name
    [ordered]@{
        name    = $name
        driver  = [string]$_.DriverName
        default = [bool]$_.Default
        port    = [string]$_.PortName
        network = [bool]$_.Network
        offline = ([bool]$_.WorkOffline -or $_.PrinterStatus -eq 7)
        error   = [int]$_.DetectedErrorState
        jobs    = @($jobs | Where-Object { ([string]$_.Name).StartsWith("$name,") }).Count
    }
})

[ordered]@{
    manufacturer = [string]$cs.Manufacturer
    model        = [string]$cs.Model
    cpu          = [string]$cpu.Name
    ram          = [double]$cs.TotalPhysicalMemory
    drive        = [string]$env:SystemDrive
    disk_free    = [double]$disk.FreeSpace
    disk_size    = [double]$disk.Size
    gpus         = $gpus
    devices      = $devices
    printers     = $printers
} | ConvertTo-Json -Compress -Depth 4

# Create backup directory if it does not exist
$backupDir = "../Soryouth-CRM-backup"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# Copy files excluding large/generated folders
Get-ChildItem -Path . -Exclude "node_modules", ".next", ".git", "*.zip" | ForEach-Object {
    $dest = Join-Path $backupDir $_.Name
    Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force
}

Write-Output "Backup successfully created at: $backupDir"

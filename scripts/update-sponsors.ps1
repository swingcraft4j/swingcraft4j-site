# Runs the sponsors sync locally on Windows.
# Prompts for the account and a token (typed hidden, never saved),
# then updates src/data/sponsors.json.
#
# Usage (from the project folder): .\scripts\update-sponsors.ps1

$login = Read-Host 'GitHub username (the sponsored account)'
$secureToken = Read-Host 'GitHub token (input hidden)' -AsSecureString

$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
try {
    $env:SPONSORS_LOGIN = $login
    $env:SPONSORS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    node (Join-Path $PSScriptRoot 'update-sponsors.mjs')
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    Remove-Item Env:SPONSORS_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SPONSORS_LOGIN -ErrorAction SilentlyContinue
}

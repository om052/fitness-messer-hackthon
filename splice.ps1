
$f = 'src\pages\WorldMap\WorldMap.tsx'
$lines = Get-Content $f
# Find the LAST closing brace of the component — we replace everything after
# the clientContains useMemo block (which ends with '}, [userCoords, apiKingdoms]);')
$anchorIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i].Trim() -eq 'return (') { $anchorIdx = $i }
}
if ($anchorIdx -lt 0) { Write-Error 'anchor not found'; exit 1 }
$body = Get-Content 'src\pages\WorldMap\render-body.txt'
$head = $lines[0..$anchorIdx]  # keep everything up to and including 'return ('
Set-Content $f -Value ($head + $body)
Remove-Item 'src\pages\WorldMap\render-body.txt'
Write-Output "replaced render body after line $($anchorIdx + 1)"

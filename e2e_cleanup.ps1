###############################################################################
# Cleanup: remove duplicate empty clients + check policies
###############################################################################
$ErrorActionPreference = 'Continue'
$API = "http://127.0.0.1:8001/api"
$lr = Invoke-RestMethod -Uri "$API/auth/login" -Method POST -Body '{"email":"tdadmin","password":"admin123"}' -ContentType "application/json"
$h = @{ "Authorization" = "Bearer $($lr.access_token)"; "Content-Type" = "application/json" }

# Check all policies with status
Write-Host "===== ALL POLICIES =====" -ForegroundColor Cyan
$policies = Invoke-RestMethod -Uri "$API/policies" -Headers $h
foreach ($p in $policies) {
    Write-Host "  $($p.policy_number) | status=$($p.status) | premium=$($p.premium_amount) | type=$($p.policy_type)"
}

# Delete duplicate clients (from first failed run)
Write-Host "`n===== CLEANUP DUPLICATE CLIENTS =====" -ForegroundColor Cyan
$clients = Invoke-RestMethod -Uri "$API/clients" -Headers $h
$seen = @{}
$toDelete = @()
foreach ($cl in $clients) {
    if ($seen.ContainsKey($cl.full_name)) {
        # First occurrence is the duplicate (from failed run, no data)
        $toDelete += $seen[$cl.full_name]
    }
    $seen[$cl.full_name] = $cl.id
}

Write-Host "Duplicates to remove: $($toDelete.Count)"
foreach ($did in $toDelete) {
    try {
        Invoke-RestMethod -Uri "$API/clients/$did" -Method DELETE -Headers $h
        Write-Host "  Deleted client $did" -ForegroundColor Yellow
    } catch {
        Write-Host "  Failed to delete $did : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final client list
Write-Host "`n===== FINAL CLIENT LIST =====" -ForegroundColor Cyan
$clients2 = Invoke-RestMethod -Uri "$API/clients" -Headers $h
Write-Host "Total: $($clients2.Count) clients"
foreach ($cl in $clients2) {
    Write-Host "  - $($cl.full_name) | $($cl.occupation) | $($cl.email)"
}

Write-Host "`nDone!" -ForegroundColor Green

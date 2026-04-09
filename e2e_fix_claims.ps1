###############################################################################
# Fix Script: Submit claims for existing clients + verify dashboard + audit
###############################################################################
$ErrorActionPreference = 'Continue'
$API = "http://127.0.0.1:8001/api"

# Login
$lr = Invoke-RestMethod -Uri "$API/auth/login" -Method POST -Body '{"email":"tdadmin","password":"admin123"}' -ContentType "application/json"
$h = @{ "Authorization" = "Bearer $($lr.access_token)"; "Content-Type" = "application/json" }
Write-Host "[OK] Logged in" -ForegroundColor Green

# Get all policies
$policies = Invoke-RestMethod -Uri "$API/policies" -Headers $h
Write-Host "Found $($policies.Count) policies"

# Define claim data for each policy number
$claimMap = @{
    "AIA-2026-TW-001" = @{ type = "health"; amount = 5000000; desc = "Hospitalization - Thida Win" }
    "AIA-2026-ZM-001" = @{ type = "accident"; amount = 3000000; desc = "Accident injury - Zaw Min Oo" }
    "AIA-2026-AA-001" = @{ type = "death"; amount = 10000000; desc = "Death benefit claim - Aye Aye Mon" }
    "AIA-2026-KS-001" = @{ type = "health"; amount = 4000000; desc = "Hospital treatment - Kyaw Soe Htet" }
    "AIA-2026-SS-001" = @{ type = "accident"; amount = 2500000; desc = "Accident claim - Su Su Lwin" }
}

$claimsPassed = 0
foreach ($pol in $policies) {
    $pn = $pol.policy_number
    if ($claimMap.ContainsKey($pn)) {
        $cd = $claimMap[$pn]
        $body = @{
            policy_id = $pol.id
            claim_type = $cd.type
            claim_amount = $cd.amount
            incident_date = "2026-02-15"
            incident_description = $cd.desc
        } | ConvertTo-Json
        try {
            $claim = Invoke-RestMethod -Uri "$API/claims" -Method POST -Headers $h -Body $body
            Write-Host "[PASS] Claim submitted for $pn (claim# $($claim.claim_number))" -ForegroundColor Green
            $claimsPassed++
        } catch {
            Write-Host "[FAIL] Claim for $pn : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}
Write-Host "`nClaims submitted: $claimsPassed / 5"

# ===== AUDIT LOGS =====
Write-Host "`n===== AUDIT LOGS =====" -ForegroundColor Cyan
try {
    $auditLogs = Invoke-RestMethod -Uri "$API/audit?limit=50" -Headers $h
    Write-Host "Total audit log entries: $($auditLogs.Count)" -ForegroundColor Yellow
    Write-Host ("{0,-22} {1,-25} {2,-18} {3,-38}" -f "TIMESTAMP","ACTION","ENTITY_TYPE","ENTITY_ID")
    Write-Host ("-" * 103)
    foreach ($log in $auditLogs | Select-Object -First 30) {
        $ts = if ($log.created_at) { ($log.created_at).ToString().Substring(0,[Math]::Min(19,$log.created_at.ToString().Length)) } else { "N/A" }
        $et = if ($log.entity_type) { $log.entity_type } else { "-" }
        $ei = if ($log.entity_id) { $log.entity_id } else { "-" }
        Write-Host ("{0,-22} {1,-25} {2,-18} {3,-38}" -f $ts, $log.action, $et, $ei)
    }
} catch {
    Write-Host "[FAIL] Audit logs: $($_.Exception.Message)" -ForegroundColor Red
}

# ===== DASHBOARD STATS =====
Write-Host "`n===== DASHBOARD STATS =====" -ForegroundColor Cyan
try {
    $stats = Invoke-RestMethod -Uri "$API/dashboard/stats" -Headers $h
    Write-Host "Total Clients:       $($stats.total_clients)"
    Write-Host "Active Policies:     $($stats.active_policies)"
    Write-Host "Total Premium:       $($stats.total_premium) MMK"
    Write-Host "Pipeline Deals:      $($stats.pipeline_deals)"
    Write-Host "Pipeline Value:      $($stats.pipeline_value) MMK"
    Write-Host "Total Earned:        $($stats.total_earned) MMK"
    Write-Host "Pending Commission:  $($stats.pending_commission) MMK"
    Write-Host "Activities Completed: $($stats.activities_completed)"
} catch {
    Write-Host "[FAIL] Dashboard: $($_.Exception.Message)" -ForegroundColor Red
}

# ===== ALL CLIENTS SUMMARY =====
Write-Host "`n===== ALL CLIENTS =====" -ForegroundColor Cyan
$clients = Invoke-RestMethod -Uri "$API/clients" -Headers $h
Write-Host "Total: $($clients.Count) clients"
foreach ($cl in $clients) {
    Write-Host "  - $($cl.full_name) | $($cl.occupation) | Income: $($cl.monthly_income)"
}

Write-Host "`nDone!" -ForegroundColor Green

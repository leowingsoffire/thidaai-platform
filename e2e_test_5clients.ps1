###############################################################################
# E2E Test: Create 5 Clients with Full Data Entry + Audit Logs
# Uses correct Pydantic schemas from backend
###############################################################################
$ErrorActionPreference = 'Continue'
$API = "http://127.0.0.1:8001/api"
$passed = 0; $failed = 0

function Test-Step($name, $scriptBlock) {
    try {
        $result = & $scriptBlock
        Write-Host "[PASS] $name" -ForegroundColor Green
        $script:passed++
        return $result
    } catch {
        Write-Host "[FAIL] $name : $($_.Exception.Message)" -ForegroundColor Red
        $script:failed++
        return $null
    }
}

# ---- Step 1: Login ----
Write-Host "`n===== STEP 1: LOGIN =====" -ForegroundColor Cyan
$loginBody = '{"email":"tdadmin","password":"admin123"}'
$lr = Invoke-RestMethod -Uri "$API/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $lr.access_token
$h = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
Write-Host "[PASS] Login successful (user: $($lr.user.full_name))" -ForegroundColor Green
$passed++

# ---- Define 5 Clients ----
$clients = @(
    @{
        name = "Thida Win"; phone = "+959771001001"; email = "thida.win@email.com"
        dob = "1985-03-15"; gender = "female"; occupation = "Doctor"
        income = 2500000; maritalStatus = "married"; address = "No.45, Pyay Road, Kamayut Tsp, Yangon"
        policyNo = "AIA-2026-TW-001"; policyType = "whole_life"; productName = "AIA Whole Life Plus"
        premium = 1200000; sa = 150000000
        claimType = "health"; claimAmt = 5000000
    },
    @{
        name = "Zaw Min Oo"; phone = "+959771002002"; email = "zawminoo@email.com"
        dob = "1990-07-22"; gender = "male"; occupation = "Engineer"
        income = 1800000; maritalStatus = "single"; address = "No.88, University Ave, Bahan Tsp, Yangon"
        policyNo = "AIA-2026-ZM-001"; policyType = "term_life"; productName = "AIA Term Protect"
        premium = 600000; sa = 100000000
        claimType = "accident"; claimAmt = 3000000
    },
    @{
        name = "Aye Aye Mon"; phone = "+959771003003"; email = "ayeayemon@email.com"
        dob = "1978-11-08"; gender = "female"; occupation = "Business Owner"
        income = 5000000; maritalStatus = "married"; address = "No.12, Merchant St, Pabedan Tsp, Yangon"
        policyNo = "AIA-2026-AA-001"; policyType = "endowment"; productName = "AIA Gold Endowment"
        premium = 2000000; sa = 200000000
        claimType = "death"; claimAmt = 10000000
    },
    @{
        name = "Kyaw Soe Htet"; phone = "+959771004004"; email = "kyawsoehtet@email.com"
        dob = "1995-01-30"; gender = "male"; occupation = "IT Manager"
        income = 3000000; maritalStatus = "single"; address = "No.56, Inya Road, Mayangone Tsp, Yangon"
        policyNo = "AIA-2026-KS-001"; policyType = "investment_linked"; productName = "AIA Smart Invest"
        premium = 1500000; sa = 180000000
        claimType = "health"; claimAmt = 4000000
    },
    @{
        name = "Su Su Lwin"; phone = "+959771005005"; email = "susulwin@email.com"
        dob = "1988-06-14"; gender = "female"; occupation = "Teacher"
        income = 1200000; maritalStatus = "married"; address = "No.23, Bo Aung Kyaw St, Botataung Tsp, Yangon"
        policyNo = "AIA-2026-SS-001"; policyType = "whole_life"; productName = "AIA Family Shield"
        premium = 800000; sa = 120000000
        claimType = "accident"; claimAmt = 2500000
    }
)

$pipelineStages = @("prospect", "contacted", "needs_analysis", "proposal_sent", "negotiation")
$pipelineTargets = @("contacted", "needs_analysis", "proposal_sent", "negotiation", "closed_won")

$clientIds = @()
$policyIds = @()

foreach ($i in 0..4) {
    $c = $clients[$i]
    $num = $i + 1
    Write-Host "`n===== CLIENT $num / 5: $($c.name) =====" -ForegroundColor Cyan

    # ---- Create Client ----
    $clientBody = @{
        full_name = $c.name; phone = $c.phone; email = $c.email
        date_of_birth = $c.dob; gender = $c.gender; occupation = $c.occupation
        monthly_income = $c.income; marital_status = $c.maritalStatus
        address = $c.address; source = "referral"
    } | ConvertTo-Json
    $client = Test-Step "Create client: $($c.name)" {
        Invoke-RestMethod -Uri "$API/clients" -Method POST -Headers $h -Body $clientBody
    }
    if (-not $client) { continue }
    $cid = $client.id
    $clientIds += $cid

    # ---- Create Policy (schema: PolicyCreate) ----
    $policyBody = @{
        client_id = $cid
        policy_number = $c.policyNo
        product_name = $c.productName
        policy_type = $c.policyType
        premium_amount = $c.premium
        sum_assured = $c.sa
        premium_frequency = "monthly"
        start_date = "2026-01-01"
        end_date = "2046-01-01"
        status = "active"
    } | ConvertTo-Json
    $policy = Test-Step "Create policy: $($c.policyNo)" {
        Invoke-RestMethod -Uri "$API/policies" -Method POST -Headers $h -Body $policyBody
    }
    $polId = $null
    if ($policy) { $polId = $policy.id; $policyIds += $polId }

    # ---- Needs Analysis (schema: NeedsAnalysisRequest) ----
    $analysisBody = @{
        client_id = $cid
        annual_expenses = [math]::Floor($c.income * 12 * 0.6)
        current_coverage = [math]::Floor($c.sa * 0.3)
        outstanding_debts = [math]::Floor($c.income * 6)
        emergency_fund_months = 6
        children_education_needed = ($c.maritalStatus -eq "married")
        retirement_age = 60
    } | ConvertTo-Json
    Test-Step "Needs analysis for $($c.name)" {
        Invoke-RestMethod -Uri "$API/clients/analyze" -Method POST -Headers $h -Body $analysisBody
    } | Out-Null

    # ---- Generate Proposal (schema: ProposalGenerateRequest) ----
    $proposalBody = @{
        client_id = $cid
        products = @($c.productName)
        notes = "Coverage proposal for $($c.name) - $($c.policyType) policy"
    } | ConvertTo-Json
    Test-Step "Generate proposal for $($c.name)" {
        Invoke-RestMethod -Uri "$API/proposals/generate" -Method POST -Headers $h -Body $proposalBody
    } | Out-Null

    # ---- Underwriting Case (schema: UWCreateRequest needs policy_id) ----
    $uwCase = $null
    if ($polId) {
        $uwBody = @{ policy_id = $polId } | ConvertTo-Json
        $uwCase = Test-Step "Underwriting case for $($c.name)" {
            Invoke-RestMethod -Uri "$API/underwriting" -Method POST -Headers $h -Body $uwBody
        }
    } else {
        Write-Host "[SKIP] Underwriting - no policy" -ForegroundColor Yellow
    }

    # ---- Underwriting Decision ----
    if ($uwCase -and $uwCase.id) {
        $decisionBody = @{
            decision = "approved"; loading_percentage = 0
            conditions = "Standard acceptance"; notes = "All checks passed"
        } | ConvertTo-Json
        Test-Step "Approve underwriting for $($c.name)" {
            Invoke-RestMethod -Uri "$API/underwriting/$($uwCase.id)/decision" -Method POST -Headers $h -Body $decisionBody
        } | Out-Null
    }

    # ---- Pipeline Deal (schema: PipelineDealCreate) ----
    $dealBody = @{
        client_id = $cid
        product_name = $c.productName
        expected_premium = $c.premium
        stage = $pipelineStages[$i]
        probability = 70 + ($i * 5)
        expected_close_date = "2026-06-30"
        notes = "Pipeline deal for $($c.name)"
    } | ConvertTo-Json
    $deal = Test-Step "Create pipeline deal for $($c.name)" {
        Invoke-RestMethod -Uri "$API/pipeline" -Method POST -Headers $h -Body $dealBody
    }

    # Move deal to next stage
    if ($deal -and $deal.id) {
        $moveBody = @{ stage = $pipelineTargets[$i] } | ConvertTo-Json
        Test-Step "Move deal to $($pipelineTargets[$i])" {
            Invoke-RestMethod -Uri "$API/pipeline/$($deal.id)" -Method PUT -Headers $h -Body $moveBody
        } | Out-Null
    }

    # ---- Activity (schema: ActivityCreate uses activity_type not type) ----
    $actTypes = @("meeting", "call", "email", "follow_up", "presentation")
    $actBody = @{
        client_id = $cid
        activity_type = $actTypes[$i]
        title = "$($actTypes[$i]) with $($c.name)"
        description = "Discussed $($c.policyType) policy options and coverage details"
        scheduled_date = "2026-02-$(10 + $i)T10:00:00"
        status = "completed"
    } | ConvertTo-Json
    Test-Step "Create activity ($($actTypes[$i])) for $($c.name)" {
        Invoke-RestMethod -Uri "$API/activities" -Method POST -Headers $h -Body $actBody
    } | Out-Null

    # ---- Commission (schema: CommissionCreate needs policy_id) ----
    if ($polId) {
        $commBody = @{
            policy_id = $polId
            commission_type = "first_year"
            amount = [math]::Floor($c.premium * 0.10)
            period = "2026-Q1"
            status = "paid"
            notes = "First year commission for $($c.name)"
        } | ConvertTo-Json
        Test-Step "Record commission for $($c.name)" {
            Invoke-RestMethod -Uri "$API/commissions" -Method POST -Headers $h -Body $commBody
        } | Out-Null
    } else {
        Write-Host "[SKIP] Commission - no policy" -ForegroundColor Yellow
    }

    # ---- Create Claim (schema: ClaimCreateRequest) ----
    if ($polId) {
        $claimBody = @{
            policy_id = $polId
            claim_type = $c.claimType
            claim_amount = $c.claimAmt
            incident_date = "2026-02-15"
            incident_description = "$($c.claimType) claim for $($c.name) - medical treatment required"
        } | ConvertTo-Json
        Test-Step "Submit claim ($($c.claimType)) for $($c.name)" {
            Invoke-RestMethod -Uri "$API/claims" -Method POST -Headers $h -Body $claimBody
        } | Out-Null
    } else {
        Write-Host "[SKIP] Claim - no policy" -ForegroundColor Yellow
    }

    Write-Host "--- Client $num complete ---" -ForegroundColor DarkGray
}

# ===== AUDIT LOGS =====
Write-Host "`n===== AUDIT LOGS =====" -ForegroundColor Cyan
$auditLogs = Test-Step "Fetch audit logs" {
    Invoke-RestMethod -Uri "$API/audit?limit=50" -Headers $h
}
if ($auditLogs) {
    Write-Host "`nTotal audit log entries: $($auditLogs.Count)" -ForegroundColor Yellow
    Write-Host ("{0,-22} {1,-25} {2,-15} {3,-38}" -f "TIMESTAMP","ACTION","ENTITY_TYPE","ENTITY_ID")
    Write-Host ("-" * 100)
    foreach ($log in $auditLogs | Select-Object -First 30) {
        $ts = if ($log.created_at) { ($log.created_at).ToString().Substring(0,19) } else { "N/A" }
        Write-Host ("{0,-22} {1,-25} {2,-15} {3,-38}" -f $ts, $log.action, $log.entity_type, $log.entity_id)
    }
}

# ===== DASHBOARD STATS =====
Write-Host "`n===== DASHBOARD STATS =====" -ForegroundColor Cyan
$stats = Test-Step "Fetch dashboard stats" {
    Invoke-RestMethod -Uri "$API/dashboard/stats" -Headers $h
}
if ($stats) {
    Write-Host "Total Clients:     $($stats.total_clients)"
    Write-Host "Active Policies:   $($stats.active_policies)"
    Write-Host "Total Premium:     $($stats.total_premium) MMK"
    Write-Host "Pending Claims:    $($stats.pending_claims)"
    Write-Host "Total Commission:  $($stats.total_commission) MMK"
}

# ===== NOTIFICATIONS =====
Write-Host "`n===== RECENT NOTIFICATIONS =====" -ForegroundColor Cyan
$notifs = Test-Step "Fetch notifications" {
    Invoke-RestMethod -Uri "$API/notifications" -Headers $h
}
if ($notifs) {
    Write-Host "Total notifications: $($notifs.Count)"
    foreach ($n in $notifs | Select-Object -First 10) {
        Write-Host "  [$($n.type)] $($n.title)"
    }
}

# ===== FINAL SUMMARY =====
Write-Host "`n===== FINAL SUMMARY =====" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host "Total:  $($passed + $failed)"

# List all clients
Write-Host "`n--- All Clients ---"
$allClients = Invoke-RestMethod -Uri "$API/clients" -Headers $h
foreach ($cl in $allClients) {
    Write-Host "  - $($cl.full_name) (ID: $($cl.id))"
}
Write-Host "`nDone!"

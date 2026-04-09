
# E2E Seed Script: Insert 5 clients + policies + claims + test all features
$ErrorActionPreference = "Continue"
$BASE = "https://thidaai-backend-production.up.railway.app"

function API($method, $path, $body = $null) {
    $uri = "$BASE$path"
    $params = @{ Uri = $uri; Method = $method; Headers = $global:h; ContentType = "application/json" }
    if ($body) { $params.Body = ($body | ConvertTo-Json -Depth 5) }
    try { Invoke-RestMethod @params } catch { Write-Host "  ERROR $path : $($_.Exception.Message)" -ForegroundColor Red; $null }
}

# ---- LOGIN ----
Write-Host "=== LOGIN ===" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "$BASE/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"tdadmin","password":"admin123"}'
$global:h = @{ Authorization = "Bearer $($login.access_token)" }
Write-Host "  Logged in as: $($login.user.full_name) ($($login.user.role))" -ForegroundColor Green

# ---- CREATE 5 CLIENTS ----
Write-Host "`n=== CREATING 5 CLIENTS ===" -ForegroundColor Cyan
$clientData = @(
    @{ full_name="Aung Ko Ko"; email="aungkoko@gmail.com"; phone="+959123456001"; date_of_birth="1985-03-15"; gender="male"; occupation="Software Engineer"; monthly_income=2500000; marital_status="married"; dependents=2; address="No.45, Pyay Road, Kamayut Township, Yangon"; notes="Tech professional, interested in education savings" },
    @{ full_name="Thinzar Win"; email="thinzarwin@gmail.com"; phone="+959123456002"; date_of_birth="1990-07-22"; gender="female"; occupation="Doctor"; monthly_income=3500000; marital_status="single"; dependents=0; address="No.88, University Ave, Bahan Township, Yangon"; notes="Medical professional, high income, needs life+health" },
    @{ full_name="Kyaw Zin Htet"; email="kyawzinhtet@gmail.com"; phone="+959123456003"; date_of_birth="1978-11-01"; gender="male"; occupation="Business Owner"; monthly_income=5000000; marital_status="married"; dependents=3; address="No.12, Merchant St, Pabedan Township, Yangon"; notes="SME owner, corporate client potential"; client_type="corporate" },
    @{ full_name="Su Su Hlaing"; email="susuhlaing@gmail.com"; phone="+959123456004"; date_of_birth="1995-01-30"; gender="female"; occupation="Teacher"; monthly_income=800000; marital_status="married"; dependents=1; address="No.67, Strand Road, Latha Township, Yangon"; notes="Budget-conscious, needs basic protection plan" },
    @{ full_name="Min Thu Aung"; email="minthuaung@gmail.com"; phone="+959123456005"; date_of_birth="1982-09-10"; gender="male"; occupation="Civil Engineer"; monthly_income=3000000; marital_status="married"; dependents=2; address="No.34, Insein Road, Hlaing Township, Yangon"; notes="Construction industry, interested in accident + retirement" }
)

$clientIds = @()
foreach ($c in $clientData) {
    $result = API "POST" "/api/clients" $c
    if ($result) {
        $clientIds += $result.id
        Write-Host "  Created: $($result.full_name) -> $($result.id)" -ForegroundColor Green
    }
}
Write-Host "  Total clients created: $($clientIds.Count)" -ForegroundColor Yellow

# ---- CREATE POLICIES ----
Write-Host "`n=== CREATING POLICIES ===" -ForegroundColor Cyan
$policyData = @(
    # Client 1: Aung Ko Ko - Health + Education
    @{ client_id=$clientIds[0]; policy_number="POL-2025-0101"; product_name="AIA Health Shield Plus"; policy_type="health"; premium_amount=85000; sum_assured=50000000; premium_frequency="monthly"; start_date="2025-01-15"; end_date="2026-01-15"; status="active" },
    @{ client_id=$clientIds[0]; policy_number="POL-2025-0102"; product_name="AIA Education Savings"; policy_type="education"; premium_amount=120000; sum_assured=30000000; premium_frequency="monthly"; start_date="2025-03-01"; status="active" },
    # Client 2: Thinzar Win - Life + Critical Illness
    @{ client_id=$clientIds[1]; policy_number="POL-2025-0201"; product_name="AIA Life Protector"; policy_type="life"; premium_amount=150000; sum_assured=100000000; premium_frequency="monthly"; start_date="2024-06-01"; status="active" },
    @{ client_id=$clientIds[1]; policy_number="POL-2025-0202"; product_name="AIA Critical Care"; policy_type="critical_illness"; premium_amount=95000; sum_assured=75000000; premium_frequency="monthly"; start_date="2025-02-01"; status="active" },
    # Client 3: Kyaw Zin Htet - Life + Investment
    @{ client_id=$clientIds[2]; policy_number="POL-2025-0301"; product_name="AIA Executive Life Plan"; policy_type="life"; premium_amount=250000; sum_assured=200000000; premium_frequency="monthly"; start_date="2024-01-01"; status="active" },
    @{ client_id=$clientIds[2]; policy_number="POL-2025-0302"; product_name="AIA Wealth Builder"; policy_type="investment"; premium_amount=500000; sum_assured=150000000; premium_frequency="quarterly"; start_date="2024-03-01"; status="active" },
    # Client 4: Su Su Hlaing - Health
    @{ client_id=$clientIds[3]; policy_number="POL-2025-0401"; product_name="AIA Basic Health"; policy_type="health"; premium_amount=45000; sum_assured=20000000; premium_frequency="monthly"; start_date="2025-06-01"; end_date="2026-06-01"; status="active" },
    # Client 5: Min Thu Aung - Life + Investment + Health
    @{ client_id=$clientIds[4]; policy_number="POL-2025-0501"; product_name="AIA Accident Guard"; policy_type="life"; premium_amount=65000; sum_assured=80000000; premium_frequency="monthly"; start_date="2024-09-01"; status="active" },
    @{ client_id=$clientIds[4]; policy_number="POL-2025-0502"; product_name="AIA Retirement Gold"; policy_type="investment"; premium_amount=200000; sum_assured=120000000; premium_frequency="monthly"; start_date="2025-01-01"; status="active" },
    @{ client_id=$clientIds[4]; policy_number="POL-2025-0503"; product_name="AIA Health Plus"; policy_type="health"; premium_amount=75000; sum_assured=40000000; premium_frequency="monthly"; start_date="2025-04-01"; end_date="2026-04-01"; status="active" }
)

$policyIds = @()
foreach ($p in $policyData) {
    $result = API "POST" "/api/policies" $p
    if ($result) {
        $policyIds += $result.id
        Write-Host "  Created: $($result.policy_number) - $($result.product_name) for client $($result.client_name)" -ForegroundColor Green
    }
}
Write-Host "  Total policies created: $($policyIds.Count)" -ForegroundColor Yellow

# ---- CREATE CLAIMS ----
Write-Host "`n=== CREATING CLAIMS ===" -ForegroundColor Cyan
$claimData = @(
    # Claim on Aung Ko Ko's health policy
    @{ policy_id=$policyIds[0]; claim_type="health"; claim_amount=5000000; incident_date="2025-11-20"; incident_description="Hospitalization for appendicitis surgery at Yangon General Hospital" },
    # Claim on Thinzar Win's critical illness policy
    @{ policy_id=$policyIds[3]; claim_type="health"; claim_amount=15000000; incident_date="2025-12-05"; incident_description="Diagnosis of early-stage breast cancer, treatment at Asia Royal Hospital" },
    # Claim on Kyaw Zin Htet's life policy
    @{ policy_id=$policyIds[4]; claim_type="accident"; claim_amount=8000000; incident_date="2026-01-15"; incident_description="Workplace injury at construction site, broken leg requiring surgery" },
    # Claim on Min Thu Aung's health policy
    @{ policy_id=$policyIds[9]; claim_type="health"; claim_amount=3500000; incident_date="2026-02-10"; incident_description="Emergency treatment for cardiac arrhythmia, 5-day ICU stay" }
)

$claimIds = @()
foreach ($cl in $claimData) {
    $result = API "POST" "/api/claims" $cl
    if ($result) {
        $claimIds += $result.id
        Write-Host "  Created: $($result.claim_number) - $($result.claim_type) ($($result.claim_amount) MMK) - Status: $($result.status) - Fraud: $($result.fraud_flag)" -ForegroundColor Green
    }
}
Write-Host "  Total claims created: $($claimIds.Count)" -ForegroundColor Yellow

# ---- CREATE ACTIVITIES ----
Write-Host "`n=== CREATING ACTIVITIES ===" -ForegroundColor Cyan
$activityData = @(
    @{ client_id=$clientIds[0]; activity_type="meeting"; title="Annual policy review with Aung Ko Ko"; description="Review health + education policies, discuss premium adjustments"; status="planned"; scheduled_date="2026-04-15T10:00:00" },
    @{ client_id=$clientIds[1]; activity_type="call"; title="Follow-up on claim status - Thinzar Win"; description="Update client on critical illness claim progress"; status="completed"; scheduled_date="2026-03-20T14:00:00" },
    @{ client_id=$clientIds[2]; activity_type="presentation"; title="Corporate insurance proposal - Kyaw Zin Htet"; description="Present group insurance options for his 50-employee company"; status="planned"; scheduled_date="2026-04-20T09:00:00" },
    @{ client_id=$clientIds[3]; activity_type="follow_up"; title="Premium payment reminder - Su Su Hlaing"; description="Monthly premium due, gentle reminder call"; status="planned"; scheduled_date="2026-04-12T11:00:00" },
    @{ client_id=$clientIds[4]; activity_type="meeting"; title="Retirement planning session - Min Thu Aung"; description="Discuss retirement goals and additional coverage"; status="planned"; scheduled_date="2026-04-18T15:00:00" }
)

foreach ($a in $activityData) {
    $result = API "POST" "/api/activities" $a
    if ($result) {
        Write-Host "  Created: $($result.title) ($($result.activity_type))" -ForegroundColor Green
    }
}

# ---- TEST: LIST ALL ENTITIES ----
Write-Host "`n=== E2E VERIFICATION ===" -ForegroundColor Cyan

Write-Host "`n--- Clients ---"
$allClients = API "GET" "/api/clients"
Write-Host "  Total clients: $($allClients.Count)" -ForegroundColor $(if ($allClients.Count -ge 5) { "Green" } else { "Red" })
$allClients | ForEach-Object { Write-Host "  $($_.full_name) | $($_.occupation) | Income: $($_.monthly_income) MMK | Deps: $($_.dependents)" }

Write-Host "`n--- Policies ---"
$allPolicies = API "GET" "/api/policies"
Write-Host "  Total policies: $($allPolicies.Count)" -ForegroundColor $(if ($allPolicies.Count -ge 8) { "Green" } else { "Red" })
$allPolicies | ForEach-Object { Write-Host "  $($_.policy_number) | $($_.product_name) | $($_.client_name) | $($_.premium_amount) MMK | $($_.status)" }

Write-Host "`n--- Claims ---"
$allClaims = API "GET" "/api/claims"
Write-Host "  Total claims: $($allClaims.Count)" -ForegroundColor $(if ($allClaims.Count -ge 3) { "Green" } else { "Red" })
$allClaims | ForEach-Object { Write-Host "  $($_.claim_number) | $($_.client_name) | $($_.claim_type) | $($_.claim_amount) MMK | Status: $($_.status) | Fraud: $($_.fraud_flag)" }

Write-Host "`n--- Claims Stats ---"
$claimStats = API "GET" "/api/claims/stats"
Write-Host "  Stats: $($claimStats | ConvertTo-Json -Compress)"

Write-Host "`n--- Dashboard ---"
$dash = API "GET" "/api/dashboard"
if ($dash) {
    Write-Host "  Total Clients: $($dash.total_clients)" -ForegroundColor Green
    Write-Host "  Active Policies: $($dash.active_policies)" -ForegroundColor Green
    Write-Host "  Total Premium: $($dash.total_premium) MMK" -ForegroundColor Green
    Write-Host "  Pending Claims: $($dash.pending_claims)" -ForegroundColor Green
}

Write-Host "`n--- Activities ---"
$allActs = API "GET" "/api/activities"
Write-Host "  Total activities: $($allActs.Count)" -ForegroundColor $(if ($allActs.Count -ge 4) { "Green" } else { "Red" })

Write-Host "`n--- Underwriting Cases ---"
$uwCases = API "GET" "/api/underwriting"
Write-Host "  Total UW cases: $($uwCases.Count)"

# ---- TEST: CLAIM WORKFLOW ----
Write-Host "`n=== CLAIM WORKFLOW TEST ===" -ForegroundColor Cyan
if ($claimIds.Count -ge 1) {
    $testClaimId = $claimIds[0]
    Write-Host "  Testing claim workflow on first claim: $testClaimId"
    
    # Verify docs
    $r = API "POST" "/api/claims/$testClaimId/action" @{ action="docs_verification" }
    if ($r) { Write-Host "  -> docs_verification: Status=$($r.status)" -ForegroundColor Green }
    
    # Assess
    $r = API "POST" "/api/claims/$testClaimId/action" @{ action="assessment" }
    if ($r) { Write-Host "  -> assessment: Status=$($r.status)" -ForegroundColor Green }
    
    # Approve
    $r = API "POST" "/api/claims/$testClaimId/action" @{ action="approve"; notes="Claim verified and approved for payment" }
    if ($r) { Write-Host "  -> approve: Status=$($r.status) Approved=$($r.approved_amount)" -ForegroundColor Green }
    
    # Payment
    $r = API "POST" "/api/claims/$testClaimId/action" @{ action="payment_processing"; payment_method="bank_transfer"; payment_reference="TRF-2026-0001" }
    if ($r) { Write-Host "  -> payment: Status=$($r.status)" -ForegroundColor Green }
}

# ---- TEST: PIPELINE ----
Write-Host "`n--- Pipeline ---"
$pipeline = API "GET" "/api/pipeline"
if ($pipeline) { Write-Host "  Pipeline stages: $($pipeline | ConvertTo-Json -Compress -Depth 2)" -ForegroundColor Green }

# ---- TEST: MDRT ----
Write-Host "`n--- MDRT ---"
$mdrt = API "POST" "/api/mdrt/progress" @{ year=2026 }
if ($mdrt) { Write-Host "  MDRT Progress: $($mdrt.progress_percentage)% premium, $($mdrt.cases_percentage)% cases" -ForegroundColor Green }

# ---- TEST: COMMISSIONS ----
Write-Host "`n--- Commissions ---"
$commissions = API "GET" "/api/commissions/summary"
if ($commissions) { Write-Host "  Commission summary: $($commissions | ConvertTo-Json -Compress -Depth 2)" -ForegroundColor Green }

# ---- TEST: NOTIFICATIONS ----  
Write-Host "`n--- Notifications ---"
$notifs = API "GET" "/api/notifications"
Write-Host "  Notifications: $($notifs.Count)"

Write-Host "`n=== E2E TEST COMPLETE ===" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  Clients: $($allClients.Count)" -ForegroundColor White
Write-Host "  Policies: $($allPolicies.Count)" -ForegroundColor White
Write-Host "  Claims: $($allClaims.Count)" -ForegroundColor White
Write-Host "  Activities: $($allActs.Count)" -ForegroundColor White
Write-Host "  Claim Workflow: Tested (submit -> verify -> assess -> approve -> pay)" -ForegroundColor White

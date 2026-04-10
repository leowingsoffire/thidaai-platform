import requests
import json

BASE = 'https://thidaai-backend-production.up.railway.app'

# Step 1: Login
print('=== LOGIN ===')
lr = requests.post(BASE+'/api/auth/login', json={'email':'tdadmin','password':'admin123'})
print(f'  Status: {lr.status_code}')
data = lr.json()
token = data['access_token']
user = data['user']
print(f'  User: {user["full_name"]} ({user["role"]})')
h = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Step 2: Create Client
print('\n=== CREATE CLIENT ===')
r = requests.post(BASE+'/api/clients', headers=h, json={
    'full_name': 'Dr. Khin Myo Aye',
    'phone': '09-789456123',
    'email': 'khinmyoaye@gmail.com',
    'date_of_birth': '1985-03-15',
    'gender': 'female',
    'occupation': 'Doctor / Specialist Physician',
    'monthly_income': 4000000,
    'marital_status': 'married',
    'dependents': 2,
    'address': 'No.72, Inya Road, Bahan Township, Yangon',
    'notes': 'Specialist physician at Yangon General Hospital, interested in comprehensive life and health coverage',
    'source': 'referral'
})
print(f'  Status: {r.status_code}')
client = r.json()
cid = client['id']
print(f'  Created: {client["full_name"]} -> {cid}')

# Step 3: Create 2 Policies
print('\n=== CREATE POLICIES ===')
r1 = requests.post(BASE+'/api/policies', headers=h, json={
    'client_id': cid,
    'policy_number': 'POL-2026-KMA-001',
    'product_name': 'AIA Life Protector Plus',
    'policy_type': 'life',
    'premium_amount': 180000,
    'sum_assured': 120000000,
    'premium_frequency': 'monthly',
    'start_date': '2025-06-01',
    'end_date': '2045-06-01',
    'status': 'active'
})
print(f'  Policy 1 status: {r1.status_code}')
pol1 = r1.json()
pid1 = pol1['id']
print(f'  Policy 1: {pol1["policy_number"]} - {pol1["product_name"]} -> {pid1}')

r2 = requests.post(BASE+'/api/policies', headers=h, json={
    'client_id': cid,
    'policy_number': 'POL-2026-KMA-002',
    'product_name': 'AIA Health Shield Gold',
    'policy_type': 'health',
    'premium_amount': 95000,
    'sum_assured': 50000000,
    'premium_frequency': 'monthly',
    'start_date': '2025-09-01',
    'end_date': '2026-09-01',
    'status': 'active'
})
print(f'  Policy 2 status: {r2.status_code}')
pol2 = r2.json()
pid2 = pol2['id']
print(f'  Policy 2: {pol2["policy_number"]} - {pol2["product_name"]} -> {pid2}')

# Step 4: Create 2 Commissions
print('\n=== CREATE COMMISSIONS ===')
r = requests.post(BASE+'/api/commissions', headers=h, json={
    'policy_id': pid1,
    'commission_type': 'first_year',
    'amount': 216000,
    'period': '2025-Q3',
    'status': 'paid',
    'notes': 'First year commission for Life Protector Plus - Dr. Khin Myo Aye'
})
print(f'  Commission 1 status: {r.status_code}')
comm1 = r.json()
print(f'  Commission 1: {comm1.get("commission_type","?")} - {comm1.get("amount","?")} MMK -> {comm1.get("id","?")}')

r = requests.post(BASE+'/api/commissions', headers=h, json={
    'policy_id': pid2,
    'commission_type': 'first_year',
    'amount': 114000,
    'period': '2025-Q4',
    'status': 'paid',
    'notes': 'First year commission for Health Shield Gold - Dr. Khin Myo Aye'
})
print(f'  Commission 2 status: {r.status_code}')
comm2 = r.json()
print(f'  Commission 2: {comm2.get("commission_type","?")} - {comm2.get("amount","?")} MMK -> {comm2.get("id","?")}')

# Step 5: Create Pipeline Deal
print('\n=== CREATE PIPELINE DEAL ===')
r = requests.post(BASE+'/api/pipeline', headers=h, json={
    'client_id': cid,
    'product_name': 'AIA Critical Care Plus',
    'expected_premium': 150000,
    'stage': 'proposal_sent',
    'probability': 75,
    'expected_close_date': '2026-05-30',
    'notes': 'Critical illness rider proposal for Dr. Khin Myo Aye - follow up after hospital schedule review'
})
print(f'  Pipeline status: {r.status_code}')
deal = r.json()
print(f'  Deal: {deal.get("product_name","?")} | Stage: {deal.get("stage","?")} -> {deal.get("id","?")}')

# Step 6: Create 4 Activities
print('\n=== CREATE ACTIVITIES ===')
activities = [
    {
        'client_id': cid,
        'activity_type': 'meeting',
        'title': 'Initial consultation with Dr. Khin Myo Aye',
        'description': 'Discussed comprehensive life and health coverage needs, family protection goals',
        'scheduled_date': '2026-03-10T10:00:00',
        'status': 'completed'
    },
    {
        'client_id': cid,
        'activity_type': 'call',
        'title': 'Policy delivery confirmation call',
        'description': 'Confirmed receipt of Health Shield Gold policy documents, explained claim procedures',
        'scheduled_date': '2026-03-20T14:00:00',
        'status': 'completed'
    },
    {
        'client_id': cid,
        'activity_type': 'follow_up',
        'title': 'Critical illness rider follow-up',
        'description': 'Follow up on AIA Critical Care Plus proposal, awaiting decision after hospital schedule review',
        'scheduled_date': '2026-04-15T11:00:00',
        'status': 'planned'
    },
    {
        'client_id': cid,
        'activity_type': 'meeting',
        'title': 'Quarterly policy review - Dr. Khin Myo Aye',
        'description': 'Scheduled quarterly review of life and health policies, discuss claim status and additional coverage',
        'scheduled_date': '2026-04-25T09:30:00',
        'status': 'planned'
    }
]
for i, act in enumerate(activities):
    r = requests.post(BASE+'/api/activities', headers=h, json=act)
    print(f'  Activity {i+1} status: {r.status_code}')
    a = r.json()
    print(f'  Activity {i+1}: {a.get("title","?")} ({a.get("activity_type","?")}) -> {a.get("id","?")}')

# Step 7: Create Health Claim
print('\n=== CREATE HEALTH CLAIM ===')
r = requests.post(BASE+'/api/claims', headers=h, json={
    'policy_id': pid2,
    'claim_type': 'health',
    'claim_amount': 3500000,
    'incident_date': '2026-03-28',
    'incident_description': 'Hospitalization for dengue fever treatment at Yangon General Hospital, 4-day inpatient stay with IV therapy and monitoring'
})
print(f'  Claim status: {r.status_code}')
claim = r.json()
print(f'  Claim: {claim.get("claim_number","?")} | Type: {claim.get("claim_type","?")} | Amount: {claim.get("claim_amount","?")} MMK | Status: {claim.get("status","?")} -> {claim.get("id","?")}')

print('\n=== SEED COMPLETE ===')
print(f'  Client: {client["full_name"]} (ID: {cid})')
print(f'  Policies: 2 (IDs: {pid1}, {pid2})')
print(f'  Commissions: 2')
print(f'  Pipeline Deals: 1')
print(f'  Activities: 4')
print(f'  Claims: 1')

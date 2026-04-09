import requests

BASE = 'https://thidaai-backend-production.up.railway.app'
token = requests.post(BASE+'/api/auth/login', json={'email':'tdadmin','password':'admin123'}).json()['access_token']
h = {'Authorization': 'Bearer '+token}

# Dashboard
d = requests.get(BASE+'/api/dashboard/stats', headers=h).json()
print("DASHBOARD:", d.get('total_clients'), "clients,", d.get('active_policies'), "policies,", d.get('total_premium'), "MMK premium,", d.get('pending_claims'), "pending claims")

# Claims
cr = requests.get(BASE+'/api/claims', headers=h)
print("Claims response:", cr.status_code, cr.text[:300] if cr.status_code != 200 else "OK")
claims = cr.json() if cr.ok else []
print("CLAIMS:", len(claims), "total")
claimId = claims[0]['id']
claimNum = claims[0]['claim_number']
print("  Testing workflow on", claimNum, "- current status:", claims[0]['status'])

# Verify docs
r = requests.post(BASE+'/api/claims/'+claimId+'/verify-docs', headers=h)
status = r.json()['status'] if r.ok else r.text[:200]
print("  verify-docs:", r.status_code, "->", status)

# Approve
r = requests.post(BASE+'/api/claims/'+claimId+'/approve', headers=h)
status = r.json()['status'] if r.ok else r.text[:200]
approved = r.json().get('approved_amount') if r.ok else 'N/A'
print("  approve:", r.status_code, "->", status, "| approved:", approved)

# Payment via PUT
r = requests.put(BASE+'/api/claims/'+claimId, headers=h, json={'status':'payment_processing','payment_method':'bank_transfer','payment_reference':'TRF-2026-001'})
status = r.json()['status'] if r.ok else r.text[:200]
print("  payment:", r.status_code, "->", status)

# Close
r = requests.put(BASE+'/api/claims/'+claimId, headers=h, json={'status':'closed'})
status = r.json()['status'] if r.ok else r.text[:200]
print("  close:", r.status_code, "->", status)

# Final claim state
print("\nFINAL CLAIMS:")
claims = requests.get(BASE+'/api/claims', headers=h).json()
for c in claims:
    print("  ", c['claim_number'], "|", c.get('client_name','?'), "| status:", c['status'], "| approved:", c.get('approved_amount'))

# Underwriting
uw = requests.get(BASE+'/api/underwriting', headers=h).json()
print("\nUW cases:", len(uw))

# Pipeline
pip = requests.get(BASE+'/api/pipeline', headers=h).json()
print("Pipeline deals:", len(pip) if isinstance(pip, list) else 'N/A')

# Activities
acts = requests.get(BASE+'/api/activities', headers=h).json()
print("Activities:", len(acts))

# MDRT
mdrt = requests.post(BASE+'/api/mdrt/progress', headers=h, json={'year':2026}).json()
print("MDRT:", mdrt.get('progress_percentage','?'), "% premium,", mdrt.get('cases_percentage','?'), "% cases")

# Commissions
comm = requests.get(BASE+'/api/commissions/summary', headers=h).json()
print("Commissions total:", comm.get('total'))

# Notifications
notifs = requests.get(BASE+'/api/notifications', headers=h).json()
print("Notifications:", len(notifs))

print("\n=== E2E TEST COMPLETE ===")

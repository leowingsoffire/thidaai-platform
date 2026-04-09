import { useState, useEffect } from 'react'
import { api, Claim } from '../api'

const STATUS_COLORS: Record<string, string> = {
  submitted: '#6b7280', docs_verification: '#f59e0b', fraud_check: '#ef4444',
  assessment: '#3b82f6', approved: '#10b981', rejected: '#ef4444',
  payment_processing: '#8b5cf6', closed: '#374151',
}

export default function Claims() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ policy_id: '', claim_type: 'health', claim_amount: '', incident_date: '', incident_description: '' })
  const [stats, setStats] = useState<any>(null)

  useEffect(() => { loadAll() }, [filter])

  async function loadAll() {
    setLoading(true)
    try {
      const [c, s] = await Promise.all([api.getClaims(filter || undefined), api.getClaimStats()])
      setClaims(c); setStats(s)
    } catch { } finally { setLoading(false) }
  }

  async function submitClaim() {
    try {
      await api.submitClaim({ ...form, claim_amount: Number(form.claim_amount) })
      setShowForm(false); setForm({ policy_id: '', claim_type: 'health', claim_amount: '', incident_date: '', incident_description: '' })
      loadAll()
    } catch (err: any) { alert(err.message) }
  }

  async function handleAction(id: string, action: string) {
    try {
      if (action === 'approve') {
        const amt = prompt('Approved amount:')
        if (amt) await api.approveClaim(id, Number(amt))
      } else if (action === 'reject') {
        const reason = prompt('Rejection reason:')
        await api.rejectClaim(id, reason || undefined)
      } else {
        await api.updateClaim(id, { status: action })
      }
      loadAll()
    } catch (err: any) { alert(err.message) }
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

  if (loading) return <div className="page"><p>Loading claims…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Claims Management</h1>
        <div className="header-actions">
          <select className="select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All</option>
            <option value="submitted">Submitted</option>
            <option value="assessment">Assessment</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Claim</button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Claims</div></div>
          <div className="stat-card"><div className="stat-value">{stats.pending}</div><div className="stat-label">Pending</div></div>
          <div className="stat-card"><div className="stat-value">{stats.approved}</div><div className="stat-label">Approved</div></div>
          <div className="stat-card"><div className="stat-value">{stats.flagged}</div><div className="stat-label">Fraud Flagged</div></div>
          <div className="stat-card"><div className="stat-value">{fmt(stats.total_claimed)} MMK</div><div className="stat-label">Total Claimed</div></div>
          <div className="stat-card"><div className="stat-value">{fmt(stats.total_approved)} MMK</div><div className="stat-label">Total Approved</div></div>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Submit New Claim</h2>
            <div className="form-group"><label>Policy ID</label><input value={form.policy_id} onChange={e => setForm({ ...form, policy_id: e.target.value })} placeholder="Policy ID" /></div>
            <div className="form-group"><label>Type</label>
              <select className="select" value={form.claim_type} onChange={e => setForm({ ...form, claim_type: e.target.value })}>
                <option value="health">Health</option><option value="death">Death</option><option value="disability">Disability</option>
                <option value="accident">Accident</option><option value="maturity">Maturity</option><option value="surrender">Surrender</option>
              </select>
            </div>
            <div className="form-group"><label>Amount (MMK)</label><input type="number" value={form.claim_amount} onChange={e => setForm({ ...form, claim_amount: e.target.value })} /></div>
            <div className="form-group"><label>Incident Date</label><input type="date" value={form.incident_date} onChange={e => setForm({ ...form, incident_date: e.target.value })} /></div>
            <div className="form-group"><label>Description</label><textarea value={form.incident_description} onChange={e => setForm({ ...form, incident_description: e.target.value })} rows={3} /></div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitClaim}>Submit Claim</button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Claim #</th><th>Client</th><th>Type</th><th>Amount</th><th>Fraud</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {claims.map(c => (
              <tr key={c.id}>
                <td><strong>{c.claim_number}</strong></td>
                <td>{c.client_name || '—'}</td>
                <td>{c.claim_type}</td>
                <td>{fmt(c.claim_amount)} MMK</td>
                <td>
                  {c.fraud_flag ? <span className="badge" style={{ backgroundColor: '#ef4444' }}>⚠ {c.fraud_score}</span> : <span className="badge" style={{ backgroundColor: '#10b981' }}>OK</span>}
                </td>
                <td><span className="badge" style={{ backgroundColor: STATUS_COLORS[c.status] || '#6b7280' }}>{c.status.replace(/_/g, ' ')}</span></td>
                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="btn-group-sm">
                    {c.status === 'assessment' && <>
                      <button className="btn btn-sm btn-success" onClick={() => handleAction(c.id, 'approve')}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleAction(c.id, 'reject')}>Reject</button>
                    </>}
                    {c.status === 'submitted' && <button className="btn btn-sm btn-primary" onClick={() => handleAction(c.id, 'docs_verification')}>Verify</button>}
                    {c.status === 'approved' && <button className="btn btn-sm btn-primary" onClick={() => handleAction(c.id, 'payment_processing')}>Pay</button>}
                  </div>
                </td>
              </tr>
            ))}
            {claims.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center' }}>No claims found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

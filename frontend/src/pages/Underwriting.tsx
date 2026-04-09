import { useState, useEffect } from 'react'
import { api, UnderwritingCase } from '../api'

const RISK_COLORS: Record<string, string> = { preferred: '#10b981', standard: '#3b82f6', substandard: '#f59e0b', declined: '#ef4444' }

export default function Underwriting() {
  const [cases, setCases] = useState<UnderwritingCase[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => { loadCases() }, [filter])

  async function loadCases() {
    setLoading(true)
    try { setCases(await api.getUnderwritingCases(filter || undefined)) } catch { } finally { setLoading(false) }
  }

  async function makeDecision(id: string, decision: string) {
    const notes = prompt('Notes (optional):')
    const loading_pct = decision === 'approved_with_loading' ? Number(prompt('Loading %:', '25')) : undefined
    try {
      await api.underwritingDecision(id, decision, loading_pct || undefined, undefined, notes || undefined)
      loadCases()
    } catch (err: any) { alert(err.message) }
  }

  if (loading) return <div className="page"><p>Loading underwriting cases…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Underwriting</h1>
        <select className="select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="auto_assessed">Auto Assessed</option>
          <option value="manual_review">Manual Review</option>
          <option value="decided">Decided</option>
        </select>
      </div>

      {cases.length === 0 ? <div className="empty-state"><p>No underwriting cases</p></div> : (
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Policy</th><th>Client</th><th>Product</th><th>Risk</th><th>Score</th><th>Auto</th><th>Decision</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {cases.map(c => (
                <tr key={c.id}>
                  <td><strong>{c.policy_number || c.policy_id.substring(0, 8)}</strong></td>
                  <td>{c.client_name || '—'}</td>
                  <td>{c.product_name || '—'}</td>
                  <td><span className="badge" style={{ backgroundColor: RISK_COLORS[c.risk_category] || '#6b7280' }}>{c.risk_category}</span></td>
                  <td>{c.risk_score}</td>
                  <td>{c.auto_decision || '—'}</td>
                  <td>{c.decision || '—'}</td>
                  <td><span className="badge">{c.status}</span></td>
                  <td>
                    {c.status !== 'decided' && (
                      <div className="btn-group-sm">
                        <button className="btn btn-sm btn-success" onClick={() => makeDecision(c.id, 'approved')}>Approve</button>
                        <button className="btn btn-sm btn-warning" onClick={() => makeDecision(c.id, 'approved_with_loading')}>+ Loading</button>
                        <button className="btn btn-sm btn-danger" onClick={() => makeDecision(c.id, 'declined')}>Decline</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

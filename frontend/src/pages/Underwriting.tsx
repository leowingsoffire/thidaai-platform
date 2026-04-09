import { useState, useEffect } from 'react'
import { api, UnderwritingCase } from '../api'
import { ChevronDown, ChevronRight, Paperclip } from 'lucide-react'
import DocumentManager from '../components/DocumentManager'
import FeatureGuide from '../components/FeatureGuide'

const RISK_COLORS: Record<string, string> = { preferred: '#10b981', standard: '#3b82f6', substandard: '#f59e0b', declined: '#ef4444' }

export default function Underwriting() {
  const [cases, setCases] = useState<UnderwritingCase[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [expandedCase, setExpandedCase] = useState<string | null>(null)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>Underwriting</h1>
          <FeatureGuide
            title="Underwriting"
            description="Risk assessment engine that auto-scores cases based on client age, occupation, sum assured, and policy type. Make approve, loading, or decline decisions."
            steps={[
              { text: 'When a policy is created, an underwriting case is auto-generated.' },
              { text: 'Review the auto-assessed risk score and category.' },
              { text: 'Click a case row to view full details and AI risk analysis.' },
              { text: 'Make a decision: Approve, Approve with Loading (25%), or Decline.' },
              { text: 'Add decision notes — they appear in the Audit Trail.' },
            ]}
            tips={[
              'Risk ≤5 = Preferred (auto-approve). Score >15 = likely decline.',
              'Use "Approve with Loading" for substandard risk rather than declining.',
            ]}
            aiCommands={['underwriting status', 'risk assessment', 'pending reviews']}
          />
        </div>
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
              <tr><th style={{ width: 30 }}></th><th>Policy</th><th>Client</th><th>Product</th><th>Risk</th><th>Score</th><th>Auto</th><th>Decision</th><th>Status</th><th>Actions</th><th style={{ width: 40 }}><Paperclip size={14} /></th></tr>
            </thead>
            <tbody>
              {cases.map(c => (
                <>
                <tr key={c.id} onClick={() => setExpandedCase(expandedCase === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
                  <td>{expandedCase === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td><strong>{c.policy_number || c.policy_id.substring(0, 8)}</strong></td>
                  <td>{c.client_name || '—'}</td>
                  <td>{c.product_name || '—'}</td>
                  <td><span className="badge" style={{ backgroundColor: RISK_COLORS[c.risk_category] || '#6b7280' }}>{c.risk_category}</span></td>
                  <td>{c.risk_score}</td>
                  <td>{c.auto_decision || '—'}</td>
                  <td>{c.decision || '—'}</td>
                  <td><span className="badge">{c.status}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    {c.status !== 'decided' && (
                      <div className="btn-group-sm">
                        <button className="btn btn-sm btn-success" onClick={() => makeDecision(c.id, 'approved')}>Approve</button>
                        <button className="btn btn-sm btn-warning" onClick={() => makeDecision(c.id, 'approved_with_loading')}>+ Loading</button>
                        <button className="btn btn-sm btn-danger" onClick={() => makeDecision(c.id, 'declined')}>Decline</button>
                      </div>
                    )}
                  </td>
                  <td><Paperclip size={13} color="var(--text-dim)" /></td>
                </tr>
                {expandedCase === c.id && (
                  <tr key={`${c.id}-docs`}>
                    <td colSpan={11} style={{ padding: '12px 20px', background: 'var(--bg-elevated)' }}>
                      <DocumentManager entityType="underwriting" entityId={c.id} />
                    </td>
                  </tr>
                )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

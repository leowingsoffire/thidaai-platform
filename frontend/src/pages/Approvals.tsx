import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, AlertTriangle, Filter, RefreshCw } from 'lucide-react'
import { api, ApprovalItem } from '../api'
import FeatureGuide from '../components/FeatureGuide'

export default function Approvals() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [filter, setFilter] = useState<string>('pending')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getApprovals(filter || undefined)
      setApprovals(data)
    } catch { }
    setLoading(false)
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setActing(id)
    try {
      const reason = action === 'reject' ? prompt('Rejection reason (optional):') || undefined : undefined
      await api.actOnApproval(id, action, reason || undefined)
      await load()
    } catch (err: any) {
      alert(err.message)
    }
    setActing(null)
  }

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444',
      expired: '#6b7280', auto_executed: '#3b82f6',
    }
    return (
      <span className="status-badge" style={{ background: colors[status] || '#888', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
        {status}
      </span>
    )
  }

  function confidenceBar(val: number | null) {
    if (val === null) return null
    const pct = Math.round(val * 100)
    const color = pct > 85 ? '#10b981' : pct > 60 ? '#f59e0b' : '#ef4444'
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 60, height: 6, background: '#e5e7eb', borderRadius: 3 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 11, color: '#666' }}>{pct}%</span>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>Approval Queue</h1>
          <FeatureGuide
            title="Approvals"
            description="Review AI-generated actions with confidence scores. When the AI Assistant performs write operations, it queues approval requests here."
            steps={[
              { text: 'Use the AI Assistant chat to perform an action (e.g. "add client John").' },
              { text: 'If the action requires approval, it appears here.' },
              { text: 'Review the confidence score and action description.' },
              { text: 'Click Approve (green) to execute, or Reject (red) to decline.' },
              { text: 'Check Approved/Rejected tabs to see completed decisions.' },
            ]}
            tips={[
              'Green confidence bars (>85%) are generally safe to approve.',
              'Expired approvals need to be re-submitted through the AI Assistant.',
            ]}
            aiCommands={['approval queue', 'approvals', 'approve', 'reject']}
          />
          <p>AI-generated actions awaiting your approval</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Filter size={16} />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="input" style={{ width: 140 }}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading approvals...</div>
      ) : approvals.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={48} />
          <p>No {filter || ''} approvals</p>
        </div>
      ) : (
        <div className="card-list">
          {approvals.map(a => (
            <div key={a.id} className="card approval-card">
              <div className="approval-header">
                <div>
                  <h3>{a.title}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    {statusBadge(a.status)}
                    <span style={{ fontSize: 12, color: '#888' }}>{a.action_type.replace(/_/g, ' ')}</span>
                    {a.priority === 'urgent' && <AlertTriangle size={14} color="#ef4444" />}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#999' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleString() : ''}
                  </div>
                  <div style={{ marginTop: 4 }}>{confidenceBar(a.ai_confidence)}</div>
                </div>
              </div>

              {a.description && (
                <p className="approval-desc" style={{ whiteSpace: 'pre-wrap', margin: '8px 0', fontSize: 13, color: '#555' }}>
                  {a.description}
                </p>
              )}

              {a.executed_result && (
                <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                  {a.executed_result.message || JSON.stringify(a.executed_result)}
                </div>
              )}

              {a.rejection_reason && (
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                  Reason: {a.rejection_reason}
                </div>
              )}

              {a.expires_at && a.status === 'pending' && (
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  <Clock size={11} /> Expires: {new Date(a.expires_at).toLocaleString()}
                </div>
              )}

              {a.status === 'pending' && (
                <div className="approval-actions" style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAction(a.id, 'approve')}
                    disabled={acting === a.id}
                    style={{ background: '#10b981' }}
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleAction(a.id, 'reject')}
                    disabled={acting === a.id}
                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { api, AuditLogEntry } from '../api'
import { ChevronDown, ChevronRight } from 'lucide-react'

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    try { setLogs(await api.getAuditLogs(filter || undefined)) } catch { } finally { setLoading(false) }
  }

  const ACTION_COLORS: Record<string, string> = {
    create: '#10b981', update: '#3b82f6', delete: '#ef4444',
    login: '#8b5cf6', approve: '#10b981', reject: '#ef4444', escalate: '#f59e0b',
  }

  if (loading) return <div className="page"><p>Loading audit log…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Audit Trail</h1>
        <select className="select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Entities</option>
          <option value="policy">Policies</option>
          <option value="claim">Claims</option>
          <option value="underwriting">Underwriting</option>
          <option value="workflow">Workflows</option>
          <option value="user">Users</option>
          <option value="client">Clients</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th style={{ width: 30 }}></th><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>ID</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <>
              <tr key={l.id} onClick={() => setExpandedLog(expandedLog === l.id ? null : l.id)} style={{ cursor: 'pointer' }}>
                <td>{expandedLog === l.id ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</td>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.user_name || l.user_id?.substring(0, 8)}</td>
                <td><span className="badge" style={{ backgroundColor: ACTION_COLORS[l.action] || '#6b7280' }}>{l.action}</span></td>
                <td>{l.entity_type}</td>
                <td><code>{l.entity_id?.substring(0, 12)}</code></td>
                <td style={{ fontSize: 11, color: 'var(--gray-400)' }}>{l.details ? 'Click to expand' : '—'}</td>
              </tr>
              {expandedLog === l.id && l.details && (
                <tr><td colSpan={7} style={{ padding: '12px 16px', background: 'var(--bg-elevated)' }}>
                  <pre style={{ fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{JSON.stringify(l.details, null, 2)}</pre>
                </td></tr>
              )}
              </>
            ))}
            {logs.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center' }}>No audit logs</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

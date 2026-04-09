import { useState, useEffect } from 'react'
import { api, AuditLogEntry } from '../api'

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

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
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>ID</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.user_name || l.user_id?.substring(0, 8)}</td>
                <td><span className="badge" style={{ backgroundColor: ACTION_COLORS[l.action] || '#6b7280' }}>{l.action}</span></td>
                <td>{l.entity_type}</td>
                <td><code>{l.entity_id?.substring(0, 12)}</code></td>
                <td><pre style={{ fontSize: '11px', maxWidth: 300, overflow: 'auto', margin: 0 }}>{l.details ? JSON.stringify(l.details, null, 1) : '—'}</pre></td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center' }}>No audit logs</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { api, type Commission } from '../api'
import { DollarSign, TrendingUp, Clock, Layers } from 'lucide-react'

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function Commissions() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')

  const load = () => {
    Promise.all([api.getCommissions(filterStatus || undefined), api.getCommissionSummary()])
      .then(([c, s]) => { setCommissions(c); setSummary(s) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [filterStatus])

  if (loading) return <div className="loading">Loading commissions...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Commissions</h1>
      </div>

      {summary && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-header"><div className="stat-label">Total Earned</div><div className="stat-icon green"><DollarSign size={18} /></div></div>
            <div className="stat-value">{fmt(summary.total_earned)}</div>
            <div className="stat-change neutral">MMK</div>
          </div>
          <div className="stat-card">
            <div className="stat-header"><div className="stat-label">Pending</div><div className="stat-icon yellow"><Clock size={18} /></div></div>
            <div className="stat-value">{fmt(summary.total_pending)}</div>
            <div className="stat-change neutral">MMK</div>
          </div>
          <div className="stat-card">
            <div className="stat-header"><div className="stat-label">First Year</div><div className="stat-icon blue"><TrendingUp size={18} /></div></div>
            <div className="stat-value">{fmt(summary.by_type?.first_year || 0)}</div>
            <div className="stat-change neutral">MMK</div>
          </div>
          <div className="stat-card">
            <div className="stat-header"><div className="stat-label">Renewal</div><div className="stat-icon purple"><Layers size={18} /></div></div>
            <div className="stat-value">{fmt(summary.by_type?.renewal || 0)}</div>
            <div className="stat-change neutral">MMK</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setLoading(true) }} style={{ minWidth: 140 }}>
          <option value="">All Status</option>
          <option value="earned">Earned</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {summary && summary.by_type && Object.keys(summary.by_type).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          {Object.entries(summary.by_type as Record<string, number>).map(([type, amount]) => (
            <div className="commission-type-card" key={type}>
              <div className="commission-type-label">{type.replace('_', ' ')}</div>
              <div className="commission-type-value">{fmt(amount)}</div>
            </div>
          ))}
        </div>
      )}

      {commissions.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">💰</div><h3>No commissions</h3><p>Commissions from your policies will appear here.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Policy</th><th>Client</th><th>Type</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {commissions.map(c => (
              <tr key={c.id}>
                <td>{c.paid_date ? new Date(c.paid_date).toLocaleDateString() : new Date(c.created_at).toLocaleDateString()}</td>
                <td style={{ fontFamily: 'monospace' }}>{c.policy_number || '—'}</td>
                <td>{c.client_name || '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>{c.commission_type.replace('_', ' ')}</td>
                <td style={{ fontWeight: 600 }}>{fmt(c.amount)} MMK</td>
                <td><span className={`badge badge-${c.status === 'earned' || c.status === 'paid' ? 'green' : 'blue'}`}>{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

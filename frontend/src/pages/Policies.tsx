import { useEffect, useState } from 'react'
import { api, type Policy, type Client } from '../api'
import { Plus, Search, X, Paperclip, ChevronDown, ChevronRight } from 'lucide-react'
import DocumentManager from '../components/DocumentManager'

const PRODUCTS = [
  'AIA Universal Life', 'AIA Short-term Endowment', 'AIA Health Shield',
  'AIA Education Plan', 'AIA Critical Illness', 'AIA Cancer Care', 'AIA Group Life',
]
const FREQUENCIES = ['monthly', 'quarterly', 'semi-annual', 'annual']
const STATUSES = ['active', 'pending', 'lapsed', 'cancelled', 'matured']
const TYPES = ['life', 'health', 'investment', 'education', 'critical_illness', 'cancer_care', 'group']

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({
    client_id: '', policy_number: '', product_name: '', policy_type: 'life',
    premium_amount: '', sum_assured: '', premium_frequency: 'monthly', start_date: '', status: 'active',
  })
  const [saving, setSaving] = useState(false)
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null)

  const load = () => {
    Promise.all([api.getPolicies(), api.getClients()])
      .then(([p, c]) => { setPolicies(p); setClients(c) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = policies.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    const q = search.toLowerCase()
    return !q || p.policy_number.toLowerCase().includes(q) || p.product_name.toLowerCase().includes(q) || (p.client_name || '').toLowerCase().includes(q)
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, premium_amount: Number(form.premium_amount), sum_assured: form.sum_assured ? Number(form.sum_assured) : null }
      await api.createPolicy(payload)
      setShowModal(false)
      setForm({ client_id: '', policy_number: '', product_name: '', policy_type: 'life', premium_amount: '', sum_assured: '', premium_frequency: 'monthly', start_date: '', status: 'active' })
      load()
    } catch { } finally { setSaving(false) }
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  const totalPremium = filtered.reduce((s, p) => s + p.premium_amount, 0)
  const activePolicies = filtered.filter(p => p.status === 'active').length

  if (loading) return <div className="loading">Loading policies...</div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Policies</h1>
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{activePolicies} active · {fmt(totalPremium)} MMK total premium</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> New Policy</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={16} /><input placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: 120 }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No policies found</h3><p>Create a new policy to get started.</p></div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th style={{ width: 30 }}></th><th>Policy #</th><th>Client</th><th>Product</th><th>Premium</th><th>Frequency</th><th>Status</th><th>Start Date</th><th style={{ width: 40 }}><Paperclip size={14} /></th></tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <>
              <tr key={p.id} onClick={() => setExpandedPolicy(expandedPolicy === p.id ? null : p.id)} style={{ cursor: 'pointer' }}>
                <td>{expandedPolicy === p.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{p.policy_number}</td>
                <td>{p.client_name || '—'}</td>
                <td>{p.product_name}</td>
                <td>{fmt(p.premium_amount)} MMK</td>
                <td style={{ textTransform: 'capitalize' }}>{p.premium_frequency}</td>
                <td><span className={`badge badge-${p.status === 'active' ? 'green' : p.status === 'pending' ? 'blue' : 'gray'}`}>{p.status}</span></td>
                <td>{new Date(p.start_date).toLocaleDateString()}</td>
                <td><Paperclip size={13} color="var(--text-dim)" /></td>
              </tr>
              {expandedPolicy === p.id && (
                <tr key={`${p.id}-docs`}>
                  <td colSpan={9} style={{ padding: '12px 20px', background: 'var(--bg-elevated)' }}>
                    <DocumentManager entityType="policy" entityId={p.id} />
                  </td>
                </tr>
              )}
              </>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>New Policy</h2>
              <button className="btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="form-group">
              <label>Client *</label>
              <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">Select client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Policy Number *</label><input value={form.policy_number} onChange={e => setForm({ ...form, policy_number: e.target.value })} placeholder="AIA-2026-001" /></div>
              <div className="form-group">
                <label>Product *</label>
                <select value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })}>
                  <option value="">Select product</option>
                  {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select value={form.policy_type} onChange={e => setForm({ ...form, policy_type: e.target.value })}>
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <select value={form.premium_frequency} onChange={e => setForm({ ...form, premium_frequency: e.target.value })}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Premium (MMK) *</label><input type="number" value={form.premium_amount} onChange={e => setForm({ ...form, premium_amount: e.target.value })} /></div>
              <div className="form-group"><label>Sum Assured (MMK)</label><input type="number" value={form.sum_assured} onChange={e => setForm({ ...form, sum_assured: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Start Date *</label><input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={!form.client_id || !form.policy_number || !form.product_name || !form.premium_amount || !form.start_date || saving} onClick={handleSave}>{saving ? 'Saving...' : 'Create Policy'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Client } from '../api'
import { Plus, Search, Phone, Mail, X } from 'lucide-react'

const EMPTY_CLIENT = {
  full_name: '', email: '', phone: '', date_of_birth: '', gender: '',
  occupation: '', monthly_income: '', marital_status: '', dependents: 0, address: '', notes: '',
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({ ...EMPTY_CLIENT })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const load = () => { api.getClients().then(setClients).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(load, [])

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (payload.monthly_income) payload.monthly_income = Number(payload.monthly_income)
      if (payload.dependents) payload.dependents = Number(payload.dependents)
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
      payload.full_name = form.full_name
      await api.createClient(payload)
      setShowModal(false)
      setForm({ ...EMPTY_CLIENT })
      load()
    } catch { } finally { setSaving(false) }
  }

  if (loading) return <div className="loading">Loading clients...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Clients</h1>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Add Client</button>
        </div>
      </div>

      <div className="search-bar">
        <Search size={16} />
        <input placeholder="Search by name, phone, or email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>{search ? 'No matching clients' : 'No clients yet'}</h3>
          <p>{search ? 'Try a different search term' : 'Add your first client to get started'}</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Email</th><th>Occupation</th><th>Status</th></tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="clickable" onClick={() => navigate(`/clients/${c.id}`)}>
                <td style={{ fontWeight: 600 }}>{c.full_name}</td>
                <td>{c.phone ? <span><Phone size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{c.phone}</span> : '—'}</td>
                <td>{c.email ? <span><Mail size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{c.email}</span> : '—'}</td>
                <td>{c.occupation || '—'}</td>
                <td><span className="badge badge-green">Active</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>New Client</h2>
              <button className="btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Full Name *</label><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+95 9..." /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="form-group"><label>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={e => setForm({ ...form, date_of_birth: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                  <option value="">Select</option><option value="male">Male</option><option value="female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Marital Status</label>
                <select value={form.marital_status} onChange={e => setForm({ ...form, marital_status: e.target.value })}>
                  <option value="">Select</option><option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Occupation</label><input value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} /></div>
              <div className="form-group"><label>Monthly Income (MMK)</label><input type="number" value={form.monthly_income} onChange={e => setForm({ ...form, monthly_income: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Dependents</label><input type="number" value={form.dependents} onChange={e => setForm({ ...form, dependents: e.target.value })} /></div>
              <div className="form-group"><label>Address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={!form.full_name || saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Client'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

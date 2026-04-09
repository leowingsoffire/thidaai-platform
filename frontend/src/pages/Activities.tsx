import { useEffect, useState } from 'react'
import { api, type Activity, type Client } from '../api'
import { Plus, Search, Check, X, Phone, HandshakeIcon, Presentation, UserPlus, ClipboardList, ChevronDown, ChevronRight } from 'lucide-react'

const TYPES = [
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'meeting', label: 'Meeting', icon: '🤝' },
  { value: 'follow_up', label: 'Follow Up', icon: '📋' },
  { value: 'presentation', label: 'Presentation', icon: '📊' },
  { value: 'referral', label: 'Referral', icon: '👥' },
]
const STATUS_OPTS = ['planned', 'completed', 'cancelled']

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({ client_id: '', activity_type: 'call', title: '', description: '', scheduled_date: '', status: 'planned' })
  const [saving, setSaving] = useState(false)
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)

  const load = () => {
    const params: any = {}
    if (filterType) params.activity_type = filterType
    if (filterStatus) params.status = filterStatus
    Promise.all([api.getActivities(params), api.getClients(), api.getActivityStats()])
      .then(([a, c, s]) => { setActivities(a); setClients(c); setStats(s) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [filterType, filterStatus])

  const markComplete = async (activity: Activity) => {
    await api.updateActivity(activity.id, { status: 'completed', completed_date: new Date().toISOString().split('T')[0] })
    load()
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.client_id) payload.client_id = null
      if (!payload.scheduled_date) payload.scheduled_date = null
      if (!payload.description) payload.description = null
      await api.createActivity(payload)
      setShowModal(false)
      setForm({ client_id: '', activity_type: 'call', title: '', description: '', scheduled_date: '', status: 'planned' })
      load()
    } catch { } finally { setSaving(false) }
  }

  if (loading) return <div className="loading">Loading activities...</div>

  return (
    <div>
      <div className="page-header">
        <h1>Activities</h1>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Log Activity</button>
        </div>
      </div>

      {stats && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="stat-card" onClick={() => { setFilterStatus(''); setFilterType('') }} style={{ cursor: 'pointer' }}>
            <div className="stat-header"><div className="stat-label">Today</div><div className="stat-icon blue"><ClipboardList size={18} /></div></div>
            <div className="stat-value">{stats.today}</div>
          </div>
          <div className="stat-card" onClick={() => { setFilterStatus('completed'); setFilterType('') }} style={{ cursor: 'pointer' }}>
            <div className="stat-header"><div className="stat-label">This Week</div><div className="stat-icon green"><Check size={18} /></div></div>
            <div className="stat-value">{stats.week}</div>
          </div>
          <div className="stat-card" onClick={() => { setFilterStatus(''); setFilterType('') }} style={{ cursor: 'pointer' }}>
            <div className="stat-header"><div className="stat-label">This Month</div><div className="stat-icon purple"><Presentation size={18} /></div></div>
            <div className="stat-value">{stats.month}</div>
          </div>
          <div className="stat-card" onClick={() => { setFilterType('call'); setFilterStatus('') }} style={{ cursor: 'pointer' }}>
            <div className="stat-header"><div className="stat-label">Calls Made</div><div className="stat-icon orange"><Phone size={18} /></div></div>
            <div className="stat-value">{stats.by_type?.call || 0}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setLoading(true) }} style={{ minWidth: 120 }}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setLoading(true) }} style={{ minWidth: 120 }}>
          <option value="">All Status</option>
          {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {activities.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📅</div><h3>No activities</h3><p>Start logging your calls, meetings, and follow-ups.</p></div>
      ) : (
        <div className="card">
          {activities.map(a => (
            <div className="activity-item" key={a.id}
              onClick={() => setExpandedActivity(expandedActivity === a.id ? null : a.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="activity-icon" style={{ background: a.status === 'completed' ? 'var(--green-50)' : 'var(--gray-100)', fontSize: 16 }}>
                {TYPES.find(t => t.value === a.activity_type)?.icon || '📌'}
              </div>
              <div className="activity-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="activity-title">{a.title}</div>
                  {expandedActivity === a.id ? <ChevronDown size={13} color="var(--gray-400)" /> : <ChevronRight size={13} color="var(--gray-400)" />}
                </div>
                <div className="activity-meta">
                  {a.client_name && <span>{a.client_name} · </span>}
                  <span style={{ textTransform: 'capitalize' }}>{a.activity_type}</span>
                  {a.scheduled_date && <span> · {new Date(a.scheduled_date).toLocaleDateString()}</span>}
                </div>
                {expandedActivity === a.id && a.description && <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6, lineHeight: 1.5 }}>{a.description}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
                <span className={`badge badge-${a.status === 'completed' ? 'green' : a.status === 'planned' ? 'blue' : 'gray'}`}>{a.status}</span>
                {a.status === 'planned' && (
                  <button className="btn-success btn-sm" onClick={() => markComplete(a)} title="Mark completed"><Check size={14} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Log Activity</h2>
              <button className="btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Type *</label>
                <select value={form.activity_type} onChange={e => setForm({ ...form, activity_type: e.target.value })}>
                  {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Client</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">None</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label>Title *</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Follow-up call with prospect" /></div>
            <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>Scheduled Date</label><input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={!form.title || saving} onClick={handleSave}>{saving ? 'Saving...' : 'Log Activity'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

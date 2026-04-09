import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type Client, type Policy, type NeedsAnalysis, type Proposal, type AutoGreetingItem } from '../api'
import { ArrowLeft, ShieldCheck, Brain, FileText, Edit2, Trash2, X, Phone, Mail, MapPin, Heart, Home, Lightbulb, Smile, Target, AlertTriangle, Gift, Send } from 'lucide-react'
import DocumentManager from '../components/DocumentManager'

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [analysis, setAnalysis] = useState<NeedsAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'policies' | 'proposals' | 'greetings' | 'documents'>('overview')
  const [analyzing, setAnalyzing] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [greetings, setGreetings] = useState<AutoGreetingItem[]>([])
  const [sendingGreeting, setSendingGreeting] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getClient(id).then(setClient),
      api.getPolicies(id).then(setPolicies),
      api.getProposals(id).then(setProposals),
      api.getGreetingHistory(id).then(setGreetings).catch(() => {}),
    ]).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const runAnalysis = async () => {
    if (!client) return
    setAnalyzing(true)
    try {
      const result = await api.analyzeNeeds({
        client_id: client.id, monthly_income: client.monthly_income || 0,
        dependents: client.dependents, marital_status: client.marital_status || 'single',
        occupation: client.occupation || '', age: client.date_of_birth ? Math.floor((Date.now() - new Date(client.date_of_birth).getTime()) / 31557600000) : 30,
      })
      setAnalysis(result)
    } catch { } finally { setAnalyzing(false) }
  }

  const handleEdit = () => {
    if (!client) return
    setForm({ ...client })
    setEditModal(true)
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (payload.monthly_income) payload.monthly_income = Number(payload.monthly_income)
      if (payload.dependents) payload.dependents = Number(payload.dependents)
      const updated = await api.updateClient(id, payload)
      setClient(updated)
      setEditModal(false)
    } catch { } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!id || !confirm('Delete this client? This cannot be undone.')) return
    await api.deleteClient(id)
    navigate('/clients')
  }

  if (loading) return <div className="loading">Loading client...</div>
  if (!client) return <div className="alert alert-error">Client not found</div>

  const age = client.date_of_birth ? Math.floor((Date.now() - new Date(client.date_of_birth).getTime()) / 31557600000) : null
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })

  // Renewal alerts: policies expiring within 60 days
  const renewalAlerts = policies.filter(p => {
    if (!p.end_date || p.status !== 'active') return false
    const daysUntil = (new Date(p.end_date).getTime() - Date.now()) / 86400000
    return daysUntil > 0 && daysUntil <= 60
  })

  // 4 Pillars Assessment
  const fourPillars = {
    liveWell: {
      icon: Home, color: '#ec4899', label: 'Live Well', labelMy: 'ကောင်းစွာနေထိုင်ပါ',
      desc: 'Health & Medical Protection',
      covered: policies.some(p => ['health','cancer_care','critical_illness'].includes(p.policy_type)),
      products: policies.filter(p => ['health','cancer_care','critical_illness'].includes(p.policy_type)),
    },
    thinkWell: {
      icon: Lightbulb, color: '#8b5cf6', label: 'Think Well', labelMy: 'ကောင်းစွာစဉ်းစားပါ',
      desc: 'Education & Savings',
      covered: policies.some(p => ['education','investment'].includes(p.policy_type)),
      products: policies.filter(p => ['education','investment'].includes(p.policy_type)),
    },
    feelWell: {
      icon: Smile, color: '#22c55e', label: 'Feel Well', labelMy: 'ကောင်းစွာခံစားပါ',
      desc: 'Life & Income Protection',
      covered: policies.some(p => ['life'].includes(p.policy_type)),
      products: policies.filter(p => ['life'].includes(p.policy_type)),
    },
    planWell: {
      icon: Target, color: '#f59e0b', label: 'Plan Well', labelMy: 'ကောင်းစွာစီမံပါ',
      desc: 'Retirement & Legacy Planning',
      covered: policies.some(p => ['investment','life'].includes(p.policy_type) && (p.sum_assured || 0) > 50000000),
      products: [],
    },
  }

  const sendClientGreeting = async (gtype: string) => {
    if (!id) return
    setSendingGreeting(true)
    try {
      await api.sendGreeting({ client_id: id, greeting_type: gtype, channel: 'sms' })
      setGreetings(await api.getGreetingHistory(id))
    } catch (e: any) { alert(e.message) }
    setSendingGreeting(false)
  }

  return (
    <div>
      <button className="btn-ghost" onClick={() => navigate('/clients')} style={{ marginBottom: 12 }}>
        <ArrowLeft size={16} /> Back to Clients
      </button>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{client.full_name}</h1>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--gray-500)', flexWrap: 'wrap' }}>
              {client.phone && <span><Phone size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{client.phone}</span>}
              {client.email && <span><Mail size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{client.email}</span>}
              {client.address && <span><MapPin size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{client.address}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-secondary btn-sm" onClick={handleEdit}><Edit2 size={13} /> Edit</button>
            <button className="btn-ghost btn-sm" style={{ color: 'var(--aia-red)' }} onClick={handleDelete}><Trash2 size={13} /></button>
          </div>
        </div>

        <div className="grid-4" style={{ marginTop: 18 }}>
          <div><span className="stat-label">Age</span><div style={{ fontWeight: 600, fontSize: 15 }}>{age || '—'}</div></div>
          <div><span className="stat-label">Occupation</span><div style={{ fontWeight: 600, fontSize: 15 }}>{client.occupation || '—'}</div></div>
          <div><span className="stat-label">Income</span><div style={{ fontWeight: 600, fontSize: 15 }}>{client.monthly_income ? `${fmt(client.monthly_income)} MMK` : '—'}</div></div>
          <div><span className="stat-label">Dependents</span><div style={{ fontWeight: 600, fontSize: 15 }}>{client.dependents}</div></div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`tab ${tab === 'policies' ? 'active' : ''}`} onClick={() => setTab('policies')}>Policies ({policies.length})</button>
        <button className={`tab ${tab === 'proposals' ? 'active' : ''}`} onClick={() => setTab('proposals')}>Proposals ({proposals.length})</button>
        <button className={`tab ${tab === 'greetings' ? 'active' : ''}`} onClick={() => setTab('greetings')}>
          Greetings{greetings.length > 0 ? ` (${greetings.length})` : ''}
        </button>
        <button className={`tab ${tab === 'documents' ? 'active' : ''}`} onClick={() => setTab('documents')}>Documents</button>
      </div>

      {tab === 'overview' && (
        <div>
          {/* Renewal Alerts */}
          {renewalAlerts.length > 0 && (
            <div className="card" style={{ marginBottom: 16, background: '#fef3c7', border: '1px solid #fbbf24' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={18} style={{ color: '#d97706' }} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: 0 }}>Policy Renewal Alerts</h3>
              </div>
              {renewalAlerts.map(p => {
                const daysLeft = Math.ceil((new Date(p.end_date!).getTime() - Date.now()) / 86400000)
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #fde68a' }}>
                    <ShieldCheck size={14} style={{ color: '#d97706' }} />
                    <span style={{ fontSize: 13, flex: 1 }}><strong>{p.policy_number}</strong> — {p.product_name}</span>
                    <span style={{ fontSize: 12, color: daysLeft <= 14 ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                      Expires in {daysLeft} days
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* 4 Pillars Needs Analysis */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              <Heart size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#ec4899' }} />
              4 Pillars Needs Analysis — AIA Well-Being Framework
            </h3>
            <div className="grid-4">
              {Object.entries(fourPillars).map(([key, pillar]) => {
                const Icon = pillar.icon
                return (
                  <div key={key} style={{
                    padding: 16, borderRadius: 12, border: `2px solid ${pillar.covered ? pillar.color : '#e5e7eb'}`,
                    background: pillar.covered ? `${pillar.color}10` : '#f9fafb', textAlign: 'center',
                  }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: pillar.covered ? `${pillar.color}20` : '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <Icon size={22} style={{ color: pillar.covered ? pillar.color : '#9ca3af' }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: pillar.covered ? pillar.color : '#6b7280' }}>{pillar.label}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>{pillar.labelMy}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>{pillar.desc}</div>
                    {pillar.covered ? (
                      <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Covered</span>
                    ) : (
                      <span className="badge badge-red" style={{ fontSize: 10 }}>Gap</span>
                    )}
                    {pillar.products.length > 0 && (
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6 }}>
                        {pillar.products.map(p => p.product_name).join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--gray-400)', textAlign: 'center' }}>
              {Object.values(fourPillars).filter(p => !p.covered).length === 0
                ? '✅ All 4 pillars covered! Client has holistic protection.'
                : `⚠️ ${Object.values(fourPillars).filter(p => !p.covered).length} pillar(s) need attention. Recommend coverage for gaps.`
              }
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}><Brain size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--purple-500)' }} />AI Needs Analysis</h3>
                <button className="btn-primary btn-sm" onClick={runAnalysis} disabled={analyzing}>
                  {analyzing ? 'Analyzing...' : analysis ? 'Re-Analyze' : 'Run Analysis'}
                </button>
              </div>
            {analysis ? (
              <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--gray-700)' }}>
                {analysis.ai_recommendations || 'Analysis complete. See details below.'}
                {analysis.analysis_data && analysis.analysis_data.protection_gap != null && (
                  <div className="result-card" style={{ marginTop: 14 }}>
                    <div className="result-row"><span className="result-label">Protection Gap</span><span className="result-value" style={{ color: 'var(--aia-red)' }}>{fmt(analysis.analysis_data.protection_gap)} MMK</span></div>
                    <div className="result-row"><span className="result-label">Recommended Coverage</span><span className="result-value">{fmt(analysis.analysis_data.recommended_coverage)} MMK</span></div>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Run AI analysis to get personalized insurance recommendations for this client based on their profile.</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              <ShieldCheck size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--green-500)' }} />
              Coverage Summary
            </h3>
            {policies.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>No policies yet. Run a needs analysis and create a proposal.</p>
            ) : (
              <>
                <div className="result-card" style={{ marginBottom: 10 }}>
                  <div className="result-row"><span className="result-label">Total Policies</span><span className="result-value">{policies.length}</span></div>
                  <div className="result-row"><span className="result-label">Active</span><span className="result-value">{policies.filter(p => p.status === 'active').length}</span></div>
                  <div className="result-row"><span className="result-label">Total Premium</span><span className="result-value">{fmt(policies.reduce((s, p) => s + p.premium_amount, 0))} MMK</span></div>
                  <div className="result-row"><span className="result-label">Total Sum Assured</span><span className="result-value">{fmt(policies.reduce((s, p) => s + (p.sum_assured || 0), 0))} MMK</span></div>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      )}

      {tab === 'greetings' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              <Gift size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#ec4899' }} />
              Send Greeting
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['birthday','policy_anniversary','new_year','thingyan'].map(g => (
                <button key={g} className="btn btn-secondary btn-sm" disabled={sendingGreeting}
                  onClick={() => sendClientGreeting(g)}>
                  <Send size={12} /> {g.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Greeting History</h3>
            {greetings.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>No greetings sent to this client yet.</p>
            ) : (
              greetings.map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <span style={{ fontSize: 18 }}>{g.greeting_type === 'birthday' ? '🎂' : g.greeting_type === 'thingyan' ? '💧' : '🎉'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{g.greeting_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{g.channel} · {g.sent_at ? new Date(g.sent_at).toLocaleDateString() : 'pending'}</div>
                  </div>
                  <span className={`badge badge-${g.status === 'sent' ? 'green' : 'gray'}`}>{g.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'policies' && (
        policies.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No policies</h3><p>Policies linked to this client will appear here.</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Policy #</th><th>Product</th><th>Premium</th><th>Sum Assured</th><th>Status</th><th>Start</th></tr></thead>
            <tbody>
              {policies.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.policy_number}</td>
                  <td>{p.product_name}</td>
                  <td>{fmt(p.premium_amount)} MMK</td>
                  <td>{p.sum_assured ? `${fmt(p.sum_assured)} MMK` : '—'}</td>
                  <td><span className={`badge badge-${p.status === 'active' ? 'green' : p.status === 'pending' ? 'blue' : 'gray'}`}>{p.status}</span></td>
                  <td>{new Date(p.start_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {tab === 'proposals' && (
        proposals.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📄</div><h3>No proposals</h3><p>Generate a proposal from the needs analysis.</p></div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Title</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {proposals.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td><span className={`badge badge-${p.status === 'sent' ? 'green' : 'blue'}`}>{p.status}</span></td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {tab === 'documents' && id && (
        <div className="card" style={{ padding: 20 }}>
          <DocumentManager entityType="client" entityId={id} />
        </div>
      )}

      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>Edit Client</h2>
              <button className="btn-ghost" onClick={() => setEditModal(false)}><X size={18} /></button>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Full Name</label><input value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="form-group"><label>Phone</label><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Email</label><input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="form-group"><label>Occupation</label><input value={form.occupation || ''} onChange={e => setForm({ ...form, occupation: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Monthly Income</label><input type="number" value={form.monthly_income || ''} onChange={e => setForm({ ...form, monthly_income: e.target.value })} /></div>
              <div className="form-group"><label>Dependents</label><input type="number" value={form.dependents || 0} onChange={e => setForm({ ...form, dependents: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Notes</label><textarea rows={3} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

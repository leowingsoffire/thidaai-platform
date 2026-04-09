import { useEffect, useState } from 'react'
import { api, type PipelineDeal, type Client } from '../api'
import { Plus, X, Trash2, ChevronDown, ChevronRight, Calendar, TrendingUp, User } from 'lucide-react'
import FeatureGuide from '../components/FeatureGuide'

const STAGES = ['prospect', 'approach', 'fact_find', 'proposal', 'negotiation', 'closed_won', 'closed_lost']
const STAGE_LABELS: Record<string, string> = {
  prospect: 'Prospect', approach: 'Approach', fact_find: 'Fact Find',
  proposal: 'Proposal', negotiation: 'Negotiation', closed_won: 'Closed Won', closed_lost: 'Closed Lost',
}
const STAGE_COLORS: Record<string, string> = {
  prospect: 'var(--gray-400)', approach: 'var(--blue-500)', fact_find: 'var(--purple-500)',
  proposal: 'var(--orange-500)', negotiation: 'var(--yellow-500)', closed_won: 'var(--green-500)', closed_lost: 'var(--aia-red)',
}
const PRODUCTS = [
  'AIA Universal Life', 'AIA Short-term Endowment', 'AIA Health Shield',
  'AIA Education Plan', 'AIA Critical Illness', 'AIA Cancer Care', 'AIA Group Life',
]
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function Pipeline() {
  const [deals, setDeals] = useState<PipelineDeal[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<any>({
    client_id: '', product_name: '', expected_premium: '', stage: 'prospect', probability: 50, expected_close_date: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null)

  const load = () => {
    Promise.all([api.getPipeline(), api.getClients(), api.getPipelineSummary()])
      .then(([d, c, s]) => { setDeals(d); setClients(c); setSummary(s) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const moveStage = async (deal: PipelineDeal, newStage: string) => {
    try {
      await api.updateDeal(deal.id, { stage: newStage })
      load()
    } catch (e) { console.error('Move stage failed:', e) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        expected_premium: Number(form.expected_premium),
        probability: Number(form.probability),
        expected_close_date: form.expected_close_date || null,
        notes: form.notes || null,
      }
      await api.createDeal(payload)
      setShowModal(false)
      setForm({ client_id: '', product_name: '', expected_premium: '', stage: 'prospect', probability: 50, expected_close_date: '', notes: '' })
      load()
    } catch { } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this deal?')) return
    try {
      await api.deleteDeal(id)
      load()
    } catch (e) { console.error('Delete failed:', e) }
  }

  const activeStages = STAGES.filter(s => s !== 'closed_lost')

  if (loading) return <div className="loading">Loading pipeline...</div>

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>Sales Pipeline</h1>
          <FeatureGuide
            title="Pipeline"
            description="Track your sales deals through a visual kanban board. Create deals, move through stages, and monitor expected premiums and close probabilities."
            steps={[
              { text: 'Click "+ New Deal" to create a pipeline opportunity.' },
              { text: 'Select client, product, set premium, probability, and close date.' },
              { text: 'The deal appears in the selected stage column.' },
              { text: 'Click any deal card to expand it and see stage transition buttons.' },
              { text: 'Click a stage button (e.g. → Proposal) to move the deal forward.' },
              { text: 'Track the summary bar for total deals and weighted pipeline value.' },
            ]}
            tips={[
              'Keep probability % updated — it feeds into weighted pipeline value.',
              'If a deal stalls, check AI Hub for objection handling scripts.',
            ]}
            aiCommands={['add deal', 'pipeline', 'pipeline insights']}
          />
          {summary && <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{summary.total_deals} deals · {fmt(summary.total_value)} MMK total · {fmt(summary.weighted_value)} MMK weighted</p>}
        </div>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> New Deal</button>
        </div>
      </div>

      <div className="pipeline-board">
        {activeStages.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage)
          const stageTotal = stageDeals.reduce((s, d) => s + d.expected_premium, 0)
          return (
            <div className="pipeline-column" key={stage}>
              <div className="pipeline-column-header">
                <div>
                  <div className="pipeline-column-title" style={{ color: STAGE_COLORS[stage] }}>{STAGE_LABELS[stage]}</div>
                  {stageTotal > 0 && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{fmt(stageTotal)} MMK</div>}
                </div>
                <span className="pipeline-column-count">{stageDeals.length}</span>
              </div>
              {stageDeals.length === 0 ? (
                <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>No deals</div>
              ) : (
                stageDeals.map(deal => (
                  <div className="pipeline-card" key={deal.id}
                    onClick={() => setExpandedDeal(expandedDeal === deal.id ? null : deal.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="pipeline-card-title">{deal.product_name}</div>
                      {expandedDeal === deal.id ? <ChevronDown size={14} color="var(--gray-400)" /> : <ChevronRight size={14} color="var(--gray-400)" />}
                    </div>
                    <div className="pipeline-card-client"><User size={11} style={{ marginRight: 3, verticalAlign: '-1px' }} />{deal.client_name || 'Unknown'}</div>
                    <div className="pipeline-card-footer">
                      <span className="pipeline-card-amount">{fmt(deal.expected_premium)}</span>
                      <span className="pipeline-card-prob"><TrendingUp size={10} style={{ marginRight: 2, verticalAlign: '-1px' }} />{deal.probability}%</span>
                    </div>
                    {deal.expected_close_date && (
                      <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={10} /> Close: {new Date(deal.expected_close_date).toLocaleDateString()}
                      </div>
                    )}
                    {expandedDeal === deal.id && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-card)' }} onClick={e => e.stopPropagation()}>
                        {deal.notes && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 8, lineHeight: 1.4 }}>{deal.notes}</div>}
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Move to stage:</div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {STAGES.filter(s => s !== stage && s !== 'closed_lost').map(s => (
                            <button key={s} className="btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => moveStage(deal, s)}>
                              → {STAGE_LABELS[s]}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                          <button className="btn-ghost btn-sm" style={{ fontSize: 10, padding: '2px 6px', color: 'var(--aia-red)' }} onClick={() => handleDelete(deal.id)}>
                            <Trash2 size={10} /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>New Deal</h2>
              <button className="btn-ghost" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Client *</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Product *</label>
                <select value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })}>
                  <option value="">Select product</option>
                  {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Expected Premium (MMK) *</label><input type="number" value={form.expected_premium} onChange={e => setForm({ ...form, expected_premium: e.target.value })} /></div>
              <div className="form-group"><label>Probability (%)</label><input type="number" min="0" max="100" value={form.probability} onChange={e => setForm({ ...form, probability: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Stage</label>
                <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                  {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Expected Close Date</label><input type="date" value={form.expected_close_date} onChange={e => setForm({ ...form, expected_close_date: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Notes</label><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={!form.client_id || !form.product_name || !form.expected_premium || saving} onClick={handleSave}>{saving ? 'Saving...' : 'Create Deal'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

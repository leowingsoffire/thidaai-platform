import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, WorkflowTask, WorkflowInstance } from '../api'
import { ChevronDown, ChevronRight } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', in_progress: '#3b82f6', completed: '#10b981', cancelled: '#6b7280',
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', normal: '#3b82f6', low: '#6b7280',
}

export default function WorkflowTasks() {
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [instances, setInstances] = useState<WorkflowInstance[]>([])
  const [view, setView] = useState<'tasks' | 'instances'>('tasks')
  const [loading, setLoading] = useState(true)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [expandedInstance, setExpandedInstance] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [t, i] = await Promise.all([api.getMyTasks(), api.getWorkflowInstances()])
      setTasks(t)
      setInstances(i)
    } catch { } finally { setLoading(false) }
  }

  if (loading) return <div className="page"><p>Loading workflows…</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <h1>Workflow Engine</h1>
        <div className="btn-group">
          <button className={`btn ${view === 'tasks' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('tasks')}>My Tasks ({tasks.length})</button>
          <button className={`btn ${view === 'instances' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setView('instances')}>All Instances ({instances.length})</button>
        </div>
      </div>

      {view === 'tasks' ? (
        tasks.length === 0 ? <div className="empty-state"><p>No pending tasks</p></div> : (
          <div className="card-grid">
            {tasks.map(t => {
              const entityRoute = t.workflow_type === 'policy_issuance' ? '/policies'
                : t.workflow_type === 'claim_processing' ? '/claims'
                : t.workflow_type === 'underwriting_assessment' ? '/underwriting' : null
              return (
              <div key={t.id} className="card" onClick={() => setExpandedTask(expandedTask === t.id ? null : t.id)} style={{ cursor: 'pointer' }}>
                <div className="card-header">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{t.title} {expandedTask === t.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</h3>
                  <span className="badge" style={{ backgroundColor: PRIORITY_COLORS[t.priority] || '#6b7280' }}>{t.priority}</span>
                </div>
                <div className="card-body">
                  <div className="detail-row"><span>Status</span><span className="badge" style={{ backgroundColor: STATUS_COLORS[t.status] || '#6b7280' }}>{t.status}</span></div>
                  <div className="detail-row"><span>Type</span><span>{t.workflow_type || '—'}</span></div>
                  <div className="detail-row"><span>State</span><span>{t.current_state || '—'}</span></div>
                  <div className="detail-row"><span>Role</span><span>{t.assigned_role || '—'}</span></div>
                  {t.due_date && <div className="detail-row"><span>Due</span><span>{new Date(t.due_date).toLocaleDateString()}</span></div>}
                  {expandedTask === t.id && entityRoute && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-card)' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => navigate(entityRoute)}>View {t.workflow_type?.replace(/_/g, ' ')} →</button>
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Workflow</th><th>Entity</th><th>State</th><th>Priority</th><th>SLA</th><th>Started</th>
              </tr>
            </thead>
            <tbody>
              {instances.map(i => {
                const iRoute = i.entity_type === 'policy' ? '/policies'
                  : i.entity_type === 'claim' ? '/claims'
                  : i.entity_type === 'underwriting_case' ? '/underwriting' : null
                return (
                <tr key={i.id} onClick={() => iRoute && navigate(iRoute)} style={{ cursor: iRoute ? 'pointer' : 'default' }}>
                  <td><strong>{i.definition_name || i.definition_id}</strong></td>
                  <td>{i.entity_type} / {i.entity_id?.substring(0, 8)}…</td>
                  <td><span className="badge" style={{ backgroundColor: '#3b82f6' }}>{i.current_state}</span></td>
                  <td><span className="badge" style={{ backgroundColor: PRIORITY_COLORS[i.priority] }}>{i.priority}</span></td>
                  <td>
                    {i.is_escalated && <span className="badge" style={{ backgroundColor: '#ef4444' }}>ESCALATED</span>}
                    {i.sla_deadline ? new Date(i.sla_deadline).toLocaleString() : '—'}
                  </td>
                  <td>{new Date(i.created_at).toLocaleDateString()}</td>
                </tr>
                )
              })}
              {instances.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center' }}>No workflow instances</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type DashboardData } from '../api'
import {
  Users, ShieldCheck, DollarSign, Layers, CalendarCheck, Target,
  TrendingUp, Lightbulb, Gift, Trophy, BarChart3, ArrowUpRight,
  Clock, Zap, Activity, ArrowUp, ArrowDown, Minus, Award,
  PieChart as PieChartIcon, Sparkles, Star, ChevronRight
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, ComposedChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart
} from 'recharts'

/* ─── Constants ─── */
const ACTIVITY_ICONS: Record<string, string> = { call: '📞', meeting: '🤝', follow_up: '📋', presentation: '📊', referral: '👥' }
const PRODUCT_LABELS: Record<string, string> = {
  life: 'Universal Life', health: 'Health Shield', investment: 'Endowment',
  education: 'Education', critical_illness: 'Critical Illness', cancer_care: 'Cancer Care',
}
const PRODUCT_COLORS: Record<string, string> = {
  life: '#ec4899', health: '#10b981', investment: '#3b82f6',
  education: '#7c5cfc', critical_illness: '#f97316', cancer_care: '#f59e0b',
}
const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead', contacted: 'Contacted', proposal_sent: 'Proposal',
  negotiation: 'Negotiation', closing: 'Closing',
}
const STAGE_COLORS: Record<string, string> = {
  lead: '#9ca3af', contacted: '#3b82f6', proposal_sent: '#7c5cfc',
  negotiation: '#f59e0b', closing: '#10b981',
}
const REC_ICONS: Record<string, any> = {
  trophy: Trophy, calendar: CalendarCheck, target: Target, users: Users, lightbulb: Lightbulb,
}
const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })
const fmtK = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(0) + 'K' : n.toString()

/* ─── Custom Tooltip ─── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="db-tooltip">
      {label && <div className="db-tooltip-label">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="db-tooltip-row">
          <span className="db-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name}:</span>
          <strong>{typeof p.value === 'number' ? fmt(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

/* ─── Mini Sparkline ─── */
function Sparkline({ data, color, height = 32 }: { data: number[], color: string, height?: number }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 80
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')
  return (
    <svg width={w} height={height} className="db-sparkline">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${w},${height}`}
        fill={`url(#spark-${color.replace('#', '')})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getDashboard().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="loading" style={{ height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="db-loading-spinner" />
        <div style={{ marginTop: 16, color: 'var(--text-muted)' }}>Loading analytics...</div>
      </div>
    </div>
  )
  if (!data) return <div className="alert alert-error">Failed to load dashboard data</div>

  const totalProductPremium = Object.values(data.product_breakdown).reduce((s, p) => s + p.premium, 0)
  const totalProductCount = Object.values(data.product_breakdown).reduce((s, p) => s + p.count, 0)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  /* ── Chart data ── */
  const pieData = Object.entries(data.product_breakdown).map(([key, val]) => ({
    name: PRODUCT_LABELS[key] || key,
    value: val.premium,
    count: val.count,
    color: PRODUCT_COLORS[key] || '#9ca3af',
  }))

  const pipelineBarData = (data.daily_pipeline || []).map(s => ({
    stage: STAGE_LABELS[s.stage] || s.stage,
    count: s.count,
    value: s.deals.reduce((sum, d) => sum + d.expected_premium, 0),
    fill: STAGE_COLORS[s.stage] || '#7c7490',
  }))

  const revenueAreaData = (data.revenue_tracker || []).map(m => ({
    month: m.month,
    premium: m.premium,
    commission: m.commission,
  }))

  const conversionRate = data.pipeline_deals > 0
    ? Math.round((data.active_policies / Math.max(data.pipeline_deals + data.active_policies, 1)) * 100)
    : 0

  const mdrtPct = Math.min(data.mdrt_progress_pct, 100)

  // Radar data for performance breakdown
  const radarData = [
    { metric: 'Clients', value: Math.min((data.total_clients / 50) * 100, 100), fullMark: 100 },
    { metric: 'Policies', value: Math.min((data.active_policies / 40) * 100, 100), fullMark: 100 },
    { metric: 'Pipeline', value: Math.min((data.pipeline_deals / 20) * 100, 100), fullMark: 100 },
    { metric: 'MDRT', value: mdrtPct, fullMark: 100 },
    { metric: 'Activity', value: Math.min((data.activities_week / 15) * 100, 100), fullMark: 100 },
    { metric: 'Revenue', value: Math.min((data.total_earned / 500000) * 100, 100), fullMark: 100 },
  ]

  // Sparkline data from revenue tracker
  const premiumSpark = revenueAreaData.map(r => r.premium)
  const commissionSpark = revenueAreaData.map(r => r.commission)

  return (
    <div className="db">
      {/* ══════════════════════════════════════════════════════ */}
      {/* WELCOME HEADER                                        */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="db-hero">
        <div className="db-hero-left">
          <h1 className="db-hero-title">Hello, {user.full_name?.split(' ')[0] || 'User'}</h1>
          <p className="db-hero-sub">This is your Dashboard</p>
        </div>
        <div className="db-hero-right">
          {(data.pending_approvals ?? 0) > 0 && (
            <button className="db-chip" onClick={() => navigate('/approvals')}>
              <Clock size={14} /> {data.pending_approvals} Pending Approvals
            </button>
          )}
          {(data.upcoming_greetings ?? 0) > 0 && (
            <button className="db-chip accent" onClick={() => navigate('/ai-hub')}>
              <Gift size={14} /> {data.upcoming_greetings} Upcoming Birthdays
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ROW 1: Revenue Chart + Radar                          */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="db-grid-row db-grid-70-30">
        {/* Revenue Composed Chart */}
        <div className="db-card">
          <div className="db-card-head">
            <h3><BarChart3 size={16} className="db-head-icon green" /> Yearly Revenues</h3>
            <div className="db-chart-legend-inline">
              <span><i style={{ background: '#7c5cfc' }} />Premium</span>
              <span><i style={{ background: '#10b981' }} />Commission</span>
              <span><i style={{ background: '#ec4899' }} />Growth</span>
            </div>
          </div>
          {revenueAreaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={revenueAreaData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#6242e0" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#7b7f95', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7b7f95', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="premium" name="Premium" fill="url(#barGrad1)" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="commission" name="Commission" fill="url(#barGrad2)" radius={[4, 4, 0, 0]} barSize={18} />
                <Line type="monotone" dataKey="premium" name="Growth" stroke="#ec4899" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#ec4899', stroke: '#fff', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="db-empty"><BarChart3 size={36} /><span>Revenue data will appear as you add policies</span></div>
          )}
        </div>

        {/* Radar: Performance */}
        <div className="db-card">
          <h3 className="db-card-title"><Award size={16} className="db-head-icon violet" /> Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid stroke="#eef0f6" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#7b7f95', fontSize: 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar name="Score" dataKey="value" stroke="#7c5cfc" fill="#7c5cfc" fillOpacity={0.15} strokeWidth={2} />
              <Tooltip content={<ChartTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ROW 2: KPI Stat Cards with sparklines                 */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="db-stat-row">
        {[
          { label: 'Total Clients', value: fmt(data.total_clients), change: `+${data.new_clients_month}`, pct: data.total_clients > 0 ? Math.round((data.new_clients_month / data.total_clients) * 100) : 0, color: '#ec4899', icon: Users, spark: premiumSpark, up: data.new_clients_month > 0, nav: '/clients' },
          { label: 'Active Policies', value: fmt(data.active_policies), change: `+${data.new_policies_month}`, pct: data.active_policies > 0 ? Math.round((data.new_policies_month / data.active_policies) * 100) : 0, color: '#10b981', icon: ShieldCheck, spark: commissionSpark, up: data.new_policies_month > 0, nav: '/policies' },
          { label: 'Pipeline Value', value: fmtK(data.pipeline_value), change: `${data.pipeline_deals} deals`, pct: conversionRate, color: '#3b82f6', icon: Layers, spark: premiumSpark, up: true, nav: '/pipeline' },
          { label: 'Commission', value: fmtK(data.total_earned), change: `${fmtK(data.pending_commission)} pending`, pct: data.total_earned > 0 ? Math.round((data.pending_commission / data.total_earned) * 100) : 0, color: '#f59e0b', icon: DollarSign, spark: commissionSpark, up: data.total_earned > 0, nav: '/commissions' },
        ].map((kpi, i) => (
          <div key={i} className="db-stat" onClick={() => navigate(kpi.nav)} style={{ '--stat-accent': kpi.color } as any}>
            <div className="db-stat-left-bar" />
            <div className="db-stat-body">
              <div className="db-stat-label">{kpi.label}</div>
              <div className="db-stat-row-inner">
                <span className="db-stat-value">{kpi.value}</span>
                <span className={`db-stat-change ${kpi.up ? 'up' : 'down'}`}>
                  {kpi.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {kpi.change}
                </span>
                <span className="db-stat-pct" style={{ borderColor: kpi.color, color: kpi.color }}>{kpi.pct}%</span>
              </div>
            </div>
            <div className="db-stat-spark">
              <Sparkline data={kpi.spark.length > 1 ? kpi.spark : [0, 10, 5, 15, 8, 20]} color={kpi.color} />
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ROW 3: Statistics Line + MDRT Donut                   */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="db-grid-row db-grid-70-30">
        {/* Statistics area chart */}
        <div className="db-card">
          <div className="db-card-head">
            <h3><Activity size={16} className="db-head-icon blue" /> Statistics</h3>
            <div className="db-card-tabs">
              <span className="db-tab active">Year</span>
              <span className="db-tab">Month</span>
            </div>
          </div>
          {revenueAreaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueAreaData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaFillBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#7b7f95', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7b7f95', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="premium" name="Revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#areaFillBlue)" dot={false} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="db-empty"><Activity size={36} /><span>Statistics will appear with more data</span></div>
          )}
        </div>

        {/* MDRT Donut with % */}
        <div className="db-card db-card-center">
          <h3 className="db-card-title"><Target size={16} className="db-head-icon gold" /> MDRT Progress</h3>
          <div className="db-donut-wrap">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Achieved', value: mdrtPct },
                    { name: 'Remaining', value: 100 - mdrtPct },
                  ]}
                  dataKey="value" cx="50%" cy="50%"
                  innerRadius={60} outerRadius={80}
                  startAngle={90} endAngle={-270}
                  strokeWidth={0} paddingAngle={2}
                >
                  <Cell fill="url(#mdrtGrad)" />
                  <Cell fill="#eef0f6" />
                </Pie>
                <defs>
                  <linearGradient id="mdrtGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </PieChart>
            </ResponsiveContainer>
            <div className="db-donut-center">
              <span className="db-donut-pct">{mdrtPct}%</span>
            </div>
          </div>
          {data.mdrt_data && (
            <div className="db-donut-meta">
              <div><span>Premium</span><strong>{fmtK(data.mdrt_data.achieved_premium)} / {fmtK(data.mdrt_data.target_premium)}</strong></div>
              <div><span>Cases</span><strong>{data.mdrt_data.achieved_cases} / {data.mdrt_data.target_cases}</strong></div>
            </div>
          )}
          <button className="db-link-btn" onClick={() => navigate('/mdrt')}>View MDRT Tracker <ArrowUpRight size={14} /></button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MILESTONE BANNER                                      */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="db-milestone">
        <div className="db-milestone-icon"><Sparkles size={28} /></div>
        <div className="db-milestone-body">
          <h3>Keep Going, {user.full_name?.split(' ')[0] || 'User'}!</h3>
          <p>You've achieved <strong>{mdrtPct}%</strong> of your MDRT target with <strong>{data.active_policies}</strong> active policies.
            {mdrtPct >= 75 ? ' Almost there — push for MDRT qualification!' :
              mdrtPct >= 50 ? ' Great progress — you\'re past the halfway mark!' :
                ' Every policy counts — keep building momentum!'}
          </p>
        </div>
        <button className="db-milestone-btn" onClick={() => navigate('/mdrt')}>View Details</button>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ROW 4: Pipeline Funnel + Product Pie + Activity       */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="db-grid-row db-grid-thirds">
        {/* Pipeline */}
        <div className="db-card">
          <div className="db-card-head">
            <h3><TrendingUp size={16} className="db-head-icon blue" /> Pipeline Funnel</h3>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/pipeline')}>View <ArrowUpRight size={12} /></button>
          </div>
          {pipelineBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pipelineBarData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" vertical={false} />
                <XAxis dataKey="stage" tick={{ fill: '#7b7f95', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7b7f95', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Deals" radius={[6, 6, 0, 0]}>
                  {pipelineBarData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="db-empty"><Layers size={32} /><span>No pipeline data</span></div>
          )}
        </div>

        {/* Product Distribution Donut */}
        <div className="db-card db-card-center">
          <h3 className="db-card-title"><PieChartIcon size={16} className="db-head-icon rose" /> Product Mix</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="db-pie-list">
                {pieData.map((p, i) => (
                  <div key={i} className="db-pie-row">
                    <span className="db-pie-dot" style={{ background: p.color }} />
                    <span className="db-pie-name">{p.name}</span>
                    <span className="db-pie-val">{p.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="db-empty"><PieChartIcon size={32} /><span>Add policies to see breakdown</span></div>
          )}
        </div>

        {/* Activity Summary */}
        <div className="db-card">
          <div className="db-card-head">
            <h3><CalendarCheck size={16} className="db-head-icon violet" /> Activity</h3>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/activities')}>All <ArrowUpRight size={12} /></button>
          </div>
          <div className="db-activity-stats">
            {[
              { val: data.activities_today, label: 'Today', color: '#3b82f6' },
              { val: data.activities_week, label: 'This Week', color: '#7c5cfc' },
              { val: data.activities_completed, label: 'Done', color: '#10b981' },
            ].map((a, i) => (
              <div key={i} className="db-act-num" style={{ '--act-color': a.color } as any}>
                <span className="db-act-val">{a.val}</span>
                <span className="db-act-label">{a.label}</span>
              </div>
            ))}
          </div>
          <div className="db-conv-box">
            <div className="db-conv-head">
              <span>Conversion Rate</span>
              <strong style={{ color: '#059669' }}>{conversionRate}%</strong>
            </div>
            <div className="progress-bar" style={{ height: 6 }}>
              <div className="progress-fill green" style={{ width: `${conversionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* AI RECOMMENDATIONS                                    */}
      {/* ══════════════════════════════════════════════════════ */}
      {data.ai_recommendations && data.ai_recommendations.length > 0 && (
        <div className="db-card db-ai-section">
          <div className="db-card-head">
            <h3><Zap size={16} className="db-head-icon gold" /> AI Insights &amp; Recommendations</h3>
            <span className="badge badge-purple">AI Powered</span>
          </div>
          <div className="db-ai-grid">
            {data.ai_recommendations.map((rec, i) => {
              const Icon = REC_ICONS[rec.icon] || Lightbulb
              const pColor = rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#f59e0b' : '#10b981'
              return (
                <div key={i} className="db-ai-item" onClick={() => navigate('/approvals')} style={{ cursor: 'pointer' }}>
                  <div className="db-ai-item-icon" style={{ background: `${pColor}15`, color: pColor }}>
                    <Icon size={18} />
                  </div>
                  <div className="db-ai-item-body">
                    <div className="db-ai-item-title">{rec.title}</div>
                    <div className="db-ai-item-desc">{rec.description}</div>
                  </div>
                  <span className={`badge badge-${rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'yellow' : 'green'}`}>
                    {rec.priority}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* ROW 5: Recent Activity Table + Performance Metrics    */}
      {/* ══════════════════════════════════════════════════════ */}
      <div className="db-grid-row db-grid-60-40">
        <div className="db-card">
          <div className="db-card-head">
            <h3><Activity size={16} className="db-head-icon rose" /> Recent Activity</h3>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/activities')}>View all <ArrowUpRight size={12} /></button>
          </div>
          {data.recent_activities.length === 0 ? (
            <div className="db-empty"><Activity size={32} /><span>Start logging activities to see them here</span></div>
          ) : (
            <div className="db-table-wrap">
              <table className="db-mini-table">
                <thead>
                  <tr>
                    <th>Activity</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_activities.slice(0, 5).map(a => (
                    <tr key={a.id} onClick={() => navigate('/activities')} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="db-tbl-cell">
                          <span className="db-tbl-icon">{ACTIVITY_ICONS[a.activity_type] || '📌'}</span>
                          {a.title}
                        </div>
                      </td>
                      <td>{a.client_name || '—'}</td>
                      <td>{a.scheduled_date ? new Date(a.scheduled_date).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={`badge badge-${a.status === 'completed' ? 'green' : a.status === 'planned' ? 'blue' : 'gray'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td><ChevronRight size={14} style={{ color: 'var(--text-dim)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="db-card">
          <h3 className="db-card-title"><Star size={16} className="db-head-icon gold" /> Quick Metrics</h3>
          <div className="db-metrics-list">
            {[
              { label: 'Avg Policy Premium', value: data.active_policies > 0 ? fmtK(Math.round(data.total_premium / data.active_policies)) : '0', unit: 'MMK', color: '#7c5cfc', route: '/policies' },
              { label: 'Monthly Revenue', value: fmtK(data.monthly_premium), unit: 'MMK', color: '#3b82f6', route: '/commissions' },
              { label: 'Pending Payout', value: fmtK(data.pending_commission), unit: 'MMK', color: '#f59e0b', route: '/commissions' },
              { label: 'New Clients', value: data.new_clients_month.toString(), unit: 'this month', color: '#ec4899', route: '/clients' },
              { label: 'New Policies', value: data.new_policies_month.toString(), unit: 'this month', color: '#10b981', route: '/policies' },
              { label: 'Pipeline Deals', value: data.pipeline_deals.toString(), unit: 'active', color: '#f97316', route: '/pipeline' },
            ].map((m, i) => (
              <div key={i} className="db-metric-row" onClick={() => navigate(m.route)} style={{ cursor: 'pointer' }}>
                <span className="db-metric-dot" style={{ background: m.color }} />
                <span className="db-metric-label">{m.label}</span>
                <span className="db-metric-val" style={{ color: m.color }}>{m.value}</span>
                <span className="db-metric-unit">{m.unit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="db-footer">
        POWERED BY: KO | WorkWell Framework | MDRT Standards &nbsp;·&nbsp; FOR: Thida Soe | thidasoe@aia.com.mm
      </div>
    </div>
  )
}

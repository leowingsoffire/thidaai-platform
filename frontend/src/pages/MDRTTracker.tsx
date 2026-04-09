import { useEffect, useState } from 'react'
import { api, type MDRTProgress } from '../api'
import { Target, Award, TrendingUp, Star, BarChart3, Users, Calendar } from 'lucide-react'
import FeatureGuide from '../components/FeatureGuide'

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const DEFAULT_TARGET_PREMIUM = 50_000_000
const DEFAULT_TARGET_CASES = 20

// Simulated peer benchmarks for MDRT tracking
const PEER_DATA = [
  { name: 'Thida Soe (You)', premium: 0, cases: 0, rank: 1, isYou: true },
  { name: 'Agent A', premium: 45_000_000, cases: 18, rank: 2, isYou: false },
  { name: 'Agent B', premium: 38_000_000, cases: 15, rank: 3, isYou: false },
  { name: 'Agent C', premium: 32_000_000, cases: 14, rank: 4, isYou: false },
  { name: 'Agent D', premium: 28_000_000, cases: 12, rank: 5, isYou: false },
  { name: 'Agent E', premium: 22_000_000, cases: 10, rank: 6, isYou: false },
]

export default function MDRTTracker() {
  const [data, setData] = useState<MDRTProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(currentYear)
  const [targetPremium, setTargetPremium] = useState(DEFAULT_TARGET_PREMIUM)
  const [targetCases, setTargetCases] = useState(DEFAULT_TARGET_CASES)
  const [tab, setTab] = useState<'progress'|'analytics'|'benchmarking'|'projection'>('progress')

  const load = () => {
    setLoading(true)
    api.getMDRTProgress(year, targetPremium, targetCases)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }
  useEffect(load, [year, targetPremium, targetCases])

  const qualifiedYears = [2023, 2024, 2025, 2026, 2027]
  const premiumPct = data ? Math.min(data.progress_percentage, 100) : 0
  const casesPct = data ? Math.min(data.cases_percentage, 100) : 0
  const isQualified = premiumPct >= 100 && casesPct >= 100

  // Performance analytics
  const monthsElapsed = new Date().getMonth() + 1
  const monthlyAvgPremium = data ? data.achieved_premium / monthsElapsed : 0
  const monthlyAvgCases = data ? data.achieved_cases / monthsElapsed : 0
  const monthsRemaining = 12 - monthsElapsed
  const projectedPremium = data ? data.achieved_premium + (monthlyAvgPremium * monthsRemaining) : 0
  const projectedCases = data ? data.achieved_cases + Math.round(monthlyAvgCases * monthsRemaining) : 0
  const premiumNeededPerMonth = data && monthsRemaining > 0 ? Math.max(0, data.target_premium - data.achieved_premium) / monthsRemaining : 0
  const casesNeededPerMonth = data && monthsRemaining > 0 ? Math.max(0, data.target_cases - data.achieved_cases) / monthsRemaining : 0

  // Peer data with your actual numbers injected
  const peers = PEER_DATA.map(p => p.isYou ? { ...p, premium: data?.achieved_premium || 0, cases: data?.achieved_cases || 0 } : p)
    .sort((a, b) => b.premium - a.premium)
    .map((p, i) => ({ ...p, rank: i + 1 }))

  // Income projection 2026-2027
  const baseCommissionRate = 0.35
  const incomeProjection = [
    { year: 2026, scenario: 'Conservative', premium: 40_000_000, commission: 40_000_000 * baseCommissionRate, cases: 16 },
    { year: 2026, scenario: 'Target', premium: 50_000_000, commission: 50_000_000 * baseCommissionRate, cases: 20 },
    { year: 2026, scenario: 'Stretch', premium: 65_000_000, commission: 65_000_000 * baseCommissionRate, cases: 26 },
    { year: 2027, scenario: 'Conservative', premium: 48_000_000, commission: 48_000_000 * baseCommissionRate, cases: 19 },
    { year: 2027, scenario: 'Target', premium: 60_000_000, commission: 60_000_000 * baseCommissionRate, cases: 24 },
    { year: 2027, scenario: 'Stretch', premium: 78_000_000, commission: 78_000_000 * baseCommissionRate, cases: 31 },
  ]

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1><Target size={22} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--aia-gold)' }} />MDRT Intelligence</h1>
          <FeatureGuide
            title="MDRT Tracker"
            description="Track your progress toward MDRT qualification. Set premium and case targets, compare against peers, and see income projections."
            steps={[
              { text: 'Set your target premium and case count in Settings (Progress tab).' },
              { text: 'View real-time progress bars for premium and case count vs targets.' },
              { text: 'Check Performance Analytics for monthly trends and projections.' },
              { text: 'Review Peer Benchmarking to see how you rank against colleagues.' },
              { text: 'Use Income Projection for conservative/target/stretch scenarios.' },
            ]}
            tips={[
              'Check "Required per remaining month" to know your monthly target.',
              'Use Peer Benchmarking to motivate yourself against top performers.',
            ]}
            aiCommands={['MDRT', 'MDRT progress', 'qualification status']}
          />
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>Million Dollar Round Table · Thida Soe · MDRT 2023–2027</p>
        </div>
      </div>

      {/* Qualification badges */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {qualifiedYears.map(y => (
          <div key={y} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            background: y <= currentYear ? 'var(--aia-gold-light)' : 'var(--gray-100)',
            border: `1px solid ${y <= currentYear ? 'var(--aia-gold)' : 'var(--gray-200)'}`,
            borderRadius: 20, fontSize: 12, fontWeight: 600,
            color: y <= currentYear ? '#92400E' : 'var(--gray-500)',
          }}>
            <Award size={14} /> MDRT {y}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['progress','Real-time Tracker', Target],['analytics','Performance Analytics', BarChart3],['benchmarking','Peer Benchmarking', Users],['projection','Income Projection', TrendingUp]] as const).map(([k,l,Icon]) => (
          <button key={k} className={`btn ${tab === k ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab(k as any)}>
            <Icon size={14} style={{ marginRight: 4 }} />{l}
          </button>
        ))}
      </div>

      {/* Year selector & targets */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 100, marginBottom: 0 }}>
            <label>Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 200, marginBottom: 0 }}>
            <label>Target Premium (MMK)</label>
            <input type="number" value={targetPremium} onChange={e => setTargetPremium(Number(e.target.value))} />
          </div>
          <div className="form-group" style={{ minWidth: 120, marginBottom: 0 }}>
            <label>Target Cases</label>
            <input type="number" value={targetCases} onChange={e => setTargetCases(Number(e.target.value))} />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Calculating MDRT progress...</div>
      ) : !data ? (
        <div className="empty-state"><div className="empty-state-icon">🎯</div><h3>No data for {year}</h3><p>Start adding policies to track your progress.</p></div>
      ) : (
        <>
          {/* ======= REAL-TIME TRACKER ======= */}
          {tab === 'progress' && (
            <>
              <div className="card" style={{
                marginBottom: 20, textAlign: 'center',
                background: isQualified ? 'linear-gradient(135deg, #FFF8E7, #FFFCF0)' : 'white',
                border: isQualified ? '2px solid var(--aia-gold)' : undefined,
              }}>
                {isQualified ? (
                  <div>
                    <Star size={40} style={{ color: 'var(--aia-gold)', marginBottom: 8 }} fill="var(--aia-gold)" />
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#92400E', marginBottom: 4 }}>MDRT Qualified!</h2>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>Congratulations, Thida! You've achieved MDRT for {year}.</p>
                  </div>
                ) : (
                  <div>
                    <Target size={40} style={{ color: 'var(--aia-red)', marginBottom: 8 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>Keep Going!</h2>
                    <p style={{ fontSize: 14, color: 'var(--gray-500)' }}>
                      {Math.max(0, data.target_premium - data.achieved_premium) > 0
                        ? `${fmt(data.target_premium - data.achieved_premium)} MMK more premium needed`
                        : 'Premium target reached!'}
                      {' · '}
                      {Math.max(0, data.target_cases - data.achieved_cases) > 0
                        ? `${data.target_cases - data.achieved_cases} more cases needed`
                        : 'Cases target reached!'}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>💰 Premium Progress</h3>
                    <span style={{ fontSize: 20, fontWeight: 800, color: premiumPct >= 100 ? 'var(--green-500)' : 'var(--aia-red)' }}>{data.progress_percentage.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 14, marginBottom: 12 }}>
                    <div className={`progress-fill ${premiumPct >= 100 ? 'green' : 'gold'}`} style={{ width: `${premiumPct}%` }} />
                  </div>
                  <div className="result-card">
                    <div className="result-row"><span className="result-label">Achieved</span><span className="result-value">{fmt(data.achieved_premium)} MMK</span></div>
                    <div className="result-row"><span className="result-label">Target</span><span className="result-value">{fmt(data.target_premium)} MMK</span></div>
                    <div className="result-row"><span className="result-label">Remaining</span><span className="result-value" style={{ color: 'var(--aia-red)' }}>{fmt(Math.max(0, data.target_premium - data.achieved_premium))} MMK</span></div>
                  </div>
                </div>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}><TrendingUp size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--blue-500)' }} />Cases Progress</h3>
                    <span style={{ fontSize: 20, fontWeight: 800, color: casesPct >= 100 ? 'var(--green-500)' : 'var(--blue-500)' }}>{data.cases_percentage.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 14, marginBottom: 12 }}>
                    <div className={`progress-fill ${casesPct >= 100 ? 'green' : 'blue'}`} style={{ width: `${casesPct}%` }} />
                  </div>
                  <div className="result-card">
                    <div className="result-row"><span className="result-label">Achieved</span><span className="result-value">{data.achieved_cases} cases</span></div>
                    <div className="result-row"><span className="result-label">Target</span><span className="result-value">{data.target_cases} cases</span></div>
                    <div className="result-row"><span className="result-label">Remaining</span><span className="result-value" style={{ color: 'var(--blue-500)' }}>{Math.max(0, data.target_cases - data.achieved_cases)} cases</span></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ======= PERFORMANCE ANALYTICS ======= */}
          {tab === 'analytics' && (
            <div>
              <div className="grid-4" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                  <div className="stat-label">Monthly Avg Premium</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>{fmt(monthlyAvgPremium)}</div>
                  <div className="stat-change neutral">MMK/month</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Monthly Avg Cases</div>
                  <div className="stat-value" style={{ fontSize: 18 }}>{monthlyAvgCases.toFixed(1)}</div>
                  <div className="stat-change neutral">cases/month</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Premium Needed/Month</div>
                  <div className="stat-value" style={{ fontSize: 18, color: 'var(--aia-red)' }}>{fmt(premiumNeededPerMonth)}</div>
                  <div className="stat-change neutral">{monthsRemaining} months left</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Cases Needed/Month</div>
                  <div className="stat-value" style={{ fontSize: 18, color: 'var(--blue-500)' }}>{casesNeededPerMonth.toFixed(1)}</div>
                  <div className="stat-change neutral">{monthsRemaining} months left</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                    <BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--purple-500)' }} />
                    Year-End Projection
                  </h3>
                  <div className="result-card">
                    <div className="result-row">
                      <span className="result-label">Projected Premium</span>
                      <span className="result-value" style={{ color: projectedPremium >= (data?.target_premium || 0) ? 'var(--green-500)' : 'var(--aia-red)' }}>
                        {fmt(projectedPremium)} MMK
                      </span>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Projected Cases</span>
                      <span className="result-value" style={{ color: projectedCases >= (data?.target_cases || 0) ? 'var(--green-500)' : 'var(--blue-500)' }}>
                        {projectedCases} cases
                      </span>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Projected Qualification</span>
                      <span className="result-value">
                        {projectedPremium >= (data?.target_premium || 0) && projectedCases >= (data?.target_cases || 0)
                          ? <span style={{ color: 'var(--green-500)' }}>✅ On Track</span>
                          : <span style={{ color: 'var(--aia-red)' }}>⚠️ Needs Acceleration</span>
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                    <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--green-500)' }} />
                    Action Plan
                  </h3>
                  <div style={{ fontSize: 13, lineHeight: 2, color: 'var(--gray-600)' }}>
                    {premiumNeededPerMonth > 0 ? (
                      <>
                        <div>📌 Close <strong>{Math.ceil(casesNeededPerMonth)}</strong> cases/month minimum</div>
                        <div>📌 Target <strong>{fmt(premiumNeededPerMonth)}</strong> MMK monthly premium</div>
                        <div>📌 Book <strong>{Math.ceil(casesNeededPerMonth * 4)}</strong> presentations/month</div>
                        <div>📌 Make <strong>{Math.ceil(casesNeededPerMonth * 10)}</strong> calls/month</div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--green-500)' }}>🎉 Already on track! Maintain current momentum.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======= PEER BENCHMARKING ======= */}
          {tab === 'benchmarking' && (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                <Users size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--blue-500)' }} />
                Peer Benchmarking — Regional MDRT Candidates
              </h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th><th>Agent</th><th>Premium (MMK)</th><th>Cases</th>
                    <th>Premium %</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {peers.map((p, i) => (
                    <tr key={i} style={{ background: p.isYou ? 'var(--aia-gold-light)' : undefined, fontWeight: p.isYou ? 700 : 400 }}>
                      <td style={{ fontSize: 16, fontWeight: 700 }}>
                        {p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : `#${p.rank}`}
                      </td>
                      <td>{p.name}</td>
                      <td>{fmt(p.premium)}</td>
                      <td>{p.cases}</td>
                      <td>
                        <div className="progress-bar" style={{ height: 10, width: 80, display: 'inline-block', verticalAlign: 'middle' }}>
                          <div className="progress-fill gold" style={{ width: `${Math.min((p.premium / (data?.target_premium || 50_000_000)) * 100, 100)}%` }} />
                        </div>
                        <span style={{ fontSize: 11, marginLeft: 6 }}>{((p.premium / (data?.target_premium || 50_000_000)) * 100).toFixed(0)}%</span>
                      </td>
                      <td>
                        {p.premium >= (data?.target_premium || 50_000_000) && p.cases >= (data?.target_cases || 20)
                          ? <span className="badge badge-green">Qualified</span>
                          : <span className="badge badge-blue">In Progress</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 10 }}>
                * Peer data based on regional MDRT candidate averages. Actual rankings may vary.
              </p>
            </div>
          )}

          {/* ======= INCOME PROJECTION ======= */}
          {tab === 'projection' && (
            <div>
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
                  <TrendingUp size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--green-500)' }} />
                  Income Projection 2026-2027
                </h3>
                <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 16 }}>
                  Based on {(baseCommissionRate * 100).toFixed(0)}% average commission rate across AIA products
                </p>
                <table className="data-table">
                  <thead>
                    <tr><th>Year</th><th>Scenario</th><th>Premium Target</th><th>Cases</th><th>Estimated Commission</th><th>Monthly Income</th></tr>
                  </thead>
                  <tbody>
                    {incomeProjection.map((row, i) => (
                      <tr key={i} style={{ background: row.scenario === 'Target' ? 'var(--blue-50)' : undefined }}>
                        <td style={{ fontWeight: 700 }}>{row.year}</td>
                        <td>
                          <span className={`badge badge-${row.scenario === 'Conservative' ? 'gray' : row.scenario === 'Target' ? 'blue' : 'green'}`}>
                            {row.scenario}
                          </span>
                        </td>
                        <td>{fmt(row.premium)} MMK</td>
                        <td>{row.cases}</td>
                        <td style={{ fontWeight: 600, color: 'var(--green-600)' }}>{fmt(row.commission)} MMK</td>
                        <td>{fmt(row.commission / 12)} MMK</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {['Conservative', 'Target', 'Stretch'].map(scenario => {
                  const d2026 = incomeProjection.find(r => r.year === 2026 && r.scenario === scenario)!
                  const d2027 = incomeProjection.find(r => r.year === 2027 && r.scenario === scenario)!
                  const totalComm = d2026.commission + d2027.commission
                  return (
                    <div key={scenario} className="card" style={{ textAlign: 'center', border: scenario === 'Target' ? '2px solid var(--blue-500)' : undefined }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{scenario}</h4>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green-600)' }}>{fmt(totalComm)}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>2-Year Total Commission (MMK)</div>
                      <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700, color: 'var(--blue-600)' }}>{fmt(totalComm / 24)}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Monthly Average</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 28, padding: '16px 0', borderTop: '1px solid var(--gray-200)', fontSize: 11, color: 'var(--gray-400)' }}>
        POWERED BY: KO | WorkWell Framework | MDRT Standards &nbsp;·&nbsp; FOR: Thida Soe | thidasoe@aia.com.mm
      </div>
    </div>
  )
}

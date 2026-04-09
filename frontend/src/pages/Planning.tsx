import { useState } from 'react'
import { api, type FinancialPlan } from '../api'
import { Calculator, Umbrella, GraduationCap, Receipt, Heart, Shield, Wallet } from 'lucide-react'
import FeatureGuide from '../components/FeatureGuide'

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })

const SERVICES = [
  { key: 'corporate', icon: Shield, label: 'Corporate Solutions', desc: 'Employee benefits, group life & health for businesses' },
  { key: 'business', icon: Wallet, label: 'Business Insurance', desc: 'Key person, buy-sell agreements, business continuity' },
  { key: 'health', icon: Heart, label: 'Total Health Planning', desc: 'Comprehensive health protection for individuals & families' },
  { key: 'retirement', icon: Umbrella, label: 'Retirement Planning', desc: 'Secure your golden years with guaranteed income' },
  { key: 'education', icon: GraduationCap, label: 'Education Planning', desc: 'Fund your children\'s education dreams' },
  { key: 'tax', icon: Receipt, label: 'Tax Planning', desc: 'Optimize tax benefits through insurance' },
  { key: 'cashflow', icon: Calculator, label: 'Cash Flow Planning', desc: 'Balance protection with financial flexibility' },
]

export default function Planning() {
  const [tab, setTab] = useState<'services' | 'retirement' | 'education' | 'tax' | 'cashflow'>('services')
  const [result, setResult] = useState<FinancialPlan | null>(null)
  const [loading, setLoading] = useState(false)

  // Retirement form
  const [retForm, setRetForm] = useState({ client_id: '', current_age: 35, retirement_age: 60, monthly_expense: 1000000, current_savings: 5000000, inflation_rate: 6 })
  // Education form
  const [eduForm, setEduForm] = useState({ client_id: '', child_age: 5, education_start_age: 18, annual_cost: 10000000, duration_years: 4, inflation_rate: 8 })
  // Tax form
  const [taxForm, setTaxForm] = useState({ client_id: '', annual_income: 20000000, current_deductions: 2000000 })
  // Cash Flow form
  const [cfForm, setCfForm] = useState({ monthly_income: 3000000, monthly_expense: 2000000, monthly_savings: 500000, monthly_insurance: 200000, emergency_fund: 5000000, total_debt: 2000000, total_assets: 50000000 })
  const [cfScore, setCfScore] = useState<any>(null)

  const handleRetirement = async () => { setLoading(true); try { const r = await api.retirementPlan(retForm); setResult(r) } catch {} finally { setLoading(false) } }
  const handleEducation = async () => { setLoading(true); try { const r = await api.educationPlan(eduForm); setResult(r) } catch {} finally { setLoading(false) } }
  const handleTax = async () => { setLoading(true); try { const r = await api.taxPlan(taxForm); setResult(r) } catch {} finally { setLoading(false) } }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>Financial Planning</h1>
          <FeatureGuide
            title="Financial Planning"
            description="Professional financial calculators for client consultations. Calculate retirement needs, education funding, tax optimization, and cash flow health."
            steps={[
              { text: 'Select a calculator tab: Retirement, Education, Tax, or Cash Flow.' },
              { text: 'Enter the client\'s financial parameters.' },
              { text: 'Click Calculate to see results and recommendations.' },
              { text: 'Use results during client meetings to identify coverage gaps.' },
              { text: 'Explore Corporate Solutions for group insurance options.' },
            ]}
            tips={[
              'Run Cash Flow Health Score during meetings — it\'s a powerful visual tool.',
              'Education Calculator shows real costs with inflation factored in.',
            ]}
            aiCommands={['retirement plan', 'education plan', 'cash flow health']}
          />
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
            WorkWell with AIA · LIVE WELL · THINK WELL · FEEL WELL · PLAN WELL
          </p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'services' ? 'active' : ''}`} onClick={() => { setTab('services'); setResult(null) }}>Services</button>
        <button className={`tab ${tab === 'retirement' ? 'active' : ''}`} onClick={() => { setTab('retirement'); setResult(null) }}>Retirement</button>
        <button className={`tab ${tab === 'education' ? 'active' : ''}`} onClick={() => { setTab('education'); setResult(null) }}>Education</button>
        <button className={`tab ${tab === 'tax' ? 'active' : ''}`} onClick={() => { setTab('tax'); setResult(null) }}>Tax</button>
        <button className={`tab ${tab === 'cashflow' ? 'active' : ''}`} onClick={() => { setTab('cashflow'); setResult(null) }}>Cash Flow Score</button>
      </div>

      {tab === 'services' && (
        <div>
          <div style={{ background: 'linear-gradient(135deg, var(--aia-red), var(--aia-red-dark))', borderRadius: 14, padding: '28px 32px', marginBottom: 24, color: 'white' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Insure Another Life Daily</h2>
            <p style={{ fontSize: 14, opacity: 0.9, lineHeight: 1.6 }}>
              As your AIA Certified Life Planner & Corporate Solutions Advisor, I help individuals and businesses achieve healthier, longer, better lives through comprehensive financial security services.
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, opacity: 0.8 }}>
              <span>📞 +95 9 4318 1662</span>
              <span>✉️ thidasoe@aia.com.mm</span>
              <span>🏢 Junction City Tower, 22F</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {SERVICES.map(s => (
              <div className="card" key={s.key} style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                onClick={() => { if (s.key === 'retirement') setTab('retirement'); else if (s.key === 'education') setTab('education'); else if (s.key === 'tax') setTab('tax'); else if (s.key === 'cashflow') setTab('cashflow') }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div className={`stat-icon ${s.key === 'health' ? 'red' : s.key === 'retirement' ? 'blue' : s.key === 'education' ? 'purple' : s.key === 'tax' ? 'green' : s.key === 'corporate' ? 'orange' : 'yellow'}`}>
                    <s.icon size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4 }}>{s.label}</h3>
                    <p style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.5 }}>{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'retirement' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}><Umbrella size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--blue-500)' }} />Retirement Calculator</h3>
            <div className="form-row">
              <div className="form-group"><label>Current Age</label><input type="number" value={retForm.current_age} onChange={e => setRetForm({ ...retForm, current_age: +e.target.value })} /></div>
              <div className="form-group"><label>Retirement Age</label><input type="number" value={retForm.retirement_age} onChange={e => setRetForm({ ...retForm, retirement_age: +e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Monthly Expense (MMK)</label><input type="number" value={retForm.monthly_expense} onChange={e => setRetForm({ ...retForm, monthly_expense: +e.target.value })} /></div>
              <div className="form-group"><label>Current Savings (MMK)</label><input type="number" value={retForm.current_savings} onChange={e => setRetForm({ ...retForm, current_savings: +e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Inflation Rate (%)</label><input type="number" value={retForm.inflation_rate} onChange={e => setRetForm({ ...retForm, inflation_rate: +e.target.value })} /></div>
            <div className="modal-actions"><button className="btn-primary" onClick={handleRetirement} disabled={loading}>{loading ? 'Calculating...' : 'Calculate'}</button></div>
          </div>
          <div>{result && result.plan_type === 'retirement' && <ResultCard data={result} />}</div>
        </div>
      )}

      {tab === 'education' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}><GraduationCap size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--purple-500)' }} />Education Calculator</h3>
            <div className="form-row">
              <div className="form-group"><label>Child's Age</label><input type="number" value={eduForm.child_age} onChange={e => setEduForm({ ...eduForm, child_age: +e.target.value })} /></div>
              <div className="form-group"><label>Education Start Age</label><input type="number" value={eduForm.education_start_age} onChange={e => setEduForm({ ...eduForm, education_start_age: +e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Annual Cost (MMK)</label><input type="number" value={eduForm.annual_cost} onChange={e => setEduForm({ ...eduForm, annual_cost: +e.target.value })} /></div>
              <div className="form-group"><label>Duration (Years)</label><input type="number" value={eduForm.duration_years} onChange={e => setEduForm({ ...eduForm, duration_years: +e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Education Inflation (%)</label><input type="number" value={eduForm.inflation_rate} onChange={e => setEduForm({ ...eduForm, inflation_rate: +e.target.value })} /></div>
            <div className="modal-actions"><button className="btn-primary" onClick={handleEducation} disabled={loading}>{loading ? 'Calculating...' : 'Calculate'}</button></div>
          </div>
          <div>{result && result.plan_type === 'education' && <ResultCard data={result} />}</div>
        </div>
      )}

      {tab === 'tax' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}><Receipt size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--green-500)' }} />Tax Planning Calculator</h3>
            <div className="form-group"><label>Annual Income (MMK)</label><input type="number" value={taxForm.annual_income} onChange={e => setTaxForm({ ...taxForm, annual_income: +e.target.value })} /></div>
            <div className="form-group"><label>Current Deductions (MMK)</label><input type="number" value={taxForm.current_deductions} onChange={e => setTaxForm({ ...taxForm, current_deductions: +e.target.value })} /></div>
            <div className="modal-actions"><button className="btn-primary" onClick={handleTax} disabled={loading}>{loading ? 'Calculating...' : 'Calculate'}</button></div>
          </div>
          <div>{result && result.plan_type === 'tax' && <ResultCard data={result} />}</div>
        </div>
      )}

      {tab === 'cashflow' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                <Calculator size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: 'var(--blue-500)' }} />
                Cash Flow Health Score
              </h3>
              <div className="form-row">
                <div className="form-group"><label>Monthly Income (MMK)</label><input type="number" value={cfForm.monthly_income} onChange={e => setCfForm({ ...cfForm, monthly_income: +e.target.value })} /></div>
                <div className="form-group"><label>Monthly Expenses (MMK)</label><input type="number" value={cfForm.monthly_expense} onChange={e => setCfForm({ ...cfForm, monthly_expense: +e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Monthly Savings (MMK)</label><input type="number" value={cfForm.monthly_savings} onChange={e => setCfForm({ ...cfForm, monthly_savings: +e.target.value })} /></div>
                <div className="form-group"><label>Monthly Insurance (MMK)</label><input type="number" value={cfForm.monthly_insurance} onChange={e => setCfForm({ ...cfForm, monthly_insurance: +e.target.value })} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Emergency Fund (MMK)</label><input type="number" value={cfForm.emergency_fund} onChange={e => setCfForm({ ...cfForm, emergency_fund: +e.target.value })} /></div>
                <div className="form-group"><label>Total Debt (MMK)</label><input type="number" value={cfForm.total_debt} onChange={e => setCfForm({ ...cfForm, total_debt: +e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Total Assets (MMK)</label><input type="number" value={cfForm.total_assets} onChange={e => setCfForm({ ...cfForm, total_assets: +e.target.value })} /></div>
              <div className="modal-actions">
                <button className="btn-primary" onClick={() => {
                  const savingsRate = cfForm.monthly_income > 0 ? (cfForm.monthly_savings / cfForm.monthly_income) * 100 : 0
                  const insuranceRate = cfForm.monthly_income > 0 ? (cfForm.monthly_insurance / cfForm.monthly_income) * 100 : 0
                  const emergencyMonths = cfForm.monthly_expense > 0 ? cfForm.emergency_fund / cfForm.monthly_expense : 0
                  const debtToAsset = cfForm.total_assets > 0 ? (cfForm.total_debt / cfForm.total_assets) * 100 : 0
                  const surplus = cfForm.monthly_income - cfForm.monthly_expense - cfForm.monthly_savings - cfForm.monthly_insurance

                  // Score calculation (0-100)
                  let score = 50
                  score += Math.min(savingsRate, 30) // Up to 30 points for savings rate
                  score += Math.min(insuranceRate * 2, 15) // Up to 15 for insurance allocation
                  score += Math.min(emergencyMonths * 2, 12) // Up to 12 for emergency fund months
                  score -= Math.min(debtToAsset * 0.3, 20) // Penalty for high debt
                  if (surplus > 0) score += 5
                  score = Math.max(0, Math.min(100, Math.round(score)))

                  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
                  const gradeColor = score >= 85 ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 55 ? '#f59e0b' : '#ef4444'

                  setCfScore({
                    score, grade, gradeColor, savingsRate: savingsRate.toFixed(1),
                    insuranceRate: insuranceRate.toFixed(1), emergencyMonths: emergencyMonths.toFixed(1),
                    debtToAsset: debtToAsset.toFixed(1), surplus,
                    recommendations: [
                      savingsRate < 20 ? 'Increase savings to at least 20% of income' : null,
                      insuranceRate < 5 ? 'Allocate at least 5-10% of income to insurance protection' : null,
                      emergencyMonths < 6 ? `Build emergency fund to 6 months of expenses (need ${fmt(cfForm.monthly_expense * 6 - cfForm.emergency_fund)} more)` : null,
                      debtToAsset > 30 ? 'Focus on reducing debt — debt-to-asset ratio is high' : null,
                      surplus < 0 ? 'Monthly expenses exceed income — review budget urgently' : null,
                      insuranceRate >= 5 && savingsRate >= 20 && emergencyMonths >= 6 ? 'Great financial health! Consider increasing investment allocations.' : null,
                    ].filter(Boolean),
                  })
                }}>
                  Calculate Score
                </button>
              </div>
            </div>

            {cfScore && (
              <div className="card" style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Cash Flow Health Score</h3>
                <div style={{
                  width: 120, height: 120, borderRadius: '50%', margin: '0 auto 16px',
                  background: `conic-gradient(${cfScore.gradeColor} ${cfScore.score * 3.6}deg, #f3f4f6 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 96, height: 96, borderRadius: '50%', background: 'white',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: cfScore.gradeColor }}>{cfScore.score}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: cfScore.gradeColor }}>Grade {cfScore.grade}</div>
                  </div>
                </div>

                <div className="result-card" style={{ textAlign: 'left', marginBottom: 14 }}>
                  <div className="result-row"><span className="result-label">Savings Rate</span><span className="result-value">{cfScore.savingsRate}%</span></div>
                  <div className="result-row"><span className="result-label">Insurance Allocation</span><span className="result-value">{cfScore.insuranceRate}%</span></div>
                  <div className="result-row"><span className="result-label">Emergency Fund</span><span className="result-value">{cfScore.emergencyMonths} months</span></div>
                  <div className="result-row"><span className="result-label">Debt-to-Asset</span><span className="result-value">{cfScore.debtToAsset}%</span></div>
                  <div className="result-row"><span className="result-label">Monthly Surplus</span>
                    <span className="result-value" style={{ color: cfScore.surplus >= 0 ? 'var(--green-500)' : 'var(--aia-red)' }}>
                      {fmt(cfScore.surplus)} MMK
                    </span>
                  </div>
                </div>

                {cfScore.recommendations.length > 0 && (
                  <div style={{ textAlign: 'left', padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e', lineHeight: 1.8 }}>
                    <strong>💡 Recommendations:</strong>
                    {cfScore.recommendations.map((r: string, i: number) => (
                      <div key={i}>• {r}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ResultCard({ data }: { data: FinancialPlan }) {
  const r = data.result_data || {}
  return (
    <div className="card" style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--green-600)' }}>
        📊 {data.plan_type.charAt(0).toUpperCase() + data.plan_type.slice(1)} Plan Results
      </h3>
      <div className="result-card" style={{ background: 'white' }}>
        {Object.entries(r).map(([key, val]) => (
          <div className="result-row" key={key}>
            <span className="result-label">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            <span className="result-value">{typeof val === 'number' ? `${fmt(val)} MMK` : String(val)}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.6 }}>
        <strong>Recommended AIA Products:</strong>
        {data.plan_type === 'retirement' && ' AIA Universal Life, AIA Short-term Endowment'}
        {data.plan_type === 'education' && ' AIA Education Plan, AIA Short-term Endowment'}
        {data.plan_type === 'tax' && ' AIA Universal Life (tax-deductible premiums)'}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gray-400)' }}>
        Contact Thida Soe at +95 9 4318 1662 or thidasoe@aia.com.mm for personalized advice.
      </div>
    </div>
  )
}

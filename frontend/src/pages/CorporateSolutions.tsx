import { useEffect, useState } from 'react'
import { api, type CorporateProfile, type Client } from '../api'
import { Building2, Users, Calculator, BarChart3, Shield, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'

const INDUSTRIES = [
  'technology','finance','manufacturing','construction','healthcare',
  'education','agriculture','mining','retail','hospitality','logistics',
  'oil_gas','telecommunications','government','real_estate',
]

export default function CorporateSolutions() {
  const [tab, setTab] = useState<'profiles'|'calculator'|'compare'>('profiles')
  const [profiles, setProfiles] = useState<CorporateProfile[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [calcResult, setCalcResult] = useState<any>(null)
  const [compareResult, setCompareResult] = useState<any>(null)

  const [form, setForm] = useState({
    client_id: '', company_name: '', industry: 'technology', employee_count: 50,
    avg_employee_age: 35, annual_revenue: 0, existing_benefits: {} as Record<string,any>,
    hr_contact_name: '', hr_contact_email: '', hr_contact_phone: '',
  })
  const [calcForm, setCalcForm] = useState({
    employee_count: 50, avg_employee_age: 35, plan_type: 'standard',
    include_life: true, include_health: true, include_dental: false,
    include_disability: false, sum_assured_per_employee: 10000000,
  })
  const [compareForm, setCompareForm] = useState({
    employee_count: 50, current_provider: '', current_cost_per_employee: 0, current_benefits: {},
  })

  useEffect(() => {
    Promise.all([
      api.getCorporateProfiles().catch(() => []),
      api.getClients().catch(() => []),
    ]).then(([p, c]) => {
      setProfiles(p)
      setClients(c.filter((cl: Client) => cl.client_type === 'corporate'))
    }).finally(() => setLoading(false))
  }, [])

  const createProfile = async () => {
    try {
      const result = await api.createCorporateProfile(form)
      const updated = await api.getCorporateProfiles()
      setProfiles(updated)
      setShowForm(false)
      alert(`Profile created! Risk: ${result.risk_profile}`)
    } catch (e: any) { alert(e.message) }
  }

  const runCalc = async () => {
    try {
      setCalcResult(await api.groupInsuranceCalc(calcForm))
    } catch (e: any) { alert(e.message) }
  }

  const runCompare = async () => {
    try {
      setCompareResult(await api.benefitsCompare(compareForm))
    } catch (e: any) { alert(e.message) }
  }

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  const riskColor = (r: string) => r === 'low' ? '#22c55e' : r === 'medium' ? '#f59e0b' : '#ef4444'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><Building2 size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Corporate Solutions</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: 13, marginTop: 2 }}>Group insurance, company analysis & HR benefits</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['profiles','Company Profiles'],['calculator','Group Calculator'],['compare','Benefits Compare']] as const).map(([k,l]) => (
          <button key={k} className={`btn ${tab === k ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ======= PROFILES TAB ======= */}
      {tab === 'profiles' && (
        <div>
          <button className="btn btn-primary btn-sm" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Company Profile'}
          </button>

          {showForm && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Company Profile Analyzer</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Client (Corporate)</label>
                  <select className="form-input" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}>
                    <option value="">Select client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Company Name</label>
                  <input className="form-input" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Industry</label>
                  <select className="form-input" value={form.industry} onChange={e => setForm({...form, industry: e.target.value})}>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Employee Count</label>
                  <input className="form-input" type="number" value={form.employee_count} onChange={e => setForm({...form, employee_count: +e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Avg Employee Age</label>
                  <input className="form-input" type="number" value={form.avg_employee_age} onChange={e => setForm({...form, avg_employee_age: +e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Annual Revenue (MMK)</label>
                  <input className="form-input" type="number" value={form.annual_revenue} onChange={e => setForm({...form, annual_revenue: +e.target.value})} />
                </div>
                <div>
                  <label className="form-label">HR Contact Name</label>
                  <input className="form-input" value={form.hr_contact_name} onChange={e => setForm({...form, hr_contact_name: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">HR Contact Email</label>
                  <input className="form-input" value={form.hr_contact_email} onChange={e => setForm({...form, hr_contact_email: e.target.value})} />
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={createProfile}>Analyze & Create Profile</button>
            </div>
          )}

          {loading ? <div className="loading">Loading...</div> :
            profiles.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <Building2 size={48} style={{ color: 'var(--gray-300)', margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--gray-400)' }}>No corporate profiles yet. Create one to analyze company insurance needs.</p>
              </div>
            ) : (
              <div className="grid-3">
                {profiles.map(p => (
                  <div key={p.id} className="card" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700 }}>{p.company_name}</h4>
                      <span className={`badge badge-${p.risk_profile === 'low' ? 'green' : p.risk_profile === 'medium' ? 'yellow' : 'red'}`}>
                        {p.risk_profile} risk
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
                      <div><Users size={12} style={{ verticalAlign: 'middle' }} /> {p.employee_count} employees</div>
                      <div><Building2 size={12} style={{ verticalAlign: 'middle' }} /> {p.industry}</div>
                    </div>
                    {p.analysis_result && (
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                        Recommended: <strong style={{ color: 'var(--blue-500)' }}>{p.analysis_result.recommended_plan}</strong> plan
                        {p.analysis_result.volume_discount > 0 && (
                          <span> · {p.analysis_result.volume_discount}% volume discount</span>
                        )}
                      </div>
                    )}
                    {p.group_plans && p.group_plans.length > 0 && (
                      <div style={{ marginTop: 10, fontSize: 12 }}>
                        <strong>Plans:</strong>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                          {p.group_plans.map((plan: any, i: number) => (
                            <span key={i} className="badge badge-blue" style={{ fontSize: 10 }}>
                              {plan.plan_name}: {fmt(plan.monthly_cost)}/mo
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ======= CALCULATOR TAB ======= */}
      {tab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              <Calculator size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Group Insurance Calculator
            </h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label className="form-label">Employee Count</label>
                <input className="form-input" type="number" value={calcForm.employee_count} onChange={e => setCalcForm({...calcForm, employee_count: +e.target.value})} />
              </div>
              <div>
                <label className="form-label">Avg Employee Age</label>
                <input className="form-input" type="number" value={calcForm.avg_employee_age} onChange={e => setCalcForm({...calcForm, avg_employee_age: +e.target.value})} />
              </div>
              <div>
                <label className="form-label">Plan Type</label>
                <select className="form-input" value={calcForm.plan_type} onChange={e => setCalcForm({...calcForm, plan_type: e.target.value})}>
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </div>
              <div>
                <label className="form-label">Sum Assured per Employee (MMK)</label>
                <input className="form-input" type="number" value={calcForm.sum_assured_per_employee} onChange={e => setCalcForm({...calcForm, sum_assured_per_employee: +e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {['life','health','dental','disability'].map(k => (
                  <label key={k} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={(calcForm as any)[`include_${k}`]} onChange={e => setCalcForm({...calcForm, [`include_${k}`]: e.target.checked})} />
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                  </label>
                ))}
              </div>
              <button className="btn btn-primary" onClick={runCalc}>Calculate Premium</button>
            </div>
          </div>

          {calcResult && (
            <div className="card">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: 'var(--green-600)' }}>
                <CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                Calculation Result
              </h3>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-200)' }}>
                  <span style={{ fontSize: 13 }}>Per Employee (Annual)</span>
                  <strong>{fmt(calcResult.per_employee_annual)} MMK</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-200)' }}>
                  <span style={{ fontSize: 13 }}>Total Annual</span>
                  <strong>{fmt(calcResult.total_annual)} MMK</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-200)' }}>
                  <span style={{ fontSize: 13 }}>Volume Discount</span>
                  <strong style={{ color: 'var(--green-500)' }}>-{calcResult.volume_discount_pct}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: 8, background: 'var(--green-50)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Monthly Total</span>
                  <strong style={{ fontSize: 18, color: 'var(--green-600)' }}>{fmt(calcResult.monthly_total)} MMK</strong>
                </div>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Breakdown:</h4>
                {Object.entries(calcResult.breakdown).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-500)' }}>
                    <span>{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                    <span>{fmt(v as number)} MMK</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======= COMPARE TAB ======= */}
      {tab === 'compare' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              <BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              HR Benefits Comparison
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Employee Count</label>
                <input className="form-input" type="number" value={compareForm.employee_count} onChange={e => setCompareForm({...compareForm, employee_count: +e.target.value})} />
              </div>
              <div>
                <label className="form-label">Current Provider</label>
                <input className="form-input" value={compareForm.current_provider} onChange={e => setCompareForm({...compareForm, current_provider: e.target.value})} placeholder="e.g. Competitor Inc." />
              </div>
              <div>
                <label className="form-label">Monthly Cost / Employee (MMK)</label>
                <input className="form-input" type="number" value={compareForm.current_cost_per_employee} onChange={e => setCompareForm({...compareForm, current_cost_per_employee: +e.target.value})} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-primary" onClick={runCompare}>Compare Plans</button>
              </div>
            </div>
          </div>

          {compareResult && (
            <div>
              <div className="card" style={{ marginBottom: 16, background: 'var(--blue-50)' }}>
                <p style={{ fontSize: 13 }}>Current annual spend: <strong>{fmt(compareResult.current_annual_total)} MMK</strong> ({fmt(compareResult.current_per_employee)} per employee/month)</p>
              </div>
              <div className="grid-4">
                {compareResult.comparisons.map((c: any) => (
                  <div key={c.plan} className="card" style={{ border: c.plan === compareResult.recommendation ? '2px solid var(--green-500)' : undefined }}>
                    {c.plan === compareResult.recommendation && (
                      <div className="badge badge-green" style={{ marginBottom: 8 }}>Recommended</div>
                    )}
                    <h4 style={{ fontSize: 15, fontWeight: 700, textTransform: 'capitalize', marginBottom: 10 }}>{c.plan}</h4>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-600)', marginBottom: 4 }}>{fmt(c.total_annual)}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginBottom: 12 }}>per year ({fmt(c.annual_per_employee)}/emp)</div>
                    {c.vs_current_savings > 0 && (
                      <div style={{ background: 'var(--green-50)', padding: 8, borderRadius: 6, marginBottom: 10, fontSize: 12, color: 'var(--green-600)' }}>
                        <TrendingUp size={12} style={{ verticalAlign: 'middle' }} /> Save {fmt(c.vs_current_savings)} MMK ({c.savings_pct}%)
                      </div>
                    )}
                    <div style={{ fontSize: 12 }}>
                      {Object.entries(c.features).map(([feat, enabled]) => (
                        <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: enabled ? 'var(--gray-600)' : 'var(--gray-300)' }}>
                          {enabled ? <CheckCircle size={12} style={{ color: 'var(--green-500)' }} /> : <span style={{ width: 12, height: 12, display: 'inline-block' }}>—</span>}
                          {feat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 28, padding: '16px 0', borderTop: '1px solid var(--gray-200)', fontSize: 11, color: 'var(--gray-400)' }}>
        POWERED BY: KO | WorkWell Framework | MDRT Standards &nbsp;·&nbsp; FOR: Thida Soe | thidasoe@aia.com.mm
      </div>
    </div>
  )
}

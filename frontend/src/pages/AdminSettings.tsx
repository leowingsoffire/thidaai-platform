import { useState, useEffect } from 'react'
import {
  Settings, Mail, MessageSquare, Video, Globe, Shield, Save,
  CheckCircle, AlertTriangle, Eye, EyeOff, RefreshCw, Upload,
  Smartphone, Bell, Database, Palette, ChevronRight, Server,
  Cpu, Send, Phone, Lock, Target, Sliders, Zap, Key, Hash
} from 'lucide-react'
import { api } from '../api'
import FeatureGuide from '../components/FeatureGuide'

interface SettingsData {
  general: { company_name: string; timezone: string; language: string; date_format: string; currency: string; currency_symbol: string }
  smtp: { host: string; port: number; username: string; password: string; from_email: string; from_name: string; use_tls: boolean; enabled: boolean }
  viber: { bot_token: string; bot_name: string; webhook_url: string; welcome_message: string; enabled: boolean }
  zoom: { client_id: string; client_secret: string; account_email: string; auto_record: boolean; enabled: boolean }
  telegram: { bot_token: string; webhook_url: string; parse_mode: string; timeout: number; enabled: boolean }
  whatsapp: { twilio_sid: string; twilio_token: string; whatsapp_number: string; enabled: boolean }
  ai: { openai_api_key: string; model: string; temperature: number; max_tokens: number; system_prompt: string; enabled: boolean }
  security: { secret_key: string; token_expiry_minutes: number; cors_origins: string; app_env: string }
  mdrt: { premium_target: number; cases_target: number; currency: string; qualification_year: string }
  notifications: { email_on_claim: boolean; email_on_policy: boolean; email_on_workflow: boolean; viber_on_greeting: boolean; daily_digest: boolean; digest_time: string }
  branding: { primary_color: string; accent_color: string; logo_url: string; sidebar_style: string }
}

const DEFAULTS: SettingsData = {
  general: { company_name: 'AIA Myanmar', timezone: 'Asia/Yangon', language: 'en', date_format: 'DD/MM/YYYY', currency: 'MMK', currency_symbol: 'K' },
  smtp: { host: '', port: 587, username: '', password: '', from_email: '', from_name: '', use_tls: true, enabled: false },
  viber: { bot_token: '', bot_name: '', webhook_url: '', welcome_message: 'Welcome to AIA Assistant! Send "help" to see available commands.', enabled: false },
  zoom: { client_id: '', client_secret: '', account_email: '', auto_record: false, enabled: false },
  telegram: { bot_token: '', webhook_url: '', parse_mode: 'Markdown', timeout: 10, enabled: false },
  whatsapp: { twilio_sid: '', twilio_token: '', whatsapp_number: '', enabled: false },
  ai: { openai_api_key: '', model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 800, system_prompt: 'You are an expert insurance advisor for AIA Myanmar. Provide helpful, accurate advice.', enabled: true },
  security: { secret_key: '', token_expiry_minutes: 480, cors_origins: '', app_env: 'production' },
  mdrt: { premium_target: 15000, cases_target: 20, currency: 'USD', qualification_year: '2026' },
  notifications: { email_on_claim: true, email_on_policy: true, email_on_workflow: true, viber_on_greeting: true, daily_digest: false, digest_time: '08:00' },
  branding: { primary_color: '#7c5cfc', accent_color: '#ec4899', logo_url: '', sidebar_style: 'light' },
}

const TABS = [
  { key: 'general', label: 'General', icon: Globe, desc: 'Company info & preferences' },
  { key: 'ai', label: 'AI / OpenAI', icon: Cpu, desc: 'GPT model & prompt config' },
  { key: 'smtp', label: 'Email / SMTP', icon: Mail, desc: 'Email server configuration' },
  { key: 'viber', label: 'Viber Bot', icon: Smartphone, desc: 'Viber messaging integration' },
  { key: 'telegram', label: 'Telegram', icon: Send, desc: 'Telegram bot integration' },
  { key: 'whatsapp', label: 'WhatsApp', icon: Phone, desc: 'Twilio WhatsApp integration' },
  { key: 'zoom', label: 'Zoom', icon: Video, desc: 'Video meeting integration' },
  { key: 'security', label: 'Security', icon: Lock, desc: 'Auth, CORS & environment' },
  { key: 'mdrt', label: 'MDRT Targets', icon: Target, desc: 'Qualification thresholds' },
  { key: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alert & digest preferences' },
  { key: 'branding', label: 'Branding', icon: Palette, desc: 'Colors & appearance' },
]

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULTS)
  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ type: string; ok: boolean; msg: string } | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  useEffect(() => {
    api.getSettings().then(s => setSettings({ ...DEFAULTS, ...s })).catch(() => {})
  }, [])

  const updateSection = (section: keyof SettingsData, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.saveSettings(settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { } finally { setSaving(false) }
  }

  const testConnection = async (type: string) => {
    setTesting(type)
    setTestResult(null)
    try {
      const result = await api.testConnection(type, (settings as any)[type])
      setTestResult({ type, ok: result.success, msg: result.message })
    } catch (e: any) {
      setTestResult({ type, ok: false, msg: e.message || 'Connection failed' })
    } finally { setTesting(null) }
  }

  const togglePassword = (key: string) => setShowPasswords(p => ({ ...p, [key]: !p[key] }))

  const PasswordInput = ({ section, field, placeholder }: { section: keyof SettingsData; field: string; placeholder: string }) => {
    const key = `${section}_${field}`
    const val = (settings[section] as any)[field] || ''
    return (
      <div style={{ position: 'relative' }}>
        <input
          type={showPasswords[key] ? 'text' : 'password'}
          value={val}
          onChange={e => updateSection(section, field, e.target.value)}
          placeholder={placeholder}
          style={{ paddingRight: 36 }}
        />
        <button onClick={() => togglePassword(key)} type="button" className="btn-ghost" style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4 }}>
          {showPasswords[key] ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    )
  }

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 40, height: 22, borderRadius: 11,
          background: checked ? 'linear-gradient(135deg, #7c5cfc, #6366f1)' : '#d1d5db',
          position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </label>
  )

  const StatusBadge = ({ enabled }: { enabled: boolean }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 20,
      background: enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)',
      color: enabled ? '#10b981' : '#9ca3af',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: enabled ? '#10b981' : '#9ca3af' }} />
      {enabled ? 'Active' : 'Inactive'}
    </span>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1><Settings size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} />Admin Settings</h1>
          <FeatureGuide
            title="Admin Settings"
            description="Configure all system integrations and preferences. Set up AI/OpenAI, email, Viber, Telegram, WhatsApp, Zoom, security, MDRT targets, notifications, and branding — all from one place."
            steps={[
              { text: 'Select a settings category from the left panel.' },
              { text: 'Fill in the configuration fields for that integration.' },
              { text: 'Use "Test Connection" to verify before saving.' },
              { text: 'Click "Save All Settings" to persist your changes.' },
              { text: 'Enable/disable integrations with toggle switches.' },
            ]}
            tips={[
              'Always test SMTP connection before enabling email notifications.',
              'Viber Bot Token is available from the Viber Admin Panel.',
              'Zoom OAuth credentials come from the Zoom App Marketplace.',
            ]}
          />
        </div>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {saving ? <RefreshCw size={14} className="spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Settings'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, minHeight: 'calc(100vh - 200px)' }}>
        {/* Settings Navigation */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div className="card" style={{ padding: 8 }}>
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              const sectionData = (settings as any)[tab.key]
              const isEnabled = sectionData?.enabled !== undefined ? sectionData.enabled : true
              return (
                <div
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                    borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                    background: isActive ? 'linear-gradient(135deg, #f0ebff, #eae4ff)' : 'transparent',
                    borderLeft: isActive ? '3px solid #7c5cfc' : '3px solid transparent',
                  }}
                >
                  <Icon size={16} style={{ color: isActive ? '#7c5cfc' : 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? '#7c5cfc' : 'var(--text-primary)' }}>{tab.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{tab.desc}</div>
                  </div>
                  {tab.key !== 'general' && tab.key !== 'notifications' && tab.key !== 'branding' && (
                    <StatusBadge enabled={isEnabled} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Quick Status */}
          <div className="card" style={{ marginTop: 16, padding: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Integration Status</h4>
            {[
              { label: 'OpenAI / GPT', ok: settings.ai.enabled && !!settings.ai.openai_api_key },
              { label: 'SMTP Email', ok: settings.smtp.enabled && !!settings.smtp.host },
              { label: 'Viber Bot', ok: settings.viber.enabled && !!settings.viber.bot_token },
              { label: 'Telegram', ok: settings.telegram.enabled && !!settings.telegram.bot_token },
              { label: 'WhatsApp', ok: settings.whatsapp.enabled && !!settings.whatsapp.twilio_sid },
              { label: 'Zoom', ok: settings.zoom.enabled && !!settings.zoom.client_id },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                <span style={{ color: s.ok ? '#10b981' : '#d1d5db', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {s.ok ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                  {s.ok ? 'Connected' : 'Not set'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Content */}
        <div style={{ flex: 1 }}>
          {/* ═══════════ GENERAL ═══════════ */}
          {activeTab === 'general' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={20} color="white" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>General Settings</h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Company information and regional preferences</p>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Company Name</label><input value={settings.general.company_name} onChange={e => updateSection('general', 'company_name', e.target.value)} /></div>
                <div className="form-group">
                  <label>Timezone</label>
                  <select value={settings.general.timezone} onChange={e => updateSection('general', 'timezone', e.target.value)}>
                    <option value="Asia/Yangon">Asia/Yangon (MMT +6:30)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (ICT +7:00)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST +9:00)</option>
                    <option value="UTC">UTC (+0:00)</option>
                    <option value="America/New_York">America/New_York (EST -5:00)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Language</label>
                  <select value={settings.general.language} onChange={e => updateSection('general', 'language', e.target.value)}>
                    <option value="en">English</option>
                    <option value="my">Myanmar (မြန်မာ)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Date Format</label>
                  <select value={settings.general.date_format} onChange={e => updateSection('general', 'date_format', e.target.value)}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Currency</label>
                  <select value={settings.general.currency} onChange={e => updateSection('general', 'currency', e.target.value)}>
                    <option value="MMK">Myanmar Kyat (MMK)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="SGD">Singapore Dollar (SGD)</option>
                    <option value="THB">Thai Baht (THB)</option>
                  </select>
                </div>
                <div className="form-group"><label>Currency Symbol</label><input value={settings.general.currency_symbol} onChange={e => updateSection('general', 'currency_symbol', e.target.value)} /></div>
              </div>
            </div>
          )}

          {/* ═══════════ AI / OPENAI ═══════════ */}
          {activeTab === 'ai' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cpu size={20} color="white" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>AI / OpenAI Configuration</h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Configure GPT model, prompts, and AI behavior for all AI features</p>
                  </div>
                </div>
                <Toggle checked={settings.ai.enabled} onChange={v => updateSection('ai', 'enabled', v)} label="Enable AI" />
              </div>

              <div className="form-group">
                <label>OpenAI API Key</label>
                <PasswordInput section="ai" field="openai_api_key" placeholder="sk-..." />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>Get your API key from <strong>platform.openai.com/api-keys</strong></span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Model</label>
                  <select value={settings.ai.model} onChange={e => updateSection('ai', 'model', e.target.value)}>
                    <option value="gpt-4o-mini">GPT-4o Mini (fast, cost-effective)</option>
                    <option value="gpt-4o">GPT-4o (best quality)</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo (legacy)</option>
                    <option value="o3-mini">o3-mini (reasoning)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Max Tokens</label>
                  <input type="number" value={settings.ai.max_tokens} onChange={e => updateSection('ai', 'max_tokens', Number(e.target.value))} min={100} max={4096} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>100–4096 · Higher = longer responses</span>
                </div>
              </div>

              <div className="form-group">
                <label>Temperature: {settings.ai.temperature}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Precise</span>
                  <input type="range" min={0} max={1} step={0.1} value={settings.ai.temperature} onChange={e => updateSection('ai', 'temperature', parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: '#10b981' }}
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Creative</span>
                </div>
              </div>

              <div className="form-group">
                <label>System Prompt</label>
                <textarea rows={4} value={settings.ai.system_prompt} onChange={e => updateSection('ai', 'system_prompt', e.target.value)} placeholder="You are an expert insurance advisor..." />
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>This prompt is prepended to every AI request (needs analysis, proposals, chat)</span>
              </div>

              <div style={{ marginTop: 16, padding: 16, background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: 12, border: '1px solid #a7f3d0' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 8 }}>🤖 AI Features Powered by This Config</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { feat: 'Needs Analysis', desc: 'AI-driven coverage recommendations' },
                    { feat: 'Proposal Generation', desc: 'Auto-generate policy proposals' },
                    { feat: 'AI Chat Assistant', desc: 'Conversational data entry & queries' },
                    { feat: 'Content Generation', desc: 'Social media post creation' },
                    { feat: 'Pipeline Insights', desc: 'AI deal scoring & suggestions' },
                    { feat: 'UW AI Analysis', desc: 'Underwriting risk assessment' },
                  ].map(f => (
                    <div key={f.feat} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                      <Zap size={12} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} />
                      <div><strong style={{ color: '#065f46' }}>{f.feat}</strong> <span style={{ color: 'var(--text-muted)' }}>— {f.desc}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-card)', display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => testConnection('ai')} disabled={testing === 'ai' || !settings.ai.openai_api_key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {testing === 'ai' ? <RefreshCw size={14} className="spin" /> : <Cpu size={14} />}
                  {testing === 'ai' ? 'Testing...' : 'Test API Key'}
                </button>
                {testResult?.type === 'ai' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: testResult.ok ? '#10b981' : '#ef4444' }}>
                    {testResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    {testResult.msg}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ SMTP ═══════════ */}
          {activeTab === 'smtp' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={20} color="white" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>SMTP / Email Configuration</h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Configure outgoing email server for notifications and reports</p>
                  </div>
                </div>
                <Toggle checked={settings.smtp.enabled} onChange={v => updateSection('smtp', 'enabled', v)} label="Enable" />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}><label>SMTP Host</label><input value={settings.smtp.host} onChange={e => updateSection('smtp', 'host', e.target.value)} placeholder="smtp.gmail.com" /></div>
                <div className="form-group" style={{ flex: 1 }}><label>Port</label><input type="number" value={settings.smtp.port} onChange={e => updateSection('smtp', 'port', Number(e.target.value))} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>Username</label><input value={settings.smtp.username} onChange={e => updateSection('smtp', 'username', e.target.value)} placeholder="your@email.com" /></div>
                <div className="form-group"><label>Password</label><PasswordInput section="smtp" field="password" placeholder="App password" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label>From Email</label><input value={settings.smtp.from_email} onChange={e => updateSection('smtp', 'from_email', e.target.value)} placeholder="noreply@company.com" /></div>
                <div className="form-group"><label>From Name</label><input value={settings.smtp.from_name} onChange={e => updateSection('smtp', 'from_name', e.target.value)} placeholder="AIA Assistant" /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                <Toggle checked={settings.smtp.use_tls} onChange={v => updateSection('smtp', 'use_tls', v)} label="Use TLS encryption" />
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-card)', display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => testConnection('smtp')} disabled={testing === 'smtp' || !settings.smtp.host} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {testing === 'smtp' ? <RefreshCw size={14} className="spin" /> : <Server size={14} />}
                  {testing === 'smtp' ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult?.type === 'smtp' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: testResult.ok ? '#10b981' : '#ef4444' }}>
                    {testResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    {testResult.msg}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ VIBER ═══════════ */}
          {activeTab === 'viber' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #7c5cfc, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smartphone size={20} color="white" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Viber Bot Integration</h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Connect your Viber bot for mobile data entry and auto-greetings</p>
                  </div>
                </div>
                <Toggle checked={settings.viber.enabled} onChange={v => updateSection('viber', 'enabled', v)} label="Enable" />
              </div>
              <div className="form-row">
                <div className="form-group"><label>Bot Name</label><input value={settings.viber.bot_name} onChange={e => updateSection('viber', 'bot_name', e.target.value)} placeholder="AIA Assistant Bot" /></div>
                <div className="form-group"><label>Bot Token</label><PasswordInput section="viber" field="bot_token" placeholder="Viber Bot API token" /></div>
              </div>
              <div className="form-group"><label>Webhook URL</label><input value={settings.viber.webhook_url} onChange={e => updateSection('viber', 'webhook_url', e.target.value)} placeholder="https://your-backend.com/api/viber/webhook" /></div>
              <div className="form-group"><label>Welcome Message</label><textarea rows={2} value={settings.viber.welcome_message} onChange={e => updateSection('viber', 'welcome_message', e.target.value)} /></div>

              <div style={{ marginTop: 16, padding: 16, background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', borderRadius: 12, border: '1px solid #ddd6fe' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>📱 Viber Commands Available</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { cmd: 'add client [name]', desc: 'Create new client' },
                    { cmd: 'log call [client]', desc: 'Log a phone call' },
                    { cmd: 'new policy [client]', desc: 'Start policy creation' },
                    { cmd: 'dashboard', desc: 'View KPI summary' },
                    { cmd: 'pipeline', desc: 'View sales pipeline' },
                    { cmd: 'help', desc: 'Show all commands' },
                  ].map(c => (
                    <div key={c.cmd} style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                      <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, color: '#7c3aed', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.cmd}</code>
                      <span style={{ color: 'var(--text-muted)' }}>{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-card)', display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => testConnection('viber')} disabled={testing === 'viber' || !settings.viber.bot_token} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {testing === 'viber' ? <RefreshCw size={14} className="spin" /> : <MessageSquare size={14} />}
                  {testing === 'viber' ? 'Testing...' : 'Test Bot Connection'}
                </button>
                {testResult?.type === 'viber' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: testResult.ok ? '#10b981' : '#ef4444' }}>
                    {testResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    {testResult.msg}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ ZOOM ═══════════ */}
          {activeTab === 'zoom' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Video size={20} color="white" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Zoom Integration</h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Create Zoom meetings for client consultations directly from the app</p>
                  </div>
                </div>
                <Toggle checked={settings.zoom.enabled} onChange={v => updateSection('zoom', 'enabled', v)} label="Enable" />
              </div>
              <div className="form-row">
                <div className="form-group"><label>Client ID</label><input value={settings.zoom.client_id} onChange={e => updateSection('zoom', 'client_id', e.target.value)} placeholder="Zoom OAuth Client ID" /></div>
                <div className="form-group"><label>Client Secret</label><PasswordInput section="zoom" field="client_secret" placeholder="Zoom OAuth Client Secret" /></div>
              </div>
              <div className="form-group"><label>Account Email</label><input value={settings.zoom.account_email} onChange={e => updateSection('zoom', 'account_email', e.target.value)} placeholder="your-zoom@email.com" /></div>
              <div style={{ marginTop: 8 }}>
                <Toggle checked={settings.zoom.auto_record} onChange={v => updateSection('zoom', 'auto_record', v)} label="Auto-record meetings" />
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-card)', display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => testConnection('zoom')} disabled={testing === 'zoom' || !settings.zoom.client_id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {testing === 'zoom' ? <RefreshCw size={14} className="spin" /> : <Video size={14} />}
                  {testing === 'zoom' ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult?.type === 'zoom' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: testResult.ok ? '#10b981' : '#ef4444' }}>
                    {testResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    {testResult.msg}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ TELEGRAM ═══════════ */}
          {activeTab === 'telegram' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #0088cc, #229ED9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={20} color="white" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Telegram Bot Integration</h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Connect Telegram bot for messaging and mobile data entry</p>
                  </div>
                </div>
                <Toggle checked={settings.telegram.enabled} onChange={v => updateSection('telegram', 'enabled', v)} label="Enable" />
              </div>
              <div className="form-group">
                <label>Bot Token</label>
                <PasswordInput section="telegram" field="bot_token" placeholder="123456789:ABCDefGHI..." />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>Create a bot via <strong>@BotFather</strong> on Telegram to get this token</span>
              </div>
              <div className="form-group">
                <label>Webhook URL</label>
                <input value={settings.telegram.webhook_url} onChange={e => updateSection('telegram', 'webhook_url', e.target.value)} placeholder="https://your-backend.com/api/telegram/webhook" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Parse Mode</label>
                  <select value={settings.telegram.parse_mode} onChange={e => updateSection('telegram', 'parse_mode', e.target.value)}>
                    <option value="Markdown">Markdown</option>
                    <option value="MarkdownV2">MarkdownV2</option>
                    <option value="HTML">HTML</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Request Timeout (seconds)</label>
                  <input type="number" value={settings.telegram.timeout} onChange={e => updateSection('telegram', 'timeout', Number(e.target.value))} min={5} max={60} />
                </div>
              </div>

              <div style={{ marginTop: 16, padding: 16, background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', borderRadius: 12, border: '1px solid #7dd3fc' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0369a1', marginBottom: 8 }}>📨 Setup Steps</h4>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#0c4a6e', lineHeight: 1.8 }}>
                  <li>Open Telegram, search for <strong>@BotFather</strong></li>
                  <li>Send <code>/newbot</code> and follow instructions to create your bot</li>
                  <li>Copy the bot token and paste it above</li>
                  <li>Set the webhook URL to your backend's Telegram endpoint</li>
                  <li>Enable the integration and save</li>
                </ol>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-card)', display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => testConnection('telegram')} disabled={testing === 'telegram' || !settings.telegram.bot_token} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {testing === 'telegram' ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                  {testing === 'telegram' ? 'Testing...' : 'Test Bot Connection'}
                </button>
                {testResult?.type === 'telegram' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: testResult.ok ? '#10b981' : '#ef4444' }}>
                    {testResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    {testResult.msg}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ WHATSAPP / TWILIO ═══════════ */}
          {activeTab === 'whatsapp' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #25d366, #128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={20} color="white" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>WhatsApp / Twilio Integration</h2>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Send WhatsApp messages to clients via Twilio API</p>
                  </div>
                </div>
                <Toggle checked={settings.whatsapp.enabled} onChange={v => updateSection('whatsapp', 'enabled', v)} label="Enable" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Twilio Account SID</label>
                  <input value={settings.whatsapp.twilio_sid} onChange={e => updateSection('whatsapp', 'twilio_sid', e.target.value)} placeholder="AC..." />
                </div>
                <div className="form-group">
                  <label>Twilio Auth Token</label>
                  <PasswordInput section="whatsapp" field="twilio_token" placeholder="Twilio auth token" />
                </div>
              </div>
              <div className="form-group">
                <label>WhatsApp Number</label>
                <input value={settings.whatsapp.whatsapp_number} onChange={e => updateSection('whatsapp', 'whatsapp_number', e.target.value)} placeholder="whatsapp:+14155238886" />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>Format: <code>whatsapp:+1XXXXXXXXXX</code> — from Twilio sandbox or purchased number</span>
              </div>

              <div style={{ marginTop: 16, padding: 16, background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', borderRadius: 12, border: '1px solid #86efac' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 8 }}>💬 WhatsApp Capabilities</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[
                    { feat: 'Client Notifications', desc: 'Policy reminders & updates' },
                    { feat: 'Birthday Greetings', desc: 'Automated birthday messages' },
                    { feat: 'Claim Alerts', desc: 'Status change notifications' },
                    { feat: 'Payment Reminders', desc: 'Premium due date alerts' },
                  ].map(f => (
                    <div key={f.feat} style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                      <CheckCircle size={12} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                      <div><strong style={{ color: '#14532d' }}>{f.feat}</strong> <span style={{ color: '#166534' }}>— {f.desc}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-card)', display: 'flex', gap: 10 }}>
                <button className="btn-secondary" onClick={() => testConnection('whatsapp')} disabled={testing === 'whatsapp' || !settings.whatsapp.twilio_sid} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {testing === 'whatsapp' ? <RefreshCw size={14} className="spin" /> : <Phone size={14} />}
                  {testing === 'whatsapp' ? 'Testing...' : 'Test Twilio Connection'}
                </button>
                {testResult?.type === 'whatsapp' && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: testResult.ok ? '#10b981' : '#ef4444' }}>
                    {testResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                    {testResult.msg}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ SECURITY ═══════════ */}
          {activeTab === 'security' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={20} color="white" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Security & Environment</h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>JWT authentication, CORS, and deployment settings</p>
                </div>
              </div>

              <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: 16, fontSize: 12, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} />
                <span>Changing security settings may require a backend restart to take effect.</span>
              </div>

              <div className="form-group">
                <label>JWT Secret Key</label>
                <PasswordInput section="security" field="secret_key" placeholder="Your secret key for JWT signing" />
                <span style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>Used to sign authentication tokens. Use a long random string.</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Token Expiry (minutes)</label>
                  <input type="number" value={settings.security.token_expiry_minutes} onChange={e => updateSection('security', 'token_expiry_minutes', Number(e.target.value))} min={30} max={10080} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Default: 480 (8 hours) · Max: 10080 (7 days)</span>
                </div>
                <div className="form-group">
                  <label>Environment</label>
                  <select value={settings.security.app_env} onChange={e => updateSection('security', 'app_env', e.target.value)}>
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>CORS Allowed Origins</label>
                <textarea rows={3} value={settings.security.cors_origins} onChange={e => updateSection('security', 'cors_origins', e.target.value)}
                  placeholder="https://your-frontend.vercel.app,http://localhost:5173" />
                <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Comma-separated list of allowed frontend URLs</span>
              </div>

              <div style={{ marginTop: 16, padding: 16, background: 'linear-gradient(135deg, #fef2f2, #fee2e2)', borderRadius: 12, border: '1px solid #fecaca' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>🔒 Security Checklist</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { check: 'JWT secret key is set', ok: !!settings.security.secret_key && settings.security.secret_key !== 'change-this' },
                    { check: 'Environment is production', ok: settings.security.app_env === 'production' },
                    { check: 'CORS origins are configured', ok: !!settings.security.cors_origins },
                    { check: 'Token expiry ≤ 8 hours', ok: settings.security.token_expiry_minutes <= 480 },
                  ].map(c => (
                    <div key={c.check} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      {c.ok ? <CheckCircle size={14} style={{ color: '#16a34a' }} /> : <AlertTriangle size={14} style={{ color: '#f59e0b' }} />}
                      <span style={{ color: c.ok ? '#166534' : '#92400e' }}>{c.check}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ MDRT TARGETS ═══════════ */}
          {activeTab === 'mdrt' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Target size={20} color="white" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>MDRT Qualification Targets</h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Set premium and case thresholds for MDRT qualification tracking</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Premium Target</label>
                  <input type="number" value={settings.mdrt.premium_target} onChange={e => updateSection('mdrt', 'premium_target', Number(e.target.value))} min={0} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Minimum premium to qualify for MDRT membership</span>
                </div>
                <div className="form-group">
                  <label>Cases Target</label>
                  <input type="number" value={settings.mdrt.cases_target} onChange={e => updateSection('mdrt', 'cases_target', Number(e.target.value))} min={1} />
                  <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Minimum number of policy cases needed</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Target Currency</label>
                  <select value={settings.mdrt.currency} onChange={e => updateSection('mdrt', 'currency', e.target.value)}>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="MMK">MMK (Myanmar Kyat)</option>
                    <option value="SGD">SGD (Singapore Dollar)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Qualification Year</label>
                  <select value={settings.mdrt.qualification_year} onChange={e => updateSection('mdrt', 'qualification_year', e.target.value)}>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: 16, padding: 16, background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: 12, border: '1px solid #fde68a' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>🏆 MDRT Tiers Reference</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {[
                    { tier: 'MDRT', premium: '$15,000', color: '#f59e0b' },
                    { tier: 'COT', premium: '$45,000', color: '#3b82f6' },
                    { tier: 'TOT', premium: '$90,000', color: '#7c5cfc' },
                  ].map(t => (
                    <div key={t.tier} style={{ textAlign: 'center', padding: 12, background: '#fff', borderRadius: 10, border: `2px solid ${t.color}20` }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: t.color }}>{t.tier}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.premium}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ NOTIFICATIONS ═══════════ */}
          {activeTab === 'notifications' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #f59e0b, #f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={20} color="white" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Notification Preferences</h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Control when and how you receive alerts</p>
                </div>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Email Notifications</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <Toggle checked={settings.notifications.email_on_claim} onChange={v => updateSection('notifications', 'email_on_claim', v)} label="New claim submitted" />
                <Toggle checked={settings.notifications.email_on_policy} onChange={v => updateSection('notifications', 'email_on_policy', v)} label="New policy created" />
                <Toggle checked={settings.notifications.email_on_workflow} onChange={v => updateSection('notifications', 'email_on_workflow', v)} label="Workflow task assigned" />
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Viber Notifications</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <Toggle checked={settings.notifications.viber_on_greeting} onChange={v => updateSection('notifications', 'viber_on_greeting', v)} label="Auto-send birthday greetings" />
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Daily Digest</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <Toggle checked={settings.notifications.daily_digest} onChange={v => updateSection('notifications', 'daily_digest', v)} label="Send daily summary email" />
                {settings.notifications.daily_digest && (
                  <div className="form-group" style={{ marginBottom: 0, width: 120 }}>
                    <input type="time" value={settings.notifications.digest_time} onChange={e => updateSection('notifications', 'digest_time', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ BRANDING ═══════════ */}
          {activeTab === 'branding' && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #ec4899, #f43f5e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Palette size={20} color="white" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Branding & Appearance</h2>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)' }}>Customize colors and visual identity</p>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Primary Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={settings.branding.primary_color} onChange={e => updateSection('branding', 'primary_color', e.target.value)} style={{ width: 40, height: 36, padding: 2, cursor: 'pointer' }} />
                    <input value={settings.branding.primary_color} onChange={e => updateSection('branding', 'primary_color', e.target.value)} style={{ flex: 1 }} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Accent Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={settings.branding.accent_color} onChange={e => updateSection('branding', 'accent_color', e.target.value)} style={{ width: 40, height: 36, padding: 2, cursor: 'pointer' }} />
                    <input value={settings.branding.accent_color} onChange={e => updateSection('branding', 'accent_color', e.target.value)} style={{ flex: 1 }} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Logo URL (optional)</label>
                <input value={settings.branding.logo_url} onChange={e => updateSection('branding', 'logo_url', e.target.value)} placeholder="https://your-logo.com/logo.png" />
              </div>
              <div className="form-group">
                <label>Sidebar Style</label>
                <select value={settings.branding.sidebar_style} onChange={e => updateSection('branding', 'sidebar_style', e.target.value)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              {/* Preview */}
              <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--border-card)' }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Preview</h4>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 80, height: 50, borderRadius: 10, background: `linear-gradient(135deg, ${settings.branding.primary_color}, ${settings.branding.accent_color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>Primary</div>
                  <div style={{ width: 80, height: 50, borderRadius: 10, background: settings.branding.primary_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>Button</div>
                  <div style={{ width: 80, height: 50, borderRadius: 10, background: settings.branding.accent_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600 }}>Accent</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

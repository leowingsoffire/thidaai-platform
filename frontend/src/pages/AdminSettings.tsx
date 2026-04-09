import { useState, useEffect } from 'react'
import {
  Settings, Mail, MessageSquare, Video, Globe, Shield, Save,
  CheckCircle, AlertTriangle, Eye, EyeOff, RefreshCw, Upload,
  Smartphone, Bell, Database, Palette, ChevronRight, Server
} from 'lucide-react'
import { api } from '../api'
import FeatureGuide from '../components/FeatureGuide'

interface SettingsData {
  general: { company_name: string; timezone: string; language: string; date_format: string; currency: string; currency_symbol: string }
  smtp: { host: string; port: number; username: string; password: string; from_email: string; from_name: string; use_tls: boolean; enabled: boolean }
  viber: { bot_token: string; bot_name: string; webhook_url: string; welcome_message: string; enabled: boolean }
  zoom: { client_id: string; client_secret: string; account_email: string; auto_record: boolean; enabled: boolean }
  notifications: { email_on_claim: boolean; email_on_policy: boolean; email_on_workflow: boolean; viber_on_greeting: boolean; daily_digest: boolean; digest_time: string }
  branding: { primary_color: string; accent_color: string; logo_url: string; sidebar_style: string }
}

const DEFAULTS: SettingsData = {
  general: { company_name: 'AIA Myanmar', timezone: 'Asia/Yangon', language: 'en', date_format: 'DD/MM/YYYY', currency: 'MMK', currency_symbol: 'K' },
  smtp: { host: '', port: 587, username: '', password: '', from_email: '', from_name: '', use_tls: true, enabled: false },
  viber: { bot_token: '', bot_name: '', webhook_url: '', welcome_message: 'Welcome to AIA Assistant! Send "help" to see available commands.', enabled: false },
  zoom: { client_id: '', client_secret: '', account_email: '', auto_record: false, enabled: false },
  notifications: { email_on_claim: true, email_on_policy: true, email_on_workflow: true, viber_on_greeting: true, daily_digest: false, digest_time: '08:00' },
  branding: { primary_color: '#7c5cfc', accent_color: '#ec4899', logo_url: '', sidebar_style: 'light' },
}

const TABS = [
  { key: 'general', label: 'General', icon: Globe, desc: 'Company info & preferences' },
  { key: 'smtp', label: 'Email / SMTP', icon: Mail, desc: 'Email server configuration' },
  { key: 'viber', label: 'Viber Bot', icon: Smartphone, desc: 'Viber messaging integration' },
  { key: 'zoom', label: 'Zoom', icon: Video, desc: 'Video meeting integration' },
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
            description="Configure all system integrations and preferences from one place. Set up SMTP email, Viber bot, Zoom meetings, notification rules, and branding."
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
              { label: 'SMTP Email', ok: settings.smtp.enabled && !!settings.smtp.host },
              { label: 'Viber Bot', ok: settings.viber.enabled && !!settings.viber.bot_token },
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

import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import { BarChart3, Users, ShieldCheck, CalendarCheck, DollarSign, Target, Calculator, Layers, GitBranch, FileSearch, AlertTriangle, Bell, ClipboardList, LogOut, CheckSquare, Building2, MessageSquare, Search, Settings, BookOpen } from 'lucide-react'
import { api, AuthUser } from './api'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Policies from './pages/Policies'
import Activities from './pages/Activities'
import Commissions from './pages/Commissions'
import Pipeline from './pages/Pipeline'
import MDRTTracker from './pages/MDRTTracker'
import Planning from './pages/Planning'
import WorkflowTasks from './pages/WorkflowTasks'
import Underwriting from './pages/Underwriting'
import Claims from './pages/Claims'
import AuditLog from './pages/AuditLog'
import Approvals from './pages/Approvals'
import CorporateSolutions from './pages/CorporateSolutions'
import AICommHub from './pages/AICommHub'
import AIChat from './components/AIChat'
import UserGuide from './pages/UserGuide'
import './App.css'

const NAV_MAIN = [
  { to: '/', icon: BarChart3, label: 'Dashboard', end: true },
  { to: '/workflows', icon: GitBranch, label: 'Workflows' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/policies', icon: ShieldCheck, label: 'Policies' },
  { to: '/underwriting', icon: FileSearch, label: 'Underwriting' },
  { to: '/claims', icon: AlertTriangle, label: 'Claims' },
  { to: '/pipeline', icon: Layers, label: 'Pipeline' },
  { to: '/approvals', icon: CheckSquare, label: 'Approvals' },
  { to: '/activities', icon: CalendarCheck, label: 'Activities' },
  { to: '/commissions', icon: DollarSign, label: 'Commissions' },
  { to: '/mdrt', icon: Target, label: 'MDRT' },
  { to: '/planning', icon: Calculator, label: 'Planning' },
  { to: '/corporate', icon: Building2, label: 'Corporate' },
  { to: '/ai-hub', icon: MessageSquare, label: 'AI Hub' },
]

const NAV_BOTTOM = [
  { to: '/audit', icon: ClipboardList, label: 'Audit Trail' },
  { to: '/guide', icon: BookOpen, label: 'User Guide' },
]

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/workflows': 'Workflows',
  '/clients': 'Clients',
  '/policies': 'Policies',
  '/underwriting': 'Underwriting',
  '/claims': 'Claims',
  '/pipeline': 'Pipeline',
  '/approvals': 'Approvals',
  '/activities': 'Activities',
  '/commissions': 'Commissions',
  '/mdrt': 'MDRT Tracker',
  '/planning': 'Financial Planning',
  '/corporate': 'Corporate Solutions',
  '/ai-hub': 'AI Communication Hub',
  '/audit': 'Audit Trail',
  '/guide': 'User Guide',
}

export default function App() {
  const location = useLocation()
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (user) {
      api.getUnreadCount().then(r => setUnread(r.count)).catch(() => {})
      const interval = setInterval(() => {
        api.getUnreadCount().then(r => setUnread(r.count)).catch(() => {})
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  function handleLogin(u: AuthUser, token: string) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  if (!user) return <Login onLogin={handleLogin} />

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo heart-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="heartGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#60a5fa"/>
                  <stop offset="25%" stopColor="#818cf8"/>
                  <stop offset="50%" stopColor="#c084fc"/>
                  <stop offset="75%" stopColor="#f472b6"/>
                  <stop offset="100%" stopColor="#fb7185"/>
                </linearGradient>
                <linearGradient id="goldStroke" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fbbf24"/>
                  <stop offset="30%" stopColor="#fde68a"/>
                  <stop offset="50%" stopColor="#fffbeb"/>
                  <stop offset="70%" stopColor="#fde68a"/>
                  <stop offset="100%" stopColor="#f59e0b"/>
                </linearGradient>
                <linearGradient id="goldShine" x1="-1" y1="0" x2="0" y2="0" gradientUnits="objectBoundingBox">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)"/>
                  <stop offset="40%" stopColor="rgba(255,255,255,0)"/>
                  <stop offset="50%" stopColor="rgba(255,255,255,0.9)"/>
                  <stop offset="60%" stopColor="rgba(255,255,255,0)"/>
                  <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
                  <animateTransform attributeName="gradientTransform" type="translate" from="-0.5 0" to="1.5 0" dur="3s" repeatCount="indefinite"/>
                </linearGradient>
                <mask id="heartMask">
                  <path d="M16 28C16 28 3 20 3 11.5C3 7.36 6.36 4 10.5 4C13 4 15.1 5.3 16 7.3C16.9 5.3 19 4 21.5 4C25.64 4 29 7.36 29 11.5C29 20 16 28 16 28Z" fill="none" stroke="white" strokeWidth="2.5"/>
                </mask>
              </defs>
              <path className="heart-body" d="M16 28C16 28 3 20 3 11.5C3 7.36 6.36 4 10.5 4C13 4 15.1 5.3 16 7.3C16.9 5.3 19 4 21.5 4C25.64 4 29 7.36 29 11.5C29 20 16 28 16 28Z" fill="url(#heartGrad)"/>
              <path className="heart-gold-outline" d="M16 28C16 28 3 20 3 11.5C3 7.36 6.36 4 10.5 4C13 4 15.1 5.3 16 7.3C16.9 5.3 19 4 21.5 4C25.64 4 29 7.36 29 11.5C29 20 16 28 16 28Z" fill="none" stroke="url(#goldStroke)" strokeWidth="2" strokeLinejoin="round"/>
              <rect className="heart-shine-sweep" x="0" y="0" width="32" height="32" fill="url(#goldShine)" mask="url(#heartMask)"/>
              <circle className="sparkle s1" cx="8" cy="7" r="1.2" fill="#fbbf24"/>
              <circle className="sparkle s2" cx="25" cy="6" r="1" fill="#fde68a"/>
              <circle className="sparkle s3" cx="5" cy="18" r="0.8" fill="#f59e0b"/>
              <circle className="sparkle s4" cx="27" cy="16" r="1.1" fill="#fbbf24"/>
              <circle className="sparkle s5" cx="16" cy="3" r="0.9" fill="#fde68a"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">AI Assistant</span>
            <span className="brand-sub">AI Power Workflow</span>
          </div>
        </div>

        <div className="sidebar-section-label">Main menu</div>
        <nav className="sidebar-nav">
          {NAV_MAIN.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <n.icon size={18} />
              <span>{n.label}</span>
            </NavLink>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            {NAV_BOTTOM.map(n => (
              <NavLink key={n.to} to={n.to} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                <n.icon size={18} />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="agent-avatar">{user.full_name.split(' ').map(w => w[0]).join('').substring(0, 2)}</div>
          <div className="agent-info">
            <strong>{user.full_name}</strong>
            <small>{user.role} · {user.department || 'AIA'}</small>
          </div>
          <button className="btn-icon" onClick={handleLogout} title="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-content">
        {/* Top header bar with breadcrumb, search, notifications */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24, paddingBottom: 16,
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)' }}>
            <span>{PAGE_TITLES[location.pathname] || 'Page'}</span>
            <span style={{ opacity: 0.4 }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>Overview</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
              background: 'var(--bg-card)', border: '1px solid var(--border-card)',
              borderRadius: 10, cursor: 'pointer', color: 'var(--text-dim)', fontSize: 13,
            }}>
              <Search size={14} />
              <span>Search...</span>
            </div>
            {unread > 0 && (
              <span className="notification-badge" title={`${unread} unread notifications`}>
                <Bell size={14} /> {unread}
              </span>
            )}
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 12, fontWeight: 700,
            }}>
              {user.full_name.split(' ').map(w => w[0]).join('').substring(0, 2)}
            </div>
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workflows" element={<WorkflowTasks />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/underwriting" element={<Underwriting />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/commissions" element={<Commissions />} />
          <Route path="/mdrt" element={<MDRTTracker />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/corporate" element={<CorporateSolutions />} />
          <Route path="/ai-hub" element={<AICommHub />} />
          <Route path="/guide" element={<UserGuide />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <AIChat />
    </div>
  )
}

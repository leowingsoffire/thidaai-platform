import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, BarChart3, Users, ShieldCheck, FileSearch, AlertTriangle, Layers,
  CheckSquare, CalendarCheck, DollarSign, Target, Calculator, Building2,
  MessageSquare, ClipboardList, GitBranch, Bot, ChevronRight, ChevronDown,
  ArrowRight, Sparkles, Search, ExternalLink, Zap, HelpCircle, Star,
  Shield, Play, Info, Link2, Eye, LogIn, Lightbulb, Rocket, Map,
  MousePointerClick, ArrowRightCircle,
} from 'lucide-react'

/* ─── types ─── */
interface Section { id: string; icon: any; title: string; route?: string; color: string }
interface FAQ { q: string; a: string; links?: { label: string; route: string }[] }

/* ─── data ─── */
const SECTIONS: Section[] = [
  { id: 'dashboard',    icon: BarChart3,      title: 'Dashboard',          route: '/',            color: '#6366f1' },
  { id: 'clients',      icon: Users,          title: 'Clients',            route: '/clients',     color: '#8b5cf6' },
  { id: 'policies',     icon: ShieldCheck,    title: 'Policies',           route: '/policies',    color: '#0ea5e9' },
  { id: 'underwriting', icon: FileSearch,     title: 'Underwriting',       route: '/underwriting',color: '#f59e0b' },
  { id: 'claims',       icon: AlertTriangle,  title: 'Claims',             route: '/claims',      color: '#ef4444' },
  { id: 'pipeline',     icon: Layers,         title: 'Pipeline',           route: '/pipeline',    color: '#10b981' },
  { id: 'approvals',    icon: CheckSquare,    title: 'Approvals',          route: '/approvals',   color: '#14b8a6' },
  { id: 'activities',   icon: CalendarCheck,  title: 'Activities',         route: '/activities',  color: '#f97316' },
  { id: 'commissions',  icon: DollarSign,     title: 'Commissions',        route: '/commissions', color: '#22c55e' },
  { id: 'mdrt',         icon: Target,         title: 'MDRT Tracker',       route: '/mdrt',        color: '#eab308' },
  { id: 'planning',     icon: Calculator,     title: 'Financial Planning', route: '/planning',    color: '#3b82f6' },
  { id: 'corporate',    icon: Building2,      title: 'Corporate Solutions',route: '/corporate',   color: '#64748b' },
  { id: 'ai-hub',       icon: MessageSquare,  title: 'AI Communication Hub',route: '/ai-hub',    color: '#a855f7' },
  { id: 'workflows',    icon: GitBranch,      title: 'Workflows',          route: '/workflows',   color: '#06b6d4' },
  { id: 'audit',        icon: ClipboardList,  title: 'Audit Trail',        route: '/audit',       color: '#78716c' },
  { id: 'ai-chat',      icon: Bot,            title: 'AI Assistant Chat',  route: undefined,      color: '#ec4899' },
]

const FAQS: FAQ[] = [
  {
    q: 'How do I create a new client?',
    a: 'Go to Clients, click "+ Add Client", fill in the form, and Submit. Or ask the AI Assistant: "add client Thida Win, phone +959771001001".',
    links: [{ label: 'Open Clients', route: '/clients' }],
  },
  {
    q: 'How do I submit a claim?',
    a: 'Navigate to Claims, click "New Claim", select the policy, enter claim type, amount, incident date, and Submit. The system auto-runs fraud check and creates a workflow.',
    links: [{ label: 'Open Claims', route: '/claims' }, { label: 'View Workflows', route: '/workflows' }],
  },
  {
    q: 'What can the AI Assistant do?',
    a: 'The floating chat (bottom-right button) can answer questions, create clients/policies/claims, check dashboards, schedule activities, and more. Type "help" to see all commands. Write operations go through the Approvals queue.',
    links: [{ label: 'View Approvals', route: '/approvals' }],
  },
  {
    q: 'How does the approval system work?',
    a: 'When the AI performs write operations (create, update, delete), it queues an approval request with a confidence score. Go to Approvals to review and approve or reject each action.',
    links: [{ label: 'Open Approvals', route: '/approvals' }],
  },
  {
    q: 'What is MDRT?',
    a: 'Million Dollar Round Table — an industry benchmark for elite insurance agents. The MDRT Tracker shows your progress toward qualification targets for premium and case count.',
    links: [{ label: 'Open MDRT Tracker', route: '/mdrt' }],
  },
  {
    q: 'How do workflows function?',
    a: 'Policies, claims, and underwriting cases automatically trigger workflows with SLA timers. View them in Workflows. Tasks are assigned to roles and escalate to manager if overdue.',
    links: [{ label: 'Open Workflows', route: '/workflows' }, { label: 'Open Policies', route: '/policies' }, { label: 'Open Claims', route: '/claims' }],
  },
  {
    q: 'Can I send greetings to clients?',
    a: 'Yes — go to AI Hub Auto-Greetings tab or open a Client Detail page Greetings tab. Send via SMS, Viber, Telegram, or WhatsApp.',
    links: [{ label: 'Open AI Hub', route: '/ai-hub' }, { label: 'Open Clients', route: '/clients' }],
  },
  {
    q: 'How is the 4 Pillars assessment used?',
    a: 'On each Client Detail page, the 4 Pillars (Live Well, Think Well, Feel Well, Plan Well) show coverage gaps across health, education, life, and retirement. Use "AI Needs Analysis" to get personalized recommendations.',
    links: [{ label: 'Open Clients', route: '/clients' }],
  },
  {
    q: 'Where can I track my earnings?',
    a: 'Go to Commissions to see total earned, pending, and paid commissions by type (First Year, Renewal). The Dashboard also shows commission totals and revenue trends.',
    links: [{ label: 'Open Commissions', route: '/commissions' }, { label: 'Open Dashboard', route: '/' }],
  },
  {
    q: 'How do I use financial planning tools?',
    a: 'Navigate to Planning to access Retirement Calculator, Education Calculator, Tax Planning, and Cash Flow Health Score. Use these with clients to identify coverage gaps.',
    links: [{ label: 'Open Planning', route: '/planning' }],
  },
]

/* ─── End-to-End Journeys ─── */
interface JourneyStep { title: string; desc: string; page?: string; route?: string }
interface Journey { title: string; subtitle: string; icon: any; color: string; steps: JourneyStep[]; tip?: string }

const JOURNEYS: Journey[] = [
  {
    title: 'Journey 1: Onboard a New Client & Sell a Policy',
    subtitle: 'The most common workflow — from first contact to active coverage',
    icon: Users, color: '#8b5cf6',
    steps: [
      { title: 'Register the Client', desc: 'Go to Clients → click "+ Add Client" → enter name, phone, email, DOB, occupation, monthly income → Submit.', page: 'Clients Page', route: '/clients' },
      { title: 'View Client Profile & Run Needs Analysis', desc: 'Click the client row to open their detail page. Review the 4 Pillars assessment (Live Well, Think Well, Feel Well, Plan Well). Click "AI Needs Analysis" for personalized product recommendations.', page: 'Client Detail', route: '/clients' },
      { title: 'Create a Pipeline Deal', desc: 'Go to Pipeline → "+ New Deal" → select the client, choose a product, set expected premium & probability → Submit. The deal starts in "Prospect" stage.', page: 'Pipeline Page', route: '/pipeline' },
      { title: 'Move the Deal Through Stages', desc: 'As you progress with the client, click stage buttons on the deal card: Prospect → Approach → Fact Find → Proposal → Negotiation → Closed Won.', page: 'Pipeline Page', route: '/pipeline' },
      { title: 'Create the Policy', desc: 'Once the deal is closed, go to Policies → "+ New Policy" → select client, product (e.g. AIA Health Shield), premium, sum assured, payment frequency → Submit.', page: 'Policies Page', route: '/policies' },
      { title: 'Underwriting Review', desc: 'The system auto-creates an underwriting case. Go to Underwriting to check the risk score. The engine auto-assesses: Preferred (≤5), Standard (≤10), Substandard (≤15), or Declined (>15).', page: 'Underwriting Page', route: '/underwriting' },
      { title: 'Log the Activity', desc: 'Go to Activities → "+ Log Activity" to record the client meeting/call that resulted in the sale. This helps track your productivity.', page: 'Activities Page', route: '/activities' },
      { title: 'Check Your Commission', desc: 'Go to Commissions to see the first-year commission created for this policy. Check MDRT Tracker to see how the new premium contributes to your qualification target.', page: 'Commissions → MDRT', route: '/commissions' },
    ],
    tip: 'Pro Tip: You can also do this entire flow using the AI Assistant — just type "add client Thida Win" then "create policy for Thida" and the AI handles the rest (with approval required).',
  },
  {
    title: 'Journey 2: Process a Claim End-to-End',
    subtitle: 'From claim submission through fraud check to payment',
    icon: AlertTriangle, color: '#ef4444',
    steps: [
      { title: 'Submit the Claim', desc: 'Go to Claims → "New Claim" → select the policy, choose claim type (Health, Death, Disability, Accident, Maturity, Surrender), enter claimed amount & incident date → Submit.', page: 'Claims Page', route: '/claims' },
      { title: 'Document Verification', desc: 'The claim workflow auto-starts. First stage: Docs Verification. Upload supporting documents using the expandable document panel on the claim row.', page: 'Claims Page', route: '/claims' },
      { title: 'Fraud Check (Automatic)', desc: 'The system runs auto-fraud detection. A fraud score is computed. Claims with high scores get flagged for manual review. Check the fraud flag indicator.', page: 'Claims Page', route: '/claims' },
      { title: 'Assessment & Decision', desc: 'At the Assessment stage, review all evidence. Click "Approve" (set approved amount) or "Reject" (with reason). Approved claims move to Payment Processing.', page: 'Claims Page', route: '/claims' },
      { title: 'Payment & Closure', desc: 'Approved claims go through Payment Processing → Closed. The full lifecycle is tracked in Workflows.', page: 'Workflows Page', route: '/workflows' },
      { title: 'Audit Trail', desc: 'Every decision (approve, reject, fraud flag) is logged. Go to Audit Trail and filter by "Claims" to see the complete history.', page: 'Audit Trail', route: '/audit' },
    ],
    tip: 'Pro Tip: Claims with fraud scores above threshold are automatically flagged. Always check the fraud indicator before approving large claims.',
  },
  {
    title: 'Journey 3: Daily Agent Workflow',
    subtitle: 'What to check every day to stay on top of your work',
    icon: CalendarCheck, color: '#f97316',
    steps: [
      { title: 'Start with the Dashboard', desc: 'Login and review your KPI cards — total clients, policies, premium, commissions. Check the AI Recommendations section for suggested next actions.', page: 'Dashboard', route: '/' },
      { title: 'Check Your Workflow Tasks', desc: 'Go to Workflows → "My Tasks" tab to see all tasks assigned to you. Focus on overdue items first (highlighted in red). Complete or transition pending tasks.', page: 'Workflows Page', route: '/workflows' },
      { title: 'Review Pending Approvals', desc: 'Visit Approvals to review any AI-generated actions waiting for your decision. Check the confidence score before approving.', page: 'Approvals Page', route: '/approvals' },
      { title: 'Review Pipeline Deals', desc: 'Check your Pipeline — any deals that need follow-up today? Move deals to the next stage as conversations progress.', page: 'Pipeline Page', route: '/pipeline' },
      { title: 'Log Your Activities', desc: 'Record all client calls, meetings, and follow-ups in Activities. This tracks your productivity and helps with MDRT benchmarking.', page: 'Activities Page', route: '/activities' },
      { title: 'Send Client Greetings', desc: 'Check AI Hub → Auto-Greetings tab for upcoming birthdays/anniversaries. Send personalized greetings via Viber, Telegram, SMS, or WhatsApp.', page: 'AI Hub', route: '/ai-hub' },
      { title: 'Review MDRT Progress', desc: 'End your day on MDRT Tracker to see how you\'re progressing toward your qualification targets and compare against peers.', page: 'MDRT Tracker', route: '/mdrt' },
    ],
    tip: 'Pro Tip: Use the AI Assistant shortcut — type "what\'s planned" to see your daily agenda, or "how\'s business" for a quick dashboard summary.',
  },
  {
    title: 'Journey 4: Corporate Client Proposal',
    subtitle: 'Group insurance quotation for a company',
    icon: Building2, color: '#64748b',
    steps: [
      { title: 'Create Company Profile', desc: 'Go to Corporate Solutions → "+ New Profile" → enter company name, industry, employee count, average age, revenue, HR contact.', page: 'Corporate Page', route: '/corporate' },
      { title: 'Review Risk Assessment', desc: 'The system auto-generates a risk assessment based on industry and employee demographics. Review the risk rating.', page: 'Corporate Page', route: '/corporate' },
      { title: 'Calculate Group Premium', desc: 'Switch to the "Group Calculator" tab → enter employee count, average age, plan type (Basic/Standard/Premium/Enterprise), coverage level → get premium estimate.', page: 'Corporate Page', route: '/corporate' },
      { title: 'Compare Benefits', desc: 'Use the "Benefits Comparison" tab to show the client their existing benefits vs. your proposed AIA benefits with cost analysis.', page: 'Corporate Page', route: '/corporate' },
      { title: 'Use Financial Planning Tools', desc: 'Complement your proposal with Planning tools — show Retirement, Education, or Cash Flow projections relevant to group benefits.', page: 'Planning Page', route: '/planning' },
    ],
    tip: 'Pro Tip: Upload proposal documents directly to the company profile using the document manager panel.',
  },
]

/* ─── styles ─── */
const linkChip = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600,
  color, padding: '3px 10px', borderRadius: 6, background: color + '12',
  cursor: 'pointer', transition: 'all 0.15s', border: `1px solid ${color}25`,
  textDecoration: 'none', whiteSpace: 'nowrap' as const,
})

const cardHover = (el: HTMLElement, color: string, enter: boolean) => {
  el.style.borderColor = enter ? color : 'var(--border-card)'
  el.style.transform = enter ? 'translateY(-3px)' : 'translateY(0)'
  el.style.boxShadow = enter ? `0 6px 20px ${color}18` : 'none'
}

/* ─── component ─── */
export default function UserGuide() {
  const navigate = useNavigate()
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [activeJourney, setActiveJourney] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSections = SECTIONS.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (FEATURE_CONTENT[s.id]?.summary || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const scrollToSection = useCallback((id: string) => {
    setActiveSection(id)
    setTimeout(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }, [])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #a855f7 70%, #ec4899 100%)',
        borderRadius: 16, padding: '36px 40px', marginBottom: 28, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: '40%', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={26} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: 'white' }}>AI Assist User Guide</h1>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Learn every feature of the ThidaAI Platform — your all-in-one insurance workflow assistant</p>
            </div>
          </div>
          {/* Quick-access stat chips (clickable) */}
          <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
            {[
              { icon: Zap, label: '16 Features', desc: 'Full workflow coverage', action: () => scrollToSection('dashboard') },
              { icon: Bot, label: 'AI Powered', desc: 'Natural language commands', action: () => scrollToSection('ai-chat') },
              { icon: Shield, label: 'Audit Trail', desc: 'Full compliance logging', action: () => navigate('/audit') },
              { icon: Star, label: 'MDRT Ready', desc: 'Track qualifications', action: () => navigate('/mdrt') },
            ].map((s, i) => (
              <div key={i} onClick={s.action} style={{
                display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '8px 14px', cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.22)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.12)' }}
              >
                <s.icon size={16} color="white" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ GETTING STARTED — First-time User Guide ═══ */}
      <div style={{
        background: 'var(--bg-card)', border: '2px solid #22c55e40',
        borderRadius: 16, padding: '24px 28px', marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#22c55e18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={22} color="#22c55e" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Getting Started — Where to Begin</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)' }}>Follow these steps if you're using the app for the first time</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { step: '1', title: 'Log In to Your Account', desc: 'Use your credentials to sign in. Admin: tdadmin / admin123 · Agent: tdagent / agent123. Click "Sign In" on the Login page.', route: '/login', icon: LogIn, color: '#6366f1' },
            { step: '2', title: 'Explore the Dashboard', desc: 'After login you land on the Dashboard — your command center. Review KPI cards (clients, policies, premium, commissions) and AI Recommendations.', route: '/', icon: BarChart3, color: '#8b5cf6' },
            { step: '3', title: 'Add Your First Client', desc: 'Go to Clients → click "+ Add Client" → fill name, phone, email, DOB, occupation, income → Submit. This is the foundation for everything.', route: '/clients', icon: Users, color: '#0ea5e9' },
            { step: '4', title: 'Create a Policy for the Client', desc: 'Go to Policies → "+ New Policy" → select your client, pick a product (e.g. AIA Health Shield), set premium & sum assured → Submit. An underwriting case is auto-created.', route: '/policies', icon: ShieldCheck, color: '#10b981' },
            { step: '5', title: 'Try the AI Assistant', desc: 'Click the floating chat button (bottom-right corner) and type "help" to see what the AI can do. Try "how many clients do I have?" or "dashboard summary".', icon: Bot, color: '#ec4899' },
            { step: '6', title: 'Check Workflows & Activities', desc: 'Visit Workflows to see auto-created tasks. Go to Activities to log calls and meetings. These pages track your day-to-day work.', route: '/workflows', icon: GitBranch, color: '#06b6d4' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
              background: 'var(--bg-elevated)', borderRadius: 10, cursor: s.route ? 'pointer' : 'default',
              border: '1px solid transparent', transition: 'all 0.2s',
            }}
            onClick={() => s.route && navigate(s.route)}
            onMouseEnter={e => { if (s.route) { (e.currentTarget as HTMLDivElement).style.borderColor = s.color + '40'; (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)' } }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)' }}
            >
              <div style={{
                minWidth: 32, height: 32, borderRadius: '50%', background: s.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 14, fontWeight: 700, marginTop: 2,
              }}>{s.step}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <s.icon size={14} color={s.color} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.title}</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
              {s.route && <ExternalLink size={12} color={s.color} style={{ marginTop: 6, flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ END-TO-END JOURNEYS ═══ */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <Map size={20} color="#3b82f6" /> End-to-End Journeys — Common Workflows
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: -8, marginBottom: 14 }}>
          These multi-step walkthroughs show how pages connect together for real-world tasks.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {JOURNEYS.map((j, ji) => (
            <div key={ji} style={{
              background: 'var(--bg-card)', border: `1px solid ${j.color}30`,
              borderRadius: 12, overflow: 'hidden',
            }}>
              <button
                onClick={() => setActiveJourney(activeJourney === ji ? null : ji)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-primary)', textAlign: 'left',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: j.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <j.icon size={18} color={j.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{j.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{j.subtitle}</div>
                </div>
                {activeJourney === ji ? <ChevronDown size={16} color="var(--text-dim)" /> : <ChevronRight size={16} color="var(--text-dim)" />}
              </button>
              {activeJourney === ji && (
                <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                    {j.steps.map((step, si) => (
                      <div key={si} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px',
                        background: 'var(--bg-elevated)', borderRadius: 8,
                        cursor: step.route ? 'pointer' : 'default',
                        border: '1px solid transparent', transition: 'all 0.15s',
                      }}
                      onClick={() => step.route && navigate(step.route)}
                      onMouseEnter={e => { if (step.route) (e.currentTarget as HTMLDivElement).style.borderColor = j.color + '40' }}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'}
                      >
                        <div style={{
                          minWidth: 24, height: 24, borderRadius: '50%', background: j.color,
                          color: 'white', fontSize: 11, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                        }}>{si + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{step.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>{step.desc}</div>
                          {step.page && <span style={{ fontSize: 11, color: j.color, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 600 }}><MousePointerClick size={10} /> {step.page}</span>}
                        </div>
                        {step.route && <ArrowRightCircle size={14} color={j.color} style={{ flexShrink: 0, marginTop: 4 }} />}
                      </div>
                    ))}
                  </div>
                  {j.tip && (
                    <div style={{
                      marginTop: 12, padding: '10px 14px', borderRadius: 8,
                      background: '#f59e0b12', border: '1px solid #f59e0b25',
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <Lightbulb size={14} color="#f59e0b" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{j.tip}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick-Start Workflow */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <Sparkles size={20} color="#f59e0b" /> Quick-Start Workflow
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
          {[
            { step: '1', label: 'Add Client',     page: '/clients',      color: '#8b5cf6' },
            { step: '2', label: 'Create Policy',   page: '/policies',     color: '#0ea5e9' },
            { step: '3', label: 'Underwriting',     page: '/underwriting', color: '#f59e0b' },
            { step: '4', label: 'Pipeline Deal',    page: '/pipeline',     color: '#10b981' },
            { step: '5', label: 'Log Activity',     page: '/activities',   color: '#f97316' },
            { step: '6', label: 'Track Commission', page: '/commissions',  color: '#22c55e' },
            { step: '7', label: 'Submit Claim',     page: '/claims',       color: '#ef4444' },
          ].map((s, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                  borderRadius: 12, padding: '14px 16px', minWidth: 112, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => cardHover(e.currentTarget, s.color, true)}
                onMouseLeave={e => cardHover(e.currentTarget, s.color, false)}
                onClick={() => navigate(s.page)}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 13, fontWeight: 700,
                }}>{s.step}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>{s.label}</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <ExternalLink size={9} /> Go to page
                </span>
              </div>
              {i < arr.length - 1 && <ArrowRight size={16} color="var(--text-dim)" style={{ margin: '0 4px', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Feature Map Grid */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <Eye size={20} color="#6366f1" /> Feature Map — Click to Jump
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 8 }}>
          {SECTIONS.map(s => {
            const Icon = s.icon
            return (
              <div key={s.id} onClick={() => s.route ? navigate(s.route) : scrollToSection(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                }}
                onMouseEnter={e => cardHover(e.currentTarget, s.color, true)}
                onMouseLeave={e => cardHover(e.currentTarget, s.color, false)}
              >
                <div style={{ width: 30, height: 30, borderRadius: 7, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={15} color={s.color} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>{s.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 2 }}>
                    {s.route ? <><ExternalLink size={8} /> Open</> : <><Info size={8} /> Details</>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input
          type="text" placeholder="Search features, workflows, or commands..." value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px 10px 38px', borderRadius: 10,
            border: '1px solid var(--border-card)', background: 'var(--bg-card)',
            color: 'var(--text-primary)', fontSize: 14, outline: 'none',
          }}
        />
      </div>

      {/* Feature Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filteredSections.map(section => (
          <div key={section.id} ref={el => { sectionRefs.current[section.id] = el }}>
            <FeatureSection
              section={section}
              isOpen={activeSection === section.id}
              onToggle={() => setActiveSection(prev => prev === section.id ? null : section.id)}
              onNavigate={route => navigate(route)}
              onScrollTo={scrollToSection}
            />
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ marginTop: 36, marginBottom: 36 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <HelpCircle size={20} color="#6366f1" /> Frequently Asked Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-card)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, textAlign: 'left',
                }}
              >
                <span>{faq.q}</span>
                {expandedFaq === i ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {expandedFaq === i && (
                <div style={{ padding: '0 16px 14px' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 8px' }}>{faq.a}</p>
                  {faq.links && faq.links.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {faq.links.map((lnk, j) => (
                        <span key={j} onClick={() => navigate(lnk.route)} style={linkChip('#6366f1')}>
                          <ExternalLink size={10} /> {lnk.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Feature Section Accordion
   ═══════════════════════════════════════════════════════════ */
function FeatureSection({ section, isOpen, onToggle, onNavigate, onScrollTo }: {
  section: Section; isOpen: boolean; onToggle: () => void
  onNavigate: (route: string) => void; onScrollTo: (id: string) => void
}) {
  const Icon = section.icon
  const content = FEATURE_CONTENT[section.id]

  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid ${isOpen ? section.color + '40' : 'var(--border-card)'}`,
      borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)', textAlign: 'left',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: section.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={section.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{section.title}</div>
          {content && <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{content.summary}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {section.route && (
            <span
              onClick={e => { e.stopPropagation(); onNavigate(section.route!) }}
              style={{ ...linkChip(section.color), fontSize: 12 }}
              onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.background = section.color + '22' }}
              onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.background = section.color + '12' }}
            >
              <Play size={10} /> Open Page
            </span>
          )}
          {isOpen ? <ChevronDown size={16} color="var(--text-dim)" /> : <ChevronRight size={16} color="var(--text-dim)" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && content && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border-subtle)' }}>
          {/* Description */}
          <div style={{ marginTop: 14 }}>
            <SectionLabel color={section.color}>What it does</SectionLabel>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{content.description}</p>
          </div>

          {/* Key features grid */}
          {content.features.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <SectionLabel color={section.color}>Key Features</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                {content.features.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
                    background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)',
                    border: '1px solid transparent', transition: 'all 0.15s',
                    cursor: f.route ? 'pointer' : 'default',
                  }}
                  onClick={() => f.route && onNavigate(f.route)}
                  onMouseEnter={e => { if (f.route) { (e.currentTarget as HTMLDivElement).style.borderColor = section.color + '40' } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}
                  >
                    <span style={{ color: section.color, fontWeight: 700, fontSize: 14, lineHeight: '18px', flexShrink: 0 }}>&#x2022;</span>
                    <span style={{ flex: 1 }}>{f.label}</span>
                    {f.route && <ExternalLink size={11} color={section.color} style={{ flexShrink: 0, marginTop: 3 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to use */}
          {content.steps && content.steps.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <SectionLabel color={section.color}>How to Use</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {content.steps.map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
                    background: 'var(--bg-elevated)', borderRadius: 8,
                    cursor: step.linkRoute ? 'pointer' : 'default',
                    border: '1px solid transparent', transition: 'all 0.15s',
                  }}
                  onClick={() => step.linkRoute && onNavigate(step.linkRoute)}
                  onMouseEnter={e => { if (step.linkRoute) { (e.currentTarget as HTMLDivElement).style.borderColor = section.color + '40' } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}
                  >
                    <div style={{
                      minWidth: 22, height: 22, borderRadius: '50%', background: section.color,
                      color: 'white', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>{step.text}</span>
                    {step.linkRoute && <ExternalLink size={11} color={section.color} style={{ flexShrink: 0, marginTop: 4 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Assistant commands */}
          {content.aiCommands && content.aiCommands.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Bot size={14} color="#ec4899" />
                <SectionLabel color="#ec4899" noMargin>AI Assistant Commands</SectionLabel>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {content.aiCommands.map((cmd, i) => (
                  <code key={i} style={{
                    padding: '5px 10px', borderRadius: 6,
                    background: '#ec489915', border: '1px solid #ec489930',
                    fontSize: 12, color: '#ec4899', fontFamily: 'monospace', cursor: 'default',
                  }}>"{cmd}"</code>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Info size={10} /> Type these in the floating AI chat (bottom-right button)
              </div>
            </div>
          )}

          {/* Pro Tips */}
          {content.tips && content.tips.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Lightbulb size={14} color="#f59e0b" />
                <SectionLabel color="#f59e0b" noMargin>Pro Tips</SectionLabel>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {content.tips.map((tip, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px',
                    background: '#f59e0b08', borderRadius: 8, border: '1px solid #f59e0b18',
                  }}>
                    <span style={{ color: '#f59e0b', fontSize: 12, marginTop: 1 }}>💡</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workflow diagram(s) */}
          {content.workflows && content.workflows.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <SectionLabel color={section.color}>
                {content.workflows.length > 1 ? 'Workflow Definitions' : 'Workflow'}
              </SectionLabel>
              {content.workflows.map((wf, wi) => (
                <div key={wi} style={{ marginBottom: wi < content.workflows!.length - 1 ? 14 : 0 }}>
                  {wf.name && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GitBranch size={12} color={section.color} /> {wf.name}
                      {wf.sla && <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 400 }}>({wf.sla})</span>}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0' }}>
                    {wf.stages.map((stage, i, arr) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                          background: stage.type === 'start' ? section.color
                            : stage.type === 'end' ? '#22c55e'
                            : stage.type === 'reject' ? '#ef4444'
                            : 'var(--bg-elevated)',
                          color: (stage.type === 'start' || stage.type === 'end' || stage.type === 'reject') ? 'white' : 'var(--text-secondary)',
                          border: `1px solid ${stage.type === 'start' ? section.color
                            : stage.type === 'end' ? '#22c55e'
                            : stage.type === 'reject' ? '#ef4444'
                            : 'var(--border-card)'}`,
                        }}>{stage.label}</div>
                        {i < arr.length - 1 && (
                          <ArrowRight size={13} color="var(--text-dim)" style={{ margin: '0 3px', flexShrink: 0 }} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                onClick={() => onNavigate('/workflows')}>
                <Link2 size={10} /> View live workflow instances
              </div>
            </div>
          )}

          {/* Connected features / Related pages */}
          {content.related && content.related.length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Link2 size={11} /> Connected:
                </span>
                {content.related.map((r, i) => {
                  const rs = SECTIONS.find(s => s.id === r)
                  if (!rs) return null
                  const RIcon = rs.icon
                  return (
                    <span key={i}
                      onClick={() => rs.route ? onNavigate(rs.route) : onScrollTo(rs.id)}
                      style={{ ...linkChip(rs.color), display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.background = rs.color + '22' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.background = rs.color + '12' }}
                    >
                      <RIcon size={11} /> {rs.title}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── small helpers ─── */
function SectionLabel({ color, children, noMargin }: { color: string; children: React.ReactNode; noMargin?: boolean }) {
  return (
    <h4 style={{
      fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.6,
      marginTop: 0, marginBottom: noMargin ? 0 : 8,
    }}>{children}</h4>
  )
}

/* ═══════════════════════════════════════════════════════════
   Feature Content Data
   ═══════════════════════════════════════════════════════════ */
interface WfStage { label: string; type?: 'start' | 'end' | 'reject' | 'normal' }
interface Wf { name?: string; stages: WfStage[]; sla?: string }
interface LinkedFeature { label: string; route?: string }
interface LinkedStep { text: string; linkRoute?: string }

interface FeatureContent {
  summary: string
  description: string
  features: LinkedFeature[]
  steps?: LinkedStep[]
  aiCommands?: string[]
  workflows?: Wf[]
  related?: string[]
  tips?: string[]
}

const S = (label: string, type: WfStage['type'] = 'normal'): WfStage => ({ label, type })

const FEATURE_CONTENT: Record<string, FeatureContent> = {
  dashboard: {
    summary: 'Real-time KPIs, revenue analytics, pipeline overview, and AI recommendations',
    description: 'Your command center showing all key performance indicators at a glance. View revenue trends, product breakdown, pipeline analysis, MDRT progress, and AI-powered action recommendations — all updated in real time.',
    features: [
      { label: 'Revenue analytics with yearly premium & commission trends', route: '/commissions' },
      { label: 'Product breakdown pie chart (Life, Health, Investment, Education, Critical Illness, Cancer Care)', route: '/policies' },
      { label: 'Pipeline analysis — deal count & value by stage', route: '/pipeline' },
      { label: 'Performance radar chart across 6 metrics' },
      { label: 'MDRT progress indicator with qualification status', route: '/mdrt' },
      { label: 'AI-powered recommendations for next best actions' },
      { label: 'Quick actions for pending approvals & birthday reminders', route: '/approvals' },
      { label: 'Daily pipeline deals and revenue tracker (last 6 months)' },
    ],
    steps: [
      { text: 'Open the app — Dashboard loads automatically as your home page', linkRoute: '/' },
      { text: 'Review the KPI cards at top for total clients, policies, premium, and commissions' },
      { text: 'Check the AI Recommendations section for suggested next actions' },
      { text: 'Click "Pending Approvals" quick-action to review AI-generated tasks', linkRoute: '/approvals' },
      { text: 'Use the revenue chart to compare monthly premium vs commission trends' },
    ],
    aiCommands: ['dashboard', 'summary', "how's business", 'how many clients', 'how many policies'],
    tips: [
      'Start every day here — the AI Recommendations section tells you exactly what to focus on next.',
      'Click any KPI card number to navigate to the related page (e.g. click client count → Clients page).',
      'The pipeline funnel chart shows where your deals get stuck — focus on the narrowest stage.',
    ],
    related: ['pipeline', 'mdrt', 'approvals', 'commissions'],
  },

  clients: {
    summary: 'Client database with demographics, search, and the 4 Pillars assessment',
    description: 'Manage your complete client database. Add new clients with full demographics, search by name/phone/email, and dive into individual profiles with the AIA 4 Pillars coverage assessment: Live Well (health), Think Well (education), Feel Well (life), Plan Well (retirement).',
    features: [
      { label: 'Add clients with full demographics (name, phone, email, DOB, gender, occupation, income)', route: '/clients' },
      { label: 'Search & filter by name, phone, or email' },
      { label: 'Client detail page with comprehensive profile view' },
      { label: '4 Pillars Assessment — Live Well, Think Well, Feel Well, Plan Well' },
      { label: 'AI-powered Needs Analysis generates personalized coverage recommendations' },
      { label: 'View linked policies, proposals, and greeting history per client', route: '/policies' },
      { label: 'Send auto-greetings via SMS, Viber, Telegram, or WhatsApp', route: '/ai-hub' },
      { label: 'Policy renewal alerts for policies expiring within 60 days' },
    ],
    steps: [
      { text: 'Navigate to Clients from the sidebar menu', linkRoute: '/clients' },
      { text: 'Click "+ Add Client" to open the registration form' },
      { text: 'Fill in client details — name, phone, email, date of birth, occupation, monthly income' },
      { text: 'Click a client row to open their detail profile page' },
      { text: 'On the detail page, view the 4 Pillars coverage analysis' },
      { text: 'Click "AI Needs Analysis" to generate AI-powered recommendations' },
      { text: 'Use the Greetings tab to send birthday or anniversary messages' },
    ],
    aiCommands: ['add client', 'register customer', 'find client Thida', 'list clients', 'search customer'],
    tips: [
      'Always fill in the monthly income field — it feeds into risk scoring and 4 Pillars assessment.',
      'Use the search bar to find clients by name, phone, or email — it searches all fields.',
      'Check the "Policies expiring within 60 days" alert on client profiles to catch upcoming renewals.',
      'The AI Needs Analysis works best when all 4 Pillar sections have data filled in.',
    ],
    related: ['policies', 'pipeline', 'activities', 'ai-hub'],
  },

  policies: {
    summary: 'Create and manage insurance policies for all AIA product lines',
    description: 'The policy management hub where you create, view, and manage all insurance policies. Supports 7+ AIA products including Universal Life, Health Shield, Education Plan, and Critical Illness. Creating a policy automatically triggers an Underwriting workflow with SLA tracking.',
    features: [
      { label: 'Create policies with full details — policy number, product, premium, sum assured, dates', route: '/policies' },
      { label: 'AIA products: Universal Life, Short-term Endowment, Health Shield, Education Plan, Critical Illness, Cancer Care, Group Life' },
      { label: 'Filter by status: Active, Pending, Lapsed, Cancelled, Matured' },
      { label: 'Statistics cards showing active count and total premium (MMK)' },
      { label: 'Link policies to clients automatically', route: '/clients' },
      { label: 'Payment frequency options: Monthly, Quarterly, Semi-annual, Annual' },
      { label: 'Auto-creates underwriting case on submission', route: '/underwriting' },
    ],
    steps: [
      { text: 'Go to Policies from the sidebar', linkRoute: '/policies' },
      { text: 'Click "+ New Policy" to create a policy' },
      { text: 'Select the client, choose a product (e.g., AIA Health Shield), set premium and sum assured' },
      { text: 'Set the start date, payment frequency, and status' },
      { text: 'Submit — the system auto-creates an underwriting case and policy issuance workflow', linkRoute: '/underwriting' },
      { text: 'Use the status filter to find policies by status (active, lapsed, etc.)' },
    ],
    aiCommands: ['create policy', 'issue insurance', 'list policies', 'renew policy', 'cancel policy'],
    tips: [
      'Choose "Annual" payment frequency for higher first-year commissions when the client can afford it.',
      'After creating a policy, immediately check the Underwriting page to see the auto-generated risk assessment.',
      'Use the status filter to quickly spot lapsed policies that might need renewal outreach.',
    ],
    workflows: [{
      name: 'Policy Issuance (Happy Path)',
      sla: 'SLA: submitted 4h, under_review 24h, underwriting 48h, approved 8h',
      stages: [
        S('Draft', 'start'), S('Submitted'), S('Under Review'), S('Underwriting'),
        S('Approved'), S('Issued'), S('Completed', 'end'),
      ],
    }, {
      name: 'Policy Issuance (Rejected Path)',
      stages: [
        S('Draft', 'start'), S('Submitted'), S('Under Review'),
        S('Rejected', 'reject'), S('Draft (Re-submit)', 'start'),
      ],
    }],
    related: ['underwriting', 'claims', 'commissions', 'workflows'],
  },

  underwriting: {
    summary: 'Risk assessment with auto-scoring, manual review, and approve/decline decisions',
    description: 'The underwriting engine automatically scores risk based on client age, occupation, sum assured, and policy type. Cases are auto-assessed into risk categories (Preferred <=5, Standard <=10, Substandard <=15, Declined >15). Underwriters can approve, apply premium loading, or decline.',
    features: [
      { label: 'Automatic risk scoring engine from age, income ratio, premium, policy type' },
      { label: 'Risk categories: Preferred (<=5), Standard (<=10), Substandard (<=15), Declined (>15)' },
      { label: 'Filter cases: All, Pending, Auto Assessed, Manual Review, Decided' },
      { label: 'Decision options: Approve, Approve with Loading (25%), Decline' },
      { label: 'Add decision notes and conditions' },
      { label: 'AI risk analysis available per case' },
      { label: 'Auto-creates workflow with SLA tracking', route: '/workflows' },
    ],
    steps: [
      { text: 'When a policy is created, an underwriting case is auto-generated', linkRoute: '/policies' },
      { text: 'Navigate to Underwriting to see all cases', linkRoute: '/underwriting' },
      { text: 'Review the auto-assessed risk score and category' },
      { text: 'Click a case to view full details and AI risk analysis' },
      { text: 'Make a decision: Approve (standard), Approve with Loading (substandard), or Decline' },
      { text: 'Add notes and conditions, then submit — logged in Audit Trail', linkRoute: '/audit' },
    ],
    aiCommands: ['underwriting status', 'risk assessment', 'pending reviews'],
    tips: [
      'Risk score ≤5 = Preferred (auto-approve eligible). Score >15 = likely decline — prepare the client.',
      'Use "Approve with Loading" for substandard risk cases — adds 25% to the premium rather than declining.',
      'Always add decision notes — they appear in the Audit Trail for compliance review.',
    ],
    workflows: [{
      name: 'Underwriting Assessment (Happy Path)',
      sla: 'SLA: pending 4h, auto_assessment 1h, manual_review 48h, docs_requested 72h',
      stages: [
        S('Pending', 'start'), S('Auto Assessment'), S('Manual Review'),
        S('Decision Made'), S('Completed', 'end'),
      ],
    }, {
      name: 'Underwriting (Docs Requested Path)',
      stages: [
        S('Pending', 'start'), S('Auto Assessment'), S('Manual Review'),
        S('Docs Requested'), S('Manual Review (re-review)'), S('Decision Made'), S('Completed', 'end'),
      ],
    }],
    related: ['policies', 'workflows', 'approvals', 'audit'],
  },

  claims: {
    summary: 'Full claim lifecycle — submit, verify docs, fraud check, assess, pay, and close',
    description: 'End-to-end claim management with built-in fraud detection. Submit claims by type (Health, Death, Disability, Accident, Maturity, Surrender), track through verification and assessment stages, and process payments. The system auto-generates fraud scores and flags suspicious claims.',
    features: [
      { label: 'Claim types: Health, Death, Disability, Accident, Maturity, Surrender' },
      { label: 'Statistics dashboard: total, pending, approved, fraud flagged, amounts' },
      { label: 'Auto-fraud detection with fraud score and flag system' },
      { label: 'Document verification step before assessment' },
      { label: 'Approve with custom amount or reject with reason' },
      { label: 'Payment processing and closure tracking' },
      { label: 'Full workflow with SLA timers at each stage', route: '/workflows' },
      { label: 'Filter by status: Submitted, Assessment, Approved, Rejected, Closed' },
    ],
    steps: [
      { text: 'Go to Claims and click "New Claim"', linkRoute: '/claims' },
      { text: 'Select the policy, choose claim type, enter amount and incident date' },
      { text: 'Submit — the system creates a claim processing workflow automatically' },
      { text: 'Claims go through: Docs Verification -> Fraud Check -> Assessment' },
      { text: 'At Assessment stage, approve (set approved amount) or reject (provide reason)' },
      { text: 'Approved claims move to Payment Processing -> Closed' },
      { text: 'All decisions are logged in the Audit Trail', linkRoute: '/audit' },
    ],
    aiCommands: ['submit claim', 'file claim', 'claim status', 'pending claims', 'approve claim'],
    tips: [
      'Always upload supporting documents before the Docs Verification stage to avoid delays.',
      'Watch the fraud score — claims flagged for fraud require extra scrutiny and manager approval.',
      'The claim amount and approved amount can differ — set the approved amount during the assessment stage.',
    ],
    workflows: [{
      name: 'Claim Processing (Happy Path)',
      sla: 'SLA: submitted 2h, docs 24h, fraud 48h, assessment 24h, approved 8h, payment 48h',
      stages: [
        S('Submitted', 'start'), S('Docs Verification'), S('Fraud Check'),
        S('Assessment'), S('Approved'), S('Payment Processing'), S('Closed', 'end'),
      ],
    }, {
      name: 'Claim Processing (Rejected Path)',
      stages: [
        S('Submitted', 'start'), S('Docs Verification'), S('Fraud Check'),
        S('Assessment'), S('Rejected', 'reject'), S('Closed', 'end'),
      ],
    }],
    related: ['policies', 'workflows', 'audit'],
  },

  pipeline: {
    summary: 'Visual sales pipeline with kanban stages from Prospect to Closed Won',
    description: 'Track your sales deals through a visual kanban board. Create deals linked to clients and products, move through stages, and monitor expected premiums and close probabilities. AI insights analyze pipeline health and suggest focus areas.',
    features: [
      { label: 'Kanban board: Prospect -> Approach -> Fact Find -> Proposal -> Negotiation -> Closed Won / Lost', route: '/pipeline' },
      { label: 'Stage totals showing deal count and expected premium per column' },
      { label: 'Deal cards with product name, client, premium, probability %, close date' },
      { label: 'Move deals between stages with one-click action buttons' },
      { label: 'Pipeline summary: total deals, total value, weighted value' },
      { label: 'AI pipeline insights for health analysis and recommendations' },
      { label: 'Create new deals with client, product, premium, and probability' },
    ],
    steps: [
      { text: 'Navigate to Pipeline from the sidebar', linkRoute: '/pipeline' },
      { text: 'Click "+ New Deal" to create a pipeline opportunity' },
      { text: 'Select the client, product, set expected premium, probability, and expected close date' },
      { text: 'The deal appears in the selected stage column' },
      { text: 'Click stage buttons on each card to move deals forward through the pipeline' },
      { text: 'Track the summary bar for total deals and weighted pipeline value' },
      { text: 'Check the Dashboard for pipeline overview charts', linkRoute: '/' },
    ],
    aiCommands: ['add deal', 'new opportunity', 'pipeline', 'deals', 'pipeline insights', 'deal health'],
    tips: [
      'Keep the probability % updated as you progress — it feeds into the weighted pipeline value on Dashboard.',
      'If a deal stalls at Negotiation for more than 2 weeks, consider using an objection script from AI Hub.',
      'The stage summary bar shows total premium per column — focus on the highest-value stages first.',
    ],
    workflows: [{
      name: 'Sales Pipeline Stages',
      stages: [
        S('Prospect', 'start'), S('Approach'), S('Fact Find'), S('Proposal'),
        S('Negotiation'), S('Closed Won', 'end'),
      ],
    }],
    related: ['clients', 'policies', 'activities', 'dashboard'],
  },

  approvals: {
    summary: 'Review AI-generated actions with confidence scores — approve or reject',
    description: 'When the AI Assistant performs write operations (creating clients, policies, claims, etc.), it queues approval requests here. Each request shows an AI confidence score, full description, and expiration timer. Review and approve or reject with optional notes.',
    features: [
      { label: 'Approval queue with Pending, Approved, Rejected, and Expired tabs', route: '/approvals' },
      { label: 'AI confidence score bar — green (>85%), yellow (60-85%), red (<60%)' },
      { label: 'Action type and priority indicators (urgent flagged)' },
      { label: 'Full description of the AI-proposed action' },
      { label: 'Approve or reject with one click' },
      { label: 'Execution result shown for auto-executed actions' },
      { label: 'Expiration countdown for time-sensitive approvals' },
    ],
    steps: [
      { text: 'Use the AI Assistant chat to perform an action (e.g., "add client John")' },
      { text: 'If the action requires approval, it appears in the Approvals page', linkRoute: '/approvals' },
      { text: 'Review the confidence score and action description' },
      { text: 'Click Approve (green) to execute, or Reject (red) to decline' },
      { text: 'Check the "Approved" or "Rejected" tab to see completed decisions' },
      { text: 'All approval decisions are tracked in the Audit Trail', linkRoute: '/audit' },
    ],
    aiCommands: ['approval queue', 'approvals', 'approve', 'reject'],
    tips: [
      'Green confidence bars (>85%) are generally safe to approve. Yellow (<85%) deserves a closer look.',
      'Check the Approvals page after using the AI Assistant — write operations always queue here first.',
      'Expired approvals need to be re-submitted through the AI Assistant.',
    ],
    related: ['ai-chat', 'workflows', 'audit'],
  },

  activities: {
    summary: 'Log calls, meetings, follow-ups, presentations, and referrals',
    description: 'Track all client interactions and agent activities. Log calls, meetings, follow-ups, presentations, and referrals with scheduled dates and completion status. View daily, weekly, and monthly activity statistics to stay on track.',
    features: [
      { label: 'Activity types: Call, Meeting, Follow Up, Presentation, Referral' },
      { label: 'Status tracking: Planned, Completed, Cancelled' },
      { label: 'Statistics cards: today, this week, this month, total calls' },
      { label: 'Timeline view with icons and status badges' },
      { label: 'Link activities to specific clients', route: '/clients' },
      { label: 'Mark activities as complete with one click' },
      { label: 'Filter by activity type or status' },
    ],
    steps: [
      { text: 'Navigate to Activities from the sidebar', linkRoute: '/activities' },
      { text: 'Click "+ Log Activity" to create a new entry' },
      { text: 'Select the type (call, meeting, follow-up, etc.), optionally link to a client' },
      { text: 'Add title, description, and scheduled date' },
      { text: 'View your timeline of activities with status indicators' },
      { text: 'Click "Mark Complete" to update completed activities' },
    ],
    aiCommands: ['schedule meeting', 'book call', 'today agenda', "what's planned", 'create reminder'],
    tips: [
      'Log every client interaction — activity count contributes to your MDRT case count benchmarking.',
      'Use the "Today" stats card to make sure you\'re hitting your daily call/meeting targets.',
      'Link activities to clients so they appear on the client\'s detail page history.',
    ],
    related: ['clients', 'pipeline', 'dashboard'],
  },

  commissions: {
    summary: 'Track earned, pending, and paid commissions by type and policy',
    description: 'Complete commission tracking across all your policies. View total earned, pending, and paid commissions in MMK. Filter by status and see breakdowns by commission type (First Year, Renewal, Bonus, Override).',
    features: [
      { label: 'Summary cards: Total Earned, Pending, First Year, Renewal (all in MMK)' },
      { label: 'Commission types: First Year, Renewal, Bonus, Override' },
      { label: 'Status filters: All, Earned, Pending, Paid' },
      { label: 'Commission table with date, policy, client, type, amount, status' },
      { label: 'Visual breakdown grid by commission type' },
      { label: 'Linked to policies for easy reference', route: '/policies' },
    ],
    steps: [
      { text: 'Go to Commissions from the sidebar', linkRoute: '/commissions' },
      { text: 'Review the summary cards for total earnings overview' },
      { text: 'Use the status filter to see earned, pending, or paid commissions' },
      { text: 'Check your MDRT progress — commissions feed into MDRT targets', linkRoute: '/mdrt' },
    ],
    aiCommands: ['commissions', 'earnings', 'how much earned'],
    tips: [
      'First-year commissions are typically highest — focus on new policy sales if you need to boost earnings.',
      'Check Pending commissions regularly to estimate upcoming payouts.',
      'Your commission data directly feeds into the MDRT Tracker qualification calculations.',
    ],
    related: ['policies', 'mdrt', 'dashboard'],
  },

  mdrt: {
    summary: 'Million Dollar Round Table qualification tracker with peer benchmarking',
    description: 'Track your progress toward MDRT qualification. Set premium and case targets, view real-time progress, compare against peers on the leaderboard, and see income projections for current and next year (conservative, target, stretch scenarios).',
    features: [
      { label: 'Real-time progress bars for premium and case count targets', route: '/mdrt' },
      { label: 'Qualification status banner (qualified / on track / needs attention)' },
      { label: 'Historical qualification badges (2023-2027)' },
      { label: 'Performance analytics: monthly averages, projections, required amounts' },
      { label: 'Peer benchmarking leaderboard by premium achieved' },
      { label: 'Income projection: conservative, target, stretch scenarios' },
      { label: 'Configurable year and target settings' },
    ],
    steps: [
      { text: 'Navigate to MDRT Tracker from the sidebar', linkRoute: '/mdrt' },
      { text: 'Set your target premium and target cases in Settings' },
      { text: 'View the Real-time Tracker tab for current progress vs. targets' },
      { text: 'Check Performance Analytics for monthly trends and projections' },
      { text: 'Review Peer Benchmarking to see how you rank against colleagues' },
      { text: 'Use Income Projection to plan for conservative to stretch scenarios' },
    ],
    aiCommands: ['MDRT', 'million dollar', 'MDRT progress', 'qualification status'],
    tips: [
      'Set your targets at the start of each year using the Settings panel on the Progress tab.',
      'Check the "Required per remaining month" metric to know exactly how much premium you need monthly.',
      'Use Peer Benchmarking to motivate yourself — see how top performers are tracking.',
    ],
    related: ['commissions', 'policies', 'dashboard'],
  },

  planning: {
    summary: 'Retirement, education, tax, and cash flow financial calculators',
    description: 'Professional financial planning tools for client consultations. Calculate retirement needs, education funding, tax optimization, and cash flow health. Use results to demonstrate coverage gaps and recommend products.',
    features: [
      { label: 'Retirement Calculator: current age, retirement age, monthly expenses, savings, inflation', route: '/planning' },
      { label: 'Education Calculator: child age, education start age, annual cost, duration, inflation' },
      { label: 'Tax Planning: annual income, current deductions -> optimized plan' },
      { label: 'Cash Flow Health Score: income, expenses, savings, insurance, emergency fund, debts' },
      { label: 'Services directory with contact info for Corporate and Business insurance', route: '/corporate' },
      { label: 'Results cards with actionable recommendations' },
    ],
    steps: [
      { text: 'Go to Planning from the sidebar', linkRoute: '/planning' },
      { text: 'Select a calculator tab: Retirement, Education, Tax, or Cash Flow' },
      { text: "Enter the client's financial parameters" },
      { text: 'Review the calculated results and recommendations' },
      { text: 'Use results during client meetings to identify coverage gaps' },
      { text: 'Explore Corporate Solutions for group insurance options', linkRoute: '/corporate' },
    ],
    aiCommands: ['retirement plan', 'education plan', 'tax plan', 'cash flow health', 'financial health'],
    tips: [
      'Run the Cash Flow Health Score during client meetings — it\'s a powerful visual tool to show coverage gaps.',
      'Use Retirement Calculator results to justify higher sum-assured recommendations.',
      'Education Calculator helps parents see the real cost of education with inflation factored in.',
    ],
    related: ['clients', 'policies', 'corporate'],
  },

  corporate: {
    summary: 'Group insurance profiles, premium calculator, and benefits comparison',
    description: 'Manage corporate client relationships for group insurance. Create company profiles with industry and employee data, calculate group insurance premiums, and compare existing vs. new benefits packages for proposals.',
    features: [
      { label: 'Company Profiles: name, industry, employee count, average age, revenue, HR contact', route: '/corporate' },
      { label: 'Risk assessment auto-generated per company profile' },
      { label: 'Group Insurance Calculator: employee count, avg age, plan type, coverage -> premium' },
      { label: 'Benefits Comparison: existing vs. new benefits cost analysis' },
      { label: 'Linked to client records for contact management', route: '/clients' },
    ],
    steps: [
      { text: 'Navigate to Corporate Solutions from the sidebar', linkRoute: '/corporate' },
      { text: 'Click "+ New Profile" to create a company profile' },
      { text: 'Enter company details: name, industry, employee count, average age, revenue' },
      { text: 'Use the Group Calculator tab to estimate group insurance premiums' },
      { text: 'Use Benefits Comparison to show potential savings to corporate clients' },
    ],
    aiCommands: ['corporate insurance', 'group benefits', 'employee benefits', 'group health'],
    tips: [
      'The Benefits Comparison tab is your best sales tool — show potential savings side by side.',
      'Upload proposals and quote documents to company profiles using the document manager.',
      'Combine Corporate with Financial Planning tools for a comprehensive group benefits pitch.',
    ],
    related: ['planning', 'clients', 'policies'],
  },

  'ai-hub': {
    summary: 'Content calendar, objection scripts, and automated client greetings',
    description: 'Your AI-powered communication toolkit. Create and schedule social media posts with templates, browse objection handling scripts by category (price, trust, timing, need, competitor), and set up auto-greetings for birthdays and anniversaries via multiple channels.',
    features: [
      { label: 'Content Calendar: create posts with title, platform, type, schedule, hashtags', route: '/ai-hub' },
      { label: 'Content templates (click to use as starting point)' },
      { label: 'Draft & scheduled post management' },
      { label: 'Objection Scripts: by category — price, trust, timing, need, competitor' },
      { label: 'Track script usage (mark as used)' },
      { label: 'Auto-Greetings: upcoming birthdays & anniversaries' },
      { label: 'Multi-channel delivery: Viber, Telegram, SMS, WhatsApp' },
      { label: 'Real-time Viber connection status indicator' },
    ],
    steps: [
      { text: 'Go to AI Hub from the sidebar', linkRoute: '/ai-hub' },
      { text: 'Content Calendar tab: click "+ Create Post" to draft social media content' },
      { text: 'Choose a template to start from, or write custom content' },
      { text: 'Set the platform, schedule date, and hashtags' },
      { text: 'Objection Scripts tab: browse scripts by category to prepare for client objections' },
      { text: 'Auto-Greetings tab: see upcoming client events and send greetings' },
      { text: 'Select the channel (Viber, Telegram, SMS, WhatsApp) and click Send' },
    ],
    aiCommands: ['generate content', 'create post', 'objection handling', 'handle price objection', 'greetings', 'birthdays'],
    tips: [
      'Schedule content posts in advance — batch your social media work for the week on Monday.',
      'Read through objection scripts BEFORE client meetings so you\'re prepared for common pushback.',
      'Birthday greetings sent via Viber/Telegram have the highest open rates — prioritize those channels.',
    ],
    related: ['clients', 'activities'],
  },

  workflows: {
    summary: 'Workflow engine with SLA tracking, task assignment, and escalation',
    description: 'The backbone of the platform — automated workflows for policies, claims, and underwriting. Each workflow has defined states, SLA timers, and escalation rules. View your assigned tasks or all workflow instances, transition states, and track overdue items.',
    features: [
      { label: 'Three built-in workflows: Policy Issuance, Claim Processing, Underwriting' },
      { label: 'Auto-created when policies, claims, or UW cases are submitted', route: '/policies' },
      { label: 'SLA timers with deadlines at each stage' },
      { label: 'Automatic escalation to manager when SLAs breach' },
      { label: 'My Tasks view: cards of tasks assigned to you', route: '/workflows' },
      { label: 'All Instances view: table of all workflow instances with status' },
      { label: 'Priority levels: Critical (red), High (orange), Normal (blue), Low (gray)' },
      { label: 'Task statuses: Pending, In Progress, Completed, Cancelled' },
    ],
    steps: [
      { text: 'Navigate to Workflows from the sidebar', linkRoute: '/workflows' },
      { text: 'Toggle between "My Tasks" and "All Instances" views' },
      { text: 'In My Tasks, review cards showing workflow type, state, role, and due date' },
      { text: 'Complete tasks by updating their status' },
      { text: 'In All Instances, monitor SLA deadlines and escalation status' },
      { text: 'Overdue tasks are highlighted and escalated to manager' },
    ],
    aiCommands: ['workflow status', 'my tasks', 'pending tasks', 'process check', 'escalate'],
    tips: [
      'Check "My Tasks" first thing every morning — overdue tasks escalate to your manager automatically.',
      'SLA timers are real — focus on items closest to their deadline to avoid escalations.',
      'The "All Instances" table gives you a big-picture view of all workflows across the org.',
    ],
    workflows: [
      {
        name: '1. Policy Issuance',
        sla: 'submitted 4h, under_review 24h, underwriting 48h, approved 8h',
        stages: [
          S('Draft', 'start'), S('Submitted'), S('Under Review'), S('Underwriting'),
          S('Approved'), S('Issued'), S('Completed', 'end'),
        ],
      },
      {
        name: '2. Claim Processing',
        sla: 'submitted 2h, docs 24h, fraud 48h, assessment 24h, approved 8h, payment 48h',
        stages: [
          S('Submitted', 'start'), S('Docs Verification'), S('Fraud Check'),
          S('Assessment'), S('Approved'), S('Payment Processing'), S('Closed', 'end'),
        ],
      },
      {
        name: '3. Underwriting Assessment',
        sla: 'pending 4h, auto 1h, manual 48h, docs 72h',
        stages: [
          S('Pending', 'start'), S('Auto Assessment'), S('Manual Review'),
          S('Decision Made'), S('Completed', 'end'),
        ],
      },
    ],
    related: ['policies', 'claims', 'underwriting'],
  },

  audit: {
    summary: 'Full compliance audit trail — every action logged with user, timestamp, and details',
    description: 'Complete audit logging for regulatory compliance. Every significant action (create, update, delete, login, approve, reject, escalate, underwriting_decision) is recorded with user, timestamp, entity type, entity ID, and JSON details. Filter by entity type to review specific areas.',
    features: [
      { label: 'Filter by entity type: Policies, Claims, Underwriting, Workflows, Users, Clients', route: '/audit' },
      { label: 'Tracked actions: create, update, delete, login, approve, reject, escalate, underwriting_decision' },
      { label: 'Full details: timestamp, user, action, entity type, entity ID, JSON payload' },
      { label: 'Color-coded action badges for quick scanning' },
      { label: 'User name resolution for easy identification' },
    ],
    steps: [
      { text: 'Navigate to Audit Trail from the sidebar (bottom section)', linkRoute: '/audit' },
      { text: 'View the chronological list of all logged actions' },
      { text: 'Use the entity type filter to narrow down (e.g., only Claims)' },
      { text: 'Review the full JSON details for each audit entry' },
      { text: 'Use for compliance reporting and action investigation' },
    ],
    tips: [
      'Filter by entity type (e.g., Claims, Underwriting) to quickly find relevant decisions.',
      'Use the JSON detail view to see exactly what changed in each action — useful for compliance audits.',
      'The Audit Trail is read-only — no one can modify or delete entries, ensuring full integrity.',
    ],
    related: ['approvals', 'workflows', 'claims', 'underwriting'],
  },

  'ai-chat': {
    summary: 'Floating AI assistant — ask questions, create records, get insights using natural language',
    description: 'The AI Assistant is a floating chat widget (bottom-right corner button) available on every page. It understands natural language — ask questions, create clients/policies/claims, schedule activities, check pipeline health, and more. Write operations are queued for approval.',
    features: [
      { label: 'Floating chat button with pulse animation (bottom-right of screen)' },
      { label: 'Natural language understanding — just type what you need' },
      { label: 'Read-only queries execute instantly (dashboard stats, client search, pipeline view)' },
      { label: 'Write operations create approval requests with AI confidence scores', route: '/approvals' },
      { label: 'Conversation history (view last 50 messages)' },
      { label: 'Intent detection badges show what the AI understood' },
      { label: 'Clear conversation history option' },
      { label: 'Typing indicator while AI processes your request' },
    ],
    steps: [
      { text: 'Click the floating chat button (bottom-right) with the AI icon' },
      { text: 'Type a question or command in natural language, e.g., "how many clients do I have?"' },
      { text: 'For read-only queries, the AI responds immediately with data' },
      { text: 'For write operations (e.g., "add client John"), the AI creates an approval request' },
      { text: 'Go to Approvals page to review and approve/reject AI actions', linkRoute: '/approvals' },
      { text: 'Type "help" to see all available commands' },
      { text: 'Click the clear button to reset conversation history' },
    ],
    aiCommands: ['help', 'dashboard', 'add client', 'create policy', 'MDRT progress', 'schedule meeting', 'pipeline insights', "what's planned", 'submit claim'],
    tips: [
      'Start with "help" to see all available commands — the AI shows exactly what it can do.',
      'Use natural language — "how\'s my pipeline looking?" works just as well as formal commands.',
      'Write operations always require approval — don\'t worry about the AI making changes without your consent.',
      'The AI remembers your conversation within the session — you can ask follow-up questions.',
    ],
    related: ['approvals', 'dashboard', 'clients', 'policies'],
  },
}

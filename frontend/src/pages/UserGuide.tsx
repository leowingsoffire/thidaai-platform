import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, BarChart3, Users, ShieldCheck, FileSearch, AlertTriangle, Layers,
  CheckSquare, CalendarCheck, DollarSign, Target, Calculator, Building2,
  MessageSquare, ClipboardList, GitBranch, Bot, ChevronRight, ChevronDown,
  ArrowRight, Sparkles, Search, MousePointer, Zap, HelpCircle, Star,
  Phone, Mail, Shield, Heart, Lightbulb, Smile
} from 'lucide-react'

/* ─── types ─── */
interface Section { id: string; icon: any; title: string; route?: string; color: string }
interface FAQ { q: string; a: string }

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
  { q: 'How do I create a new client?', a: 'Go to Clients → click "+ Add Client" → fill in the form → Submit. Or ask the AI Assistant: "add client Thida Win, phone +959771001001".' },
  { q: 'How do I submit a claim?', a: 'Navigate to Claims → click "New Claim" → select the policy → enter claim type, amount, incident date → Submit. The system auto-runs fraud check and creates a workflow.' },
  { q: 'What can the AI Assistant do?', a: 'The floating chat (bottom-right) can answer questions, create clients/policies/claims, check dashboards, schedule activities, and more. Type "help" to see all commands.' },
  { q: 'How does the approval system work?', a: 'When the AI performs write operations (create, update, delete), it queues an approval request with a confidence score. Go to Approvals to review, approve, or reject.' },
  { q: 'What is MDRT?', a: 'Million Dollar Round Table — an industry benchmark for elite insurance agents. The MDRT Tracker shows your progress toward qualification targets for premium and case count.' },
  { q: 'How do workflows function?', a: 'Policies, claims, and underwriting cases automatically trigger workflows with SLA timers. View them in Workflows. Tasks are assigned to roles and escalate if overdue.' },
  { q: 'Can I send greetings to clients?', a: 'Yes — go to AI Hub → Auto-Greetings tab or Client Detail → Greetings tab. Send via SMS, Viber, Telegram, or WhatsApp.' },
  { q: 'How is the 4 Pillars assessment used?', a: 'On each Client Detail page, the 4 Pillars (Live Well, Think Well, Feel Well, Plan Well) show coverage gaps. Use AI Needs Analysis to get personalized recommendations.' },
]

/* ─── component ─── */
export default function UserGuide() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSections = SECTIONS.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function toggleSection(id: string) {
    setActiveSection(prev => prev === id ? null : id)
  }

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
          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
            {[
              { icon: Zap, label: '16 Features', desc: 'Full workflow coverage' },
              { icon: Bot, label: 'AI Powered', desc: 'Natural language commands' },
              { icon: Shield, label: 'Audit Trail', desc: 'Full compliance logging' },
              { icon: Star, label: 'MDRT Ready', desc: 'Track qualifications' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '8px 14px' }}>
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

      {/* Quick-start workflow */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
          <Sparkles size={20} color="#f59e0b" /> Quick-Start Workflow
        </h2>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '4px 0',
        }}>
          {[
            { step: '1', label: 'Add Client', page: '/clients', color: '#8b5cf6' },
            { step: '2', label: 'Create Policy', page: '/policies', color: '#0ea5e9' },
            { step: '3', label: 'Underwriting', page: '/underwriting', color: '#f59e0b' },
            { step: '4', label: 'Pipeline Deal', page: '/pipeline', color: '#10b981' },
            { step: '5', label: 'Log Activity', page: '/activities', color: '#f97316' },
            { step: '6', label: 'Track Commission', page: '/commissions', color: '#22c55e' },
            { step: '7', label: 'Submit Claim', page: '/claims', color: '#ef4444' },
          ].map((s, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                onClick={() => navigate(s.page)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                  borderRadius: 12, padding: '14px 18px', minWidth: 110, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = s.color; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-card)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', background: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 13, fontWeight: 700,
                }}>{s.step}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textAlign: 'center' }}>{s.label}</span>
              </div>
              {i < arr.length - 1 && <ArrowRight size={16} color="var(--text-dim)" style={{ margin: '0 4px', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input
          type="text" placeholder="Search features..." value={searchTerm}
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
          <FeatureSection
            key={section.id}
            section={section}
            isOpen={activeSection === section.id}
            onToggle={() => toggleSection(section.id)}
            onNavigate={section.route ? () => navigate(section.route!) : undefined}
          />
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
                <div style={{ padding: '0 16px 14px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Feature Section Accordion ─── */
function FeatureSection({ section, isOpen, onToggle, onNavigate }: {
  section: Section; isOpen: boolean; onToggle: () => void; onNavigate?: () => void
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
          {onNavigate && (
            <span
              onClick={e => { e.stopPropagation(); onNavigate() }}
              style={{
                fontSize: 12, color: section.color, fontWeight: 600, cursor: 'pointer',
                padding: '4px 10px', borderRadius: 6, background: section.color + '12',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              Open <MousePointer size={11} />
            </span>
          )}
          {isOpen ? <ChevronDown size={16} color="var(--text-dim)" /> : <ChevronRight size={16} color="var(--text-dim)" />}
        </div>
      </button>

      {/* Content */}
      {isOpen && content && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border-subtle)' }}>
          {/* What it does */}
          <div style={{ marginTop: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: section.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              What it does
            </h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{content.description}</p>
          </div>

          {/* Key features grid */}
          {content.features.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: section.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Key Features
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                {content.features.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px',
                    background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)',
                  }}>
                    <span style={{ color: section.color, fontWeight: 700, fontSize: 14, lineHeight: '18px' }}>•</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to use — step by step */}
          {content.steps && content.steps.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: section.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                How to Use
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {content.steps.map((step, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px',
                    background: 'var(--bg-elevated)', borderRadius: 8,
                  }}>
                    <div style={{
                      minWidth: 22, height: 22, borderRadius: '50%', background: section.color,
                      color: 'white', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Assistant commands for this feature */}
          {content.aiCommands && content.aiCommands.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#ec4899', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bot size={14} /> AI Assistant Commands
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {content.aiCommands.map((cmd, i) => (
                  <code key={i} style={{
                    padding: '5px 10px', borderRadius: 6,
                    background: '#ec489915', border: '1px solid #ec489930',
                    fontSize: 12, color: '#ec4899', fontFamily: 'monospace',
                  }}>"{cmd}"</code>
                ))}
              </div>
            </div>
          )}

          {/* Workflow diagram */}
          {content.workflow && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: section.color, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Workflow
              </h4>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', padding: '8px 0',
              }}>
                {content.workflow.map((stage, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                      background: i === 0 ? section.color : i === arr.length - 1 ? '#22c55e' : 'var(--bg-elevated)',
                      color: (i === 0 || i === arr.length - 1) ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${i === 0 ? section.color : i === arr.length - 1 ? '#22c55e' : 'var(--border-card)'}`,
                    }}>{stage}</div>
                    {i < arr.length - 1 && <ArrowRight size={14} color="var(--text-dim)" style={{ margin: '0 4px', flexShrink: 0 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related pages */}
          {content.related && content.related.length > 0 && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)' }}>Related:</span>
              {content.related.map((r, i) => {
                const rs = SECTIONS.find(s => s.id === r)
                return rs ? (
                  <span key={i} onClick={() => onNavigate && onNavigate()} style={{
                    fontSize: 12, color: rs.color, cursor: 'pointer', fontWeight: 500,
                    padding: '2px 8px', borderRadius: 4, background: rs.color + '10',
                  }}>{rs.title}</span>
                ) : null
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Feature Content Data ─── */
interface FeatureContent {
  summary: string
  description: string
  features: string[]
  steps?: string[]
  aiCommands?: string[]
  workflow?: string[]
  related?: string[]
}

const FEATURE_CONTENT: Record<string, FeatureContent> = {
  dashboard: {
    summary: 'Real-time KPIs, revenue analytics, pipeline overview, and AI recommendations',
    description: 'Your command center showing all key performance indicators at a glance. View revenue trends, product breakdown, pipeline analysis, MDRT progress, and AI-powered action recommendations — all in one page.',
    features: [
      'Revenue analytics with yearly premium & commission trends',
      'Product breakdown pie chart (Life, Health, Investment, Education, Critical Illness, Cancer Care)',
      'Pipeline analysis — deal count & value by stage',
      'Performance radar chart across 6 metrics',
      'MDRT progress indicator with qualification status',
      'AI-powered recommendations for next best actions',
      'Quick actions for pending approvals & birthday reminders',
      'Daily pipeline deals and revenue tracker (last 6 months)',
    ],
    steps: [
      'Open the app — Dashboard loads automatically as your home page',
      'Review the KPI cards at top for total clients, policies, premium, and commissions',
      'Check the AI Recommendations section for suggested next actions',
      'Click "Pending Approvals" quick-action to review AI-generated tasks',
      'Use the revenue chart to compare monthly premium vs commission trends',
    ],
    aiCommands: ['dashboard', 'summary', "how's business", 'how many clients', 'how many policies'],
    related: ['pipeline', 'mdrt', 'approvals'],
  },
  clients: {
    summary: 'Client database with demographics, search, and the 4 Pillars assessment',
    description: 'Manage your complete client database. Add new clients with full demographics, search by name, phone, or email, and dive into individual client profiles to see the AIA 4 Pillars coverage assessment (Live Well, Think Well, Feel Well, Plan Well).',
    features: [
      'Add clients with full demographics (name, phone, email, DOB, gender, occupation, income)',
      'Search & filter by name, phone, or email',
      'Client detail page with comprehensive profile view',
      '4 Pillars Assessment — Live Well (health), Think Well (education), Feel Well (life), Plan Well (retirement)',
      'AI-powered Needs Analysis generates personalized coverage recommendations',
      'View linked policies, proposals, and greeting history per client',
      'Send auto-greetings via SMS, Viber, Telegram, or WhatsApp',
      'Policy renewal alerts for policies expiring within 60 days',
    ],
    steps: [
      'Navigate to Clients from the sidebar menu',
      'Click "+ Add Client" to open the registration form',
      'Fill in client details — name, phone, email, date of birth, occupation, monthly income',
      'Click a client row to open their detail profile',
      'On the detail page, view the 4 Pillars coverage analysis',
      'Click "AI Needs Analysis" to generate AI-powered recommendations',
      'Use the Greetings tab to send birthday or anniversary messages',
    ],
    aiCommands: ['add client', 'register customer', 'find client Thida', 'list clients', 'search customer'],
    related: ['policies', 'pipeline', 'activities'],
  },
  policies: {
    summary: 'Create and manage insurance policies for all AIA product lines',
    description: 'The policy management hub where you create, view, and manage all insurance policies. Supports 7 AIA product types including Universal Life, Health Shield, Education Plan, and Critical Illness coverage. Filter by status and track premium amounts.',
    features: [
      'Create policies with full details — policy number, product, premium, sum assured, dates',
      'AIA product catalog: Universal Life, Short-term Endowment, Health Shield, Education Plan, Critical Illness, Cancer Care, Group Life',
      'Filter by status: Active, Pending, Lapsed, Cancelled, Matured',
      'Statistics cards showing active count and total premium (MMK)',
      'Link policies to clients automatically',
      'Payment frequency options: Monthly, Quarterly, Semi-annual, Annual',
    ],
    steps: [
      'Go to Policies from the sidebar',
      'Click "+ New Policy" to create a policy',
      'Select the client, choose a product (e.g., AIA Health Shield), set premium and sum assured',
      'Set the start date, payment frequency, and status',
      'Submit — the system auto-creates an underwriting case and workflow',
      'Use the status filter to find policies by status (active, lapsed, etc.)',
    ],
    aiCommands: ['create policy', 'issue insurance', 'list policies', 'renew policy', 'cancel policy'],
    workflow: ['Draft', 'Submitted', 'Under Review', 'Underwriting', 'Approved', 'Issued', 'Completed'],
    related: ['underwriting', 'claims', 'commissions'],
  },
  underwriting: {
    summary: 'Risk assessment with auto-scoring, manual review, and approve/decline decisions',
    description: 'The underwriting engine automatically scores risk based on client age, occupation, sum assured, and policy type. Cases are auto-assessed into risk categories (Preferred, Standard, Substandard, Declined). Underwriters can make manual decisions with optional premium loading.',
    features: [
      'Automatic risk scoring engine — calculates score from age, income ratio, premium, policy type',
      'Risk categories: Preferred (≤5), Standard (≤10), Substandard (≤15), Declined (>15)',
      'Filter cases: All, Pending, Auto Assessed, Manual Review, Decided',
      'Decision options: Approve, Approve with Loading (25% premium increase), Decline',
      'Add decision notes and conditions',
      'AI risk analysis available per case',
      'Auto-creates workflow with SLA tracking',
    ],
    steps: [
      'When a policy is created, an underwriting case is auto-generated',
      'Navigate to Underwriting to see all cases',
      'Review the auto-assessed risk score and category',
      'Click a case to view full details and AI risk analysis',
      'Make a decision: Approve (standard), Approve with Loading (substandard), or Decline',
      'Add notes and conditions, then submit the decision',
    ],
    aiCommands: ['underwriting status', 'risk assessment', 'pending reviews'],
    workflow: ['Pending', 'Auto Assessment', 'Manual Review', 'Decision Made', 'Completed'],
    related: ['policies', 'workflows', 'approvals'],
  },
  claims: {
    summary: 'Full claim lifecycle — submit, verify docs, fraud check, assess, pay, and close',
    description: 'End-to-end claim management with built-in fraud detection. Submit claims by type (Health, Death, Disability, Accident, Maturity, Surrender), track through verification and assessment stages, and process payments. The system auto-generates fraud scores and flags suspicious claims.',
    features: [
      'Claim types: Health, Death, Disability, Accident, Maturity, Surrender',
      'Statistics dashboard: total claims, pending, approved, fraud flagged, total amounts',
      'Auto-fraud detection with fraud score and flag system',
      'Document verification step before assessment',
      'Approve with custom amount or reject with reason',
      'Payment processing and closure tracking',
      'Full workflow with SLA timers at each stage',
      'Filter by status: Submitted, Assessment, Approved, Rejected, Closed',
    ],
    steps: [
      'Go to Claims → click "New Claim"',
      'Select the policy, choose claim type, enter amount and incident date',
      'Submit — the system creates a claim workflow automatically',
      'Claims go through: Document Verification → Fraud Check → Assessment',
      'At Assessment stage, approve (set approved amount) or reject (provide reason)',
      'Approved claims move to Payment Processing → Closed',
    ],
    aiCommands: ['submit claim', 'file claim', 'claim status', 'pending claims', 'approve claim'],
    workflow: ['Submitted', 'Docs Verification', 'Fraud Check', 'Assessment', 'Approved', 'Payment', 'Closed'],
    related: ['policies', 'workflows', 'audit'],
  },
  pipeline: {
    summary: 'Visual sales pipeline with kanban stages from Prospect to Closed Won',
    description: 'Track your sales deals through a visual kanban board. Create deals linked to clients and products, drag through stages, and monitor expected premiums and close probabilities. AI insights analyze pipeline health and suggest focus areas.',
    features: [
      '7-stage kanban board: Prospect → Approach → Fact Find → Proposal → Negotiation → Closed Won / Closed Lost',
      'Stage totals showing deal count and expected premium per column',
      'Deal cards with product name, client, premium, probability %, and close date',
      'Move deals between stages with one-click action buttons',
      'Pipeline summary: total deals, total value, weighted value',
      'AI pipeline insights for health analysis and recommendations',
      'Create new deals with client, product, premium, and probability',
    ],
    steps: [
      'Navigate to Pipeline from the sidebar',
      'Click "+ New Deal" to create a pipeline opportunity',
      'Select the client, product, set expected premium, probability, and close date',
      'The deal appears in the selected stage column',
      'Click stage buttons on each card to move deals forward',
      'Track the summary bar for total deals and weighted pipeline value',
    ],
    aiCommands: ['add deal', 'new opportunity', 'pipeline', 'deals', 'pipeline insights', 'deal health'],
    related: ['clients', 'policies', 'activities'],
  },
  approvals: {
    summary: 'Review AI-generated actions with confidence scores — approve or reject',
    description: 'When the AI Assistant performs write operations (creating clients, policies, claims, etc.), it queues approval requests here. Each request shows an AI confidence score, full description, and expiration timer. Review and approve or reject with optional notes.',
    features: [
      'Approval queue with pending, approved, rejected, and expired tabs',
      'AI confidence score bar — green (>85%), yellow (60-85%), red (<60%)',
      'Action type and priority indicators (urgent flagged)',
      'Full description of the AI-proposed action',
      'Approve or reject with one click',
      'Execution result shown for auto-executed actions',
      'Expiration countdown for time-sensitive approvals',
    ],
    steps: [
      'Use the AI Assistant chat to perform an action (e.g., "add client John")',
      'If the action requires approval, it appears in the Approvals page',
      'Review the confidence score and action description',
      'Click Approve (green) to execute, or Reject (red) to decline',
      'Check the "Approved" or "Rejected" tab to see completed decisions',
    ],
    aiCommands: ['approval queue', 'approvals', 'approve', 'reject'],
    related: ['ai-chat', 'workflows', 'audit'],
  },
  activities: {
    summary: 'Log calls, meetings, follow-ups, presentations, and referrals',
    description: 'Track all client interactions and agent activities. Log calls, meetings, follow-ups, presentations, and referrals with scheduled dates and completion status. View daily, weekly, and monthly activity statistics.',
    features: [
      'Activity types: Call 📞, Meeting 🤝, Follow Up 📋, Presentation 📊, Referral 👥',
      'Status tracking: Planned, Completed, Cancelled',
      'Statistics cards: today, this week, this month, total calls',
      'Timeline view with icons and status badges',
      'Link activities to specific clients',
      'Mark activities as complete with one click',
      'Filter by activity type or status',
    ],
    steps: [
      'Navigate to Activities from the sidebar',
      'Click "+ Log Activity" to create a new entry',
      'Select the type (call, meeting, follow-up, etc.), link to a client, set date',
      'Add title and description for context',
      'View your timeline of activities with status indicators',
      'Click "Mark Complete" to update completed activities',
    ],
    aiCommands: ['schedule meeting', 'book call', 'today agenda', "what's planned", 'create reminder'],
    related: ['clients', 'pipeline', 'dashboard'],
  },
  commissions: {
    summary: 'Track earned, pending, and paid commissions by type and policy',
    description: 'Complete commission tracking across all your policies. View total earned, pending, and paid commissions in MMK. Filter by status and see breakdowns by commission type (First Year, Renewal, Bonus, Override).',
    features: [
      'Summary cards: Total Earned, Pending, First Year, Renewal (all in MMK)',
      'Commission types: First Year, Renewal, Bonus, Override',
      'Status filters: All, Earned, Pending, Paid',
      'Commission table with date, policy, client, type, amount, and status',
      'Visual breakdown grid by commission type',
      'Linked to policies for easy reference',
    ],
    steps: [
      'Go to Commissions from the sidebar',
      'Review the summary cards for total earnings overview',
      'Use the status filter to see earned, pending, or paid commissions',
      'Click on a commission entry to see linked policy details',
    ],
    aiCommands: ['commissions', 'earnings', 'how much earned'],
    related: ['policies', 'mdrt', 'dashboard'],
  },
  mdrt: {
    summary: 'Million Dollar Round Table qualification tracker with peer benchmarking',
    description: 'Track your progress toward MDRT qualification. Set premium and case targets, view real-time progress, compare against peers on the leaderboard, and see income projections for current and next year in conservative, target, and stretch scenarios.',
    features: [
      'Real-time progress bars for premium and case count targets',
      'Qualification status banner (qualified / on track / needs attention)',
      'Historical qualification badges (2023–2027)',
      'Performance analytics: monthly averages, projections, required amounts',
      'Peer benchmarking leaderboard by premium achieved',
      'Income projection: conservative, target, and stretch scenarios for 2026-2027',
      'Configurable year and target settings',
    ],
    steps: [
      'Navigate to MDRT Tracker from the sidebar',
      'Set your target premium and target cases in Settings',
      'View the Real-time Tracker tab for current progress vs. targets',
      'Check Performance Analytics for monthly trends and projections',
      'Review Peer Benchmarking to see how you rank against colleagues',
      'Use Income Projection to plan for conservative to stretch scenarios',
    ],
    aiCommands: ['MDRT', 'million dollar', 'MDRT progress', 'qualification status'],
    related: ['commissions', 'policies', 'dashboard'],
  },
  planning: {
    summary: 'Retirement, education, tax, and cash flow financial calculators',
    description: 'Professional financial planning tools for client consultations. Calculate retirement needs, education funding, tax optimization, and cash flow health scores. Present results to clients to demonstrate coverage gaps and product recommendations.',
    features: [
      'Retirement Calculator: current age, retirement age, monthly expenses, savings, inflation',
      'Education Calculator: child age, education start age, annual cost, duration, inflation',
      'Tax Planning: annual income, current deductions → optimized plan',
      'Cash Flow Health Score: income, expenses, savings, insurance, emergency fund, debts, assets',
      'Services directory: Corporate Solutions, Business Insurance, Health, Retirement, Education, Tax',
      'Results cards with actionable recommendations',
    ],
    steps: [
      'Go to Planning from the sidebar',
      'Select a calculator tab: Retirement, Education, Tax, or Cash Flow',
      'Enter the client\'s financial parameters',
      'Review the calculated results and recommendations',
      'Use results during client meetings to identify coverage gaps',
      'The Services tab lists available consulting services with contact info',
    ],
    aiCommands: ['retirement plan', 'education plan', 'tax plan', 'cash flow health', 'financial health'],
    related: ['clients', 'policies', 'corporate'],
  },
  corporate: {
    summary: 'Group insurance profiles, calculator, and benefits comparison',
    description: 'Manage corporate client relationships for group insurance. Create company profiles with industry and employee data, calculate group insurance premiums, and compare existing vs. new benefits packages for proposals.',
    features: [
      'Company Profiles: name, industry, employee count, average age, revenue, HR contact',
      'Risk assessment auto-generated per company profile',
      'Group Insurance Calculator: employee count, avg age, plan type, coverage → premium',
      'Benefits Comparison: existing vs. new benefits cost analysis',
      'Linked to client records for contact management',
    ],
    steps: [
      'Navigate to Corporate Solutions from the sidebar',
      'Click "+ New Profile" to create a company profile',
      'Enter company details: name, industry, employee count, average age, revenue',
      'Use the Group Calculator tab to estimate group insurance premiums',
      'Use Benefits Comparison to show potential savings to corporate clients',
    ],
    aiCommands: ['corporate insurance', 'group benefits', 'employee benefits', 'group health'],
    related: ['planning', 'clients', 'policies'],
  },
  'ai-hub': {
    summary: 'Content calendar, objection scripts, and automated client greetings',
    description: 'Your AI-powered communication toolkit. Create and schedule social media posts with templates, browse objection handling scripts by category (price, trust, timing, need, competitor), and set up auto-greetings for birthdays and anniversaries via multiple channels.',
    features: [
      'Content Calendar: create posts with title, platform, type, content, schedule, hashtags, language',
      'Content templates (click to use as starting point)',
      'Draft & scheduled post management',
      'Objection Scripts: browse by category — price, trust, timing, need, competitor',
      'Track script usage (mark as used)',
      'Auto-Greetings: upcoming birthdays & anniversaries',
      'Multi-channel delivery: Viber, Telegram, SMS, WhatsApp',
      'Real-time Viber connection status indicator',
    ],
    steps: [
      'Go to AI Hub from the sidebar',
      'Content Calendar tab: click "+ Create Post" to draft social media content',
      'Choose a template to start from, or write custom content',
      'Set the platform, schedule date, and hashtags',
      'Objection Scripts tab: browse scripts by category to prepare for objections',
      'Auto-Greetings tab: see upcoming client events and send greetings',
      'Select the channel (Viber, Telegram, SMS, WhatsApp) and click Send',
    ],
    aiCommands: ['generate content', 'create post', 'objection handling', 'handle price objection', 'greetings', 'birthdays'],
    related: ['clients', 'activities'],
  },
  workflows: {
    summary: 'Workflow engine with SLA tracking, task assignment, and escalation',
    description: 'The backbone of the platform — automated workflows for policies, claims, and underwriting. Each workflow has defined states, SLA timers, and escalation rules. View your assigned tasks or all workflow instances, transition states, and track overdue items.',
    features: [
      'Three built-in workflows: Policy Issuance, Claim Processing, Underwriting',
      'Auto-created when policies, claims, or UW cases are submitted',
      'SLA timers with deadlines at each stage',
      'Automatic escalation to manager when SLAs breach',
      'My Tasks view: card layout of tasks assigned to you',
      'All Instances view: table of all workflow instances with status',
      'Priority levels: Critical (red), High (orange), Normal (blue), Low (gray)',
      'Task statuses: Pending, In Progress, Completed, Cancelled',
    ],
    steps: [
      'Navigate to Workflows from the sidebar',
      'Toggle between "My Tasks" and "All Instances" views',
      'In My Tasks, review cards showing workflow type, state, role, and due date',
      'Complete tasks by updating their status',
      'In All Instances, monitor SLA deadlines and escalation status',
      'Overdue tasks are highlighted for immediate attention',
    ],
    aiCommands: ['workflow status', 'my tasks', 'pending tasks', 'process check', 'escalate'],
    workflow: ['Created', 'Tasks Assigned', 'SLA Timer', 'In Progress', 'Escalation (if overdue)', 'Completed'],
    related: ['policies', 'claims', 'underwriting'],
  },
  audit: {
    summary: 'Full compliance audit trail — every action logged with user, timestamp, and details',
    description: 'Complete audit logging for regulatory compliance. Every significant action (create, update, delete, login, approve, reject, escalate) is recorded with user, timestamp, entity type, entity ID, and JSON details. Filter by entity type to review specific areas.',
    features: [
      'Filter by entity type: Policies, Claims, Underwriting, Workflows, Users, Clients',
      'Tracked actions: create, update, delete, login, approve, reject, escalate, underwriting_decision',
      'Each log entry includes: timestamp, user, action, entity type, entity ID, full details (JSON)',
      'Color-coded action badges for quick scanning',
      'User name resolution for easy identification',
    ],
    steps: [
      'Navigate to Audit Trail from the sidebar (bottom section)',
      'View the chronological list of all logged actions',
      'Use the entity type filter to narrow down (e.g., only Claims)',
      'Click on entries to view the full JSON details',
      'Use for compliance reporting and investigation of actions',
    ],
    related: ['approvals', 'workflows', 'claims'],
  },
  'ai-chat': {
    summary: 'Floating AI assistant — ask questions, create records, get insights using natural language',
    description: 'The AI Assistant is a floating chat widget (bottom-right corner) that understands natural language. Ask questions about your business, create clients and policies, schedule activities, check pipeline health, and more. Write operations are queued for approval with confidence scores.',
    features: [
      'Floating chat button with pulse animation (bottom-right of screen)',
      'Natural language understanding — just type what you need',
      'Read-only queries execute instantly (dashboard stats, client search, pipeline view)',
      'Write operations create approval requests with AI confidence scores',
      'Conversation history (view last 50 messages)',
      'Intent detection badges show what the AI understood',
      'Clear conversation history option',
      'Typing indicator while AI processes your request',
    ],
    steps: [
      'Click the floating chat button (bottom-right) with the AI icon',
      'Type a question or command in natural language, e.g., "how many clients do I have?"',
      'For read-only queries, the AI responds immediately with data',
      'For write operations (e.g., "add client John"), the AI creates an approval request',
      'Go to Approvals page to review and approve/reject AI actions',
      'Type "help" to see all available commands',
      'Click the clear button to reset conversation history',
    ],
    aiCommands: ['help', 'dashboard', 'add client', 'create policy', 'MDRT progress', 'schedule meeting', 'pipeline insights'],
    related: ['approvals', 'dashboard', 'clients'],
  },
}

import { useState } from 'react'
import { HelpCircle, X, Lightbulb, Bot, ChevronRight, BookOpen, Zap } from 'lucide-react'

interface GuideStep { text: string }
interface FeatureGuideProps {
  title: string
  description: string
  steps: GuideStep[]
  tips?: string[]
  aiCommands?: string[]
}

export default function FeatureGuide({ title, description, steps, tips, aiCommands }: FeatureGuideProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="How to use this feature"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '6px 12px', borderRadius: 8,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.3)' }}
      >
        <HelpCircle size={14} /> Guide
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 9999,
          display: 'flex', justifyContent: 'flex-end',
        }}>
          {/* backdrop */}
          <div onClick={() => setOpen(false)} style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
          }} />

          {/* panel */}
          <div style={{
            position: 'relative', width: 400, maxWidth: '90vw', height: '100%',
            background: 'var(--bg-primary, #fff)', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s ease',
            overflowY: 'auto',
          }}>
            {/* header */}
            <div style={{
              padding: '20px 20px 16px', borderBottom: '1px solid var(--border-card, #eee)',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #a855f7 100%)',
              color: 'white',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.85 }}>Feature Guide</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} style={{
                  background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8,
                  padding: 6, cursor: 'pointer', color: 'white',
                }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* body */}
            <div style={{ padding: 20, flex: 1 }}>
              {/* description */}
              <p style={{ fontSize: 13, color: 'var(--text-secondary, #555)', lineHeight: 1.6, margin: '0 0 18px' }}>
                {description}
              </p>

              {/* steps */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Zap size={14} color="#6366f1" />
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    How to Use — Step by Step
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                      background: 'var(--bg-elevated, #f8f9fa)', borderRadius: 10,
                      border: '1px solid var(--border-card, #eee)',
                    }}>
                      <div style={{
                        minWidth: 24, height: 24, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                      }}>{i + 1}</div>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary, #444)', lineHeight: 1.5, flex: 1 }}>
                        {step.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* tips */}
              {tips && tips.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Lightbulb size={14} color="#f59e0b" />
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Pro Tips
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tips.map((tip, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px',
                        background: '#fef9ee', borderRadius: 8, border: '1px solid #fde68a',
                      }}>
                        <ChevronRight size={12} color="#f59e0b" style={{ marginTop: 3, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI commands */}
              {aiCommands && aiCommands.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Bot size={14} color="#ec4899" />
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      AI Assistant Commands
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {aiCommands.map((cmd, i) => (
                      <code key={i} style={{
                        padding: '5px 10px', borderRadius: 6,
                        background: '#fdf2f8', border: '1px solid #fbcfe8',
                        fontSize: 12, color: '#be185d', fontFamily: 'monospace',
                      }}>"{cmd}"</code>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-dim, #999)', marginTop: 8 }}>
                    Type these in the floating AI chat button (bottom-right corner)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}

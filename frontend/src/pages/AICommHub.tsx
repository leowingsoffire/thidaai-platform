import { useEffect, useState } from 'react'
import { api, type ContentPost, type ObjectionScript, type AutoGreetingItem, type UpcomingEvent } from '../api'
import { MessageSquare, Calendar, BookOpen, Gift, Send, Plus, Star, Globe, Heart, ChevronDown, ChevronUp, Smartphone } from 'lucide-react'

const PLATFORMS = ['facebook','viber','telegram','linkedin','instagram']
const POST_TYPES = ['educational','testimonial','product','motivational','event']
const OBJ_CATEGORIES = ['price','trust','timing','need','competitor']
const GREETING_CHANNELS = ['viber', 'telegram', 'sms', 'whatsapp']

export default function AICommHub() {
  const [tab, setTab] = useState<'content'|'objections'|'greetings'>('content')
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [objections, setObjections] = useState<ObjectionScript[]>([])
  const [greetingHistory, setGreetingHistory] = useState<AutoGreetingItem[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([])
  const [greetingChannel, setGreetingChannel] = useState('viber')
  const [viberStatus, setViberStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [expandedObj, setExpandedObj] = useState<string|null>(null)
  const [catFilter, setCatFilter] = useState('')

  const [postForm, setPostForm] = useState({
    title: '', content: '', platform: 'facebook', post_type: 'educational',
    scheduled_date: '', hashtags: '', language: 'en',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [p, t, o, h, u, vs] = await Promise.all([
        api.getContentPosts().catch(() => []),
        api.getContentTemplates().catch(() => []),
        api.getObjections().catch(() => []),
        api.getGreetingHistory().catch(() => []),
        api.getUpcomingEvents().catch(() => []),
        api.getViberStatus().catch(() => null),
      ])
      setPosts(p); setTemplates(t); setObjections(o)
      setGreetingHistory(h); setUpcoming(u); setViberStatus(vs)
    } catch {}
    setLoading(false)
  }

  const createPost = async () => {
    try {
      await api.createContentPost(postForm)
      setShowNewPost(false)
      setPostForm({ title: '', content: '', platform: 'facebook', post_type: 'educational', scheduled_date: '', hashtags: '', language: 'en' })
      const updated = await api.getContentPosts()
      setPosts(updated)
    } catch (e: any) { alert(e.message) }
  }

  const useTemplate = (t: any) => {
    setPostForm({ ...postForm, title: t.title, content: t.content, platform: t.platform, post_type: t.post_type })
    setShowNewPost(true)
  }

  const markUsed = async (id: string) => {
    await api.markObjectionUsed(id)
    setObjections(await api.getObjections())
  }

  const sendGreeting = async (event: UpcomingEvent) => {
    try {
      const result = await api.sendGreeting({ client_id: event.client_id, greeting_type: event.event_type, channel: greetingChannel })
      const note = result.note ? `\n${result.note}` : ''
      alert(`Greeting ${result.status === 'sent' ? 'sent' : 'saved'} for ${event.client_name} via ${greetingChannel}!${note}`)
      setGreetingHistory(await api.getGreetingHistory())
    } catch (e: any) { alert(e.message) }
  }

  const filteredObj = catFilter ? objections.filter(o => o.category === catFilter) : objections

  const PLATFORM_ICONS: Record<string,string> = { facebook: '📘', viber: '💜', telegram: '✈️', linkedin: '💼', instagram: '📷' }
  const STATUS_COLORS: Record<string,string> = { draft: 'gray', scheduled: 'blue', published: 'green', failed: 'red' }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1><MessageSquare size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />AI Communication Hub</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: 13, marginTop: 2 }}>Content calendar, objection handling & auto-greetings</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['content','Content Calendar', Calendar],['objections','Objection Scripts', BookOpen],['greetings','Auto-Greetings', Gift]] as const).map(([k,l,Icon]) => (
          <button key={k} className={`btn ${tab === k ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setTab(k as any)}>
            <Icon size={14} style={{ marginRight: 4 }} />{l}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Loading...</div>}

      {/* ======= CONTENT CALENDAR ======= */}
      {tab === 'content' && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewPost(!showNewPost)}>
              <Plus size={14} /> {showNewPost ? 'Cancel' : 'New Post'}
            </button>
          </div>

          {showNewPost && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Create Content Post</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Title</label>
                  <input className="form-input" value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="form-label">Platform</label>
                    <select className="form-input" value={postForm.platform} onChange={e => setPostForm({...postForm, platform: e.target.value})}>
                      {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Type</label>
                    <select className="form-input" value={postForm.post_type} onChange={e => setPostForm({...postForm, post_type: e.target.value})}>
                      {POST_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Content</label>
                  <textarea className="form-input" rows={4} value={postForm.content} onChange={e => setPostForm({...postForm, content: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Schedule Date</label>
                  <input className="form-input" type="datetime-local" value={postForm.scheduled_date} onChange={e => setPostForm({...postForm, scheduled_date: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Hashtags</label>
                  <input className="form-input" value={postForm.hashtags} onChange={e => setPostForm({...postForm, hashtags: e.target.value})} placeholder="#AIA #Insurance" />
                </div>
                <div>
                  <label className="form-label">Language</label>
                  <select className="form-input" value={postForm.language} onChange={e => setPostForm({...postForm, language: e.target.value})}>
                    <option value="en">English</option>
                    <option value="my">Myanmar</option>
                  </select>
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={createPost}>Save Post</button>
            </div>
          )}

          {/* Templates */}
          {templates.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 Content Templates — Click to use</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {templates.slice(0, 6).map((t, i) => (
                  <div key={i} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 12, cursor: 'pointer', transition: 'transform 0.1s' }}
                    onClick={() => useTemplate(t)} onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')} onMouseLeave={e => (e.currentTarget.style.transform = '')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span>{PLATFORM_ICONS[t.platform] || '📝'}</span>
                      <span className="badge badge-blue" style={{ fontSize: 9 }}>{t.post_type}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{(t.content || '').slice(0, 80)}...</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts list */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Scheduled & Draft Posts ({posts.length})</h3>
            {posts.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>No posts yet. Create one or use a template!</p>
            ) : (
              <div>
                {posts.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span style={{ fontSize: 20 }}>{PLATFORM_ICONS[p.platform] || '📝'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                        {p.post_type} · {p.language === 'my' ? '🇲🇲' : '🇬🇧'} · {p.scheduled_date ? new Date(p.scheduled_date).toLocaleDateString() : 'No date'}
                      </div>
                    </div>
                    <span className={`badge badge-${STATUS_COLORS[p.status] || 'gray'}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======= OBJECTION SCRIPTS ======= */}
      {tab === 'objections' && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button className={`btn ${catFilter === '' ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setCatFilter('')}>All</button>
            {OBJ_CATEGORIES.map(c => (
              <button key={c} className={`btn ${catFilter === c ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setCatFilter(c)}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>

          {filteredObj.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <BookOpen size={48} style={{ color: 'var(--gray-300)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--gray-400)' }}>No objection scripts found.</p>
            </div>
          ) : (
            <div>
              {filteredObj.map(o => (
                <div key={o.id} className="card" style={{ marginBottom: 12, cursor: 'pointer' }}
                  onClick={() => setExpandedObj(expandedObj === o.id ? null : o.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className={`badge badge-${o.category === 'price' ? 'yellow' : o.category === 'trust' ? 'blue' : o.category === 'timing' ? 'purple' : o.category === 'need' ? 'green' : 'red'}`}>
                          {o.category}
                        </span>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={12} fill={s <= Math.round(o.effectiveness_rating) ? '#f59e0b' : 'none'} stroke={s <= Math.round(o.effectiveness_rating) ? '#f59e0b' : '#d1d5db'} />
                          ))}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>Used {o.times_used}x</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-800)' }}>"{o.objection}"</div>
                    </div>
                    {expandedObj === o.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>

                  {expandedObj === o.id && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--gray-100)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue-500)', marginBottom: 6 }}>🇬🇧 English Response</div>
                          <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6, background: 'var(--blue-50)', padding: 12, borderRadius: 8 }}>
                            {o.response_en}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green-500)', marginBottom: 6 }}>🇲🇲 Myanmar Response</div>
                          <div style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6, background: 'var(--green-50)', padding: 12, borderRadius: 8 }}>
                            {o.response_my}
                          </div>
                        </div>
                      </div>
                      {o.tips && (
                        <div style={{ marginTop: 12, padding: 10, background: '#fef3c7', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                          💡 <strong>Tips:</strong> {o.tips}
                        </div>
                      )}
                      <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}
                        onClick={e => { e.stopPropagation(); markUsed(o.id) }}>
                        ✅ Mark as Used
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======= AUTO-GREETINGS ======= */}
      {tab === 'greetings' && !loading && (
        <div>
          {/* Channel Selector & Integration Status */}
          <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={16} style={{ color: 'var(--blue-500)' }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Send via:</span>
              {GREETING_CHANNELS.map(ch => (
                <button key={ch} className={`btn ${greetingChannel === ch ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setGreetingChannel(ch)} style={{ textTransform: 'capitalize' }}>
                  {ch === 'viber' ? '💜 ' : ch === 'telegram' ? '✈️ ' : ch === 'sms' ? '📱 ' : '💬 '}{ch}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ color: viberStatus?.configured ? 'var(--green-500)' : 'var(--gray-400)' }}>
                💜 Viber: {viberStatus?.configured ? '✅ Connected' : '⚠️ Token not set'}
              </span>
              <span style={{ color: viberStatus?.user_linked ? 'var(--green-500)' : 'var(--gray-400)' }}>
                {viberStatus?.user_linked ? '🔗 Linked' : '🔗 Not linked'}
              </span>
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              <Gift size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--pink-500)' }} />
              Upcoming Birthdays & Anniversaries (30 days)
            </h3>
            {upcoming.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>No upcoming events in the next 30 days.</p>
            ) : (
              <div>
                {upcoming.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: ev.event_type === 'birthday' ? '#fce7f3' : '#ede9fe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {ev.event_type === 'birthday' ? '🎂' : '🎉'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.client_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                        {ev.event_type === 'birthday' ? 'Birthday' : `Policy Anniversary (${ev.years} yrs)`} · {ev.event_date}
                        {ev.days_until <= 3 && <span style={{ color: 'var(--aia-red)', fontWeight: 600 }}> · In {ev.days_until} days!</span>}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => sendGreeting(ev)}>
                      <Send size={12} /> Send via {greetingChannel}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Greeting History */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>
              <Heart size={16} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--pink-500)' }} />
              Greeting History
            </h3>
            {greetingHistory.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>No greetings sent yet.</p>
            ) : (
              <div>
                {greetingHistory.map(g => (
                  <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <span style={{ fontSize: 18 }}>{g.greeting_type === 'birthday' ? '🎂' : g.greeting_type === 'thingyan' ? '💧' : '🎉'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{g.client_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                        {g.greeting_type} via {g.channel} · {g.sent_at ? new Date(g.sent_at).toLocaleDateString() : 'pending'}
                      </div>
                    </div>
                    <span className={`badge badge-${g.status === 'sent' ? 'green' : g.status === 'failed' ? 'red' : 'gray'}`}>{g.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 28, padding: '16px 0', borderTop: '1px solid var(--gray-200)', fontSize: 11, color: 'var(--gray-400)' }}>
        POWERED BY: KO | WorkWell Framework | MDRT Standards &nbsp;·&nbsp; FOR: Thida Soe | thidasoe@aia.com.mm
      </div>
    </div>
  )
}

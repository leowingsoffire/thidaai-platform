import { useState, useEffect, useRef } from 'react'
import { Send, MessageCircle, X, Trash2, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { api, AIConversationMsg } from '../api'

export default function AIChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AIConversationMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      api.getConversations(50).then(setMessages).catch(() => {})
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    // Optimistic inbound
    const tempIn: AIConversationMsg = {
      id: `temp-${Date.now()}`, direction: 'inbound', message: text,
      intent: null, channel: 'web', action_taken: null, created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempIn])
    setLoading(true)

    try {
      const result = await api.aiChat(text)
      const tempOut: AIConversationMsg = {
        id: `temp-${Date.now()}-out`, direction: 'outbound', message: result.reply,
        intent: result.intent, channel: 'web', action_taken: null, created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, tempOut])
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, direction: 'outbound', message: `Error: ${err.message}`,
        intent: null, channel: 'web', action_taken: null, created_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function handleClear() {
    await api.clearConversations().catch(() => {})
    setMessages([])
  }

  function renderMessage(msg: AIConversationMsg) {
    const isUser = msg.direction === 'inbound'
    return (
      <div key={msg.id} className={`ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-bot'}`}>
        <div className="ai-msg-avatar">
          {isUser ? <User size={14} /> : <Bot size={14} />}
        </div>
        <div className="ai-msg-content">
          <div className="ai-msg-text" style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
          {msg.intent && !isUser && (
            <span className="ai-msg-intent">{msg.intent.replace(/_/g, ' ')}</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Floating toggle */}
      <button className="ai-chat-toggle" onClick={() => setOpen(!open)} title="AI Assistant">
        {open ? <X size={22} /> : <><MessageCircle size={22} /><Sparkles className="ai-toggle-sparkle" size={10} /></>}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="ai-chat-panel">
          <div className="ai-chat-header">
            <div className="ai-chat-header-left">
              <Bot size={18} />
              <span>AI Assistant</span>
            </div>
            <button className="btn-icon-sm" onClick={handleClear} title="Clear history"><Trash2 size={14} /></button>
          </div>

          <div className="ai-chat-messages">
            {messages.length === 0 && (
              <div className="ai-chat-empty">
                <Sparkles size={32} />
                <p>Hi! I'm your AI assistant.</p>
                <p>Type <strong>help</strong> to see what I can do.</p>
              </div>
            )}
            {messages.map(renderMessage)}
            {loading && (
              <div className="ai-msg ai-msg-bot">
                <div className="ai-msg-avatar"><Bot size={14} /></div>
                <div className="ai-msg-content"><Loader2 className="spin" size={16} /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="ai-chat-input">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

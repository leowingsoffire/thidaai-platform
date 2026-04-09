import { useState, FormEvent } from 'react'
import { api, AuthUser } from '../api'

interface Props { onLogin: (user: AuthUser, token: string) => void }

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(email, password)
      onLogin(res.user, res.access_token)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="heart-logo login-heart">
            <svg width="56" height="56" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="heartGradLogin" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f472b6"/>
                  <stop offset="50%" stopColor="#fb7185"/>
                  <stop offset="100%" stopColor="#f97316"/>
                </linearGradient>
              </defs>
              <path d="M16 28C16 28 3 20 3 11.5C3 7.36 6.36 4 10.5 4C13 4 15.1 5.3 16 7.3C16.9 5.3 19 4 21.5 4C25.64 4 29 7.36 29 11.5C29 20 16 28 16 28Z" fill="url(#heartGradLogin)"/>
              <circle className="sparkle s1" cx="8" cy="7" r="1.4" fill="#fbbf24"/>
              <circle className="sparkle s2" cx="25" cy="6" r="1.2" fill="#a78bfa"/>
              <circle className="sparkle s3" cx="5" cy="18" r="1" fill="#34d399"/>
              <circle className="sparkle s4" cx="27" cy="16" r="1.3" fill="#60a5fa"/>
              <circle className="sparkle s5" cx="16" cy="3" r="1.1" fill="#fb923c"/>
            </svg>
          </div>
          <h1>AI Assistant</h1>
          <p>AI Power Workflow System</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="tdadmin" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="login-footer">
          <small>Default: tdadmin / admin123</small><br/>
          <small>Agent: tdagent / agent123</small>
        </div>
      </div>
    </div>
  )
}

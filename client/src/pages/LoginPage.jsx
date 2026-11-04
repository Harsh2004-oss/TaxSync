import { useState } from 'react'
import { Shield, Eye, EyeOff, ArrowRight, Zap, BarChart3, MessageSquare } from 'lucide-react'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('demo@taxsync.in')
  const [password, setPassword] = useState('TaxSync2026')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 600)) // brief delay for UX
    const ok = onLogin(email, password)
    if (!ok) setError('Invalid credentials. Use demo@taxsync.in / TaxSync2026')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 70px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Header */}
        <div className="text-center animate-fade-in" style={{ marginBottom: '2rem' }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, var(--brand), var(--accent))',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: 'var(--shadow-brand)',
            fontSize: '2rem', fontWeight: 900, color: 'white'
          }}>
            T
          </div>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
            Welcome to TaxSync
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            India's smartest GST ITC Reconciliation Engine
          </p>
        </div>

        {/* Features */}
        <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          {[
            { icon: <Zap size={15} />, text: 'Exact + Fuzzy Invoice Matching', color: 'var(--brand-light)' },
            { icon: <Shield size={15} />, text: 'Section 17(5) Blocked ITC Detection', color: 'var(--purple)' },
            { icon: <MessageSquare size={15} />, text: '1-Click WhatsApp Vendor Chaser', color: '#25d366' },
            { icon: <BarChart3 size={15} />, text: 'Colored XLSX Export for GSTR-3B', color: 'var(--green)' },
          ].map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0.625rem 0.875rem',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ color: f.color, flexShrink: 0 }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>

        {/* Login Card */}
        <div className="card animate-slide-up">
          <div className="card-body">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Sign In</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="email-input">Email</label>
                <input
                  id="email-input"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="demo@taxsync.in"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password-input">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password-input"
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: '3rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4
                    }}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '0.625rem 0.875rem',
                  background: 'var(--red-bg)',
                  border: '1px solid var(--red-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--red)',
                  fontSize: '0.83rem'
                }}>
                  {error}
                </div>
              )}

              <button
                id="login-submit-btn"
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ marginTop: '0.5rem', width: '100%' }}
              >
                {loading
                  ? <><div className="spinner" /> Authenticating...</>
                  : <><ArrowRight size={18} /> Sign In to Dashboard</>
                }
              </button>
            </form>

            <div className="divider" />
            <div style={{
              background: 'rgba(99,102,241,0.07)',
              border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: 8,
              padding: '0.625rem 0.875rem',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              textAlign: 'center'
            }}>
              🔑 Demo: <strong style={{ color: 'var(--brand-light)' }}>demo@taxsync.in</strong> / <strong style={{ color: 'var(--brand-light)' }}>TaxSync2026</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

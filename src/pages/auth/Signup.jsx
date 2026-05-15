import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

function passwordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 2) return { score, label: 'Weak',   color: '#f25a5a', pct: 33 }
  if (score <= 3) return { score, label: 'Fair',   color: '#f2c75a', pct: 66 }
  return              { score, label: 'Strong', color: '#b5f23a', pct: 100 }
}

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [loading, setLoading]   = useState(false)

  const strength = passwordStrength(password)

  function friendlyError(msg) {
    if (msg.includes('already registered')) return 'An account with this email already exists. Sign in instead.'
    if (msg.includes('invalid email') || msg.includes('valid email')) return 'Please enter a valid email address.'
    if (msg.includes('password')) return 'Password must be at least 6 characters.'
    return msg || 'Something went wrong. Please try again.'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    try {
      await signUp(email, password, name)
      setSuccess(true)
    } catch (err) {
      setError(friendlyError(err.message))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/timer' },
    })
  }

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Check your email</h2>
        <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
          We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
          Click it to activate your account, then come back and sign in.
        </p>
        <Link to="/login" className="btn btn-accent btn-lg" style={{ marginTop: 24, display: 'inline-flex', textDecoration: 'none' }}>
          Go to Sign In
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{
            fontSize: 64, color: 'var(--accent)',
            display: 'inline-block',
            animation: 'spin-slow 8s linear infinite',
            lineHeight: 1, fontWeight: 300, marginBottom: 12,
          }}>⟳</span>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '6px', color: '#f0f0f2', marginBottom: 8 }}>
            FOCUSOS
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Create your account to get started</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Create account</h2>

          {/* Google OAuth */}
          <button onClick={handleGoogle} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: '11px 16px', borderRadius: 8, cursor: 'pointer',
            background: '#ffffff', color: '#1f1f1f',
            border: '1px solid rgba(255,255,255,0.15)',
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
            transition: 'background 0.15s',
            marginBottom: 16,
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Your Name</label>
              <input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>

            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="label" style={{ display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4,
                  display: 'flex', alignItems: 'center',
                }}>
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 4, background: 'var(--card2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${strength.pct}%`, background: strength.color, borderRadius: 2, transition: 'all 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 11, color: strength.color, fontWeight: 600, marginTop: 4, display: 'block' }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-accent btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 18 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

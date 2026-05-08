import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FMark from '../components/FMark'

function passwordStrength(pwd) {
  if (!pwd) return { label: '', color: '', pct: 0 }
  let score = 0
  if (pwd.length >= 8)  score++
  if (pwd.length >= 12) score++
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 2) return { label: 'Weak',   color: '#f25a5a', pct: 33 }
  if (score <= 3) return { label: 'Fair',   color: '#f2c75a', pct: 66 }
  return              { label: 'Strong', color: '#b5f23a', pct: 100 }
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [sessionOk, setSessionOk] = useState(false)

  const strength = passwordStrength(password)

  useEffect(() => {
    // Supabase auto-processes the #access_token hash on page load.
    // Listen for the PASSWORD_RECOVERY event and also check existing session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionOk(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setSessionOk(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => navigate('/timer'), 2000)
      return () => clearTimeout(t)
    }
  }, [success, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to update password. Your reset link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const mismatch = confirm.length > 0 && password !== confirm

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20, background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(181,242,58,0.09)', border: '1px solid rgba(181,242,58,0.2)',
              marginBottom: 14,
            }}>
              <FMark size={26} />
            </div>
          </Link>
          <h1 className="bebas" style={{ fontSize: 38, color: 'var(--accent)', letterSpacing: '0.05em', display: 'block' }}>FOCUSOS</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 5 }}>Update your password</p>
        </div>

        <div className="card" style={{ padding: 28 }}>

          {/* Success state */}
          {success ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Password updated!</h2>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>
                Taking you to the app in a moment…
              </p>
              <div style={{ marginTop: 20 }}>
                <span className="spinner" style={{ width: 20, height: 20 }} />
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Set new password</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 22, lineHeight: 1.55 }}>
                Choose a strong password for your FocusOS account.
              </p>

              {!sessionOk && (
                <div style={{
                  background: 'rgba(242,199,90,0.1)', border: '1px solid rgba(242,199,90,0.25)',
                  borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--amber)', marginBottom: 16,
                }}>
                  Waiting for reset link to activate… If this persists, try clicking the link in your email again.
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* New password */}
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    New Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required autoFocus
                      style={{ paddingRight: 44 }}
                    />
                    <button type="button" onClick={() => setShowPass(s => !s)} style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 15, padding: 4,
                    }}>
                      {showPass ? '🙈' : '👁'}
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

                {/* Confirm password */}
                <div>
                  <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                    Confirm Password
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    style={{ borderColor: mismatch ? 'var(--red)' : undefined }}
                  />
                  {mismatch && (
                    <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, display: 'block' }}>
                      Passwords don't match
                    </span>
                  )}
                </div>

                {error && (
                  <div style={{ background: 'rgba(242,90,90,0.1)', border: '1px solid rgba(242,90,90,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-accent btn-full btn-lg"
                  disabled={loading || mismatch || !password}
                  style={{ marginTop: 4 }}
                >
                  {loading
                    ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Updating…</>
                    : 'Update Password'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 18 }}>
                Remembered it?{' '}
                <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

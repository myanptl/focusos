import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { to: '/timer',    label: 'Timer' },
  { to: '/quiz',     label: 'Quiz' },
  { to: '/notes',    label: 'Notes' },
  { to: '/goals',    label: 'Goals' },
  { to: '/streak',   label: 'Streak' },
  { to: '/progress', label: 'Progress' },
  { to: '/rooms',    label: 'Rooms' },
  { to: '/settings', label: 'Settings' },
]

export default function Nav() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 768)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const displayName = profile?.name || profile?.username || 'U'
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const streak = profile?.streak_count ?? 0

  return (
    <>
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(10,10,11,0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '0 40px',
      display: 'flex', alignItems: 'center', gap: 16,
      height: 60,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{
          fontSize: 24, color: 'var(--accent)',
          display: 'inline-block',
          animation: 'spin-slow 8s linear infinite',
          lineHeight: 1, fontWeight: 300,
        }}>⟳</span>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '4px', color: 'white' }}>
          FOCUSOS
        </span>
      </div>

      {!isMobile && (
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <NavLink key={t.to} to={t.to} style={({ isActive }) => ({
              padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
              textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              background: isActive ? 'rgba(181,242,58,0.1)' : 'transparent',
              border: isActive ? '1px solid rgba(181,242,58,0.25)' : '1px solid transparent',
            })}>
              {t.label}
            </NavLink>
          ))}
        </div>
      )}
      {isMobile && <div style={{ flex: 1 }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {isMobile && (
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 18, cursor: 'pointer',
              borderRadius: 8, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >☰</button>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(242,199,90,0.1)', border: '1px solid rgba(242,199,90,0.25)',
          borderRadius: 20, padding: '4px 10px', fontSize: 13,
        }}>
          <span>🔥</span>
          <span style={{ fontWeight: 700, color: 'var(--amber)' }}>{streak}</span>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(181,242,58,0.2)', border: '1.5px solid var(--accent)',
              color: 'var(--accent)', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {initials}
          </button>
          {dropdownOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setDropdownOpen(false)} />
              <div style={{
                position: 'absolute', top: 42, right: 0,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 6, minWidth: 160, zIndex: 99,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Signed in</div>
                </div>
                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: 6,
                    background: 'transparent', border: 'none',
                    color: 'var(--red)', fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(242,90,90,0.1)'}
                  onMouseLeave={e => e.target.style.background = 'transparent'}
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>

    {/* Mobile full-screen menu */}
    {mobileOpen && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0a0a0b',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <button
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: 24, cursor: 'pointer', lineHeight: 1,
          }}
        >✕</button>
        {tabs.map(t => (
          <NavLink
            key={t.to} to={t.to}
            onClick={() => setMobileOpen(false)}
            style={({ isActive }) => ({
              fontSize: 24, fontWeight: 700, color: isActive ? 'var(--accent)' : 'white',
              textDecoration: 'none', padding: '10px 24px', borderRadius: 12,
              background: isActive ? 'rgba(181,242,58,0.08)' : 'transparent',
              width: 220, textAlign: 'center',
            })}
          >
            {t.label}
          </NavLink>
        ))}
        <button
          onClick={handleSignOut}
          style={{
            marginTop: 16, fontSize: 15, fontWeight: 600,
            color: 'var(--red)', background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}
        >Sign Out</button>
      </div>
    )}
    </>
  )
}

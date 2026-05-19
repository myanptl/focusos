import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Timer, Brain, FileText, Target, Flame, BarChart2, Users, Settings, X } from 'lucide-react'

const tabs = [
  { to: '/timer',    label: 'Timer',    short: 'Timer',  Icon: Timer },
  { to: '/quiz',     label: 'Quiz',     short: 'Quiz',   Icon: Brain },
  { to: '/notes',    label: 'Notes',    short: 'Notes',  Icon: FileText },
  { to: '/goals',    label: 'Goals',    short: 'Goals',  Icon: Target },
  { to: '/streak',   label: 'Streak',   short: 'Streak', Icon: Flame },
  { to: '/progress', label: 'Progress', short: 'Stats',  Icon: BarChart2 },
  { to: '/rooms',    label: 'Rooms',    short: 'Rooms',  Icon: Users },
  { to: '/settings', label: 'Settings', short: 'Cfg',    Icon: Settings },
]

export default function Nav() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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
    {/* ── Floating glass pill nav ───────────────────────────────── */}
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      padding: isMobile ? '0' : '10px 20px 0',
      paddingBottom: isMobile ? 0 : 8,
      background: isMobile ? 'none' : 'linear-gradient(to bottom, rgba(10,10,11,0.95) 0%, rgba(10,10,11,0.88) 70%, rgba(10,10,11,0) 100%)',
      willChange: 'transform',
      transform: 'translateZ(0)',
    }}>
      <nav style={{
        background: 'rgba(10,10,11,0.88)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderBottom: isMobile ? '1px solid rgba(255,255,255,0.06)' : 'none',
        border: isMobile ? undefined : '1px solid rgba(255,255,255,0.09)',
        borderRadius: isMobile ? 0 : 50,
        padding: isMobile ? '0 16px' : '0 8px 0 20px',
        display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 8,
        height: 52,
        maxWidth: isMobile ? '100%' : 960,
        margin: '0 auto',
        boxShadow: isMobile
          ? 'none'
          : '0 1px 0 rgba(255,255,255,0.07) inset, 0 4px 24px rgba(0,0,0,0.32)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            fontSize: 21, color: 'var(--accent)', display: 'inline-block',
            lineHeight: 1, fontWeight: 300, animation: 'spin 8s linear infinite',
            transformOrigin: 'center',
          }}>⟳</span>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '4px', color: 'white' }}>
            FOCUSOS
          </span>
        </div>

        {/* Desktop tab links */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {tabs.map(t => {
              const isActive = location.pathname === t.to || location.pathname.startsWith(t.to + '/')
              return (
                <NavLink key={t.to} to={t.to} style={{
                  position: 'relative',
                  padding: '5px 12px', borderRadius: 40, fontSize: 13, fontWeight: 500,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  transition: 'color 0.18s cubic-bezier(0.22,1,0.36,1), background 0.18s cubic-bezier(0.22,1,0.36,1)',
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  background: isActive ? 'rgba(181,242,58,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(181,242,58,0.22)' : '1px solid transparent',
                  display: 'inline-flex', alignItems: 'center', gap: 5, letterSpacing: '0.005em',
                }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}}
                >
                  {t.label}
                </NavLink>
              )
            })}
          </div>
        )}
        {isMobile && <div style={{ flex: 1 }} />}

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Mobile hamburger — morphs to X */}
          {isMobile && (
            <motion.button
              onClick={() => setMobileOpen(true)}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'var(--text)', cursor: 'pointer',
                borderRadius: 8, width: 34, height: 34,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              {[0, 1, 2].map(i => (
                <span key={i} style={{
                  display: 'block', width: i === 1 ? 12 : 16, height: 1.5,
                  background: 'var(--text)', borderRadius: 1,
                  transition: 'width 0.2s',
                }} />
              ))}
            </motion.button>
          )}

          {/* Streak chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(242,199,90,0.09)', border: '1px solid rgba(242,199,90,0.22)',
            borderRadius: 40, padding: '4px 10px', fontSize: 12.5,
          }}>
            <Flame size={13} color="var(--amber)" />
            <span style={{ fontWeight: 700, color: 'var(--amber)' }}>{streak}</span>
          </div>

          {/* Avatar / dropdown */}
          <div style={{ position: 'relative' }}>
            <motion.button
              onClick={() => setDropdownOpen(o => !o)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(181,242,58,0.18)', border: '1.5px solid var(--accent)',
                color: 'var(--accent)', fontWeight: 700, fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                letterSpacing: '0.02em',
              }}
            >
              {initials}
            </motion.button>
            <AnimatePresence>
            {dropdownOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setDropdownOpen(false)} />
                <motion.div
                  key="dropdown"
                  initial={{ opacity: 0, scale: 0.93, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.93, y: -6 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  style={{
                    position: 'absolute', top: 44, right: 0,
                    background: 'var(--card)', border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 12, padding: 6, minWidth: 168, zIndex: 99,
                    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.5)',
                    transformOrigin: 'top right',
                  }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>{displayName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Signed in</div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 6,
                      background: 'transparent', border: 'none',
                      color: 'var(--red)', fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(242,90,90,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Sign Out
                  </button>
                </motion.div>
              </>
            )}
            </AnimatePresence>
          </div>
        </div>
      </nav>
    </div>

    {/* Mobile full-screen menu — staggered mask reveal */}
    <AnimatePresence>
    {mobileOpen && (
      <motion.div
        key="mobile-menu"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,10,11,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 4,
        }}
      >
        {/* Close button */}
        <motion.button
          onClick={() => setMobileOpen(false)}
          initial={{ opacity: 0, rotate: -45 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32, delay: 0.08 }}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--muted)', cursor: 'pointer',
            borderRadius: 8, width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        ><X size={18} /></motion.button>

        {/* Nav links — staggered slide-up reveal */}
        {tabs.map((t, i) => {
          const isActiveTab = location.pathname === t.to || location.pathname.startsWith(t.to + '/')
          return (
            <motion.div
              key={t.to}
              initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36, delay: i * 0.045 + 0.06 }}
            >
              <NavLink
                to={t.to}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontSize: 22, fontWeight: 700,
                  color: isActiveTab ? 'var(--accent)' : 'rgba(255,255,255,0.82)',
                  textDecoration: 'none', padding: '10px 28px', borderRadius: 12,
                  background: isActiveTab ? 'rgba(181,242,58,0.07)' : 'transparent',
                  border: isActiveTab ? '1px solid rgba(181,242,58,0.16)' : '1px solid transparent',
                  width: 240, textAlign: 'center', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 10,
                  letterSpacing: '-0.01em',
                  transition: 'background 0.15s',
                }}
              >
                <t.Icon size={18} strokeWidth={isActiveTab ? 2.5 : 1.75} />
                {t.label}
              </NavLink>
            </motion.div>
          )
        })}

        <motion.button
          onClick={handleSignOut}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: tabs.length * 0.045 + 0.1 }}
          whileTap={{ scale: 0.95 }}
          style={{
            marginTop: 20, fontSize: 14, fontWeight: 600,
            color: 'var(--red)', background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
            letterSpacing: '0.01em',
          }}
        >Sign Out</motion.button>
      </motion.div>
    )}
    </AnimatePresence>

    {/* Mobile bottom tab bar */}
    {isMobile && (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', height: 56, overflowX: 'auto',
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {tabs.map(t => {
          const isActive = location.pathname === t.to || location.pathname.startsWith(t.to + '/')
          return (
            <NavLink key={t.to} to={t.to} style={{
              flex: '1 0 0%', minWidth: 0, maxWidth: 80,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              padding: '4px 2px', gap: 3, minHeight: 44,
              borderTop: isActive ? '1.5px solid var(--accent)' : '1.5px solid transparent',
              transition: 'color 0.15s',
            }}>
              <t.Icon size={18} />
              <span style={{
                fontSize: 9, fontWeight: 600, letterSpacing: '0.02em',
                whiteSpace: 'nowrap', fontFamily: "'Outfit', sans-serif",
              }}>
                {t.short}
              </span>
            </NavLink>
          )
        })}
      </div>
    )}
    </>
  )
}

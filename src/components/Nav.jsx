import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Timer, Brain, FileText, Target, Flame, BarChart2, Users, Settings, Menu, X } from 'lucide-react'

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
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
          style={{ fontSize: 24, color: 'var(--accent)', display: 'inline-block', lineHeight: 1, fontWeight: 300 }}
        >⟳</motion.span>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '4px', color: 'white' }}>
          FOCUSOS
        </span>
      </div>

      {!isMobile && (
        <LayoutGroup id="nav-tabs">
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}>
            {tabs.map(t => {
              const isActive = location.pathname === t.to || location.pathname.startsWith(t.to + '/')
              return (
                <NavLink key={t.to} to={t.to} style={{
                  position: 'relative',
                  padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                  textDecoration: 'none', whiteSpace: 'nowrap', transition: 'color 0.15s, background 0.15s',
                  color: isActive ? 'var(--accent)' : 'var(--muted)',
                  background: isActive ? 'rgba(181,242,58,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(181,242,58,0.25)' : '1px solid transparent',
                  display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                }}>
                  {t.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-tab-indicator"
                      style={{
                        position: 'absolute', bottom: -1, left: '18%', right: '18%',
                        height: 2, background: 'var(--accent)', borderRadius: 1,
                      }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                </NavLink>
              )
            })}
          </div>
        </LayoutGroup>
      )}
      {isMobile && <div style={{ flex: 1 }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {isMobile && (
          <motion.button
            onClick={() => setMobileOpen(true)}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: 18, cursor: 'pointer',
              borderRadius: 8, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><Menu size={18} /></motion.button>
        )}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(242,199,90,0.1)', border: '1px solid rgba(242,199,90,0.25)',
          borderRadius: 20, padding: '4px 10px', fontSize: 13,
        }}>
          <Flame size={14} color="var(--amber)" />
          <span style={{ fontWeight: 700, color: 'var(--amber)' }}>{streak}</span>
        </div>

        <div style={{ position: 'relative' }}>
          <motion.button
            onClick={() => setDropdownOpen(o => !o)}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(181,242,58,0.2)', border: '1.5px solid var(--accent)',
              color: 'var(--accent)', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                initial={{ opacity: 0, scale: 0.92, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                style={{
                  position: 'absolute', top: 42, right: 0,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 6, minWidth: 160, zIndex: 99,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  transformOrigin: 'top right',
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
              </motion.div>
            </>
          )}
          </AnimatePresence>
        </div>
      </div>
    </nav>

    {/* Mobile full-screen menu */}
    <AnimatePresence>
    {mobileOpen && (
      <motion.div
        key="mobile-menu"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#0a0a0b',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        <motion.button
          onClick={() => setMobileOpen(false)}
          whileTap={{ scale: 0.88 }}
          style={{
            position: 'absolute', top: 20, right: 20,
            background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: 24, cursor: 'pointer', lineHeight: 1,
          }}
        ><X size={20} /></motion.button>
        {tabs.map((t, i) => (
          <motion.div
            key={t.to}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 38, delay: i * 0.04 }}
          >
            <NavLink
              to={t.to}
              onClick={() => setMobileOpen(false)}
              style={({ isActive }) => ({
                fontSize: 24, fontWeight: 700, color: isActive ? 'var(--accent)' : 'white',
                textDecoration: 'none', padding: '10px 24px', borderRadius: 12,
                background: isActive ? 'rgba(181,242,58,0.08)' : 'transparent',
                width: 220, textAlign: 'center', display: 'block',
              })}
            >
              {t.label}
            </NavLink>
          </motion.div>
        ))}
        <motion.button
          onClick={handleSignOut}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: tabs.length * 0.04 + 0.06 } }}
          whileTap={{ scale: 0.95 }}
          style={{
            marginTop: 16, fontSize: 15, fontWeight: 600,
            color: 'var(--red)', background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}
        >Sign Out</motion.button>
      </motion.div>
    )}
    </AnimatePresence>

    {/* Mobile bottom tab bar */}
    {isMobile && (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'rgba(10,10,11,0.96)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', height: 56, overflowX: 'auto',
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {tabs.map(t => {
          const isActive = location.pathname === t.to || location.pathname.startsWith(t.to + '/')
          return (
            <NavLink key={t.to} to={t.to} style={{
              flex: '1 0 auto', minWidth: 52, maxWidth: 80,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              padding: '4px 2px', gap: 2, minHeight: 44,
              borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'color 0.15s',
            }}>
              <t.Icon size={19} />
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
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

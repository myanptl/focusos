import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Timer, Brain, Target, BarChart2, Users, Settings, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTimerContext } from '../context/TimerContext'
import LogoIcon from './LogoIcon'

/* Five sections. Each owns the routes listed in `match`, so sub-pages
   (e.g. Planner) keep their parent tab lit. */
const SECTIONS = [
  { to: '/timer',    label: 'Focus', Icon: Timer,     match: ['/timer'] },
  { to: '/quiz',     label: 'Quiz',  Icon: Brain,     match: ['/quiz'] },
  { to: '/goals',    label: 'Plan',  Icon: Target,    match: ['/goals', '/planner'] },
  { to: '/progress', label: 'Stats', Icon: BarChart2, match: ['/progress'] },
  { to: '/rooms',    label: 'Rooms', Icon: Users,     match: ['/rooms'] },
]

const SPRING = { type: 'spring', stiffness: 520, damping: 40 }

function isIn(pathname, section) {
  return section.match.some(m => pathname === m || pathname.startsWith(m + '/'))
}

export default function Nav() {
  const { profile, signOut } = useAuth()
  const { running, phase } = useTimerContext()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const name = profile?.name || profile?.username || 'You'
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const streak = profile?.streak_count ?? 0
  const live = running && phase === 'focus'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      <aside className="rail" aria-label="Main navigation">
        <Link to="/timer" className="rail-brand">
          <LogoIcon size={20} spinning={live} />
          FocusOS
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative', zIndex: 0 }}>
          {SECTIONS.map((s, i) => {
            const active = isIn(pathname, s)
            return (
              <NavLink key={s.to} to={s.to} className={active ? 'rail-link active' : 'rail-link'}>
                {active && <motion.span layoutId="rail-pill" className="rail-pill" transition={SPRING} />}
                {active && <motion.span layoutId="rail-tick" className="rail-tick" transition={SPRING} />}
                <s.Icon size={16} strokeWidth={1.6} />
                {s.label}
                <span className="kbd">{i + 1}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="rail-foot">
          <div className="rail-user">
            <span className="avatar">{initials}</span>
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{name}</span>
            {streak > 0 && (
              <span title={`${streak}-day streak`} className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{streak}d</span>
            )}
          </div>
          <NavLink to="/settings" className={pathname === '/settings' ? 'rail-link active' : 'rail-link'}>
            {pathname === '/settings' && <motion.span layoutId="rail-pill" className="rail-pill" transition={SPRING} />}
            <Settings size={16} strokeWidth={1.6} /> Settings
          </NavLink>
          <button onClick={handleSignOut} className="rail-link" style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', fontSize: 13.5, width: '100%' }}>
            <LogOut size={16} strokeWidth={1.6} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile */}
      <header className="mobile-top">
        <Link to="/timer" className="rail-brand" style={{ padding: 0 }}>
          <LogoIcon size={18} spinning={live} /> FocusOS
        </Link>
        <Link to="/settings" aria-label="Settings" className="avatar" style={{ textDecoration: 'none' }}>{initials}</Link>
      </header>

      <nav className="tabbar" aria-label="Main navigation">
        {SECTIONS.map(s => {
          const active = isIn(pathname, s)
          return (
            <NavLink key={s.to} to={s.to} className={active ? 'active' : ''}>
              {active && <motion.span layoutId="tab-dot" className="tabbar-dot" transition={SPRING} />}
              <s.Icon size={19} strokeWidth={active ? 1.9 : 1.5} />
              {s.label}
            </NavLink>
          )
        })}
      </nav>
    </>
  )
}

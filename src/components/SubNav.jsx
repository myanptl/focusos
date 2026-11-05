import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const GROUPS = {
  plan:  [{ to: '/goals', label: 'Goals' }, { to: '/planner', label: 'Planner' }],
}

/* Underline tabs that join sibling pages into one section. */
export default function SubNav({ group }) {
  const { pathname } = useLocation()
  const items = GROUPS[group] || []
  return (
    <nav className="subnav recede" aria-label="Section">
      {items.map(it => {
        const active = pathname === it.to
        return (
          <NavLink key={it.to} to={it.to} className={active ? 'active' : ''}>
            {it.label}
            {active && <motion.span layoutId={`subnav-${group}`} className="subnav-line" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
          </NavLink>
        )
      })}
    </nav>
  )
}

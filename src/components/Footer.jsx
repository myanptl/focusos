import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/support', label: 'Support' },
]

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--hairline)',
      padding: '16px clamp(16px, 4vw, 40px)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
      fontSize: 12, color: 'var(--faint)',
      marginTop: 'auto',
    }}>
      <span className="mono">© 2026 FocusOS</span>
      <nav style={{ display: 'flex', gap: 20 }}>
        {LINKS.map(l => (
          <Link key={l.to} to={l.to} className="btn-quiet" style={{ padding: 0, fontSize: 12, textDecoration: 'none' }}>
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  )
}

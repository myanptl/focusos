import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      fontSize: '12px',
      color: 'var(--muted)',
      flexWrap: 'wrap',
      textAlign: 'center',
      marginTop: 'auto',
    }}>
      <span>© 2026 FocusOS. All rights reserved.</span>
      <span style={{ color: 'var(--border)' }}>·</span>
      <Link to="/privacy" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacy Policy</Link>
      <span style={{ color: 'var(--border)' }}>·</span>
      <Link to="/terms" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terms of Service</Link>
      <span style={{ color: 'var(--border)' }}>·</span>
      <Link to="/support" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Support</Link>
    </footer>
  )
}

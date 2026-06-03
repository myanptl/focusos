import { Link } from 'react-router-dom'

const footerLinkStyle = {
  color: 'var(--muted)',
  textDecoration: 'none',
  transition: 'color 0.15s',
}

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      style={footerLinkStyle}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
    >
      {children}
    </Link>
  )
}

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
      <FooterLink to="/privacy">Privacy Policy</FooterLink>
      <span style={{ color: 'var(--border)' }}>·</span>
      <FooterLink to="/terms">Terms of Service</FooterLink>
      <span style={{ color: 'var(--border)' }}>·</span>
      <FooterLink to="/support">Support</FooterLink>
    </footer>
  )
}

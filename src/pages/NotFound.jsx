import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0b',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <span style={{
        fontSize: 48, color: 'var(--accent)',
        display: 'inline-block',
        animation: 'spin-slow 8s linear infinite',
        lineHeight: 1, fontWeight: 300,
      }}>⟳</span>
      <div style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 120, color: 'var(--accent)',
        lineHeight: 1, letterSpacing: 4,
      }}>404</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: 'white' }}>Page not found</div>
      <div style={{ fontSize: 14, color: 'var(--muted)' }}>That URL doesn't exist in FocusOS.</div>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: 8, background: 'var(--accent)', color: '#000',
          border: 'none', padding: '12px 28px', borderRadius: 8,
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        Go Home
      </button>
    </div>
  )
}

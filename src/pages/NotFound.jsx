import { useNavigate } from 'react-router-dom'
import LogoIcon from '../components/LogoIcon'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)', padding: 24,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    }}>
      <LogoIcon size={22} />
      <span className="kicker" style={{ marginTop: 28 }}>Error · 404</span>
      <h1 className="page-title">Page not found</h1>
      <p style={{ color: 'var(--muted)', marginTop: 8, maxWidth: '40ch' }}>
        That URL doesn&apos;t exist in FocusOS.
      </p>
      <button className="btn btn-ghost" style={{ marginTop: 28 }} onClick={() => navigate('/')}>
        Go home
      </button>
    </div>
  )
}

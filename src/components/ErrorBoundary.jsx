import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh', background: 'var(--bg)', padding: 24,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        }}>
          <span className="kicker" style={{ color: 'var(--amber)' }}>Error</span>
          <h1 className="page-title">Something went wrong</h1>
          <p className="mono" style={{ color: 'var(--muted)', fontSize: 12.5, maxWidth: 440, marginTop: 10, lineHeight: 1.6 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button className="btn btn-ghost" style={{ marginTop: 28 }} onClick={() => { window.location.href = '/' }}>
            Return home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

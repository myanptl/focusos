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
          minHeight: '100vh', background: '#0a0a0b',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 16, color: 'white',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>Something went wrong</h2>
          <p style={{ color: '#9494a0', fontSize: 14, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: '#b5f23a', color: '#000', border: 'none',
              padding: '12px 24px', borderRadius: 8,
              fontWeight: 700, cursor: 'pointer', fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Return to Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

import { createContext, useContext, useState, useCallback } from 'react'
import { Check, X, Info } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t))
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350)
    }, duration)
  }, [])

  const icons = { success: Check, error: X, info: Info }
  const colors = {
    success: { bg: 'rgba(181,242,58,0.12)', border: 'rgba(181,242,58,0.3)', icon: '#b5f23a' },
    error:   { bg: 'rgba(242,90,90,0.12)',  border: 'rgba(242,90,90,0.3)',  icon: '#f25a5a' },
    info:    { bg: 'rgba(96,211,248,0.12)', border: 'rgba(96,211,248,0.3)', icon: '#60d3f8' },
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.success
          return (
            <div key={t.id} style={{
              background: 'rgba(20,20,23,0.82)',
              border: '1px solid var(--border)',
              borderLeft: `2px solid ${c.icon}`,
              borderRadius: 'var(--radius-md)', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 11,
              fontSize: 14, color: 'var(--text)', letterSpacing: '-0.005em',
              minWidth: 260, maxWidth: 'min(360px, calc(100vw - 48px))',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              animation: t.leaving ? 'slideOutRight 0.35s ease forwards' : 'slideInRight 0.3s var(--ease-out)',
              boxShadow: 'var(--shadow-lg)',
            }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                background: c.bg, border: `1px solid ${c.border}`,
              }}>
                {(() => { const Icon = icons[t.type] || Check; return <Icon size={14} color={c.icon} strokeWidth={2.5} /> })()}
              </span>
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

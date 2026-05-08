import { createContext, useContext, useState, useCallback } from 'react'

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

  const icons = { success: '✓', error: '✕', info: 'ℹ' }
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
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 14, color: 'var(--text)',
              minWidth: 260, maxWidth: 360,
              backdropFilter: 'blur(8px)',
              animation: t.leaving ? 'slideOutRight 0.35s ease forwards' : 'slideInRight 0.3s ease',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}>
              <span style={{ color: c.icon, fontWeight: 700, fontSize: 16 }}>{icons[t.type]}</span>
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

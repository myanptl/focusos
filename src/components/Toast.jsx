import { createContext, useContext, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X, Info } from 'lucide-react'

const ToastContext = createContext(null)

const ICONS = { success: Check, error: X, info: Info }
const ICON_COLORS = { success: 'var(--accent)', error: 'var(--red)', info: 'var(--muted)' }
const SPRING = { type: 'spring', stiffness: 500, damping: 40 }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed', left: '50%', transform: 'translateX(-50%)',
          bottom: 'var(--toast-bottom)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          width: 'max-content', maxWidth: 'calc(100vw - 32px)', pointerEvents: 'none',
        }}
      >
        <AnimatePresence initial={false}>
          {toasts.map(t => {
            const Icon = ICONS[t.type] || Check
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={SPRING}
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-full)',
                  padding: '8px 16px 8px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, color: 'var(--text)',
                  boxShadow: 'var(--shadow-lg)',
                  pointerEvents: 'auto',
                }}
              >
                <Icon size={14} strokeWidth={1.6} color={ICON_COLORS[t.type] || ICON_COLORS.info} style={{ flexShrink: 0 }} />
                <span>{t.message}</span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TimerProvider } from './context/TimerContext'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { motion, AnimatePresence } from 'framer-motion'
import Nav from './components/Nav'
import Footer from './components/Footer'
import AppBackground from './components/AppBackground'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ResetPassword from './pages/ResetPassword'
import Onboarding from './pages/Onboarding'
import Timer from './pages/Timer'
import Quiz from './pages/Quiz'
import Goals from './pages/Goals'
import Streak from './pages/Streak'
import Progress from './pages/Progress'
import Review from './pages/Review'
import Planner from './pages/Planner'
import Notes from './pages/Notes'
import Rooms from './pages/Rooms'
import RoomDetail from './pages/RoomDetail'
import Settings from './pages/Settings'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Support from './pages/Support'
import NotFound from './pages/NotFound'

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (profile && !profile.onboarding_complete) return <Navigate to="/onboarding" replace />
  return children
}

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.15, ease: [0.32, 0, 0.67, 0] } },
}

function AppShell({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 60px)', position: 'relative' }}>
      <main className="app-main" style={{ flex: 1, padding: '28px 24px', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
          {children}
        </motion.div>
      </main>
      <Footer />
    </div>
  )
}

function LegalShell({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{
            fontSize: 24, color: 'var(--accent)',
            display: 'inline-block',
            animation: 'spin 8s linear infinite',
            lineHeight: 1, fontWeight: 300,
          }}>⟳</span>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '4px', color: 'white' }}>FOCUSOS</span>
        </Link>
      </div>
      <main style={{ flex: 1, padding: '40px 24px', maxWidth: 760, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {children}
      </main>
      <Footer />
    </div>
  )
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  const noNavPaths = ['/', '/login', '/signup', '/onboarding', '/reset-password']
  const noNavPrefixes = ['/privacy', '/terms', '/support']
  const showNav = user && profile?.onboarding_complete &&
    !noNavPaths.includes(location.pathname) &&
    !noNavPrefixes.some(p => location.pathname.startsWith(p))

  const navigate = useNavigate()
  useEffect(() => {
    const TAB_ROUTES = ['/timer', '/quiz', '/notes', '/goals', '/streak', '/progress', '/rooms', '/settings']
    function handleTabShortcut(e) {
      const tag = document.activeElement?.tagName
      const editable = document.activeElement?.isContentEditable
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return
      const idx = parseInt(e.key) - 1
      if (idx >= 0 && idx < TAB_ROUTES.length) navigate(TAB_ROUTES[idx])
    }
    window.addEventListener('keydown', handleTabShortcut)
    return () => window.removeEventListener('keydown', handleTabShortcut)
  }, [navigate])

  return (
    <>
      {showNav && <Nav />}
      {showNav && <AppBackground />}
    <AnimatePresence mode="wait" initial={false}>
    <Routes location={location} key={location.pathname}>
      <Route path="/"           element={user ? <Navigate to="/timer" replace /> : <Landing />} />
      <Route path="/login"      element={!user ? <Login />  : <Navigate to="/timer" replace />} />
      <Route path="/signup"     element={!user ? <Signup /> : <Navigate to="/timer" replace />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/login" replace />} />

      <Route path="/timer"    element={<ProtectedRoute><ErrorBoundary><AppShell><Timer /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/quiz"     element={<ProtectedRoute><ErrorBoundary><AppShell><Quiz /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/goals"    element={<ProtectedRoute><ErrorBoundary><AppShell><Goals /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/streak"   element={<ProtectedRoute><ErrorBoundary><AppShell><Streak /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><ErrorBoundary><AppShell><Progress /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/planner"  element={<ProtectedRoute><ErrorBoundary><AppShell><Planner /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/notes"    element={<ProtectedRoute><ErrorBoundary><AppShell><Notes /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/rooms"    element={<ProtectedRoute><ErrorBoundary><AppShell><Rooms /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/rooms/:roomId" element={<ProtectedRoute><ErrorBoundary><AppShell><RoomDetail /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/review"   element={<ProtectedRoute><ErrorBoundary><AppShell><Review /></AppShell></ErrorBoundary></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><ErrorBoundary><AppShell><Settings /></AppShell></ErrorBoundary></ProtectedRoute>} />

      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/privacy" element={<LegalShell><Privacy /></LegalShell>} />
      <Route path="/terms"   element={<LegalShell><Terms /></LegalShell>} />
      <Route path="/support" element={<LegalShell><Support /></LegalShell>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <TimerProvider>
              <AppRoutes />
              <Analytics />
              <SpeedInsights />
            </TimerProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

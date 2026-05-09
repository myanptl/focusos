import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import ErrorBoundary from './components/ErrorBoundary'
import Nav from './components/Nav'
import Footer from './components/Footer'
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

function AppShell({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Nav />
      <main style={{ flex: 1, padding: '28px 24px', maxWidth: 1100, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {children}
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
            animation: 'spin-slow 8s linear infinite',
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  return (
    <Routes>
      <Route path="/"           element={user ? <Navigate to="/timer" replace /> : <Landing />} />
      <Route path="/login"      element={!user ? <Login />  : <Navigate to="/timer" replace />} />
      <Route path="/signup"     element={!user ? <Signup /> : <Navigate to="/timer" replace />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/login" replace />} />

      <Route path="/timer"    element={<ProtectedRoute><AppShell><Timer /></AppShell></ProtectedRoute>} />
      <Route path="/quiz"     element={<ProtectedRoute><AppShell><Quiz /></AppShell></ProtectedRoute>} />
      <Route path="/goals"    element={<ProtectedRoute><AppShell><Goals /></AppShell></ProtectedRoute>} />
      <Route path="/streak"   element={<ProtectedRoute><AppShell><Streak /></AppShell></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><AppShell><Progress /></AppShell></ProtectedRoute>} />
      <Route path="/planner"  element={<ProtectedRoute><AppShell><Planner /></AppShell></ProtectedRoute>} />
      <Route path="/notes"    element={<ProtectedRoute><AppShell><Notes /></AppShell></ProtectedRoute>} />
      <Route path="/rooms"    element={<ProtectedRoute><AppShell><Rooms /></AppShell></ProtectedRoute>} />
      <Route path="/rooms/:roomId" element={<ProtectedRoute><AppShell><RoomDetail /></AppShell></ProtectedRoute>} />
      <Route path="/review"   element={<ProtectedRoute><AppShell><Review /></AppShell></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppShell><Settings /></AppShell></ProtectedRoute>} />

      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/privacy" element={<LegalShell><Privacy /></LegalShell>} />
      <Route path="/terms"   element={<LegalShell><Terms /></LegalShell>} />
      <Route path="/support" element={<LegalShell><Support /></LegalShell>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

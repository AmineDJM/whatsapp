import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { isConfigured } from './lib/supabase'
import AuthPage from './pages/AuthPage'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Settings from './pages/Settings'
import MetaAI from './pages/MetaAI'
import SetupNotice from './pages/SetupNotice'
import { CallProvider } from './features/calls/CallProvider'

export default function App() {
  const { session, profile, loading } = useAuth()
  const loc = useLocation()

  if (!isConfigured) return <SetupNotice />

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-wa-teal">
        <div className="text-white/80 text-sm animate-pulse">WhatsApp</div>
      </div>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace state={{ from: loc.pathname }} />} />
      </Routes>
    )
  }

  // Logged in but no username yet -> onboarding
  if (!profile?.username) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  return (
    <CallProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat/:id" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/meta-ai" element={<MetaAI />} />
        <Route path="/auth" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CallProvider>
  )
}

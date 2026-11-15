import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from './components/ui/States'
import { AppShell } from './layouts/AppShell'
import { PublicLayout } from './layouts/PublicLayout'
import ComingSoon from './pages/ComingSoon'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'
import AdminOverview from './pages/admin/AdminOverview'
import Dashboard from './pages/app/Dashboard'
import History from './pages/app/History'
import Settings from './pages/app/Settings'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import { GuestOnly, RequireAuth, RequirePermission } from './routes/guards'

// MediaPipe is large: load the translator code only when it's shown.
const Translator = lazy(() => import('./pages/app/translator/Translator'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Open to everyone: the translator is the home page, no account needed. */}
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <Suspense fallback={<Spinner label="Loading translator…" />}>
                <Translator />
              </Suspense>
            }
          />
          <Route path="speech" element={<ComingSoon title="Speech & text" description="Text-to-speech and speech-to-text." phase="Phase 1" />} />
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="about" element={<Landing />} />
          <Route element={<GuestOnly />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>
        </Route>

        {/* Old links */}
        <Route path="app/translate" element={<Navigate to="/" replace />} />
        <Route path="translate" element={<Navigate to="/" replace />} />

        {/* Account features */}
        <Route element={<RequireAuth />}>
          <Route path="app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="learn" element={<ComingSoon title="Learn FSL" description="Lessons, vocabulary and favorites." phase="Phase 2" />} />
            <Route path="practice" element={<ComingSoon title="Practice" description="Quizzes and vocabulary challenges." phase="Phase 3" />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        <Route element={<RequirePermission permission="analytics.view" />}>
          <Route path="admin" element={<AppShell />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<ComingSoon title="Users" description="Manage user accounts." phase="Phase 4" />} />
            <Route path="content" element={<ComingSoon title="Vocabulary & lessons" description="Manage FSL content." phase="Phase 2" />} />
            <Route path="quizzes" element={<ComingSoon title="Quizzes" description="Build and publish quizzes." phase="Phase 3" />} />
          </Route>
        </Route>

        <Route element={<PublicLayout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

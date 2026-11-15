import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { PublicLayout } from './layouts/PublicLayout'
import ComingSoon from './pages/ComingSoon'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'
import AdminOverview from './pages/admin/AdminOverview'
import Dashboard from './pages/app/Dashboard'
import Settings from './pages/app/Settings'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import { GuestOnly, RequireAuth, RequirePermission } from './routes/guards'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route element={<GuestOnly />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="app" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="translate" element={<ComingSoon title="Sign translator" description="Recognize supported FSL signs from your camera." phase="Phase 1" />} />
            <Route path="speech" element={<ComingSoon title="Speech & text" description="Text-to-speech and speech-to-text." phase="Phase 1" />} />
            <Route path="learn" element={<ComingSoon title="Learn FSL" description="Lessons, vocabulary and favorites." phase="Phase 2" />} />
            <Route path="practice" element={<ComingSoon title="Practice" description="Quizzes and vocabulary challenges." phase="Phase 3" />} />
            <Route path="history" element={<ComingSoon title="History" description="Your saved translations." phase="Phase 1" />} />
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
      </Routes>
    </BrowserRouter>
  )
}

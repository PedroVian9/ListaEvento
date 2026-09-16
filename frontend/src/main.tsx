import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/playfair-display/latin-400.css'
import '@fontsource/playfair-display/latin-500.css'
import './styles.css'
import { theme } from './theme'
import { Loading, ToastProvider } from './components'
import { InvitationPage } from './pages/InvitationPage'
import { NotFoundPage } from './pages/NotFoundPage'

const AdminLayout = lazy(() => import('./pages/AdminLayout').then(m => ({ default: m.AdminLayout })))
const LoginPage = lazy(() => import('./pages/AdminLayout').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const GuestsPage = lazy(() => import('./pages/GuestsPage').then(m => ({ default: m.GuestsPage })))
const GiftsPage = lazy(() => import('./pages/GiftsPage').then(m => ({ default: m.GiftsPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ThemeProvider theme={theme}><CssBaseline /><ToastProvider><BrowserRouter><Suspense fallback={<Loading />}><Routes>
    <Route path="/" element={<InvitationPage />} />
    <Route path="/convite/:token" element={<InvitationPage />} />
    <Route path="/c/:token" element={<InvitationPage />} />
    <Route path="/admin/login" element={<LoginPage />} />
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<DashboardPage />} /><Route path="convidados" element={<GuestsPage />} />
      <Route path="presentes" element={<GiftsPage />} /><Route path="configuracoes" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></BrowserRouter></ToastProvider></ThemeProvider></React.StrictMode>,
)

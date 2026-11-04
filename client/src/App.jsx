import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import VendorPortal from './pages/VendorPortal'
import ToastContainer from './components/ToastContainer'
import { ToastContext } from './context/ToastContext'
import { SessionContext } from './context/SessionContext'

// Demo credentials
const DEMO_EMAIL = 'demo@taxsync.in'
const DEMO_PASSWORD = 'TaxSync2026'

function ProtectedRoute({ children, isAuth }) {
  return isAuth ? children : <Navigate to="/login" replace />
}

function VendorRoute({ children }) {
  // Vendor portal is always accessible (no auth required)
  return children
}

export default function App() {
  const [isAuth, setIsAuth] = useState(() => {
    return sessionStorage.getItem('taxsync_auth') === 'true'
  })
  const [session, setSession] = useState({
    sessionId: Math.random().toString(36).substring(2),
    tallyData: null,
    gstr2bData: null,
    reconciliationResult: null,
  })
  const [toasts, setToasts] = useState([])
  const location = useLocation()

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const handleLogin = (email, password) => {
    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      sessionStorage.setItem('taxsync_auth', 'true')
      setIsAuth(true)
      return true
    }
    return false
  }

  const handleLogout = () => {
    sessionStorage.removeItem('taxsync_auth')
    setIsAuth(false)
  }

  // Determine if this is a vendor portal route
  const isVendorRoute = location.pathname.startsWith('/v/')

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      <SessionContext.Provider value={{ session, setSession }}>
        <div className="app-layout">
          {!isVendorRoute && <Navbar isAuth={isAuth} onLogout={handleLogout} />}
          <main style={{ flex: 1 }}>
            <Routes>
              <Route path="/login" element={
                isAuth ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
              } />
              <Route path="/" element={
                <ProtectedRoute isAuth={isAuth}>
                  <UploadPage />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute isAuth={isAuth}>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/v/:token" element={
                <VendorRoute>
                  <VendorPortal />
                </VendorRoute>
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
      </SessionContext.Provider>
    </ToastContext.Provider>
  )
}

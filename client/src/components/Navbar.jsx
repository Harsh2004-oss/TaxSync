import { Link, useNavigate } from 'react-router-dom'
import { LogOut, FileSpreadsheet, MessageSquare } from 'lucide-react'

export default function Navbar({ isAuth, onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/login')
  }

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
        <div className="navbar-logo">T</div>
        <div>
          <div className="navbar-title">TaxSync AI</div>
          <div className="navbar-subtitle">GST Reconciliation Engine</div>
        </div>
      </Link>

      <div className="navbar-right">
        <span className="navbar-badge badge-mock">
          <span style={{ marginRight: 4 }}>●</span>
          WhatsApp Mock Mode
        </span>

        {isAuth && (
          <>
            <div className="navbar-badge" style={{
              background: 'rgba(99,102,241,0.1)',
              color: 'var(--brand-light)',
              border: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <FileSpreadsheet size={12} />
              Section 16(2)(aa) + 17(5)
            </div>
            <button
              id="logout-btn"
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={15} />
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

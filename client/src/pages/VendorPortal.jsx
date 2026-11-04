import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Clock, FileText, CheckCircle2, AlertCircle, Loader2, MessageCircle, Shield } from 'lucide-react'

const BASE_URL = 'http://localhost:5000'

const RESOLUTION_OPTIONS = [
  {
    id: 'filed_late',
    icon: <Clock size={28} />,
    title: 'GSTR-1 Filed Late',
    desc: 'Aapka return next month reflect hoga.',
    color: 'var(--yellow)',
    bg: 'var(--yellow-bg)',
    border: 'var(--yellow-border)',
    btnLabel: 'Haan, Late File Hua Hai',
  },
  {
    id: 'typo',
    icon: <FileText size={28} />,
    title: 'Invoice Number Typo',
    desc: 'Portal par bill number alag dala hai.',
    color: 'var(--brand-light)',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.3)',
    btnLabel: 'Haan, Number Galat Tha',
  },
  {
    id: 'upload_copy',
    icon: <CheckCircle2 size={28} />,
    title: 'Bill Copy Share Karein',
    desc: 'Verified PDF invoice buyer ko bhejein.',
    color: 'var(--green)',
    bg: 'var(--green-bg)',
    border: 'var(--green-border)',
    btnLabel: 'Bill Copy Upload / Share',
  },
]

export default function VendorPortal() {
  const { token } = useParams()
  const [chaseData, setChaseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(null) // action id being submitted
  const [responded, setResponded] = useState(false)
  const [response, setResponse] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/vendor/${token}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Invalid link')
        setChaseData(data)
        if (data.vendorResponse) {
          setResponded(true)
          setResponse(data.vendorResponse)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token])

  const handleRespond = async (action) => {
    setSubmitting(action)
    try {
      const res = await fetch(`${BASE_URL}/api/vendor/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResponded(true)
      setResponse({ action, actionLabel: data.actionLabel })
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(null)
    }
  }

  const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-base)', flexDirection: 'column', gap: 16
      }}>
        <Loader2 size={36} color="var(--brand-light)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif' }}>Loading invoice details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-base)', flexDirection: 'column', gap: 16, padding: '2rem'
      }}>
        <AlertCircle size={48} color="var(--red)" />
        <h2 style={{ color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>Link Invalid or Expired</h2>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      fontFamily: 'Inter, sans-serif',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Animated background */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at top, rgba(99,102,241,0.12) 0%, transparent 60%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%', maxWidth: 440, padding: '1.5rem',
        position: 'relative', zIndex: 1
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, var(--brand), var(--accent))',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            boxShadow: 'var(--shadow-brand)',
            fontSize: '1.5rem', fontWeight: 900, color: 'white'
          }}>T</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            TaxSync AI
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            GST Invoice Resolution Portal
          </div>
        </div>

        {/* Invoice Card */}
        <div style={{
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid var(--border-strong)',
          borderRadius: 20,
          padding: '1.5rem',
          marginBottom: '1.25rem',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: '1.25rem', gap: '0.5rem'
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Buyer</div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{chaseData.buyerName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>GST Amount</div>
              <div style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--red)' }}>
                {formatINR(chaseData.taxAmount)}
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '0 0 1rem' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase' }}>Your Company</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{chaseData.vendorName}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase' }}>Invoice No</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--brand-light)' }}>{chaseData.invoiceNo}</div>
            </div>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '0.625rem 0.875rem',
            background: 'var(--red-bg)',
            border: '1px solid var(--red-border)',
            borderRadius: 10,
            fontSize: '0.8rem',
            color: 'var(--red)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            Aapka invoice hamare GSTR-2B mein nahi mila. Please ek option select karein:
          </div>
        </div>

        {/* Resolution Buttons */}
        {!responded ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {RESOLUTION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                id={`vendor-action-${opt.id}`}
                onClick={() => handleRespond(opt.id)}
                disabled={!!submitting}
                style={{
                  width: '100%',
                  padding: '1.1rem 1.25rem',
                  background: opt.bg,
                  border: `1px solid ${opt.border}`,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting && submitting !== opt.id ? 0.5 : 1,
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
              >
                <div style={{ color: opt.color, flexShrink: 0 }}>
                  {submitting === opt.id
                    ? <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
                    : opt.icon
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: opt.color, fontSize: '0.95rem', marginBottom: 2 }}>
                    {opt.title}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  <div style={{ fontSize: '0.75rem', color: opt.color, fontWeight: 600, marginTop: 4 }}>
                    → {opt.btnLabel}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Response Confirmed */
          <div style={{
            background: 'var(--green-bg)',
            border: '1px solid var(--green-border)',
            borderRadius: 16,
            padding: '2rem 1.5rem',
            textAlign: 'center',
            marginBottom: '1.25rem',
            animation: 'fadeIn 0.4s ease'
          }}>
            <CheckCircle2 size={48} color="var(--green)" style={{ margin: '0 auto 1rem' }} />
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--green)', marginBottom: 6 }}>
              Response Recorded!
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
              {response?.actionLabel}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Buyer ko notification bhej di gayi hai. Aapki taraf se koi action nahi chahiye.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Shield size={12} color="var(--green)" />
            Secure link · Powered by TaxSync AI
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.7 }}>
            Section 16(2)(aa) CGST Act Compliance · For GST reconciliation only
          </div>
        </div>
      </div>
    </div>
  )
}

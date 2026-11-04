import { useState } from 'react'
import { MessageCircle, X, CheckCircle2, Clock, FileText, Send, Loader2 } from 'lucide-react'
import { apiPost, formatINR } from '../utils/api'
import { useToast } from '../context/ToastContext'

export default function WhatsAppModal({ invoice, invoiceIndex, onClose, onChased }) {
  const { addToast } = useToast()
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await apiPost('/api/whatsapp/chase', {
        vendorName: invoice.particulars,
        invoiceNo: invoice.supplierInvNo,
        taxAmount: invoice.totalTax,
        buyerName: 'ABC Manufacturing Pvt Ltd',
        vendorMobile: invoice.vendorMobile,
        invoiceIndex,
      })
      setResult(res)
      onChased(invoiceIndex, res.token)
      addToast(`WhatsApp sent to ${invoice.vendorMobile} ✓`, 'success')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSending(false)
    }
  }

  const portalLink = result ? `http://localhost:5173/v/${result.token}` : null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="WhatsApp Vendor Chaser">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, #25d366, #128c7e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MessageCircle size={20} color="white" />
            </div>
            <div>
              <div className="modal-title">WhatsApp Vendor Chaser</div>
              <div className="fs-sm text-muted">Mock Mode — No real message sent</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {!result ? (
          <>
            {/* Invoice Info */}
            <div style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div className="flex justify-between mb-4" style={{ gap: '1rem' }}>
                <div>
                  <div className="fs-xs text-muted fw-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Vendor</div>
                  <div className="fw-bold">{invoice.particulars}</div>
                  <div className="fs-sm text-muted">{invoice.gstin}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="fs-xs text-muted fw-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>ITC at Risk</div>
                  <div className="fw-bold text-red" style={{ fontSize: '1.2rem' }}>{formatINR(invoice.totalTax)}</div>
                </div>
              </div>
              <div className="divider" style={{ margin: '0.75rem 0' }} />
              <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                <div>
                  <div className="fs-xs text-muted">Invoice No</div>
                  <div className="mono fw-semibold">{invoice.supplierInvNo}</div>
                </div>
                <div>
                  <div className="fs-xs text-muted">Mobile</div>
                  <div className="mono fw-semibold">+91 {invoice.vendorMobile}</div>
                </div>
                <div>
                  <div className="fs-xs text-muted">Date</div>
                  <div className="mono fw-semibold">{invoice.date}</div>
                </div>
              </div>
            </div>

            {/* Message Preview */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="fs-sm fw-semibold text-secondary" style={{ marginBottom: 8 }}>Message Preview (Template: itc_vendor_chaser_v1)</div>
              <div style={{
                background: '#1a2c1e',
                border: '1px solid rgba(37, 211, 102, 0.2)',
                borderRadius: 12,
                padding: '1rem',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: '#e9fbe7'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#25d366' }}>📋 ITC Reconciliation Alert</div>
                <p>Dear <strong>{invoice.particulars}</strong>,</p>
                <br />
                <p>We are reconciling our GSTR-2B for October 2026 and noticed that invoice <strong>{invoice.supplierInvNo}</strong> for GST amount of <strong>{formatINR(invoice.totalTax)}</strong> is not reflecting in our 2B statement.</p>
                <br />
                <p>This is an automated reminder from <strong>ABC Manufacturing Pvt Ltd</strong>.</p>
                <br />
                <p>Please click below to resolve:</p>
              </div>
              <div style={{
                background: '#25d366',
                color: 'white',
                textAlign: 'center',
                padding: '0.625rem',
                borderRadius: '0 0 12px 12px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                🔗 Tap to Resolve Invoice →
              </div>
            </div>

            <div className="flex gap-3">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button
                id="send-whatsapp-btn"
                className="btn btn-whatsapp"
                style={{ flex: 2 }}
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? <><div className="spinner" /><span>Sending...</span></> : <><Send size={15} /><span>Send WhatsApp Chaser</span></>}
              </button>
            </div>
          </>
        ) : (
          /* Success State */
          <div className="text-center animate-scale">
            <div style={{
              width: 72, height: 72,
              background: 'var(--green-bg)',
              border: '2px solid var(--green)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.25rem',
              animation: 'pulse-glow 2s ease-in-out infinite'
            }}>
              <CheckCircle2 size={32} color="var(--green)" />
            </div>
            <h3 className="mb-4" style={{ marginBottom: '0.5rem' }}>Chase Sent!</h3>
            <p className="text-secondary fs-sm" style={{ marginBottom: '1.25rem' }}>
              WhatsApp message simulated for <strong>+91 {invoice.vendorMobile}</strong>
            </p>

            {/* 3 Options the vendor will see */}
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <div className="fs-sm fw-semibold text-muted" style={{ marginBottom: 10 }}>Vendor will see these options:</div>
              {[
                { icon: <Clock size={14} />, label: 'GSTR-1 Filed Late', desc: 'Next return mein aayega' },
                { icon: <FileText size={14} />, label: 'Invoice Number Typo', desc: 'Correct bill number denge' },
                { icon: <CheckCircle2 size={14} />, label: 'Upload Bill Copy', desc: 'PDF invoice share karenge' },
              ].map((opt, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.6rem 0.75rem',
                  background: 'var(--bg-glass)',
                  borderRadius: 8,
                  marginBottom: 6,
                  border: '1px solid var(--border)',
                  fontSize: '0.82rem'
                }}>
                  <span style={{ color: 'var(--brand-light)' }}>{opt.icon}</span>
                  <div>
                    <span className="fw-semibold">{opt.label}</span>
                    <span className="text-muted"> — {opt.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Vendor portal link */}
            <div style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.75rem',
              marginBottom: '1.25rem'
            }}>
              <div className="fs-xs text-muted" style={{ marginBottom: 4 }}>Vendor Portal Link (for demo):</div>
              <a
                href={portalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mono text-brand"
                style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}
              >
                {portalLink}
              </a>
            </div>

            <button id="close-whatsapp-modal-btn" className="btn btn-ghost w-full" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

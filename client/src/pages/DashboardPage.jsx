import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Download, RefreshCw, CheckCircle2, AlertTriangle, Ban, TrendingUp,
  MessageCircle, ExternalLink, Info, ChevronDown, ChevronUp, Filter
} from 'lucide-react'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'
import { formatINR, getExportUrl, getHeaders } from '../utils/api'
import WhatsAppModal from '../components/WhatsAppModal'

const STATUS_CONFIG = {
  MATCHED: {
    label: 'Exact Match', color: 'green', icon: <CheckCircle2 size={14} />,
    desc: '100% Eligible under Sec 16(2)(aa)'
  },
  FUZZY: {
    label: 'Fuzzy Match', color: 'yellow', icon: <TrendingUp size={14} />,
    desc: 'Normalized — verify before filing'
  },
  BLOCKED: {
    label: 'Blocked ITC', color: 'purple', icon: <Ban size={14} />,
    desc: 'Section 17(5) — Do not claim'
  },
  MISSING: {
    label: 'Missing in 2B', color: 'red', icon: <AlertTriangle size={14} />,
    desc: 'ITC blocked — chase vendor'
  },
}

function SummaryCards({ summary }) {
  const cards = [
    {
      color: 'green', label: 'Eligible ITC (Exact)', value: formatINR(summary.eligibleITC),
      sub: `${summary.eligibleCount} invoice${summary.eligibleCount !== 1 ? 's' : ''}`,
      icon: '✅', desc: 'Claim in GSTR-3B Table 4(A)'
    },
    {
      color: 'yellow', label: 'Fuzzy Matches', value: summary.fuzzyCount,
      sub: 'Review before filing',
      icon: '🟡', desc: 'Invoice number discrepancy'
    },
    {
      color: 'purple', label: 'Sec 17(5) Blocked', value: formatINR(summary.blockedITC),
      sub: `${summary.blockedCount} invoice${summary.blockedCount !== 1 ? 's' : ''}`,
      icon: '🚫', desc: 'Move to Table 4(B)(1)'
    },
    {
      color: 'red', label: 'Missing ITC at Risk', value: formatINR(summary.missingITC),
      sub: `${summary.missingCount} vendor${summary.missingCount !== 1 ? 's' : ''} not filed`,
      icon: '⚠️', desc: 'Chase vendor immediately'
    },
  ]

  return (
    <div className="summary-grid stagger-children" style={{ marginBottom: '1.5rem' }}>
      {cards.map((card, i) => (
        <div key={i} className={`summary-card ${card.color}`}>
          <div className="summary-card-icon">{card.icon}</div>
          <div className="summary-card-label">{card.label}</div>
          <div className={`summary-card-value text-${card.color}`}>{card.value}</div>
          <div className="summary-card-sub">{card.sub}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{card.desc}</div>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {}
  return (
    <span className={`status-badge status-${config.color}`}>
      <span className="status-badge-dot" />
      {config.label || status}
    </span>
  )
}

function LegalRiskTag({ result }) {
  if (result.status === 'BLOCKED') {
    return (
      <div style={{ fontSize: '0.75rem', color: 'var(--purple)', lineHeight: 1.4 }}>
        <strong>{result.section175?.clause}</strong><br />
        <span style={{ color: 'var(--text-muted)' }}>{result.section175?.matchedKeyword}</span>
      </div>
    )
  }
  if (result.status === 'MISSING') {
    return (
      <span style={{ fontSize: '0.75rem', color: 'var(--red)', fontWeight: 600 }}>
        {formatINR(result.totalTax)} blocked
      </span>
    )
  }
  if (result.status === 'FUZZY') {
    return (
      <span style={{ fontSize: '0.75rem', color: 'var(--yellow)' }}>
        Score: {(result.matchScore * 100).toFixed(0)}%
      </span>
    )
  }
  return <span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>Table 4(A)(5)</span>
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { session, setSession } = useSession()
  const { addToast } = useToast()
  const [whatsappTarget, setWhatsappTarget] = useState(null) // { invoice, invoiceIndex }
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [exporting, setExporting] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)

  const result = session.reconciliationResult
  if (!result) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 70px)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem'
      }}>
        <AlertTriangle size={48} color="var(--yellow)" />
        <h2>No Reconciliation Data</h2>
        <p className="text-secondary">Please upload files and run reconciliation first.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>← Go to Upload</button>
      </div>
    )
  }

  const { summary, results, meta } = result

  const filtered = filterStatus === 'ALL' ? results : results.filter(r => r.status === filterStatus)

  const handleExport = async () => {
    setExporting(true)
    try {
      const url = getExportUrl()
      const response = await fetch(url, { headers: getHeaders() })
      if (!response.ok) throw new Error('Export failed')
      const blob = await response.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `TaxSync_ITC_Report_${Date.now()}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
      addToast('XLSX report downloaded with color-coded status!', 'success')
    } catch (err) {
      addToast(`Export failed: ${err.message}`, 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleWhatsAppChased = (invoiceIndex, token) => {
    setSession(prev => {
      const updatedResults = [...prev.reconciliationResult.results]
      updatedResults[invoiceIndex] = {
        ...updatedResults[invoiceIndex],
        whatsappChased: true,
        whatsappToken: token
      }
      return { ...prev, reconciliationResult: { ...prev.reconciliationResult, results: updatedResults } }
    })
    setWhatsappTarget(null)
  }

  const STATUS_FILTERS = [
    { key: 'ALL', label: 'All', count: results.length },
    { key: 'MATCHED', label: '✅ Matched', count: summary.eligibleCount },
    { key: 'FUZZY', label: '🟡 Fuzzy', count: summary.fuzzyCount },
    { key: 'BLOCKED', label: '🟣 Blocked', count: summary.blockedCount },
    { key: 'MISSING', label: '🔴 Missing', count: summary.missingCount },
  ]

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div className="flex items-center gap-3" style={{ marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.6rem' }}>Reconciliation Results</h1>
            <span className="status-badge status-green">
              <span className="status-badge-dot" style={{ animation: 'pulse-glow 2s infinite' }} />
              Complete
            </span>
          </div>
          <p className="text-secondary fs-sm">
            {meta?.gstr2bMeta?.buyerGSTIN || '—'} · Period: {meta?.gstr2bMeta?.filingPeriod || '—'} ·
            {results.length} invoices · {new Date().toLocaleDateString('en-IN')}
          </p>
        </div>

        <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
          <button
            id="back-to-upload-btn"
            className="btn btn-ghost"
            onClick={() => navigate('/')}
          >
            <RefreshCw size={15} /> New Reconciliation
          </button>
          <button
            id="export-xlsx-btn"
            className="btn btn-success"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting
              ? <><div className="spinner" /> Generating...</>
              : <><Download size={15} /> Export XLSX Report</>
            }
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} />

      {/* Section 16(2)(aa) Compliance Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(6,182,212,0.06))',
        border: '1px solid var(--green-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <CheckCircle2 size={20} color="var(--green)" />
        <div style={{ flex: 1 }}>
          <span className="fw-semibold text-green">Sec 16(2)(aa) Compliant ITC: </span>
          <span className="text-primary">{formatINR(summary.eligibleITC)}</span>
          <span className="text-muted fs-sm"> — Ready to file in GSTR-3B Table 4(A)(5)</span>
        </div>
        <div style={{ height: 1, width: 1, background: 'var(--border)' }} />
        <div>
          <span className="text-red fw-semibold">At Risk: </span>
          <span className="text-primary">{formatINR(summary.missingITC + summary.blockedITC)}</span>
          <span className="text-muted fs-sm"> — Do NOT claim</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            id={`filter-${f.key.toLowerCase()}-btn`}
            className="btn btn-ghost btn-sm"
            onClick={() => setFilterStatus(f.key)}
            style={{
              borderColor: filterStatus === f.key ? 'var(--brand)' : undefined,
              color: filterStatus === f.key ? 'var(--brand-light)' : undefined,
              background: filterStatus === f.key ? 'rgba(99,102,241,0.1)' : undefined,
            }}
          >
            {f.label}
            <span style={{
              marginLeft: 4,
              padding: '1px 6px',
              background: 'var(--bg-glass)',
              borderRadius: 100,
              fontSize: '0.7rem',
              fontWeight: 700
            }}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Results Table */}
      <div className="table-wrapper animate-fade-in">
        <table>
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Vendor</th>
              <th>GSTIN</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Taxable Val</th>
              <th style={{ textAlign: 'right' }}>Total GST</th>
              <th>Status</th>
              <th>Legal Risk / Action</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => {
              const globalIdx = results.indexOf(row)
              const isExpanded = expandedRow === globalIdx

              return [
                <tr
                  key={`row-${globalIdx}`}
                  className={`row-${row.statusColor}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedRow(isExpanded ? null : globalIdx)}
                >
                  <td>
                    <div className="mono fw-semibold" style={{ fontSize: '0.82rem' }}>{row.supplierInvNo}</div>
                    {row.matched2BInv && row.status === 'FUZZY' && (
                      <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        2B: {row.matched2BInv.inum}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="fw-semibold" style={{ fontSize: '0.88rem' }}>{row.particulars}</div>
                    <div className="fs-xs text-muted">{row.purchaseLedger}</div>
                  </td>
                  <td>
                    <div className="mono fs-xs text-secondary">{row.gstin}</div>
                  </td>
                  <td>
                    <div className="mono fs-xs">{row.date}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="mono fw-semibold" style={{ fontSize: '0.85rem' }}>
                      {formatINR(row.taxableValue)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className={`mono fw-bold text-${row.statusColor}`} style={{ fontSize: '0.9rem' }}>
                      {formatINR(row.totalTax)}
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={row.status} />
                    {row.status === 'MATCHED' && (
                      <div className="fs-xs text-muted" style={{ marginTop: 3 }}>Exact</div>
                    )}
                  </td>
                  <td>
                    <LegalRiskTag result={row} />
                  </td>
                  <td>
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                      {(row.status === 'MISSING') && (
                        row.whatsappChased ? (
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: '0.75rem', color: '#25d366', fontWeight: 600
                          }}>
                            <CheckCircle2 size={12} /> Chased
                          </span>
                        ) : (
                          <button
                            id={`chase-btn-${globalIdx}`}
                            className="btn btn-whatsapp btn-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setWhatsappTarget({ invoice: row, invoiceIndex: globalIdx })
                            }}
                          >
                            <MessageCircle size={13} />
                            Chase
                          </button>
                        )
                      )}
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={(e) => { e.stopPropagation(); setExpandedRow(isExpanded ? null : globalIdx) }}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        title={isExpanded ? 'Collapse' : 'View details'}
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>,

                /* Expandable Detail Row */
                isExpanded && (
                  <tr key={`detail-${globalIdx}`} className={`row-${row.statusColor}`}>
                    <td colSpan={9} style={{ padding: 0 }}>
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        borderTop: '1px solid var(--border)',
                        padding: '1rem 1.5rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div>
                          <div className="fs-xs text-muted fw-semibold" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tax Breakdown</div>
                          <div className="flex gap-4">
                            <div><div className="fs-xs text-muted">IGST</div><div className="mono fw-semibold">{formatINR(row.igst)}</div></div>
                            <div><div className="fs-xs text-muted">CGST</div><div className="mono fw-semibold">{formatINR(row.cgst)}</div></div>
                            <div><div className="fs-xs text-muted">SGST</div><div className="mono fw-semibold">{formatINR(row.sgst)}</div></div>
                          </div>
                        </div>
                        <div>
                          <div className="fs-xs text-muted fw-semibold" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Invoice Value</div>
                          <div className="mono fw-bold" style={{ fontSize: '1.1rem' }}>{formatINR(row.invoiceValue)}</div>
                        </div>
                        {row.section175?.isBlocked && (
                          <div>
                            <div className="fs-xs text-muted fw-semibold" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Section 17(5) Block</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--purple)' }}>
                              <strong>{row.section175.clause}</strong> — {row.section175.description}<br />
                              <span className="text-muted">Keyword: {row.section175.matchedKeyword}</span>
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="fs-xs text-muted fw-semibold" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>GSTR-3B Action</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.gstr3bAction}</div>
                        </div>
                        {row.whatsappChased && (
                          <div>
                            <div className="fs-xs text-muted fw-semibold" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>WhatsApp Chase</div>
                            <div style={{ fontSize: '0.8rem', color: '#25d366' }}>
                              ✓ Message sent · <a href={`/v/${row.whatsappToken}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-light)' }}>View vendor portal →</a>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              ]
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: '1.5rem',
        padding: '0.875rem 1.25rem',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        lineHeight: 1.6
      }}>
        <Info size={16} color="var(--brand-light)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong style={{ color: 'var(--text-secondary)' }}>Fuzzy Matching:</strong> Invoice numbers are normalized (prefixes, slashes, leading zeros removed) before matching. "AP/089" and "089" are treated as the same invoice — which VLOOKUP would fail on.
          &nbsp;&nbsp;<strong style={{ color: 'var(--text-secondary)' }}>Section 17(5):</strong> Blocked ITC is flagged even when present in GSTR-2B. Always verify with your CA before filing.
        </div>
      </div>

      {/* WhatsApp Modal */}
      {whatsappTarget && (
        <WhatsAppModal
          invoice={whatsappTarget.invoice}
          invoiceIndex={whatsappTarget.invoiceIndex}
          onClose={() => setWhatsappTarget(null)}
          onChased={handleWhatsAppChased}
        />
      )}
    </div>
  )
}

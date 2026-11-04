import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileSpreadsheet, FileJson, CheckCircle2, Zap, Loader2, Database, Sparkles } from 'lucide-react'
import { uploadFile, apiPost } from '../utils/api'
import { useSession } from '../context/SessionContext'
import { useToast } from '../context/ToastContext'

function DropZone({ id, title, subtitle, icon, accept, onUploaded, uploaded, loading }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onUploaded(file)
  }, [onUploaded])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleClick = () => inputRef.current?.click()
  const handleChange = (e) => { if (e.target.files[0]) onUploaded(e.target.files[0]) }

  return (
    <div
      id={id}
      className={`drop-zone ${dragging ? 'drag-active' : ''} ${uploaded ? 'uploaded' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={!uploaded && !loading ? handleClick : undefined}
      style={{ cursor: uploaded || loading ? 'default' : 'pointer' }}
      role="button"
      tabIndex={0}
      aria-label={`Upload ${title}`}
      onKeyDown={e => e.key === 'Enter' && !uploaded && !loading && handleClick()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      <div className="drop-zone-icon" style={{
        background: uploaded
          ? 'var(--green-bg)'
          : 'rgba(99,102,241,0.1)',
        border: uploaded ? '1px solid var(--green-border)' : '1px solid rgba(99,102,241,0.2)'
      }}>
        {loading ? (
          <Loader2 size={24} color="var(--brand-light)" style={{ animation: 'spin 1s linear infinite' }} />
        ) : uploaded ? (
          <CheckCircle2 size={24} color="var(--green)" />
        ) : icon}
      </div>

      {loading ? (
        <div className="drop-zone-title text-brand">Parsing file...</div>
      ) : uploaded ? (
        <>
          <div className="drop-zone-title text-green">{uploaded.name}</div>
          <div className="drop-zone-sub text-green">{uploaded.count} invoices loaded ✓</div>
        </>
      ) : (
        <>
          <div className="drop-zone-title">{title}</div>
          <div className="drop-zone-sub">{subtitle}</div>
          <div className="drop-zone-sub mt-2" style={{ marginTop: '0.5rem' }}>
            <span style={{
              display: 'inline-block',
              marginTop: 8,
              padding: '0.25rem 0.75rem',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 100,
              fontSize: '0.72rem',
              color: 'var(--brand-light)',
              fontWeight: 600
            }}>
              Drop file or click to browse
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default function UploadPage() {
  const navigate = useNavigate()
  const { session, setSession } = useSession()
  const { addToast } = useToast()

  const [tallyFile, setTallyFile] = useState(null)
  const [gstr2bFile, setGstr2bFile] = useState(null)
  const [tallyLoading, setTallyLoading] = useState(false)
  const [gstr2bLoading, setGstr2bLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [reconciling, setReconciling] = useState(false)

  const handleTallyUpload = async (file) => {
    setTallyLoading(true)
    try {
      const res = await uploadFile('/api/upload/tally', file)
      setTallyFile({ name: file.name, count: res.count })
      setSession(prev => ({ ...prev, tallyData: res.invoices }))
      addToast(`Tally data loaded: ${res.count} invoices`, 'success')
    } catch (err) {
      addToast(`Tally upload failed: ${err.message}`, 'error')
    } finally {
      setTallyLoading(false)
    }
  }

  const handleGstr2bUpload = async (file) => {
    setGstr2bLoading(true)
    try {
      const res = await uploadFile('/api/upload/gstr2b', file)
      setGstr2bFile({ name: file.name, count: res.count })
      setSession(prev => ({ ...prev, gstr2bData: res.invoices }))
      addToast(`GSTR-2B loaded: ${res.count} invoices from ${res.meta?.buyerGSTIN || 'portal'}`, 'success')
    } catch (err) {
      addToast(`GSTR-2B upload failed: ${err.message}`, 'error')
    } finally {
      setGstr2bLoading(false)
    }
  }

  const handleLoadDemo = async () => {
    setDemoLoading(true)
    try {
      const res = await apiPost('/api/upload/demo', {})
      setTallyFile({ name: 'test_tally_pr.csv (Demo)', count: res.tallyCount })
      setGstr2bFile({ name: 'test_gstr2b.json (Demo)', count: res.gstr2bCount })
      setSession(prev => ({ ...prev, tallyData: res.tallyInvoices, gstr2bData: res.gstr2bInvoices }))
      addToast(`Demo data loaded! ${res.tallyCount} Tally + ${res.gstr2bCount} 2B invoices ready.`, 'success')
    } catch (err) {
      addToast(`Failed to load demo data: ${err.message}`, 'error')
    } finally {
      setDemoLoading(false)
    }
  }

  const handleReconcile = async () => {
    if (!tallyFile || !gstr2bFile) {
      addToast('Please upload both Tally CSV and GSTR-2B JSON first.', 'error')
      return
    }
    setReconciling(true)
    try {
      const res = await apiPost('/api/reconcile', {})
      setSession(prev => ({ ...prev, reconciliationResult: res }))
      addToast(`Reconciliation complete! ${res.summary.total} invoices processed.`, 'success')
      navigate('/dashboard')
    } catch (err) {
      addToast(`Reconciliation failed: ${err.message}`, 'error')
    } finally {
      setReconciling(false)
    }
  }

  const bothReady = tallyFile && gstr2bFile

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '3rem' }}>

      {/* Page Header */}
      <div className="animate-fade-in" style={{ marginBottom: '2.5rem' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '1.8rem' }}>ITC Reconciliation</h1>
          <span className="status-badge status-green">
            <span className="status-badge-dot" />
            Engine Ready
          </span>
        </div>
        <p className="text-secondary">Upload Tally Purchase Register + GSTR-2B to run multi-tier reconciliation</p>
      </div>

      {/* Stepper */}
      <div className="stepper">
        <div className={`step ${tallyFile ? 'done' : 'active'}`}>
          <div className="step-num">{tallyFile ? '✓' : '1'}</div>
          <div className="step-label">Upload Tally CSV</div>
        </div>
        <div className={`step-line ${tallyFile ? 'done' : ''}`} />
        <div className={`step ${gstr2bFile ? 'done' : tallyFile ? 'active' : ''}`}>
          <div className="step-num">{gstr2bFile ? '✓' : '2'}</div>
          <div className="step-label">Upload GSTR-2B</div>
        </div>
        <div className={`step-line ${gstr2bFile ? 'done' : ''}`} />
        <div className={`step ${bothReady ? 'active' : ''}`}>
          <div className="step-num">3</div>
          <div className="step-label">Run Reconciliation</div>
        </div>
        <div className="step-line" />
        <div className="step">
          <div className="step-num">4</div>
          <div className="step-label">View Results</div>
        </div>
      </div>

      {/* Demo Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.08))',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <div className="flex items-center gap-3">
          <Database size={20} color="var(--brand-light)" />
          <div>
            <div className="fw-semibold" style={{ fontSize: '0.9rem' }}>CA Demo Mode</div>
            <div className="text-secondary fs-sm">Load 5 sample invoices to see all 4 reconciliation outcomes instantly</div>
          </div>
        </div>
        <button
          id="load-demo-btn"
          className="btn btn-primary"
          onClick={handleLoadDemo}
          disabled={demoLoading}
          style={{ flexShrink: 0 }}
        >
          {demoLoading
            ? <><div className="spinner" /> Loading...</>
            : <><Sparkles size={16} /> Load Sample Data</>
          }
        </button>
      </div>

      {/* Upload Zones */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div className="card animate-fade-in">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} color="var(--green)" />
              <div className="card-title">Tally Purchase Register</div>
            </div>
            <span className="status-badge status-green" style={{ fontSize: '0.68rem' }}>CSV Format</span>
          </div>
          <div className="card-body">
            <DropZone
              id="tally-drop-zone"
              title="Tally Prime Export (CSV)"
              subtitle="Voucher No, GSTIN, Supplier Inv No, Tax amounts"
              icon={<FileSpreadsheet size={24} color="var(--brand-light)" />}
              accept=".csv"
              onUploaded={handleTallyUpload}
              uploaded={tallyFile}
              loading={tallyLoading}
            />
            <div className="mt-4" style={{ marginTop: '1rem' }}>
              <div className="fs-xs text-muted" style={{ marginBottom: 6 }}>Expected columns:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {['Date', 'GSTIN/UIN', 'Supplier Inv No', 'Total Tax', 'Purchase Ledger', 'Vendor Mobile'].map(col => (
                  <span key={col} className="mono" style={{
                    padding: '2px 8px',
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)'
                  }}>{col}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <div className="flex items-center gap-2">
              <FileJson size={18} color="var(--brand-light)" />
              <div className="card-title">GSTR-2B</div>
            </div>
            <span className="status-badge status-green" style={{
              background: 'rgba(99,102,241,0.1)',
              color: 'var(--brand-light)',
              border: '1px solid rgba(99,102,241,0.3)',
              fontSize: '0.68rem'
            }}>JSON Format</span>
          </div>
          <div className="card-body">
            <DropZone
              id="gstr2b-drop-zone"
              title="GST Portal GSTR-2B (JSON)"
              subtitle="Official b2b section from gst.gov.in"
              icon={<FileJson size={24} color="var(--brand-light)" />}
              accept=".json"
              onUploaded={handleGstr2bUpload}
              uploaded={gstr2bFile}
              loading={gstr2bLoading}
            />
            <div className="mt-4" style={{ marginTop: '1rem' }}>
              <div className="fs-xs text-muted" style={{ marginBottom: 6 }}>JSON structure:</div>
              <code className="mono" style={{
                display: 'block',
                padding: '0.5rem',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: '0.7rem',
                color: 'var(--text-muted)',
                lineHeight: 1.6
              }}>
                {`{ "fp":"102026", "b2b": [{ "ctin":"...", "inv": [...] }] }`}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Reconcile Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          id="run-reconciliation-btn"
          className="btn btn-accent btn-xl"
          onClick={handleReconcile}
          disabled={!bothReady || reconciling}
          style={{
            opacity: bothReady ? 1 : 0.4,
            transition: 'all 0.3s ease',
            minWidth: 280
          }}
        >
          {reconciling
            ? <><div className="spinner" /> Running Engine...</>
            : <><Zap size={20} /> Run Reconciliation</>
          }
        </button>
        {!bothReady && (
          <p className="text-muted fs-sm" style={{ marginTop: '0.75rem' }}>
            Upload both files or click "Load Sample Data" above
          </p>
        )}
      </div>
    </div>
  )
}

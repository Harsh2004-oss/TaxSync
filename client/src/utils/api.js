// API utility — all calls go through here
// VITE_API_URL is set in Vercel env vars to point at the Render backend
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'


export function getSessionId() {
  let id = sessionStorage.getItem('taxsync_session_id')
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36)
    sessionStorage.setItem('taxsync_session_id', id)
  }
  return id
}

export function getHeaders(extra = {}) {
  return {
    'x-session-id': getSessionId(),
    ...extra,
  }
}

export async function apiPost(path, body, isFormData = false) {
  const headers = getHeaders()
  if (!isFormData) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: isFormData ? body : JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `API error: ${res.status}`)
  return data
}

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: getHeaders() })
  if (res.headers.get('content-type')?.includes('application/json')) {
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `API error: ${res.status}`)
    return data
  }
  return res // for binary responses (xlsx)
}

export async function uploadFile(path, file, fieldName = 'file') {
  const formData = new FormData()
  formData.append(fieldName, file)
  return apiPost(path, formData, true)
}

export function formatINR(amount) {
  if (!amount && amount !== 0) return '—'
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export function getExportUrl() {
  return `${BASE_URL}/api/reconcile/export`
}

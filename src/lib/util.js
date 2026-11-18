export const STAGES = ['ייזום', 'תכנון', 'מכרז', 'ביצוע', 'מסירה', 'בדק', 'סגור']
export const TYPES = ['קו מים', 'העתקת קו', 'תחנת שאיבה', 'בריכה', 'ציוד קידוח', 'פיתוח שכונה']
export const SERVICE = { mgmt: 'ניהול', insp: 'פיקוח' }
export const ROLE = { admin: 'מנהל המשרד', pm: 'מנהל פרויקט', inspector: 'מפקח' }
export const TASK_ST = { open: 'פתוחה', doing: 'בטיפול', waiting: 'ממתינה לגורם חיצוני', done: 'בוצעה' }
export const DEF_ST = { open: 'פתוח', doing: 'בטיפול', fixed: 'תוקן – ממתין לאימות', closed: 'נסגר' }
export const SEV = { low: 'נמוכה', med: 'בינונית', high: 'גבוהה' }
export const ESC_ST = { todo: 'לא התחיל', doing: 'בתהליך', waiting: 'ממתין לגורם חיצוני', done: 'הושלם', na: 'לא רלוונטי' }
export const SEG_ST = { todo: 'טרם הוחל', progress: 'בביצוע', done: 'הושלם' }
export const INV_ST = { draft: 'טיוטה', submitted: 'הוגש', approved: 'אושר', paid: 'שולם' }
export const PRIO = { low: 'נמוכה', med: 'רגילה', high: 'דחופה' }
export const TONE = {
  open: 'red', doing: 'blue', waiting: 'amber', done: 'green', fixed: 'amber', closed: 'green',
  todo: 'gray', progress: 'blue', na: 'gray', draft: 'gray', submitted: 'amber', approved: 'blue', paid: 'green',
  low: 'gray', med: 'amber', high: 'red', sent: 'green',
}
export const SEG_COLOR = { todo: '#94a3b8', progress: '#f59e0b', done: '#16a34a' }
export const PLACES = {
  'באר שבע': { lat: 31.252, lng: 34.791 }, 'אילת': { lat: 29.557, lng: 34.951 }, 'אשקלון': { lat: 31.668, lng: 34.571 },
  'רהט': { lat: 31.392, lng: 34.754 }, 'אופקים': { lat: 31.314, lng: 34.62 }, 'כפר יונה': { lat: 32.317, lng: 34.935 },
  'מודיעין': { lat: 31.898, lng: 35.01 }, 'קריית גת': { lat: 31.61, lng: 34.764 },
}

export const today = () => new Date().toISOString().slice(0, 10)
export const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
export const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—')
export const fmtTime = (ts) => new Date(ts).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
export const money = (n) => '₪' + Math.round(n || 0).toLocaleString('he-IL')

export const segPct = (s) => (s.status === 'done' ? 100 : s.status === 'progress' ? Number(s.pct) || 0 : 0)
export function progress(p) {
  if (!p) return 0
  if (p.geometry === 'line') {
    const segs = p.segments || []
    const t = segs.reduce((a, s) => a + (s.to - s.from), 0)
    return t ? Math.round(segs.reduce((a, s) => a + (s.to - s.from) * segPct(s), 0) / t) : 0
  }
  const ms = p.milestones || []
  const w = ms.reduce((a, m) => a + Number(m.weight || 0), 0)
  return w ? Math.round(ms.reduce((a, m) => a + Number(m.weight || 0) * segPct(m), 0) / w) : 0
}
export function fin(p) {
  const f = p?.finance || {}
  const inv = f.invoices || []
  const sum = (st) => inv.filter((i) => st.includes(i.status)).reduce((a, i) => a + Number(i.amount || 0), 0)
  const billed = sum(['submitted', 'approved', 'paid'])
  const paid = sum(['paid'])
  const contract = Number(f.contract || 0)
  return { contract, billed, paid, toBill: contract - billed, toCollect: billed - paid, billedPct: contract ? Math.round((billed / contract) * 100) : 0 }
}
export const escortPct = (p) => {
  const it = (p?.escort || []).filter((i) => i.status !== 'na')
  return it.length ? Math.round((it.filter((i) => i.status === 'done').length / it.length) * 100) : 0
}
export const isLate = (t) => t.status !== 'done' && t.due && t.due < today()
export const isOpenDefect = (d) => d.status !== 'closed'

export function compressImage(file, max = 720, q = 0.6) {
  return new Promise((res, rej) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      res(c.toDataURL('image/jpeg', q))
    }
    img.onerror = rej
    img.src = url
  })
}
export const readFile = (file) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file) })

// returns [[lat,lng],...] for the part of the route between fractions f0..f1
export function sliceRoute(route, f0, f1) {
  const pts = (route || []).map((p) => [p.lat, p.lng])
  if (pts.length < 2) return pts
  const d = [0]
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  const T = d[d.length - 1] || 1
  const at = (f) => {
    const x = f * T
    let i = 1
    while (i < pts.length - 1 && d[i] < x) i++
    const r = (x - d[i - 1]) / (d[i] - d[i - 1] || 1)
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * r, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * r]
  }
  const out = [at(f0)]
  for (let i = 1; i < pts.length - 1; i++) if (d[i] > f0 * T && d[i] < f1 * T) out.push(pts[i])
  out.push(at(f1))
  return out
}
export const center = (p) => {
  if (p.geometry === 'line' && p.route?.length) { const m = p.route[Math.floor(p.route.length / 2)]; return [m.lat, m.lng] }
  return p.location ? [p.location.lat, p.location.lng] : [31.4, 34.9]
}
export const escortFromTemplate = (tpl) =>
  (tpl?.sections || []).flatMap((s, si) => s.items.map((name, ii) => ({ id: `e${si}_${ii}`, phase: s.name, name, status: 'todo', history: [] })))
export const pickTemplate = (templates, kind, type) =>
  templates.find((t) => t.kind === kind && (t.ptypes || []).includes(type)) || templates.find((t) => t.kind === kind)

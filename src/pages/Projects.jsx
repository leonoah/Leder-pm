import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useCol, add } from '../lib/db'
import { STAGES, TYPES, SERVICE, PLACES, progress, isOpenDefect, addDays, pickTemplate, escortFromTemplate } from '../lib/util'
import { Badge, Btn, Card, Empty, Field, Input, Modal, Progress, Select, useMe, toast } from '../ui'

const LINE_TYPES = ['קו מים', 'העתקת קו', 'פיתוח שכונה']

function NewProject({ onClose }) {
  const nav = useNavigate()
  const clients = useCol('clients')
  const users = useCol('users').filter((u) => u.active !== false)
  const templates = useCol('templates')
  const [f, setF] = useState({ name: '', clientId: clients[0]?.id || '', mgmt: true, insp: false, type: 'קו מים', geometry: 'line', place: 'באר שבע', length: 900, diameter: '12"', contractor: '', pmId: users.find((u) => u.role === 'pm')?.id || '', inspectorId: '', contract: 100000 })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const esc = pickTemplate(templates, 'escort', f.type)
  const dft = pickTemplate(templates, 'defects', f.type)
  const save = () => {
    if (!f.name.trim()) return toast('חסר שם פרויקט')
    if (!f.mgmt && !f.insp) return toast('יש לבחור לפחות סוג שירות אחד')
    const loc = PLACES[f.place]
    const len = Number(f.length) || 600
    const base = { name: f.name, clientId: f.clientId, initiator: '', service: [f.mgmt && 'mgmt', f.insp && 'insp'].filter(Boolean), geometry: f.geometry, type: f.type, stage: 'תכנון',
      pmId: f.pmId, inspectorId: f.insp ? f.inspectorId : '', team: [], contractor: f.contractor, designer: '', channelCode: String(Math.floor(1000 + Math.random() * 9000)),
      startDate: addDays(0), endDate: addDays(180), escort: escortFromTemplate(esc),
      finance: { contract: Number(f.contract) || 0, billing: 'אבני דרך', milestones: [{ name: 'תכנון ואישורים', pct: 30, done: false }, { name: 'ביצוע', pct: 50, done: false }, { name: 'מסירה', pct: 20, done: false }], invoices: [] } }
    let p
    if (f.geometry === 'line') {
      const n = Math.max(1, Math.round(len / 300)); const step = Math.round(len / n); const d = len / 111000 / Math.SQRT2
      p = { ...base, tech: { diameter: f.diameter, length: len, material: '', notes: '' },
        route: [0, 0.35, 0.7, 1].map((t, i) => ({ lat: loc.lat + d * t, lng: loc.lng + d * t * 1.15 + (i % 2 ? 0.0006 : 0) })),
        segments: Array.from({ length: n }, (_, i) => ({ id: 's' + (i + 1), name: 'מקטע ' + (i + 1), from: i * step, to: i === n - 1 ? len : (i + 1) * step, status: 'todo', pct: 0 })) }
    } else {
      p = { ...base, tech: { capacity: '', notes: '' }, location: loc,
        milestones: [['עבודות אזרחיות', 30], ['התקנות מכניות', 30], ['חשמל ובקרה', 20], ['הרצה ומסירה', 20]].map(([name, weight], i) => ({ id: 'm' + (i + 1), name, weight, status: 'todo', pct: 0 })) }
    }
    const id = add('projects', p)
    toast('הפרויקט נוצר והתבניות נטענו')
    onClose(); nav(`/projects/${id}`)
  }
  return (
    <Modal title="פרויקט חדש" wide onClose={onClose} footer={<><Btn v="outline" onClick={onClose}>ביטול</Btn><Btn onClick={save}>צור פרויקט</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="שם הפרויקט" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} autoFocus placeholder="לדוגמה: קו מחלק לתל שבע" /></Field>
        <Field label="לקוח"><Select value={f.clientId} onChange={set('clientId')} options={clients.map((c) => [c.id, c.name])} /></Field>
        <div><span className="mb-1 block text-xs font-medium text-slate-600">סוג השירות</span>
          <div className="flex gap-4 py-2 text-sm"><label className="flex items-center gap-1.5"><input type="checkbox" checked={f.mgmt} onChange={set('mgmt')} className="accent-sky-700" />ניהול</label><label className="flex items-center gap-1.5"><input type="checkbox" checked={f.insp} onChange={set('insp')} className="accent-sky-700" />פיקוח</label></div></div>
        <Field label="סוג הפרויקט"><Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, geometry: LINE_TYPES.includes(e.target.value) ? 'line' : 'point' })} options={TYPES} /></Field>
        <Field label="גיאומטריה"><Select value={f.geometry} onChange={set('geometry')} options={{ line: 'קווי – לפי אורך (קו מים)', point: 'נקודתי – מתקן (מרכזייה, תחנה, בריכה)' }} /></Field>
        <Field label="אזור (מיקום מקורב)"><Select value={f.place} onChange={set('place')} options={Object.keys(PLACES)} /></Field>
        {f.geometry === 'line' ? <><Field label={'אורך (מ\')'}><Input type="number" value={f.length} onChange={set('length')} /></Field><Field label="קוטר"><Input value={f.diameter} onChange={set('diameter')} /></Field></> : <div />}
        <Field label="מנהל פרויקט"><Select value={f.pmId} onChange={set('pmId')} options={users.filter((u) => u.role !== 'inspector').map((u) => [u.id, u.name])} /></Field>
        {f.insp && <Field label="מפקח"><Select value={f.inspectorId} onChange={set('inspectorId')} placeholder="טרם שובץ" options={users.filter((u) => u.role === 'inspector').map((u) => [u.id, u.name])} /></Field>}
        <Field label="קבלן"><Input value={f.contractor} onChange={set('contractor')} /></Field>
        <Field label="היקף חוזה שכר טרחה (₪)"><Input type="number" value={f.contract} onChange={set('contract')} /></Field>
      </div>
      <div className="mt-4 rounded-lg bg-sky-50 p-3 text-xs text-sky-900">
        <b>תבניות שייטענו אוטומטית:</b> ליווי הנדסי – {esc?.name || 'אין'}{f.insp ? ` · סיור פיקוח – ${dft?.name || 'אין'}` : ''} · {f.geometry === 'line' ? 'חלוקה למקטעים של כ-300 מ\'' : 'אבני דרך משוקללות'}
      </div>
    </Modal>
  )
}

export default function Projects() {
  const { me } = useMe()
  const projects = useCol('projects')
  const clients = useCol('clients')
  const users = useCol('users')
  const defects = useCol('defects')
  const [q, setQ] = useState({ client: '', stage: '', service: '', mine: me.role === 'inspector' })
  const [open, setOpen] = useState(false)
  const list = projects.filter((p) => (!q.client || p.clientId === q.client) && (!q.stage || p.stage === q.stage) && (!q.service || p.service.includes(q.service)) && (!q.mine || p.pmId === me.id || p.inspectorId === me.id))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">פרויקטים</h1>{me.role !== 'inspector' && <Btn onClick={() => setOpen(true)}><Plus size={16} />פרויקט חדש</Btn>}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Select value={q.client} onChange={(e) => setQ({ ...q, client: e.target.value })} placeholder="כל הלקוחות" options={clients.map((c) => [c.id, c.name])} />
        <Select value={q.stage} onChange={(e) => setQ({ ...q, stage: e.target.value })} placeholder="כל השלבים" options={STAGES} />
        <Select value={q.service} onChange={(e) => setQ({ ...q, service: e.target.value })} placeholder="כל סוגי השירות" options={SERVICE} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={q.mine} onChange={(e) => setQ({ ...q, mine: e.target.checked })} className="accent-sky-700" />רק הפרויקטים שלי</label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((p) => {
          const od = defects.filter((d) => d.projectId === p.id && isOpenDefect(d)).length
          return (
            <Link key={p.id} to={`/projects/${p.id}`}>
              <Card className="h-full p-4 hover:border-sky-400">
                <div className="flex items-start justify-between gap-2"><div className="font-semibold leading-snug">{p.name}</div><Badge tone="blue">{p.stage}</Badge></div>
                <div className="mt-1 text-xs text-slate-500">{clients.find((c) => c.id === p.clientId)?.name} · {p.type} · {p.geometry === 'line' ? 'קווי' : 'נקודתי'}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{p.service.map((s) => <Badge key={s}>{SERVICE[s]}</Badge>)}{od > 0 && <Badge tone="red">{od} ליקויים פתוחים</Badge>}</div>
                <div className="mt-3 flex items-center gap-2"><Progress value={progress(p)} /><span className="text-sm font-semibold">{progress(p)}%</span></div>
                <div className="mt-2 text-xs text-slate-500">מנהל פרויקט: {users.find((u) => u.id === p.pmId)?.name || '—'}{p.inspectorId ? ` · מפקח: ${users.find((u) => u.id === p.inspectorId)?.name}` : ''}</div>
              </Card>
            </Link>
          )
        })}
      </div>
      {!list.length && <Empty>לא נמצאו פרויקטים</Empty>}
      {open && <NewProject onClose={() => setOpen(false)} />}
    </div>
  )
}

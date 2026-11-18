import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, X, Minus, ClipboardCheck, Printer, Share2, ListTodo } from 'lucide-react'
import { useCol, useDoc, add, patch, postMessage } from '../../lib/db'
import { DEF_ST, SEV, SEG_ST, ROLE, fmtDate, today, addDays, isOpenDefect, pickTemplate } from '../../lib/util'
import { Logo, Badge, Btn, Card, Empty, Field, ImgPick, Input, Modal, Select, Tabs, Textarea, Thumbs, useMe, toast } from '../../ui'

const RES = { ok: ['תקין', 'text-emerald-700'], defect: ['ליקוי', 'text-rose-700'], na: ['לא רלוונטי', 'text-slate-400'] }

export function VisitReport({ visit }) {
  const p = useDoc('projects', visit.projectId)
  const client = useDoc('clients', p?.clientId)
  const all = useCol('defects').filter((d) => d.projectId === visit.projectId)
  const fresh = all.filter((d) => d.visitId === visit.id)
  const prior = all.filter((d) => d.visitId !== visit.id && isOpenDefect(d) && d.createdAt < visit.at)
  const cats = [...new Set(visit.items.map((i) => i.cat))]
  return (
    <div className="print-area space-y-4 text-sm">
      <div className="border-b-2 border-sky-700 pb-3">
        <Logo className="mb-2 h-9" />
        <h2 className="text-lg font-bold">דוח סיור פיקוח – {fmtDate(visit.date)}</h2>
        <div className="mt-1 text-slate-600">{p?.name} · {client?.name}</div>
      </div>
      <div className="grid grid-cols-2 gap-2"><div><span className="text-slate-500">מפקח: </span>{visit.inspectorName}</div><div><span className="text-slate-500">נוכחים: </span>{visit.attendees || '—'}</div><div><span className="text-slate-500">קבלן: </span>{p?.contractor || '—'}</div></div>
      {visit.summary && <div className="rounded-lg bg-slate-50 p-3"><b>סיכום: </b>{visit.summary}</div>}
      <div>
        <h3 className="mb-1 font-semibold">ליקויים חדשים ({fresh.length})</h3>
        {fresh.map((d, i) => (
          <div key={d.id} className="border-b border-slate-100 py-2">
            <div className="flex flex-wrap items-center gap-2"><b>{i + 1}. {d.desc}</b><Badge st={d.severity}>חומרה {SEV[d.severity]}</Badge><Badge st={d.status}>{DEF_ST[d.status]}</Badge></div>
            <div className="mt-0.5 text-xs text-slate-500">{d.cat} · {d.loc || 'ללא מיקום'} · אחראי: {d.owner} · לתיקון עד {fmtDate(d.due)}</div>
            <Thumbs imgs={d.imgs} />
          </div>
        ))}
        {!fresh.length && <div className="text-slate-500">לא נמצאו ליקויים חדשים.</div>}
      </div>
      {prior.length > 0 && <div><h3 className="mb-1 font-semibold">ליקויים פתוחים מסיורים קודמים ({prior.length})</h3>{prior.map((d) => <div key={d.id} className="py-1 text-slate-700">• {d.desc} <span className="text-xs text-slate-500">({d.loc}, {DEF_ST[d.status]})</span></div>)}</div>}
      <div>
        <h3 className="mb-1 font-semibold">רשימת בדיקות</h3>
        {cats.map((c) => <div key={c} className="mb-1"><span className="text-slate-500">{c}: </span>{visit.items.filter((i) => i.cat === c).map((i, k) => <span key={k} className={`me-3 ${RES[i.result]?.[1]}`}>{i.name} – {RES[i.result]?.[0]}</span>)}</div>)}
      </div>
    </div>
  )
}

export function ReportModal({ visit, onClose, viewer }) {
  return (
    <Modal title="דוח סיור פיקוח" wide onClose={onClose} footer={<>
      <Btn v="outline" onClick={() => window.print()}><Printer size={14} />הדפסה / PDF</Btn>
      {viewer && <Btn onClick={() => { postMessage(visit.projectId, viewer, { text: 'דוח סיור פיקוח מצורף.', card: { type: 'visit', id: visit.id, title: `דוח סיור פיקוח – ${fmtDate(visit.date)}` } }); toast('הדוח שותף לערוץ הפרויקט'); onClose() }}><Share2 size={14} />שתף לערוץ הפרויקט</Btn>}
    </>}><VisitReport visit={visit} /></Modal>
  )
}

function VisitForm({ p, onDone, onCancel }) {
  const { me } = useMe()
  const templates = useCol('templates').filter((t) => t.kind === 'defects')
  const defects = useCol('defects').filter((d) => d.projectId === p.id && isOpenDefect(d))
  const [tid, setTid] = useState(() => pickTemplate(templates, 'defects', p.type)?.id)
  const tpl = templates.find((t) => t.id === tid)
  const base = useMemo(() => (tpl?.sections || []).flatMap((s) => s.items.map((name) => ({ cat: s.name, name }))), [tid]) // eslint-disable-line
  const [res, setRes] = useState({})
  const [defs, setDefs] = useState({})
  const [verify, setVerify] = useState({})
  const [attendees, setAttendees] = useState('')
  const [summary, setSummary] = useState('')
  const [units, setUnits] = useState(() => (p.geometry === 'line' ? p.segments : p.milestones) || [])
  const locs = p.geometry === 'line' ? p.segments.map((s) => s.name) : (p.milestones || []).map((m) => m.name)
  const mark = (i, r) => {
    setRes({ ...res, [i]: r })
    if (r === 'defect' && !defs[i]) setDefs({ ...defs, [i]: { desc: '', severity: 'med', loc: locs[0] || '', imgs: [], due: addDays(7) } })
  }
  const setDef = (i, k, v) => setDefs({ ...defs, [i]: { ...defs[i], [k]: v } })
  const answered = base.filter((_, i) => res[i]).length
  const finish = () => {
    const at = Date.now()
    const vid = add('visits', { projectId: p.id, date: today(), at, inspectorId: me.id, inspectorName: me.name, attendees, summary, templateName: tpl?.name || '',
      items: base.map((b, i) => ({ ...b, result: res[i] || 'na' })) })
    base.forEach((b, i) => { if (res[i] === 'defect') { const d = defs[i]; add('defects', { projectId: p.id, visitId: vid, desc: d.desc.trim() || b.name, cat: b.cat, severity: d.severity, loc: d.loc, imgs: d.imgs, owner: 'קבלן', due: d.due, status: 'open', createdAt: at + i }) } })
    Object.entries(verify).forEach(([id, r]) => patch('defects', id, r === 'closed' ? { status: 'closed', closedAt: at } : { status: 'open' }))
    patch('projects', p.id, p.geometry === 'line' ? { segments: units } : { milestones: units })
    toast('הסיור נשמר והדוח נוצר')
    onDone(vid)
  }
  return (
    <div className="space-y-4">
      <Card className="sticky top-0 z-10 flex items-center justify-between gap-3 p-3">
        <div><div className="text-sm font-semibold">סיור פיקוח – {fmtDate(today())}</div><div className="text-xs text-slate-500">{answered} מתוך {base.length} סעיפים נבדקו</div></div>
        <div className="flex shrink-0 gap-2"><Btn v="outline" onClick={onCancel}>ביטול</Btn><Btn v="ok" className="whitespace-nowrap" onClick={finish}><Check size={16} />סיים<span className="hidden sm:inline"> והפק דוח</span></Btn></div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="נוכחים בסיור"><Input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="מנהל עבודה, מודד…" /></Field>
        <Field label="תבנית בדיקות"><Select value={tid} onChange={(e) => { setTid(e.target.value); setRes({}); setDefs({}) }} options={templates.map((t) => [t.id, t.name])} /></Field>
      </div>
      {defects.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">ליקויים פתוחים מסיורים קודמים – לאימות</h3>
          {defects.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0">
              <div className="min-w-0 text-sm"><div className="font-medium">{d.desc}</div><div className="text-xs text-slate-500">{d.loc} · <Badge st={d.status}>{DEF_ST[d.status]}</Badge></div></div>
              <div className="flex gap-1.5">
                <Btn sm v={verify[d.id] === 'closed' ? 'ok' : 'outline'} onClick={() => setVerify({ ...verify, [d.id]: 'closed' })}><Check size={13} />תוקן</Btn>
                <Btn sm v={verify[d.id] === 'open' ? 'primary' : 'outline'} onClick={() => setVerify({ ...verify, [d.id]: 'open' })}><X size={13} />לא תוקן</Btn>
              </div>
            </div>
          ))}
        </Card>
      )}
      {(tpl?.sections || []).map((s) => (
        <Card key={s.name} className="p-4">
          <h3 className="mb-2 text-sm font-semibold">{s.name}</h3>
          {s.items.map((name) => {
            const i = base.findIndex((b) => b.cat === s.name && b.name === name)
            const d = defs[i]
            return (
              <div key={name} className="border-b border-slate-100 py-2.5 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">{name}</span>
                  <div className="flex shrink-0 gap-1.5">
                    <button onClick={() => mark(i, 'ok')} className={`flex h-10 w-10 items-center justify-center rounded-lg border ${res[i] === 'ok' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-slate-500'}`} aria-label="תקין"><Check size={18} /></button>
                    <button onClick={() => mark(i, 'defect')} className={`flex h-10 w-10 items-center justify-center rounded-lg border ${res[i] === 'defect' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300 text-slate-500'}`} aria-label="ליקוי"><X size={18} /></button>
                    <button onClick={() => mark(i, 'na')} className={`flex h-10 w-10 items-center justify-center rounded-lg border ${res[i] === 'na' ? 'border-slate-500 bg-slate-500 text-white' : 'border-slate-300 text-slate-500'}`} aria-label="לא רלוונטי"><Minus size={18} /></button>
                  </div>
                </div>
                {res[i] === 'defect' && d && (
                  <div className="mt-2 space-y-2 rounded-lg bg-rose-50 p-3">
                    <Textarea rows={2} placeholder="תיאור הליקוי" value={d.desc} onChange={(e) => setDef(i, 'desc', e.target.value)} />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Select value={d.severity} onChange={(e) => setDef(i, 'severity', e.target.value)} options={Object.entries(SEV).map(([k, l]) => [k, 'חומרה ' + l])} />
                      <Select value={d.loc} onChange={(e) => setDef(i, 'loc', e.target.value)} options={locs} />
                      <Input type="date" value={d.due} onChange={(e) => setDef(i, 'due', e.target.value)} />
                    </div>
                    <ImgPick onPick={(src) => setDef(i, 'imgs', [...d.imgs, src])} />
                    <Thumbs imgs={d.imgs} onRemove={(k) => setDef(i, 'imgs', d.imgs.filter((_, m) => m !== k))} />
                  </div>
                )}
              </div>
            )
          })}
        </Card>
      ))}
      {!tpl && <Empty>אין תבנית בדיקות. אפשר ליצור אחת במסך התבניות.</Empty>}
      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold">עדכון התקדמות ({p.geometry === 'line' ? 'מקטעים' : 'אבני דרך'})</h3>
        {units.map((u, i) => (
          <div key={u.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
            <span>{u.name}</span>
            <div className="flex gap-2">
              <div className="w-32"><Select value={u.status} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, status: e.target.value } : x)))} options={SEG_ST} /></div>
              {u.status === 'progress' && <div className="w-20"><Input type="number" min="0" max="100" value={u.pct} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, pct: Number(e.target.value) } : x)))} /></div>}
            </div>
          </div>
        ))}
      </Card>
      <Field label="סיכום הסיור"><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} /></Field>
      <Btn v="ok" className="w-full" onClick={finish}><Check size={16} />סיים והפק דוח</Btn>
    </div>
  )
}

export function DefectCard({ d, external, viewerName }) {
  const { me } = useMe() || {}
  const mark = (extra) => patch('defects', d.id, extra)
  const late = isOpenDefect(d) && d.due < today()
  return (
    <Card className="p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><div className="text-sm font-semibold">{d.desc}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500"><span>{d.cat}</span>·<span>{d.loc || 'ללא מיקום'}</span>·<span className={late ? 'font-semibold text-rose-600' : ''}>לתיקון עד {fmtDate(d.due)}</span></div></div>
        <div className="flex gap-1.5"><Badge st={d.severity}>חומרה {SEV[d.severity]}</Badge><Badge st={d.status}>{DEF_ST[d.status]}</Badge></div>
      </div>
      <Thumbs imgs={d.imgs} />
      {d.afterImg && <div className="mt-2 text-xs text-slate-500">תמונת תיקון{d.fixedBy ? ` (${d.fixedBy})` : ''}:<Thumbs imgs={[d.afterImg]} /></div>}
      <div className="mt-2 flex flex-wrap gap-2 no-print">
        {external ? (
          ['open', 'doing'].includes(d.status) && <ImgPick label="סמן תוקן + תמונה" onPick={(src) => { mark({ status: 'fixed', afterImg: src, fixedBy: viewerName }); toast('סומן כתוקן – ממתין לאימות המפקח') }} />
        ) : (<>
          <div className="w-44"><Select value={d.status} onChange={(e) => mark({ status: e.target.value })} options={DEF_ST} /></div>
          {d.status !== 'closed' && <ImgPick label="תמונת תיקון" onPick={(src) => mark({ afterImg: src, status: 'fixed', fixedBy: me?.name })} />}
          <Btn v="ghost" sm onClick={() => { add('tasks', { title: 'טיפול בליקוי: ' + d.desc, desc: '', assigneeId: me.id, due: d.due, priority: d.severity === 'high' ? 'high' : 'med', status: 'open', projectId: d.projectId, source: { type: 'defect', id: d.id, label: 'ליקוי' }, createdAt: Date.now() }); toast('נוצרה משימה') }}><ListTodo size={13} />צור משימה</Btn>
        </>)}
      </div>
    </Card>
  )
}

export default function Inspection({ p }) {
  const { me } = useMe()
  const [sp, setSp] = useSearchParams()
  const visits = useCol('visits').filter((v) => v.projectId === p.id).sort((a, b) => b.at - a.at)
  const defects = useCol('defects').filter((d) => d.projectId === p.id).sort((a, b) => b.createdAt - a.createdAt)
  const [tab, setTab] = useState('defects')
  const [st, setSt] = useState('active')
  const [sev, setSev] = useState('')
  const [report, setReport] = useState(null)
  const viewer = { name: me.name, role: ROLE[me.role], internal: true }
  if (sp.get('new')) return <VisitForm p={p} onCancel={() => setSp({})} onDone={(vid) => { setSp({}); setTab('visits'); setReport(vid) }} />
  const list = defects.filter((d) => (st === 'active' ? isOpenDefect(d) : !st || d.status === st) && (!sev || d.severity === sev))
  const rv = visits.find((v) => v.id === report)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={tab} onChange={setTab} tabs={[['defects', `ליקויים (${defects.filter(isOpenDefect).length} פתוחים)`], ['visits', `סיורים (${visits.length})`]]} />
        <Btn onClick={() => setSp({ new: '1' })}><ClipboardCheck size={16} />סיור פיקוח חדש</Btn>
      </div>
      {tab === 'defects' && (<>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Select value={st} onChange={(e) => setSt(e.target.value)} options={{ active: 'כל הפתוחים', '': 'הכול', ...DEF_ST }} />
          <Select value={sev} onChange={(e) => setSev(e.target.value)} placeholder="כל החומרות" options={SEV} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">{list.map((d) => <DefectCard key={d.id} d={d} />)}</div>
        {!list.length && <Empty>אין ליקויים להצגה</Empty>}
      </>)}
      {tab === 'visits' && (
        <Card className="divide-y divide-slate-100">
          {visits.map((v) => (
            <button key={v.id} onClick={() => setReport(v.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-slate-50">
              <div className="min-w-0"><div className="text-sm font-medium">סיור {fmtDate(v.date)} · {v.inspectorName}</div><div className="truncate text-xs text-slate-500">{v.summary || 'ללא סיכום'}</div></div>
              <Badge tone={defects.some((d) => d.visitId === v.id) ? 'red' : 'green'}>{defects.filter((d) => d.visitId === v.id).length} ליקויים</Badge>
            </button>
          ))}
          {!visits.length && <div className="p-4 text-sm text-slate-500">טרם בוצעו סיורים</div>}
        </Card>
      )}
      {rv && <ReportModal visit={rv} viewer={viewer} onClose={() => setReport(null)} />}
    </div>
  )
}

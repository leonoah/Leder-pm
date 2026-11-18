import { useState } from 'react'
import { Plus, Send, Printer, Trash2, ChevronRight, Copy, X, Lock } from 'lucide-react'
import { useCol, useDoc, add, patch, del, postMessage } from '../../lib/db'
import { ROLE, fmtDate, today, addDays } from '../../lib/util'
import { Badge, Btn, Card, Empty, Modal, Select, useMe, toast } from '../../ui'

const KINDS = {
  site: ['ישיבת אתר', ['סטטוס ביצוע', 'ליקויים פתוחים', 'בטיחות', 'לוח זמנים']],
  design: ['ישיבת תכנון', ['סטטוס תכנון', 'תיאום תשתיות', 'היתרים ואישורים']],
  coord: ['ישיבת תיאום', ['נושאים לתיאום', 'לוח זמנים']],
}

export function ProtocolView({ r }) {
  const p = useDoc('projects', r.projectId)
  const users = useCol('users')
  const who = (w) => users.find((u) => u.id === w)?.name || w || '—'
  return (
    <div className="print-area space-y-4 text-sm">
      <div className="border-b-2 border-sky-700 pb-3">
        <div className="text-xs text-slate-500">אדם לדר – ניהול ופיקוח פרויקטים</div>
        <h2 className="text-lg font-bold">{r.title}</h2>
        <div className="mt-1 text-slate-600">{p?.name} · {fmtDate(r.date)} · {r.place}</div>
      </div>
      <div><b>משתתפים: </b>{(r.attendees || []).join(', ') || '—'}</div>
      {(r.topics || []).filter((t) => t.title || t.text).map((t, i) => <div key={i}><h3 className="font-semibold">{i + 1}. {t.title}</h3><p className="whitespace-pre-wrap text-slate-700">{t.text}</p></div>)}
      {(r.decisions || []).length > 0 && <div><h3 className="font-semibold">החלטות</h3><ul className="list-disc ps-5">{r.decisions.map((d, i) => <li key={i}>{d}</li>)}</ul></div>}
      {(r.actions || []).length > 0 && (
        <div><h3 className="mb-1 font-semibold">משימות</h3>
          <table className="w-full border border-slate-200 text-sm"><thead className="bg-slate-50 text-xs"><tr><th className="p-2 text-start">מה</th><th className="p-2 text-start">מי</th><th className="p-2 text-start">עד מתי</th></tr></thead>
            <tbody>{r.actions.map((a, i) => <tr key={i} className="border-t border-slate-200"><td className="p-2">{a.what}</td><td className="p-2">{who(a.who)}</td><td className="p-2">{fmtDate(a.due)}</td></tr>)}</tbody></table></div>
      )}
    </div>
  )
}

function Editor({ p, r, onBack }) {
  const { me } = useMe()
  const users = useCol('users')
  const client = useDoc('clients', p.clientId)
  const [d, setD] = useState(r)
  const [dirty, setDirty] = useState(false)
  const [send, setSend] = useState(false)
  const [share, setShare] = useState(true)
  const [nw, setNw] = useState('')
  const up = (x) => { setD({ ...d, ...x }); setDirty(true) }
  const setArr = (k, i, v) => up({ [k]: d[k].map((y, j) => (j === i ? v : y)) })
  const rm = (k, i) => up({ [k]: d[k].filter((_, j) => j !== i) })
  const save = (extra = {}) => { const { id, ...rest } = { ...d, ...extra }; patch('protocols', r.id, rest); setDirty(false) }
  const people = [...new Set([...users.map((u) => u.name), ...(client?.contacts || []).map((c) => c.name), p.contractor && `נציג הקבלן – ${p.contractor}`, p.designer && `מתכנן – ${p.designer}`].filter(Boolean))].filter((n) => !d.attendees.includes(n))
  const doSend = () => {
    const fresh = d.actions.filter((a) => a.what.trim() && !a.taskId).length
    const actions = d.actions.filter((a) => a.what.trim()).map((a) => a.taskId ? a : { ...a, taskId: add('tasks', { title: a.what, desc: `מתוך ${d.title}`, assigneeId: users.some((u) => u.id === a.who) ? a.who : me.id, due: a.due, priority: 'med', status: 'open', projectId: p.id, source: { type: 'protocol', id: r.id, label: 'פרוטוקול' }, createdAt: Date.now() }) })
    save({ actions, status: 'sent', sentAt: Date.now(), topics: d.topics.filter((t) => t.title || t.text), decisions: d.decisions.filter((x) => x.trim()) })
    if (share) postMessage(p.id, { name: me.name, role: ROLE[me.role], internal: true }, { text: 'פרוטוקול מצורף.', card: { type: 'protocol', id: r.id, title: d.title } })
    toast(`הפרוטוקול נשלח (הדמיה) · נוצרו ${fresh} משימות`)
    setSend(false); onBack()
  }
  if (r.status === 'sent') return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <Btn v="ghost" onClick={onBack}><ChevronRight size={16} />כל הפרוטוקולים</Btn>
        <div className="flex gap-2"><Badge tone="green"><Lock size={11} className="me-1" />נשלח {fmtDate(r.sentAt)}</Badge>
          <Btn v="outline" sm onClick={() => window.print()}><Printer size={14} />הדפסה / PDF</Btn>
          <Btn v="outline" sm onClick={() => { const { id, sentAt, ...rest } = r; add('protocols', { ...rest, title: r.title + ' – גרסה מתוקנת', status: 'draft', actions: r.actions.map((a) => ({ ...a })) }); toast('נוצרה גרסה מתוקנת כטיוטה'); onBack() }}><Copy size={14} />גרסה מתוקנת</Btn></div>
      </div>
      <Card className="p-6"><ProtocolView r={r} /></Card>
    </div>
  )
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn v="ghost" onClick={() => { if (dirty) save(); onBack() }}><ChevronRight size={16} />כל הפרוטוקולים</Btn>
        <div className="flex gap-2">
          <Btn v="danger" sm onClick={() => { if (confirm('למחוק את הטיוטה?')) { del('protocols', r.id); onBack() } }}><Trash2 size={14} /></Btn>
          <Btn v="outline" onClick={() => { save(); toast('נשמר') }}>{dirty ? 'שמור טיוטה' : 'נשמר'}</Btn>
          <Btn onClick={() => { save(); setSend(true) }}><Send size={15} />שלח ללקוח</Btn>
        </div>
      </div>
      <Card className="space-y-5 p-5 sm:p-8">
        <div className="border-b-2 border-sky-700 pb-3">
          <div className="text-xs text-slate-500">אדם לדר – ניהול ופיקוח פרויקטים · {p.name}</div>
          <input className="doc-input text-xl font-bold" value={d.title} onChange={(e) => up({ title: e.target.value })} />
          <div className="mt-1 flex flex-wrap gap-2 text-sm">
            <input type="date" className="doc-input !w-40" value={d.date} onChange={(e) => up({ date: e.target.value })} />
            <input className="doc-input !w-56" placeholder="מקום" value={d.place} onChange={(e) => up({ place: e.target.value })} />
          </div>
        </div>
        <section>
          <h3 className="mb-2 text-sm font-semibold">משתתפים</h3>
          <div className="flex flex-wrap items-center gap-2">
            {d.attendees.map((a, i) => <span key={a} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm">{a}<button onClick={() => rm('attendees', i)} className="text-slate-400 hover:text-rose-600"><X size={12} /></button></span>)}
            <div className="w-44"><Select value="" placeholder="+ הוסף משתתף" onChange={(e) => e.target.value && up({ attendees: [...d.attendees, e.target.value] })} options={people} /></div>
            <input className="doc-input !w-40 !border-slate-200 text-sm" placeholder="שם חופשי + Enter" value={nw} onChange={(e) => setNw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && nw.trim()) { up({ attendees: [...d.attendees, nw.trim()] }); setNw('') } }} />
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">נושאים שנדונו</h3>
          {d.topics.map((t, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <span className="pt-1.5 text-sm font-semibold text-slate-400">{i + 1}.</span>
              <div className="flex-1"><input className="doc-input font-semibold" placeholder="נושא" value={t.title} onChange={(e) => setArr('topics', i, { ...t, title: e.target.value })} />
                <textarea className="doc-input text-sm" rows={2} placeholder="פירוט הדיון…" value={t.text} onChange={(e) => setArr('topics', i, { ...t, text: e.target.value })} /></div>
              <button onClick={() => rm('topics', i)} className="self-start pt-2 text-slate-300 hover:text-rose-600"><X size={14} /></button>
            </div>
          ))}
          <Btn v="ghost" sm onClick={() => up({ topics: [...d.topics, { title: '', text: '' }] })}><Plus size={13} />נושא</Btn>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">החלטות</h3>
          {d.decisions.map((x, i) => <div key={i} className="mb-1 flex items-center gap-2"><span className="text-slate-400">•</span><input className="doc-input text-sm" placeholder="החלטה" value={x} onChange={(e) => setArr('decisions', i, e.target.value)} /><button onClick={() => rm('decisions', i)} className="text-slate-300 hover:text-rose-600"><X size={14} /></button></div>)}
          <Btn v="ghost" sm onClick={() => up({ decisions: [...d.decisions, ''] })}><Plus size={13} />החלטה</Btn>
        </section>
        <section>
          <h3 className="mb-1 text-sm font-semibold">משימות</h3>
          <p className="mb-2 text-xs text-slate-500">בעת השליחה כל שורה הופכת למשימה במערכת עם אחראי ותאריך יעד.</p>
          <div className="space-y-1.5">
            {d.actions.map((a, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-[1fr_170px_150px_auto]">
                <input className="doc-input text-sm" placeholder="מה צריך לעשות" value={a.what} onChange={(e) => setArr('actions', i, { ...a, what: e.target.value })} />
                <button onClick={() => rm('actions', i)} className="text-slate-300 hover:text-rose-600 sm:order-last"><X size={14} /></button>
                <Select value={a.who} onChange={(e) => setArr('actions', i, { ...a, who: e.target.value })} options={[...users.map((u) => [u.id, u.name]), ['קבלן', 'קבלן'], ['לקוח', 'לקוח'], ['מתכנן', 'מתכנן']]} />
                <input type="date" className="doc-input !border-slate-300 !bg-white text-sm" value={a.due} onChange={(e) => setArr('actions', i, { ...a, due: e.target.value })} />
              </div>
            ))}
          </div>
          <Btn v="ghost" sm className="mt-1" onClick={() => up({ actions: [...d.actions, { what: '', who: me.id, due: addDays(7) }] })}><Plus size={13} />משימה</Btn>
        </section>
      </Card>
      {send && (
        <Modal title="שליחת הפרוטוקול" wide onClose={() => setSend(false)} footer={<><Btn v="outline" onClick={() => setSend(false)}>חזרה לעריכה</Btn><Btn onClick={doSend}><Send size={15} />שלח</Btn></>}>
          <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
            <div className="mb-1 font-semibold">נמענים</div>
            {(client?.contacts || []).map((c) => <label key={c.email} className="flex items-center gap-2 py-0.5"><input type="checkbox" defaultChecked className="accent-sky-700" />{c.name} · {c.role} <span className="text-xs text-slate-500" dir="ltr">{c.email}</span></label>)}
            <label className="mt-2 flex items-center gap-2 border-t border-slate-200 pt-2"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="accent-sky-700" />שתף גם בערוץ הפרויקט</label>
            <div className="mt-1 text-xs text-slate-500">ב-demo לא נשלח מייל בפועל. הפרוטוקול יינעל לעריכה ו-{d.actions.filter((a) => a.what.trim() && !a.taskId).length} משימות ייווצרו.</div>
          </div>
          <div className="rounded-lg border border-slate-200 p-4"><ProtocolView r={d} /></div>
        </Modal>
      )}
    </div>
  )
}

export default function Protocols({ p }) {
  const { me } = useMe()
  const list = useCol('protocols').filter((r) => r.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date))
  const tasks = useCol('tasks')
  const [sel, setSel] = useState(null)
  const [kind, setKind] = useState('site')
  const cur = list.find((r) => r.id === sel)
  if (cur) return <Editor key={cur.id} p={p} r={cur} onBack={() => setSel(null)} />
  const create = () => {
    const [label, topics] = KINDS[kind]
    const n = list.filter((r) => r.kind === kind).length + 1
    const prev = list.find((r) => r.kind === kind)
    setSel(add('protocols', { projectId: p.id, kind, title: `${label} מס' ${n}`, date: today(), place: kind === 'site' ? 'אתר העבודה' : 'משרדי הלקוח', status: 'draft',
      attendees: prev?.attendees || [me.name], topics: topics.map((title) => ({ title, text: '' })), decisions: [], actions: [] }))
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="w-40"><Select value={kind} onChange={(e) => setKind(e.target.value)} options={Object.entries(KINDS).map(([k, v]) => [k, v[0]])} /></div>
        <Btn onClick={create}><Plus size={16} />פרוטוקול חדש</Btn>
      </div>
      <Card className="divide-y divide-slate-100">
        {list.map((r) => {
          const open = (r.actions || []).filter((a) => { const t = tasks.find((x) => x.id === a.taskId); return t && t.status !== 'done' }).length
          return (
            <button key={r.id} onClick={() => setSel(r.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start hover:bg-slate-50">
              <div><div className="text-sm font-medium">{r.title}</div><div className="text-xs text-slate-500">{fmtDate(r.date)} · {r.place} · {(r.attendees || []).length} משתתפים</div></div>
              <div className="flex items-center gap-2">{open > 0 && <Badge tone="amber">{open} משימות פתוחות</Badge>}<Badge tone={r.status === 'sent' ? 'green' : 'gray'}>{r.status === 'sent' ? 'נשלח' : 'טיוטה'}</Badge></div>
            </button>
          )
        })}
        {!list.length && <div className="p-4"><Empty>אין פרוטוקולים עדיין</Empty></div>}
      </Card>
    </div>
  )
}

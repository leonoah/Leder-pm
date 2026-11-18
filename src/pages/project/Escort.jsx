import { useRef, useState } from 'react'
import { ChevronDown, Paperclip, ListTodo, Plus } from 'lucide-react'
import { add, patch } from '../../lib/db'
import { ESC_ST, escortPct, fmtTime, addDays, readFile } from '../../lib/util'
import { Badge, Btn, Card, Empty, ImgPick, Input, Progress, Select, Tabs, Textarea, Thumbs, useMe, toast } from '../../ui'

function Item({ p, it }) {
  const { me } = useMe()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [img, setImg] = useState(null)
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState(it.status)
  const fref = useRef()
  const save = () => {
    if (!text.trim() && !img && !file && status === it.status) return toast('אין מה לעדכן')
    const entry = { at: Date.now(), by: me.name, text: text.trim(), status, ...(img ? { img } : {}), ...(file ? { file } : {}) }
    patch('projects', p.id, { escort: p.escort.map((x) => (x.id === it.id ? { ...x, status, history: [...(x.history || []), entry] } : x)) })
    setText(''); setImg(null); setFile(null); toast('העדכון נשמר')
  }
  const last = it.history?.[it.history.length - 1]
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-slate-50">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${{ done: 'bg-emerald-500', doing: 'bg-sky-500', waiting: 'bg-amber-500', todo: 'bg-slate-300', na: 'bg-slate-200' }[it.status]}`} />
        <div className="min-w-0 flex-1"><div className={`text-sm font-medium ${it.status === 'na' ? 'text-slate-400 line-through' : ''}`}>{it.name}</div>
          {last && <div className="truncate text-xs text-slate-500">{fmtTime(last.at)} · {last.by}{last.text ? ' · ' + last.text : ''}</div>}</div>
        <Badge st={it.status}>{ESC_ST[it.status]}</Badge>
        <ChevronDown size={16} className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 bg-slate-50 px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} options={ESC_ST} />
            <Textarea rows={2} placeholder="עדכון / תיעוד" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ImgPick onPick={setImg} />
            <input ref={fref} type="file" hidden onChange={async (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 400000) return toast('ב-demo ניתן לצרף קבצים עד 400KB'); setFile({ name: f.name, data: await readFile(f) }); e.target.value = '' }} />
            <Btn v="outline" sm onClick={() => fref.current.click()}><Paperclip size={14} />צרף מסמך</Btn>
            {file && <span className="text-xs text-slate-600">{file.name}</span>}
            <Btn sm onClick={save}>שמור עדכון</Btn>
            <Btn v="ghost" sm onClick={() => { add('tasks', { title: it.name, desc: '', assigneeId: me.id, due: addDays(7), priority: 'med', status: 'open', projectId: p.id, source: { type: 'escort', id: it.id, label: 'ליווי הנדסי' }, createdAt: Date.now() }); toast('נוצרה משימה') }}><ListTodo size={13} />הפוך למשימה</Btn>
          </div>
          {img && <Thumbs imgs={[img]} onRemove={() => setImg(null)} />}
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-600">היסטוריה</div>
            {[...(it.history || [])].reverse().map((h, i) => (
              <div key={i} className="border-s-2 border-slate-300 py-1.5 ps-3 text-xs">
                <div className="text-slate-500">{fmtTime(h.at)} · <b className="text-slate-700">{h.by}</b> · <Badge st={h.status}>{ESC_ST[h.status]}</Badge></div>
                {h.text && <div className="mt-0.5 text-slate-700">{h.text}</div>}
                {h.file && <a href={h.file.data} download={h.file.name} className="mt-0.5 inline-flex items-center gap-1 text-sky-700"><Paperclip size={11} />{h.file.name}</a>}
                {h.img && <Thumbs imgs={[h.img]} />}
              </div>
            ))}
            {!it.history?.length && <div className="text-xs text-slate-500">אין עדכונים עדיין</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function AddRow({ onAdd }) {
  const [v, setV] = useState('')
  const go = () => { if (v.trim()) { onAdd(v.trim()); setV('') } }
  return <div className="flex gap-2 border-t border-slate-100 p-2"><Input placeholder="הוסף סעיף לשלב זה" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} /><Btn v="ghost" sm onClick={go}><Plus size={14} /></Btn></div>
}

export default function Escort({ p }) {
  const [view, setView] = useState('list')
  const items = p.escort || []
  const phases = [...new Set(items.map((i) => i.phase))]
  const log = items.flatMap((i) => (i.history || []).map((h) => ({ ...h, item: i.name }))).sort((a, b) => b.at - a.at)
  if (!items.length) return <Empty>לא נטענה תבנית ליווי הנדסי לפרויקט זה</Empty>
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">התקדמות תהליך הליווי</span><b>{escortPct(p)}%</b></div>
        <Progress value={escortPct(p)} tone="bg-emerald-500" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {phases.map((ph) => { const it = items.filter((i) => i.phase === ph && i.status !== 'na'); const d = it.filter((i) => i.status === 'done').length
            return <div key={ph} className="text-xs"><div className="mb-1 flex justify-between text-slate-600"><span>{ph}</span><span>{d}/{it.length}</span></div><Progress value={it.length ? (d / it.length) * 100 : 0} /></div> })}
        </div>
      </Card>
      <Tabs value={view} onChange={setView} tabs={[['list', 'צ\'קליסט'], ['log', 'יומן עדכונים']]} />
      {view === 'list' && phases.map((ph) => (
        <div key={ph}>
          <h3 className="mb-1.5 text-sm font-semibold text-slate-700">{ph}</h3>
          <Card>{items.filter((i) => i.phase === ph).map((it) => <Item key={it.id} p={p} it={it} />)}
            <AddRow onAdd={(name) => patch('projects', p.id, { escort: [...items, { id: 'x' + Date.now(), phase: ph, name, status: 'todo', history: [] }] })} />
          </Card>
        </div>
      ))}
      {view === 'log' && (
        <Card className="divide-y divide-slate-100">
          {log.map((h, i) => <div key={i} className="px-4 py-2.5 text-sm"><div className="text-xs text-slate-500">{fmtTime(h.at)} · {h.by}</div><div><b>{h.item}</b> – <Badge st={h.status}>{ESC_ST[h.status]}</Badge> {h.text}</div></div>)}
          {!log.length && <div className="p-4 text-sm text-slate-500">אין עדכונים</div>}
        </Card>
      )}
    </div>
  )
}

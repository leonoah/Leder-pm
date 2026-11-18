import { useEffect, useRef, useState } from 'react'
import { Send, Paperclip, Copy, FileText, ClipboardCheck, TrendingUp, ExternalLink } from 'lucide-react'
import { useCol, useDoc, postMessage } from '../../lib/db'
import { ROLE, SERVICE, compressImage, readFile, fmtTime, fmtDate, progress, isOpenDefect } from '../../lib/util'
import { Badge, Btn, Card, Empty, Modal, Progress, Tabs, Thumbs, useMe, toast } from '../../ui'
import { VisitReport, DefectCard } from './Inspection'
import { ProtocolView } from './Protocols'
import { ProgressSummary } from './ProgressTab'

const ICON = { visit: ClipboardCheck, protocol: FileText, progress: TrendingUp }
const ROLE_TONE = { 'לקוח': 'amber', 'קבלן': 'red', 'מתכנן': 'green' }

function CardModal({ card, onClose }) {
  const visit = useDoc('visits', card.type === 'visit' ? card.id : '')
  const prot = useDoc('protocols', card.type === 'protocol' ? card.id : '')
  return (
    <Modal title={card.title} wide onClose={onClose} footer={<Btn v="outline" onClick={() => window.print()}>הדפסה / PDF</Btn>}>
      {card.type === 'visit' && (visit ? <VisitReport visit={visit} /> : <Empty>הדוח לא נמצא</Empty>)}
      {card.type === 'protocol' && (prot ? <ProtocolView r={prot} /> : <Empty>הפרוטוקול לא נמצא</Empty>)}
      {card.type === 'progress' && <div className="space-y-2 text-sm"><div className="text-2xl font-bold text-sky-800">{card.pct}% ביצוע</div><div>{card.open} ליקויים פתוחים</div><ul className="list-disc ps-5 text-slate-700">{(card.lines || []).map((l) => <li key={l}>{l}</li>)}</ul></div>}
    </Modal>
  )
}

function Chat({ p, viewer }) {
  const msgs = useCol('messages').filter((m) => m.projectId === p.id).sort((a, b) => a.at - b.at)
  const [text, setText] = useState('')
  const [card, setCard] = useState(null)
  const box = useRef()
  const fref = useRef()
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight }, [msgs.length])
  const send = () => { if (!text.trim()) return; postMessage(p.id, viewer, { text: text.trim() }); setText('') }
  const attach = async (e) => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    if (f.type.startsWith('image/')) return postMessage(p.id, viewer, { img: await compressImage(f) })
    if (f.size > 400000) return toast('ב-demo ניתן לצרף קבצים עד 400KB')
    postMessage(p.id, viewer, { file: { name: f.name, data: await readFile(f) } })
  }
  return (
    <div className="flex h-[calc(100dvh-250px)] min-h-80 flex-col rounded-xl border border-slate-200 bg-slate-50 md:h-[62vh]">
      <div ref={box} className="flex-1 space-y-2 overflow-y-auto p-3">
        {msgs.map((m) => {
          const mine = m.by === viewer.name
          const Icon = m.card && ICON[m.card.type]
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%] ${mine ? 'bg-sky-700 text-white' : 'bg-white'}`}>
                <div className={`mb-0.5 flex items-center gap-1.5 text-[11px] ${mine ? 'text-sky-100' : 'text-slate-500'}`}><b>{m.by}</b>{!mine && <Badge tone={ROLE_TONE[m.role] || 'blue'}>{m.role}</Badge>}</div>
                {m.text && <div className="whitespace-pre-wrap">{m.text}</div>}
                {m.img && <Thumbs imgs={[m.img]} />}
                {m.file && <a href={m.file.data} download={m.file.name} className={`mt-1 flex items-center gap-1.5 underline ${mine ? 'text-white' : 'text-sky-700'}`}><Paperclip size={13} />{m.file.name}</a>}
                {m.card && <button onClick={() => setCard(m.card)} className="mt-1.5 flex w-full items-center gap-2 rounded-lg bg-slate-100 p-2 text-start text-slate-800 hover:bg-slate-200"><Icon size={18} className="shrink-0 text-sky-700" /><span className="flex-1 text-xs font-semibold">{m.card.title}</span><ExternalLink size={13} className="text-slate-400" /></button>}
                <div className={`mt-0.5 text-end text-[10px] ${mine ? 'text-sky-200' : 'text-slate-400'}`}>{fmtTime(m.at)}</div>
              </div>
            </div>
          )
        })}
        {!msgs.length && <div className="pt-10 text-center text-sm text-slate-500">אין עדיין הודעות בערוץ</div>}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-200 bg-white p-2">
        <input ref={fref} type="file" hidden onChange={attach} />
        <button onClick={() => fref.current.click()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="צרף קובץ או תמונה"><Paperclip size={20} /></button>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="כתוב הודעה…" className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        <button onClick={send} className="shrink-0 rounded-full bg-sky-700 p-2.5 text-white hover:bg-sky-800" aria-label="שלח"><Send size={18} className="-scale-x-100" /></button>
      </div>
      {card && <CardModal card={card} onClose={() => setCard(null)} />}
    </div>
  )
}

export function ChannelView({ p, viewer }) {
  const [tab, setTab] = useState('chat')
  const defects = useCol('defects').filter((d) => d.projectId === p.id)
  const msgs = useCol('messages').filter((m) => m.projectId === p.id && (m.img || m.file || m.card)).sort((a, b) => b.at - a.at)
  const users = useCol('users')
  const client = useDoc('clients', p.clientId)
  const [card, setCard] = useState(null)
  const open = defects.filter(isOpenDefect)
  return (
    <div className="space-y-3">
      <Tabs value={tab} onChange={setTab} tabs={[['chat', 'צ\'אט'], ['status', `סטטוס${open.length ? ` · ${open.length} ליקויים` : ''}`], ['files', 'קבצים ותמונות'], ['info', 'מידע']]} />
      {tab === 'chat' && <Chat p={p} viewer={viewer} />}
      {tab === 'status' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3"><Badge tone="blue">שלב: {p.stage}</Badge><div className="flex-1"><Progress value={progress(p)} /></div><b>{progress(p)}%</b></div>
          <ProgressSummary p={p} defects={defects} />
          <h3 className="text-sm font-semibold">ליקויים פתוחים{viewer.role === 'קבלן' ? ' – לטיפולך' : ''}</h3>
          <div className="grid gap-3 md:grid-cols-2">{open.map((d) => <DefectCard key={d.id} d={d} external viewerName={viewer.name} />)}</div>
          {!open.length && <Empty>אין ליקויים פתוחים</Empty>}
        </div>
      )}
      {tab === 'files' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {msgs.map((m) => (
            <Card key={m.id} className="p-2 text-xs">
              {m.img && <Thumbs imgs={[m.img]} />}
              {m.file && <a href={m.file.data} download={m.file.name} className="flex items-center gap-1.5 text-sky-700"><Paperclip size={13} />{m.file.name}</a>}
              {m.card && <button onClick={() => setCard(m.card)} className="flex items-center gap-1.5 text-start font-semibold text-sky-800"><FileText size={14} />{m.card.title}</button>}
              <div className="mt-1 text-slate-500">{m.by} · {fmtTime(m.at)}</div>
            </Card>
          ))}
          {!msgs.length && <div className="col-span-full"><Empty>עדיין לא הועלו קבצים</Empty></div>}
        </div>
      )}
      {tab === 'info' && (
        <Card className="p-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {[['פרויקט', p.name], ['מזמין', client?.name], ['שירות המשרד', p.service.map((s) => SERVICE[s]).join(' + ')], ['סוג', p.type], ['מנהל פרויקט', users.find((u) => u.id === p.pmId)?.name], ['מפקח', users.find((u) => u.id === p.inspectorId)?.name], ['קבלן', p.contractor], ['מתכנן', p.designer], ['תחילה', fmtDate(p.startDate)], ['סיום מתוכנן', fmtDate(p.endDate)]]
              .filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
          </dl>
        </Card>
      )}
      {card && <CardModal card={card} onClose={() => setCard(null)} />}
    </div>
  )
}

export function ChannelTab({ p }) {
  const { me } = useMe()
  const link = `${location.origin}${location.pathname}#/c/${p.id}`
  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center justify-between gap-3 bg-sky-50 p-3 text-sm">
        <div><b>הזמנת לקוח / קבלן לערוץ:</b> שולחים קישור וקוד גישה. נכנסים מהנייד, בלי התקנה ובלי חשבון.
          <div className="mt-1 break-all text-xs text-slate-600" dir="ltr">{link}</div></div>
        <div className="flex items-center gap-2"><span className="rounded-lg bg-white px-3 py-1.5 font-mono text-lg font-bold tracking-widest">{p.channelCode}</span>
          <Btn v="outline" sm onClick={() => { navigator.clipboard?.writeText(`הוזמנת לערוץ הפרויקט "${p.name}":\n${link}\nקוד גישה: ${p.channelCode}`); toast('ההזמנה הועתקה') }}><Copy size={13} />העתק הזמנה</Btn>
          <a href={link} target="_blank" rel="noreferrer"><Btn v="outline" sm><ExternalLink size={13} />פתח כאורח</Btn></a></div>
      </Card>
      <ChannelView p={p} viewer={{ name: me.name, role: ROLE[me.role], internal: true }} />
    </div>
  )
}

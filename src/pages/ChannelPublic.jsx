import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Droplets, LogOut } from 'lucide-react'
import { useDoc } from '../lib/db'
import { Btn, Card, Empty, Field, Input, Select } from '../ui'
import { ChannelView } from './project/Channel'

export default function ChannelPublic() {
  const { id } = useParams()
  const p = useDoc('projects', id)
  const key = 'leder-guest-' + id
  const [viewer, setViewer] = useState(() => { try { return JSON.parse(sessionStorage.getItem(key)) } catch { return null } })
  const [f, setF] = useState({ name: '', role: 'קבלן', code: '' })
  const [err, setErr] = useState('')
  if (!p) return <div className="p-6"><Empty>הערוץ לא נמצא</Empty></div>
  const enter = () => {
    if (!f.name.trim()) return setErr('יש להזין שם')
    if (f.code.trim() !== p.channelCode) return setErr('קוד הגישה שגוי')
    const v = { name: f.name.trim(), role: f.role, internal: false }
    try { sessionStorage.setItem(key, JSON.stringify(v)) } catch { /* ignore */ }
    setViewer(v)
  }
  if (!viewer) return (
    <div className="flex min-h-full items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-sm space-y-3 p-6">
        <div className="flex items-center gap-2 text-sky-800"><Droplets size={22} /><b>ערוץ פרויקט</b></div>
        <h1 className="text-lg font-bold leading-snug">{p.name}</h1>
        <p className="text-sm text-slate-600">אדם לדר – ניהול ופיקוח פרויקטים. הזינו את קוד הגישה שקיבלתם כדי להצטרף לערוץ.</p>
        <Field label="שם מלא"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="תפקיד"><Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} options={['קבלן', 'לקוח', 'מתכנן']} /></Field>
        <Field label="קוד גישה"><Input value={f.code} inputMode="numeric" onChange={(e) => setF({ ...f, code: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && enter()} /></Field>
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <Btn className="w-full" onClick={enter}>כניסה לערוץ</Btn>
      </Card>
    </div>
  )
  return (
    <div className="mx-auto min-h-full max-w-3xl p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0"><div className="flex items-center gap-1.5 text-xs text-sky-800"><Droplets size={14} />ערוץ פרויקט · לדר ניהול ופיקוח</div><h1 className="truncate font-bold">{p.name}</h1></div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500"><span>{viewer.name} · {viewer.role}</span><button onClick={() => { sessionStorage.removeItem(key); setViewer(null) }} aria-label="יציאה"><LogOut size={15} /></button></div>
      </div>
      <ChannelView p={p} viewer={viewer} />
    </div>
  )
}

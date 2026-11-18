import { Share2, Printer } from 'lucide-react'
import { useCol, patch, postMessage } from '../../lib/db'
import { SEG_ST, ROLE, progress, segPct, isOpenDefect, fmtDate, today } from '../../lib/util'
import { Badge, Btn, Card, Input, Progress, Select, useMe, toast } from '../../ui'
import MapView, { MapLegend } from '../../MapView'

export function ProgressSummary({ p, defects }) {
  const line = p.geometry === 'line'
  const units = (line ? p.segments : p.milestones) || []
  const open = defects.filter(isOpenDefect)
  const done = line ? Math.round(units.reduce((a, s) => a + ((s.to - s.from) * segPct(s)) / 100, 0)) : null
  const total = line ? units.reduce((a, s) => a + (s.to - s.from), 0) : null
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
        <Card className="p-3"><div className="text-xs text-slate-500">התקדמות כוללת</div><div className="text-xl font-bold text-sky-800 sm:text-2xl">{progress(p)}%</div></Card>
        <Card className="p-3"><div className="text-xs text-slate-500">{line ? 'בוצע' : 'אבני דרך שהושלמו'}</div><div className="whitespace-nowrap text-xl font-bold sm:text-2xl">{line ? `${done.toLocaleString()} מ'` : `${units.filter((u) => u.status === 'done').length}/${units.length}`}</div>{line && <div className="text-xs text-slate-500">מתוך {total.toLocaleString()} מ'</div>}</Card>
        <Card className="p-3"><div className="text-xs text-slate-500">ליקויים פתוחים</div><div className={`text-xl font-bold sm:text-2xl ${open.length ? 'text-amber-600' : ''}`}>{open.length}</div></Card>
      </div>
      <MapView single={p} defects={defects} height={340} />
      {line && <MapLegend />}
    </div>
  )
}

export default function ProgressTab({ p }) {
  const { me } = useMe()
  const defects = useCol('defects').filter((d) => d.projectId === p.id)
  const line = p.geometry === 'line'
  const key = line ? 'segments' : 'milestones'
  const units = p[key] || []
  const canEdit = true
  const set = (i, x) => patch('projects', p.id, { [key]: units.map((u, j) => (j === i ? { ...u, ...x } : u)) })
  const share = () => {
    postMessage(p.id, { name: me.name, role: ROLE[me.role], internal: true }, { text: '', card: { type: 'progress', title: `דוח התקדמות – ${fmtDate(today())}`, pct: progress(p), open: defects.filter(isOpenDefect).length, lines: units.map((u) => `${u.name}: ${SEG_ST[u.status]}${u.status === 'progress' ? ` (${u.pct}%)` : ''}`) } })
    toast('דוח ההתקדמות שותף לערוץ הפרויקט')
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="text-sm text-slate-600">{line ? 'פרויקט קווי – ההתקדמות נמדדת לפי מ"א שבוצעו בכל מקטע.' : 'פרויקט נקודתי – ההתקדמות נמדדת לפי אבני דרך משוקללות.'}</div>
        <div className="flex gap-2"><Btn v="outline" onClick={() => window.print()}><Printer size={14} />הדפסה / PDF</Btn><Btn onClick={share}><Share2 size={14} />שתף לערוץ</Btn></div>
      </div>
      <div className="print-area space-y-4">
        <div className="hidden print:block"><h2 className="text-lg font-bold">דוח התקדמות – {p.name}</h2><div className="text-sm text-slate-500">{fmtDate(today())}</div></div>
        <ProgressSummary p={p} defects={defects} />
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2 text-start">{line ? 'מקטע' : 'אבן דרך'}</th><th className="hidden px-3 py-2 text-start sm:table-cell">{line ? 'חתך (מ\')' : 'משקל'}</th><th className="px-3 py-2 text-start">סטטוס</th><th className="px-3 py-2 text-start">ביצוע</th><th className="px-2 py-2 text-start sm:px-3">ליקויים</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u, i) => {
                const od = defects.filter((d) => isOpenDefect(d) && d.loc === u.name).length
                return (
                  <tr key={u.id}>
                    <td className="px-3 py-2 font-medium sm:px-4">{u.name}<div className="text-xs font-normal text-slate-500 sm:hidden" dir="ltr">{line ? `${u.from}–${u.to}` : `${u.weight}%`}</div></td>
                    <td className="hidden px-3 py-2 text-slate-600 sm:table-cell"><span dir="ltr">{line ? `${u.from}–${u.to}` : `${u.weight}%`}</span></td>
                    <td className="px-2 py-2 sm:px-3"><div className="w-28 no-print sm:w-32">{canEdit && <Select value={u.status} onChange={(e) => set(i, { status: e.target.value, pct: e.target.value === 'progress' ? u.pct || 10 : u.pct })} options={SEG_ST} />}</div><span className="hidden print:inline">{SEG_ST[u.status]}</span></td>
                    <td className="px-2 py-2 sm:px-3"><div className="flex items-center gap-2">{u.status === 'progress' ? <div className="w-16 no-print sm:w-20"><Input type="number" min="0" max="100" value={u.pct} onChange={(e) => set(i, { pct: Math.max(0, Math.min(100, Number(e.target.value))) })} /></div> : null}<Progress value={segPct(u)} className="hidden w-24 sm:block" tone={u.status === 'done' ? 'bg-emerald-500' : 'bg-amber-500'} /><span className="w-9 text-xs">{segPct(u)}%</span></div></td>
                    <td className="px-3 py-2">{od ? <Badge tone="red">{od}</Badge> : <span className="text-slate-300">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

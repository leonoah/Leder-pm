import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, ClipboardCheck } from 'lucide-react'
import { useCol } from '../lib/db'
import { progress, fin, isLate, isOpenDefect, money } from '../lib/util'
import { Badge, Btn, Card, Empty, Progress, Stat, useMe } from '../ui'
import MapView from '../MapView'
import { TaskControl, TaskList } from './Tasks'

export default function Dashboard() {
  const { me } = useMe()
  const nav = useNavigate()
  const projects = useCol('projects')
  const tasks = useCol('tasks')
  const defects = useCol('defects')

  if (me.role === 'inspector') {
    const mine = projects.filter((p) => p.inspectorId === me.id)
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-bold">שלום {me.name.split(' ')[0]}, היום שלך</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          {mine.map((p) => (
            <Card key={p.id} className="p-4">
              <Link to={`/projects/${p.id}`} className="font-semibold hover:text-sky-700">{p.name}</Link>
              <div className="mt-1 text-xs text-slate-500">{defects.filter((d) => d.projectId === p.id && isOpenDefect(d)).length} ליקויים פתוחים · {progress(p)}% ביצוע</div>
              <Btn className="mt-3 w-full" onClick={() => nav(`/projects/${p.id}/inspection?new=1`)}><ClipboardCheck size={16} />התחל סיור פיקוח</Btn>
            </Card>
          ))}
          {!mine.length && <Empty>אין פרויקטים בפיקוחך</Empty>}
        </div>
        <h2 className="font-semibold">המשימות שלי</h2>
        <TaskList tasks={tasks.filter((t) => t.assigneeId === me.id)} />
      </div>
    )
  }

  const active = projects.filter((p) => p.stage !== 'סגור')
  const openDef = defects.filter(isOpenDefect)
  const late = tasks.filter(isLate)
  const toCollect = projects.reduce((a, p) => a + fin(p).toCollect, 0)
  const attention = active.map((p) => {
    const reasons = []
    const l = late.filter((t) => t.projectId === p.id).length
    const h = openDef.filter((d) => d.projectId === p.id && d.severity === 'high').length
    const od = openDef.filter((d) => d.projectId === p.id && d.due && d.due < new Date().toISOString().slice(0, 10)).length
    const gap = progress(p) - fin(p).billedPct
    if (l) reasons.push(`${l} משימות באיחור`)
    if (h) reasons.push(`${h} ליקויים בחומרה גבוהה`)
    if (od) reasons.push(`${od} ליקויים שעבר מועד תיקונם`)
    if (me.role === 'admin' && gap >= 25) reasons.push(`פער חיוב: בוצע ${progress(p)}%, חויב ${fin(p).billedPct}%`)
    return { p, reasons }
  }).filter((x) => x.reasons.length)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">לוח בקרה</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="פרויקטים פעילים" value={active.length} />
        <Stat label="ליקויים פתוחים" value={openDef.length} tone={openDef.length ? 'text-amber-600' : undefined} />
        <Stat label="משימות באיחור" value={late.length} tone={late.length ? 'text-rose-600' : undefined} />
        {me.role === 'admin' ? <Stat label="יתרה לגבייה" value={money(toCollect)} sub="חשבונות שהוגשו וטרם שולמו" /> : <Stat label="המשימות הפתוחות שלי" value={tasks.filter((t) => t.assigneeId === me.id && t.status !== 'done').length} />}
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-2 font-semibold">מפת הפרויקטים</h2>
          <MapView projects={active} height={380} onPick={(p) => nav(`/projects/${p.id}`)} />
          <div className="mt-1 text-xs text-slate-500">מיקומים מקורבים. לחיצה על נקודה פותחת את הפרויקט.</div>
        </div>
        <div className="lg:col-span-2">
          <h2 className="mb-2 font-semibold">דורש תשומת לב</h2>
          <div className="space-y-2">
            {attention.map(({ p, reasons }) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="block">
                <Card className="p-3 hover:border-sky-400">
                  <div className="flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                    <div className="min-w-0"><div className="truncate text-sm font-semibold">{p.name}</div>
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-600">{reasons.map((r) => <li key={r}>{r}</li>)}</ul></div></div>
                </Card>
              </Link>
            ))}
            {!attention.length && <Empty>הכול תקין</Empty>}
          </div>
        </div>
      </div>
      <div>
        <h2 className="mb-2 font-semibold">התקדמות פרויקטים</h2>
        <Card className="divide-y divide-slate-100">
          {active.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}/progress`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{p.name}</div></div>
              <Badge tone="blue">{p.stage}</Badge>
              <div className="w-28 sm:w-48"><Progress value={progress(p)} /></div>
              <div className="w-10 text-end text-sm font-semibold">{progress(p)}%</div>
            </Link>
          ))}
        </Card>
      </div>
      <div><h2 className="mb-2 font-semibold">בקרה על משימות לפי עובד</h2><TaskControl /></div>
    </div>
  )
}

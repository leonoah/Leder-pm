import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Plus } from 'lucide-react'
import { useCol, useDoc, patch } from '../lib/db'
import { STAGES, SERVICE, progress, escortPct, isOpenDefect, isLate, fmtDate, fmtTime } from '../lib/util'
import { Badge, Btn, Card, Empty, Progress, Select, Stat, Tabs, useMe } from '../ui'
import { TaskList, TaskModal } from './Tasks'
import Inspection from './project/Inspection'
import Escort from './project/Escort'
import Protocols from './project/Protocols'
import ProgressTab from './project/ProgressTab'
import Finance from './project/Finance'
import { ChannelTab } from './project/Channel'

function Overview({ p }) {
  const { me } = useMe()
  const users = useCol('users')
  const staff = users.filter((u) => u.active !== false)
  const canEdit = me.role !== 'inspector'
  const team = p.team || []
  const clients = useCol('clients')
  const tasks = useCol('tasks').filter((t) => t.projectId === p.id)
  const defects = useCol('defects').filter((d) => d.projectId === p.id)
  const messages = useCol('messages').filter((m) => m.projectId === p.id).sort((a, b) => b.at - a.at).slice(0, 4)
  const name = (id) => users.find((u) => u.id === id)?.name || '—'
  const tech = p.tech || {}
  const rows = p.geometry === 'line'
    ? [['קוטר', tech.diameter], ['אורך', tech.length ? `${Number(tech.length).toLocaleString()} מ'` : ''], ['חומר', tech.material], ['הערות', tech.notes]]
    : [['נפח / ספיקה', tech.capacity], ['הערות', tech.notes]]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="התקדמות ביצוע" value={progress(p) + '%'} />
        {p.service.includes('mgmt') && <Stat label="ליווי הנדסי" value={escortPct(p) + '%'} />}
        <Stat label="ליקויים פתוחים" value={defects.filter(isOpenDefect).length} tone={defects.some(isOpenDefect) ? 'text-amber-600' : undefined} />
        <Stat label="משימות באיחור" value={tasks.filter(isLate).length} tone={tasks.some(isLate) ? 'text-rose-600' : undefined} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">פרטי הפרויקט</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {[['לקוח', clients.find((c) => c.id === p.clientId)?.name], ['יוזם העבודה', p.initiator], ['סוג', `${p.type} · ${p.geometry === 'line' ? 'קווי' : 'נקודתי'}`], ...rows, ['תחילה', fmtDate(p.startDate)], ['סיום מתוכנן', fmtDate(p.endDate)]]
              .filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
          </dl>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">צוות הפרויקט</h3>
          {canEdit ? (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-[90px_1fr] items-center gap-2"><span className="text-slate-500">מנהל פרויקט</span><Select value={p.pmId || ''} placeholder="לא שובץ" onChange={(e) => patch('projects', p.id, { pmId: e.target.value })} options={staff.filter((u) => u.role !== 'inspector').map((u) => [u.id, u.name])} /></div>
              {p.service.includes('insp') && <div className="grid grid-cols-[90px_1fr] items-center gap-2"><span className="text-slate-500">מפקח</span><Select value={p.inspectorId || ''} placeholder="לא שובץ" onChange={(e) => patch('projects', p.id, { inspectorId: e.target.value })} options={staff.map((u) => [u.id, u.name])} /></div>}
              <div className="grid grid-cols-[90px_1fr] items-start gap-2"><span className="pt-1.5 text-slate-500">חברי צוות</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {team.map((id) => <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs">{name(id)}<button onClick={() => patch('projects', p.id, { team: team.filter((x) => x !== id) })} className="text-slate-400 hover:text-rose-600" aria-label="הסר">×</button></span>)}
                  <div className="w-36"><Select value="" placeholder="+ הוסף עובד" onChange={(e) => e.target.value && patch('projects', p.id, { team: [...team, e.target.value] })} options={staff.filter((u) => !team.includes(u.id) && u.id !== p.pmId && u.id !== p.inspectorId).map((u) => [u.id, u.name])} /></div>
                </div></div>
            </div>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[['מנהל פרויקט', name(p.pmId)], ['מפקח', p.inspectorId ? name(p.inspectorId) : ''], ['חברי צוות', team.map(name).join(', ')]].filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            </dl>
          )}
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm">
            {[['קבלן', p.contractor], ['מתכנן', p.designer]].filter(([, v]) => v).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
          </dl>
          <h3 className="mt-5 mb-2 text-sm font-semibold">פעילות אחרונה בערוץ</h3>
          <div className="space-y-2 text-xs">
            {messages.map((m) => <div key={m.id} className="rounded-lg bg-slate-50 p-2"><b>{m.by}</b> <span className="text-slate-400">· {fmtTime(m.at)}</span><div className="mt-0.5 text-slate-600">{m.text || m.card?.title || 'קובץ'}</div></div>)}
            {!messages.length && <div className="text-slate-500">אין עדיין הודעות</div>}
          </div>
        </Card>
      </div>
    </div>
  )
}

function ProjectTasks({ p }) {
  const tasks = useCol('tasks').filter((t) => t.projectId === p.id)
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Btn onClick={() => setOpen(true)}><Plus size={16} />משימה חדשה</Btn></div>
      <TaskList tasks={tasks} showProject={false} />
      {open && <TaskModal projectId={p.id} onClose={() => setOpen(false)} />}
    </div>
  )
}

export default function Project() {
  const { id, tab = 'overview' } = useParams()
  const nav = useNavigate()
  const { me } = useMe()
  const p = useDoc('projects', id)
  const clients = useCol('clients')
  if (!p) return <Empty>הפרויקט לא נמצא. <Link to="/projects" className="text-sky-700">חזרה לרשימה</Link></Empty>
  const canFin = me.role === 'admin' || (me.role === 'pm' && p.pmId === me.id)
  const tabs = [['overview', 'סקירה'], ['tasks', 'משימות'], p.service.includes('insp') && ['inspection', 'פיקוח וליקויים'], p.service.includes('mgmt') && me.role !== 'inspector' && ['escort', 'ליווי הנדסי'],
    ['protocols', 'פרוטוקולים'], ['progress', 'התקדמות ומפה'], canFin && ['finance', 'כספים'], ['channel', 'ערוץ הפרויקט']].filter(Boolean)
  const cur = tabs.some(([k]) => k === tab) ? tab : 'overview'
  return (
    <div className="space-y-4">
      <div className="no-print">
        <Link to="/projects" className="mb-1 inline-flex items-center text-xs text-slate-500 hover:text-sky-700"><ChevronRight size={14} />פרויקטים</Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-snug">{p.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500"><span>{clients.find((c) => c.id === p.clientId)?.name}</span>{p.service.map((s) => <Badge key={s}>{SERVICE[s]}</Badge>)}<Badge tone="blue">{p.type}</Badge></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-36"><div className="mb-1 flex justify-between text-xs text-slate-500"><span>ביצוע</span><b className="text-slate-800">{progress(p)}%</b></div><Progress value={progress(p)} /></div>
            <div className="w-28">{me.role === 'inspector' ? <Badge tone="blue">{p.stage}</Badge> : <Select value={p.stage} onChange={(e) => patch('projects', p.id, { stage: e.target.value })} options={STAGES} />}</div>
          </div>
        </div>
      </div>
      <Tabs tabs={tabs} value={cur} onChange={(k) => nav(`/projects/${p.id}/${k}`)} />
      {cur === 'overview' && <Overview p={p} />}
      {cur === 'tasks' && <ProjectTasks p={p} />}
      {cur === 'inspection' && <Inspection p={p} />}
      {cur === 'escort' && <Escort p={p} />}
      {cur === 'protocols' && <Protocols p={p} />}
      {cur === 'progress' && <ProgressTab p={p} />}
      {cur === 'finance' && <Finance p={p} />}
      {cur === 'channel' && <ChannelTab p={p} />}
    </div>
  )
}

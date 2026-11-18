import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useCol, add, patch, del } from '../lib/db'
import { TASK_ST, PRIO, fmtDate, isLate, addDays } from '../lib/util'
import { Badge, Btn, Card, Empty, Field, Input, Modal, Select, Tabs, Textarea, useMe, toast } from '../ui'

export function TaskModal({ task, projectId, onClose }) {
  const { me } = useMe()
  const users = useCol('users')
  const projects = useCol('projects')
  const [t, setT] = useState(task || { title: '', desc: '', assigneeId: me.id, due: addDays(7), priority: 'med', status: 'open', projectId: projectId || '' })
  const set = (k) => (e) => setT({ ...t, [k]: e.target.value })
  const save = () => {
    if (!t.title.trim()) return toast('חסרה כותרת')
    const data = { ...t, doneAt: t.status === 'done' ? t.doneAt || Date.now() : null }
    if (task) patch('tasks', task.id, data); else add('tasks', { ...data, createdAt: Date.now(), source: null })
    onClose()
  }
  return (
    <Modal title={task ? 'משימה' : 'משימה חדשה'} onClose={onClose} footer={<>
      {task && <Btn v="danger" onClick={() => { del('tasks', task.id); onClose() }}><Trash2 size={14} />מחק</Btn>}
      <Btn v="outline" onClick={onClose}>ביטול</Btn><Btn onClick={save}>שמור</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="כותרת" className="sm:col-span-2"><Input value={t.title} onChange={set('title')} autoFocus /></Field>
        <Field label="תיאור" className="sm:col-span-2"><Textarea value={t.desc || ''} onChange={set('desc')} /></Field>
        <Field label="אחראי"><Select value={t.assigneeId} onChange={set('assigneeId')} options={users.map((u) => [u.id, u.name])} /></Field>
        <Field label="תאריך יעד"><Input type="date" value={t.due || ''} onChange={set('due')} /></Field>
        <Field label="עדיפות"><Select value={t.priority} onChange={set('priority')} options={PRIO} /></Field>
        <Field label="סטטוס"><Select value={t.status} onChange={set('status')} options={TASK_ST} /></Field>
        <Field label="פרויקט" className="sm:col-span-2"><Select value={t.projectId || ''} onChange={set('projectId')} placeholder="משימה ארגונית (ללא פרויקט)" options={projects.map((p) => [p.id, p.name])} /></Field>
      </div>
      {task?.source && <div className="mt-3 text-xs text-slate-500">מקור המשימה: {task.source.label}</div>}
    </Modal>
  )
}

export function TaskList({ tasks, showProject = true }) {
  const users = useCol('users')
  const projects = useCol('projects')
  const [edit, setEdit] = useState(null)
  const sorted = [...tasks].sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.due || '').localeCompare(b.due || ''))
  if (!sorted.length) return <Empty>אין משימות להצגה</Empty>
  return (
    <Card className="divide-y divide-slate-100">
      {sorted.map((t) => {
        const p = projects.find((x) => x.id === t.projectId)
        return (
          <div key={t.id} className="flex items-start gap-3 px-4 py-3">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-sky-700" checked={t.status === 'done'} onChange={(e) => patch('tasks', t.id, { status: e.target.checked ? 'done' : 'open', doneAt: e.target.checked ? Date.now() : null })} />
            <button className="min-w-0 flex-1 text-start" onClick={() => setEdit(t)}>
              <div className={`text-sm font-medium ${t.status === 'done' ? 'text-slate-400 line-through' : ''}`}>{t.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>{users.find((u) => u.id === t.assigneeId)?.name || '—'}</span>
                <span className={isLate(t) ? 'font-semibold text-rose-600' : ''}>{isLate(t) ? 'באיחור · ' : ''}{fmtDate(t.due)}</span>
                {showProject && <span className="truncate">{p ? p.name : 'ארגוני'}</span>}
                {t.source && <Badge tone="blue">{t.source.label}</Badge>}
                {t.priority === 'high' && <Badge tone="red">דחופה</Badge>}
              </div>
            </button>
            <Badge st={t.status}>{TASK_ST[t.status]}</Badge>
          </div>
        )
      })}
      {edit && <TaskModal task={edit} onClose={() => setEdit(null)} />}
    </Card>
  )
}

export default function TasksPage() {
  const { me } = useMe()
  const tasks = useCol('tasks')
  const users = useCol('users')
  const manager = me.role !== 'inspector'
  const [tab, setTab] = useState('mine')
  const [who, setWho] = useState('')
  const [st, setSt] = useState('')
  const [open, setOpen] = useState(false)
  const all = tasks.filter((t) => (!who || t.assigneeId === who) && (!st || (st === 'late' ? isLate(t) : t.status === st)))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">משימות</h1><Btn onClick={() => setOpen(true)}><Plus size={16} />משימה חדשה</Btn></div>
      {manager && <Tabs value={tab} onChange={setTab} tabs={[['mine', 'המשימות שלי'], ['all', 'כל המשימות'], ['control', 'בקרה לפי עובד']]} />}
      {tab === 'mine' && <TaskList tasks={tasks.filter((t) => t.assigneeId === me.id)} />}
      {tab === 'all' && (<>
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Select value={who} onChange={(e) => setWho(e.target.value)} placeholder="כל העובדים" options={users.map((u) => [u.id, u.name])} />
          <Select value={st} onChange={(e) => setSt(e.target.value)} placeholder="כל הסטטוסים" options={{ ...TASK_ST, late: 'באיחור' }} />
        </div>
        <TaskList tasks={all} />
      </>)}
      {tab === 'control' && <TaskControl />}
      {open && <TaskModal onClose={() => setOpen(false)} />}
    </div>
  )
}

export function TaskControl() {
  const tasks = useCol('tasks')
  const users = useCol('users')
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-2 text-start">עובד</th><th className="px-3 py-2">פתוחות</th><th className="px-3 py-2">באיחור</th><th className="px-3 py-2">ממתינות לגורם חיצוני</th><th className="px-3 py-2">בוצעו</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => {
            const mine = tasks.filter((t) => t.assigneeId === u.id)
            const late = mine.filter(isLate).length
            return (
              <tr key={u.id}>
                <td className="px-4 py-2.5 font-medium">{u.name}</td>
                <td className="px-3 py-2.5 text-center">{mine.filter((t) => t.status !== 'done').length}</td>
                <td className={`px-3 py-2.5 text-center font-semibold ${late ? 'text-rose-600' : 'text-slate-400'}`}>{late}</td>
                <td className="px-3 py-2.5 text-center">{mine.filter((t) => t.status === 'waiting').length}</td>
                <td className="px-3 py-2.5 text-center text-emerald-700">{mine.filter((t) => t.status === 'done').length}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">לפירוט – לשונית <Link to="/tasks" className="text-sky-700">כל המשימות</Link> עם סינון לפי עובד.</div>
    </Card>
  )
}

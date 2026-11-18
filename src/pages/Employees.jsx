import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Phone, Mail, UserX, UserCheck } from 'lucide-react'
import { useCol, add, patch } from '../lib/db'
import { ROLE, isLate, progress } from '../lib/util'
import { Badge, Btn, Card, Empty, Field, Input, Modal, Progress, Select, useMe, toast } from '../ui'
import { TaskList, TaskModal } from './Tasks'

export const useStaff = () => useCol('users').filter((u) => u.active !== false)

function EmployeeModal({ user, onClose }) {
  const [u, setU] = useState(user || { name: '', role: 'inspector', title: '', phone: '', email: '', active: true })
  const set = (k) => (e) => setU({ ...u, [k]: e.target.value })
  const save = () => {
    if (!u.name.trim()) return toast('חסר שם עובד')
    if (user) patch('users', user.id, u); else add('users', u)
    toast(user ? 'פרטי העובד עודכנו' : 'העובד נוסף'); onClose()
  }
  return (
    <Modal title={user ? 'עריכת עובד' : 'עובד חדש'} onClose={onClose} footer={<><Btn v="outline" onClick={onClose}>ביטול</Btn><Btn onClick={save}>שמור</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="שם מלא"><Input value={u.name} onChange={set('name')} autoFocus /></Field>
        <Field label="הרשאה במערכת"><Select value={u.role} onChange={set('role')} options={ROLE} /></Field>
        <Field label="תפקיד / התמחות" className="sm:col-span-2"><Input value={u.title || ''} onChange={set('title')} placeholder="לדוגמה: מהנדס אזרחי, מפקח צנרת" /></Field>
        <Field label="טלפון"><Input value={u.phone || ''} onChange={set('phone')} dir="ltr" /></Field>
        <Field label="מייל"><Input value={u.email || ''} onChange={set('email')} dir="ltr" /></Field>
      </div>
      <p className="mt-3 text-xs text-slate-500">ההרשאה קובעת מה העובד רואה: מנהל המשרד רואה הכול כולל כספים ופאנל בקרה; מנהל פרויקט רואה פרויקטים, משימות ולקוחות; מפקח רואה את הפרויקטים והמשימות שלו.</p>
    </Modal>
  )
}

export default function Employees() {
  const { me } = useMe()
  const users = useCol('users')
  const tasks = useCol('tasks')
  const projects = useCol('projects')
  const admin = me.role === 'admin'
  const [sel, setSel] = useState(null)
  const [edit, setEdit] = useState(undefined)
  const [task, setTask] = useState(false)
  const [showOff, setShowOff] = useState(false)
  const list = users.filter((u) => showOff || u.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'he'))
  const cur = users.find((u) => u.id === sel) || list[0]
  const load = (u) => { const t = tasks.filter((x) => x.assigneeId === u.id); return { open: t.filter((x) => x.status !== 'done').length, late: t.filter(isLate).length, done: t.filter((x) => x.status === 'done').length } }
  const projOf = (u) => projects.filter((p) => p.stage !== 'סגור' && (p.pmId === u.id || p.inspectorId === u.id || (p.team || []).includes(u.id)))
  const roleIn = (p, u) => [p.pmId === u.id && 'מנהל פרויקט', p.inspectorId === u.id && 'מפקח', (p.team || []).includes(u.id) && 'חבר צוות'].filter(Boolean).join(' · ')
  const max = Math.max(1, ...list.map((u) => load(u).open))
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">עובדים</h1>{admin && <Btn onClick={() => setEdit(null)}><Plus size={16} />עובד חדש</Btn>}</div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          {list.map((u) => { const l = load(u); return (
            <Card key={u.id} onClick={() => setSel(u.id)} className={`cursor-pointer p-3 ${cur?.id === u.id ? 'border-sky-500 ring-1 ring-sky-500' : 'hover:border-sky-300'} ${u.active === false ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between gap-2"><div className="font-semibold">{u.name}</div><Badge tone={u.role === 'admin' ? 'amber' : u.role === 'pm' ? 'blue' : 'green'}>{ROLE[u.role]}</Badge></div>
              <div className="mt-0.5 text-xs text-slate-500">{u.title || '—'} · {projOf(u).length} פרויקטים{u.active === false ? ' · לא פעיל' : ''}</div>
              <div className="mt-2 flex items-center gap-2 text-xs"><Progress value={(l.open / max) * 100} tone={l.late ? 'bg-rose-500' : 'bg-sky-600'} /><span className="whitespace-nowrap">{l.open} פתוחות{l.late ? ` · ${l.late} באיחור` : ''}</span></div>
            </Card>) })}
          <label className="flex items-center gap-2 px-1 text-xs text-slate-500"><input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} className="accent-sky-700" />הצג גם עובדים לא פעילים</label>
        </div>
        <div className="space-y-4 md:col-span-2">
          {!cur ? <Empty>אין עובדים</Empty> : (<>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><h2 className="text-lg font-bold">{cur.name}</h2><div className="text-sm text-slate-500">{cur.title || ROLE[cur.role]}</div></div>
                {admin && <div className="flex gap-2">
                  <Btn v="outline" sm onClick={() => setEdit(cur)}><Pencil size={13} />עריכה</Btn>
                  {cur.id !== me.id && <Btn v="outline" sm onClick={() => { patch('users', cur.id, { active: cur.active === false }); toast(cur.active === false ? 'העובד הופעל מחדש' : 'העובד סומן כלא פעיל') }}>{cur.active === false ? <><UserCheck size={13} />הפעל</> : <><UserX size={13} />השבת</>}</Btn>}
                </div>}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                {cur.phone && <span className="flex items-center gap-1.5" dir="ltr"><Phone size={14} />{cur.phone}</span>}
                {cur.email && <span className="flex items-center gap-1.5" dir="ltr"><Mail size={14} />{cur.email}</span>}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                {[['משימות פתוחות', load(cur).open, ''], ['באיחור', load(cur).late, load(cur).late ? 'text-rose-600' : ''], ['בוצעו', load(cur).done, 'text-emerald-700']].map(([l, v, c]) => <div key={l} className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{l}</div><div className={`text-xl font-bold ${c}`}>{v}</div></div>)}
              </div>
              <h3 className="mt-5 mb-2 text-sm font-semibold">פרויקטים משויכים</h3>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {projOf(cur).map((p) => <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-slate-50"><span className="min-w-0 truncate">{p.name}</span><span className="flex shrink-0 items-center gap-2"><Badge>{roleIn(p, cur)}</Badge><span className="font-semibold">{progress(p)}%</span></span></Link>)}
                {!projOf(cur).length && <div className="p-3 text-sm text-slate-500">לא משויך לפרויקטים פעילים. השיוך נעשה בכרטיס הפרויקט, בלשונית סקירה.</div>}
              </div>
            </Card>
            <div className="flex items-center justify-between"><h3 className="font-semibold">המשימות של {cur.name.split(' ')[0]}</h3>{cur.active !== false && <Btn sm onClick={() => setTask(true)}><Plus size={14} />הקצה משימה</Btn>}</div>
            <TaskList tasks={tasks.filter((t) => t.assigneeId === cur.id)} />
          </>)}
        </div>
      </div>
      {edit !== undefined && <EmployeeModal user={edit} onClose={() => setEdit(undefined)} />}
      {task && cur && <TaskModal assigneeId={cur.id} onClose={() => setTask(false)} />}
    </div>
  )
}

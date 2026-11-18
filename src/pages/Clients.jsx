import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useCol, add, patch } from '../lib/db'
import { fin, money, progress } from '../lib/util'
import { Badge, Btn, Card, Empty, Field, Input, Modal, Select, Textarea, useMe, toast } from '../ui'

function ClientModal({ client, onClose }) {
  const [c, setC] = useState(client || { name: '', type: 'תאגיד מים', notes: '', contacts: [{ name: '', role: '', phone: '', email: '' }] })
  const setCt = (i, k, v) => setC({ ...c, contacts: c.contacts.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })
  const save = () => {
    if (!c.name.trim()) return toast('חסר שם לקוח')
    const data = { ...c, contacts: c.contacts.filter((x) => x.name.trim()) }
    if (client) patch('clients', client.id, data); else add('clients', data)
    onClose()
  }
  return (
    <Modal title={client ? 'עריכת לקוח' : 'לקוח חדש'} wide onClose={onClose} footer={<><Btn v="outline" onClick={onClose}>ביטול</Btn><Btn onClick={save}>שמור</Btn></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="שם הלקוח"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} autoFocus /></Field>
        <Field label="סוג"><Select value={c.type} onChange={(e) => setC({ ...c, type: e.target.value })} options={['חברה ממשלתית', 'תאגיד מים', 'רשות מקומית', 'חברה כלכלית', 'פרטי']} /></Field>
        <Field label="הערות" className="sm:col-span-2"><Textarea rows={2} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} /></Field>
      </div>
      <div className="mt-4 mb-2 text-sm font-semibold">אנשי קשר</div>
      <div className="space-y-2">
        {c.contacts.map((ct, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <Input placeholder="שם" value={ct.name} onChange={(e) => setCt(i, 'name', e.target.value)} />
            <Input placeholder="תפקיד" value={ct.role} onChange={(e) => setCt(i, 'role', e.target.value)} />
            <Input placeholder="טלפון" value={ct.phone} onChange={(e) => setCt(i, 'phone', e.target.value)} />
            <Input placeholder="מייל" value={ct.email} onChange={(e) => setCt(i, 'email', e.target.value)} />
            <Btn v="danger" sm onClick={() => setC({ ...c, contacts: c.contacts.filter((_, j) => j !== i) })}><Trash2 size={14} /></Btn>
          </div>
        ))}
      </div>
      <Btn v="ghost" sm className="mt-2" onClick={() => setC({ ...c, contacts: [...c.contacts, { name: '', role: '', phone: '', email: '' }] })}><Plus size={14} />איש קשר</Btn>
    </Modal>
  )
}

export default function Clients() {
  const { me } = useMe()
  const clients = useCol('clients')
  const projects = useCol('projects')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const [edit, setEdit] = useState(undefined)
  const list = clients.filter((c) => c.name.includes(q))
  const cur = clients.find((c) => c.id === sel) || list[0]
  const mine = cur ? projects.filter((p) => p.clientId === cur.id) : []
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">לקוחות</h1><Btn onClick={() => setEdit(null)}><Plus size={16} />לקוח חדש</Btn></div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Input placeholder="חיפוש לקוח" value={q} onChange={(e) => setQ(e.target.value)} />
          {list.map((c) => {
            const ps = projects.filter((p) => p.clientId === c.id)
            const debt = ps.reduce((a, p) => a + fin(p).toCollect, 0)
            return (
              <Card key={c.id} onClick={() => setSel(c.id)} className={`cursor-pointer p-3 ${cur?.id === c.id ? 'border-sky-500 ring-1 ring-sky-500' : 'hover:border-sky-300'}`}>
                <div className="font-semibold">{c.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{c.type} · {ps.filter((p) => p.stage !== 'סגור').length} פרויקטים פעילים</div>
                {me.role === 'admin' && debt > 0 && <div className="mt-1 text-xs font-medium text-amber-700">יתרה פתוחה: {money(debt)}</div>}
              </Card>
            )
          })}
        </div>
        <div className="md:col-span-2">
          {!cur ? <Empty>אין לקוחות</Empty> : (
            <Card className="p-5">
              <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">{cur.name}</h2><div className="text-sm text-slate-500">{cur.type}</div></div><Btn v="outline" sm onClick={() => setEdit(cur)}><Pencil size={13} />עריכה</Btn></div>
              {cur.notes && <p className="mt-2 text-sm text-slate-600">{cur.notes}</p>}
              <h3 className="mt-5 mb-2 text-sm font-semibold">אנשי קשר</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {(cur.contacts || []).map((ct, i) => <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm"><div className="font-medium">{ct.name}</div><div className="text-xs text-slate-500">{ct.role}</div><div className="mt-1 text-xs text-slate-600" dir="ltr">{ct.phone} · {ct.email}</div></div>)}
              </div>
              <h3 className="mt-5 mb-2 text-sm font-semibold">פרויקטים ({mine.length})</h3>
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {mine.map((p) => <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-slate-50"><span className="truncate">{p.name}</span><span className="flex shrink-0 items-center gap-2"><Badge tone="blue">{p.stage}</Badge><span className="font-semibold">{progress(p)}%</span></span></Link>)}
                {!mine.length && <div className="p-3 text-sm text-slate-500">אין פרויקטים</div>}
              </div>
              {me.role === 'admin' && mine.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  {[['היקף חוזים', 'contract'], ['שולם', 'paid'], ['יתרה לגבייה', 'toCollect']].map(([l, k]) => <div key={k} className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{l}</div><div className="font-bold">{money(mine.reduce((a, p) => a + fin(p)[k], 0))}</div></div>)}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
      {edit !== undefined && <ClientModal client={edit} onClose={() => setEdit(undefined)} />}
    </div>
  )
}

import { useState } from 'react'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import { patch } from '../../lib/db'
import { INV_ST, fin, money, progress, fmtDate, today } from '../../lib/util'
import { Btn, Card, Field, Input, Modal, Progress, Select, Stat, toast } from '../../ui'

export default function Finance({ p }) {
  const f = p.finance || { contract: 0, milestones: [], invoices: [] }
  const s = fin(p)
  const pr = progress(p)
  const gap = pr - s.billedPct
  const [inv, setInv] = useState(null)
  const save = (x) => patch('projects', p.id, { finance: { ...f, ...x } })
  const earned = (f.milestones || []).filter((m) => m.done).reduce((a, m) => a + (f.contract * m.pct) / 100, 0)
  const addInv = () => {
    if (!inv.num || !Number(inv.amount)) return toast('חסר מספר חשבון או סכום')
    save({ invoices: [...(f.invoices || []), { id: 'i' + Date.now(), ...inv, amount: Number(inv.amount) }] }); setInv(null)
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="היקף חוזה שכר טרחה" value={money(s.contract)} sub={`אופן חיוב: ${f.billing || '—'}`} />
        <Stat label="הוגש / חויב" value={money(s.billed)} sub={`${s.billedPct}% מהחוזה`} />
        <Stat label="שולם" value={money(s.paid)} tone="text-emerald-700" />
        <Stat label="יתרה לגבייה" value={money(s.toCollect)} tone={s.toCollect ? 'text-amber-600' : undefined} sub={`נותר לחייב: ${money(s.toBill)}`} />
      </div>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">התקדמות הנדסית מול התקדמות כספית</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3"><span className="w-28 text-slate-600">ביצוע בשטח</span><Progress value={pr} /><b className="w-10 text-end">{pr}%</b></div>
          <div className="flex items-center gap-3"><span className="w-28 text-slate-600">חויב ללקוח</span><Progress value={s.billedPct} tone="bg-emerald-500" /><b className="w-10 text-end">{s.billedPct}%</b></div>
        </div>
        {gap >= 25 && <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle size={16} className="mt-0.5 shrink-0" />פער של {gap} נקודות אחוז: הביצוע התקדם והחיוב לא. כדאי להוציא חשבון.</div>}
        {earned > s.billed && <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">אבני דרך שהושלמו מזכות ב-{money(earned)}, וחויבו עד כה {money(s.billed)}. ניתן לחייב {money(earned - s.billed)} נוספים.</div>}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">אבני דרך לתשלום</h3>
          {(f.milestones || []).map((m, i) => (
            <label key={i} className="flex items-center gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
              <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={!!m.done} onChange={(e) => save({ milestones: f.milestones.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)) })} />
              <span className={`flex-1 ${m.done ? '' : 'text-slate-500'}`}>{m.name}</span><span className="text-slate-500">{m.pct}%</span><b className="w-24 text-end">{money((f.contract * m.pct) / 100)}</b>
            </label>
          ))}
          <Field label="היקף החוזה (₪)" className="mt-3"><Input type="number" defaultValue={f.contract} onBlur={(e) => Number(e.target.value) !== f.contract && save({ contract: Number(e.target.value) })} /></Field>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold">חשבונות ללקוח</h3><Btn sm onClick={() => setInv({ num: '', date: today(), amount: '', status: 'submitted' })}><Plus size={14} />חשבון</Btn></div>
          {(f.invoices || []).map((x) => (
            <div key={x.id} className="flex items-center gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
              <div className="min-w-0 flex-1"><div className="font-medium">חשבון {x.num}</div><div className="text-xs text-slate-500">{fmtDate(x.date)}</div></div>
              <b>{money(x.amount)}</b>
              <div className="w-24"><Select value={x.status} onChange={(e) => save({ invoices: f.invoices.map((y) => (y.id === x.id ? { ...y, status: e.target.value } : y)) })} options={INV_ST} /></div>
              <button className="text-slate-300 hover:text-rose-600" onClick={() => save({ invoices: f.invoices.filter((y) => y.id !== x.id) })}><Trash2 size={14} /></button>
            </div>
          ))}
          {!(f.invoices || []).length && <div className="text-sm text-slate-500">טרם הוצאו חשבונות</div>}
        </Card>
      </div>
      {inv && (
        <Modal title="חשבון חדש ללקוח" onClose={() => setInv(null)} footer={<><Btn v="outline" onClick={() => setInv(null)}>ביטול</Btn><Btn onClick={addInv}>הוסף</Btn></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="מספר חשבון"><Input value={inv.num} onChange={(e) => setInv({ ...inv, num: e.target.value })} autoFocus /></Field>
            <Field label="תאריך"><Input type="date" value={inv.date} onChange={(e) => setInv({ ...inv, date: e.target.value })} /></Field>
            <Field label="סכום (₪)"><Input type="number" value={inv.amount} onChange={(e) => setInv({ ...inv, amount: e.target.value })} /></Field>
            <Field label="סטטוס"><Select value={inv.status} onChange={(e) => setInv({ ...inv, status: e.target.value })} options={INV_ST} /></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}

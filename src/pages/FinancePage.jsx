import { Link } from 'react-router-dom'
import { useCol } from '../lib/db'
import { fin, money, progress, fmtDate, INV_ST } from '../lib/util'
import { Badge, Card, Progress, Stat } from '../ui'

export default function FinancePage() {
  const projects = useCol('projects')
  const clients = useCol('clients')
  const tot = projects.reduce((a, p) => { const f = fin(p); return { contract: a.contract + f.contract, billed: a.billed + f.billed, paid: a.paid + f.paid, toCollect: a.toCollect + f.toCollect, toBill: a.toBill + f.toBill } }, { contract: 0, billed: 0, paid: 0, toCollect: 0, toBill: 0 })
  const pending = projects.flatMap((p) => (p.finance?.invoices || []).filter((i) => ['submitted', 'approved'].includes(i.status)).map((i) => ({ ...i, p })))
    .sort((a, b) => a.date.localeCompare(b.date))
  const days = (d) => Math.round((Date.now() - new Date(d).getTime()) / 864e5)
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">כספים – התקדמות מול הלקוחות</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="היקף חוזים" value={money(tot.contract)} />
        <Stat label="חויב עד היום" value={money(tot.billed)} sub={`${tot.contract ? Math.round((tot.billed / tot.contract) * 100) : 0}% מהחוזים`} />
        <Stat label="שולם" value={money(tot.paid)} tone="text-emerald-700" />
        <Stat label="יתרה לגבייה" value={money(tot.toCollect)} tone="text-amber-600" sub={`נותר לחייב: ${money(tot.toBill)}`} />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr>
            <th className="px-4 py-2 text-start">פרויקט</th><th className="px-3 py-2 text-start">לקוח</th><th className="px-3 py-2 text-start">חוזה</th><th className="px-3 py-2 text-start">התקדמות הנדסית מול חיוב</th><th className="px-3 py-2 text-start">שולם</th><th className="px-3 py-2 text-start">לגבייה</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((p) => {
              const f = fin(p); const pr = progress(p); const gap = pr - f.billedPct
              return (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5"><Link className="font-medium hover:text-sky-700" to={`/projects/${p.id}/finance`}>{p.name}</Link></td>
                  <td className="px-3 py-2.5 text-slate-600">{clients.find((c) => c.id === p.clientId)?.name}</td>
                  <td className="px-3 py-2.5">{money(f.contract)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 text-xs"><span className="w-10 text-slate-500">ביצוע</span><Progress value={pr} className="max-w-32" /><span className="w-9">{pr}%</span></div>
                    <div className="mt-1 flex items-center gap-2 text-xs"><span className="w-10 text-slate-500">חיוב</span><Progress value={f.billedPct} tone="bg-emerald-500" className="max-w-32" /><span className="w-9">{f.billedPct}%</span>{gap >= 25 && <Badge tone="red">פער {gap}%</Badge>}</div>
                  </td>
                  <td className="px-3 py-2.5 text-emerald-700">{money(f.paid)}</td>
                  <td className="px-3 py-2.5 font-semibold text-amber-700">{money(f.toCollect)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <div>
        <h2 className="mb-2 font-semibold">חשבונות שטרם שולמו, לפי ותק</h2>
        <Card className="divide-y divide-slate-100">
          {pending.map((i) => (
            <div key={i.p.id + i.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
              <span className="font-medium">חשבון {i.num}</span><span className="min-w-0 flex-1 truncate text-slate-600">{i.p.name}</span>
              <span className="text-slate-500">{fmtDate(i.date)} · {days(i.date)} ימים</span><Badge st={i.status}>{INV_ST[i.status]}</Badge><span className="w-24 text-end font-semibold">{money(i.amount)}</span>
            </div>
          ))}
          {!pending.length && <div className="p-4 text-sm text-slate-500">אין חשבונות פתוחים</div>}
        </Card>
      </div>
    </div>
  )
}

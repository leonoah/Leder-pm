import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown, Copy, X } from 'lucide-react'
import { useCol, add, patch, del } from '../lib/db'
import { TYPES } from '../lib/util'
import { Badge, Btn, Card, Empty, Field, Input, Modal, Tabs, toast } from '../ui'

const KIND = { defects: 'סיור פיקוח ודוח ליקויים', escort: 'ליווי הנדסי' }

function Editor({ tpl, kind, onClose }) {
  const [t, setT] = useState(tpl || { kind, name: '', ptypes: [], sections: [{ name: kind === 'escort' ? 'תכנון' : 'כללי', items: [''] }] })
  const setSec = (i, fn) => setT({ ...t, sections: t.sections.map((s, j) => (j === i ? fn(s) : s)) })
  const move = (arr, i, d) => { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a }
  const save = () => {
    if (!t.name.trim()) return toast('חסר שם לתבנית')
    const data = { ...t, sections: t.sections.map((s) => ({ ...s, items: s.items.map((x) => x.trim()).filter(Boolean) })).filter((s) => s.name.trim() && s.items.length) }
    if (!data.sections.length) return toast('יש להוסיף לפחות סעיף אחד')
    if (tpl?.id) patch('templates', tpl.id, data); else add('templates', data)
    toast('התבנית נשמרה'); onClose()
  }
  return (
    <Modal title={tpl?.id ? 'עריכת תבנית' : 'תבנית חדשה'} wide onClose={onClose} footer={<><Btn v="outline" onClick={onClose}>ביטול</Btn><Btn onClick={save}>שמור תבנית</Btn></>}>
      <Field label="שם התבנית"><Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} autoFocus placeholder="לדוגמה: בריכת מים – סיור פיקוח" /></Field>
      <div className="mt-3 text-xs font-medium text-slate-600">סוגי פרויקט שהתבנית נטענת בהם</div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {TYPES.map((ty) => { const on = t.ptypes.includes(ty); return <button key={ty} onClick={() => setT({ ...t, ptypes: on ? t.ptypes.filter((x) => x !== ty) : [...t.ptypes, ty] })} className={`rounded-full border px-3 py-1 text-xs ${on ? 'border-sky-700 bg-sky-700 text-white' : 'border-slate-300 text-slate-600'}`}>{ty}</button> })}
      </div>
      <div className="mt-4 space-y-3">
        {t.sections.map((s, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-3">
            <div className="flex items-center gap-2">
              <Input value={s.name} onChange={(e) => setSec(i, (x) => ({ ...x, name: e.target.value }))} placeholder={kind === 'escort' ? 'שם השלב' : 'שם הקטגוריה'} />
              <Btn v="ghost" sm onClick={() => setT({ ...t, sections: move(t.sections, i, -1) })}><ArrowUp size={14} /></Btn>
              <Btn v="ghost" sm onClick={() => setT({ ...t, sections: move(t.sections, i, 1) })}><ArrowDown size={14} /></Btn>
              <Btn v="danger" sm onClick={() => setT({ ...t, sections: t.sections.filter((_, j) => j !== i) })}><Trash2 size={14} /></Btn>
            </div>
            <div className="mt-2 space-y-1.5 ps-3">
              {s.items.map((it, k) => (
                <div key={k} className="flex items-center gap-1.5">
                  <Input value={it} placeholder="סעיף" onChange={(e) => setSec(i, (x) => ({ ...x, items: x.items.map((y, m) => (m === k ? e.target.value : y)) }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') setSec(i, (x) => ({ ...x, items: [...x.items.slice(0, k + 1), '', ...x.items.slice(k + 1)] })) }} />
                  <button className="p-1 text-slate-400 hover:text-slate-700" onClick={() => setSec(i, (x) => ({ ...x, items: move(x.items, k, -1) }))}><ArrowUp size={13} /></button>
                  <button className="p-1 text-slate-400 hover:text-slate-700" onClick={() => setSec(i, (x) => ({ ...x, items: move(x.items, k, 1) }))}><ArrowDown size={13} /></button>
                  <button className="p-1 text-slate-400 hover:text-rose-600" onClick={() => setSec(i, (x) => ({ ...x, items: x.items.filter((_, m) => m !== k) }))}><X size={13} /></button>
                </div>
              ))}
              <Btn v="ghost" sm onClick={() => setSec(i, (x) => ({ ...x, items: [...x.items, ''] }))}><Plus size={13} />סעיף</Btn>
            </div>
          </div>
        ))}
      </div>
      <Btn v="outline" sm className="mt-3" onClick={() => setT({ ...t, sections: [...t.sections, { name: '', items: [''] }] })}><Plus size={14} />{kind === 'escort' ? 'שלב' : 'קטגוריה'}</Btn>
    </Modal>
  )
}

export default function Templates() {
  const templates = useCol('templates')
  const [kind, setKind] = useState('defects')
  const [edit, setEdit] = useState(undefined)
  const list = templates.filter((t) => t.kind === kind)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">תבניות</h1><Btn onClick={() => setEdit(null)}><Plus size={16} />תבנית חדשה</Btn></div>
      <p className="text-sm text-slate-600">תבנית נטענת אוטומטית לפרויקט לפי סוג הפרויקט. שינוי בתבנית משפיע על סיורים ופרויקטים חדשים בלבד.</p>
      <Tabs value={kind} onChange={setKind} tabs={Object.entries(KIND)} />
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between gap-2"><div className="font-semibold">{t.name}</div><div className="flex gap-1">
              <Btn v="ghost" sm onClick={() => setEdit({ ...t, id: undefined, name: t.name + ' (עותק)' })}><Copy size={13} />שכפל</Btn>
              <Btn v="danger" sm onClick={() => confirm('למחוק את התבנית?') && del('templates', t.id)}><Trash2 size={13} /></Btn></div></div>
            <div className="mt-2 flex flex-wrap gap-1.5">{(t.ptypes || []).map((p) => <Badge key={p} tone="blue">{p}</Badge>)}</div>
            <div className="mt-3 space-y-1 text-xs text-slate-600">{t.sections.map((s) => <div key={s.name}><b>{s.name}:</b> {s.items.join(' · ')}</div>)}</div>
            <Btn v="outline" sm className="mt-3" onClick={() => setEdit(t)}>עריכה</Btn>
          </Card>
        ))}
      </div>
      {!list.length && <Empty>אין תבניות מסוג זה</Empty>}
      {edit !== undefined && <Editor key={edit?.id || 'new'} tpl={edit} kind={kind} onClose={() => setEdit(undefined)} />}
    </div>
  )
}

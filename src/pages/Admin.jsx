import { useRef, useState } from 'react'
import { DatabaseBackup, Download, Upload, RotateCcw, Trash2, History, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useCol, useDbState, useDoc, COLS, snapshot, validSnapshot, createBackup, loadBackup, deleteBackup, restoreSnapshot, resetDemo, saveSettings } from '../lib/db'
import { fmtTime } from '../lib/util'
import { Badge, Btn, Card, Empty, Input, Select, Stat, Tabs, toast } from '../ui'

const COL_HE = { users: 'עובדים', clients: 'לקוחות', projects: 'פרויקטים', tasks: 'משימות', visits: 'סיורים', defects: 'ליקויים', templates: 'תבניות', protocols: 'פרוטוקולים', messages: 'הודעות בערוצים', system: 'מערכת' }
const ACT = { create: ['נוצר', 'green'], update: ['עודכן', 'blue'], delete: ['נמחק', 'red'], backup: ['גיבוי', 'amber'], restore: ['שחזור', 'amber'], reset: ['איפוס', 'red'] }
const kb = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1000)) + ' KB')
const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }
const stamp = (t) => new Date(t).toISOString().slice(0, 16).replace(/[T:]/g, '-')

function Backups() {
  const backups = [...useCol('backups')].sort((a, b) => b.at - a.at)
  const settings = useDoc('settings', 'main') || { autoBackup: true, keep: 7 }
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const fref = useRef()
  const run = async (label, fn) => { setBusy(label); try { await fn() } catch (e) { console.error(e); toast('שגיאה: ' + (e.message || e)) } setBusy('') }
  const safeRestore = (snap, label) => run('משחזר…', async () => {
    await createBackup('גיבוי בטיחות לפני שחזור', true)
    await restoreSnapshot(snap, label)
    toast('השחזור הושלם')
  })
  const fromFile = async (e) => {
    const f = e.target.files[0]; e.target.value = ''
    if (!f) return
    let snap
    try { snap = JSON.parse(await f.text()) } catch { return toast('הקובץ אינו קובץ גיבוי תקין') }
    if (!validSnapshot(snap)) return toast('הקובץ אינו קובץ גיבוי של המערכת')
    if (confirm(`לשחזר את הנתונים מהגיבוי של ${fmtTime(snap.at)}?\nכל הנתונים הנוכחיים יוחלפו. לפני השחזור יישמר גיבוי בטיחות.`)) safeRestore(snap, `שחזור מקובץ (${fmtTime(snap.at)})`)
  }
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">גיבוי חדש</h3>
        <div className="flex flex-wrap gap-2">
          <div className="min-w-48 flex-1"><Input placeholder="הערה לגיבוי (לא חובה)" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <Btn disabled={!!busy} onClick={() => run('מגבה…', async () => { await createBackup(note.trim()); setNote(''); toast('הגיבוי נשמר') })}><DatabaseBackup size={15} />צור גיבוי עכשיו</Btn>
          <Btn v="outline" onClick={() => { const s = snapshot(); download(`leder-backup-${stamp(s.at)}.json`, JSON.stringify(s)); toast('קובץ הגיבוי ירד למחשב') }}><Download size={15} />הורד לקובץ</Btn>
          <input ref={fref} type="file" accept="application/json,.json" hidden onChange={fromFile} />
          <Btn v="outline" disabled={!!busy} onClick={() => fref.current.click()}><Upload size={15} />שחזר מקובץ</Btn>
        </div>
        {busy && <div className="text-sm text-sky-700">{busy}</div>}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-sky-700" checked={settings.autoBackup !== false} onChange={(e) => saveSettings({ ...settings, autoBackup: e.target.checked })} />גיבוי אוטומטי יומי</label>
          <span className="text-slate-500">שמירת</span>
          <div className="w-20"><Select value={String(settings.keep || 7)} onChange={(e) => saveSettings({ ...settings, keep: Number(e.target.value) })} options={['3', '7', '14', '30']} /></div>
          <span className="text-slate-500">גיבויים אוטומטיים אחרונים</span>
        </div>
        <p className="text-xs text-slate-500">ב-demo הגיבוי האוטומטי נוצר כשמנהל המשרד פותח את המערכת ועברו יותר מ-24 שעות מהגיבוי האחרון. בגרסה מלאה הוא ירוץ בשרת בשעה קבועה, גם כשאף אחד לא מחובר.</p>
      </Card>
      <Card className="divide-y divide-slate-100">
        {backups.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-medium">{fmtTime(b.at)}<Badge tone={b.auto ? 'gray' : 'blue'}>{b.auto ? 'אוטומטי' : 'ידני'}</Badge></div>
              <div className="text-xs text-slate-500">{b.note || 'ללא הערה'} · {b.by} · <span dir="ltr">{kb(b.size)}</span> · {b.counts?.projects} פרויקטים, {b.counts?.tasks} משימות, {b.counts?.defects} ליקויים</div>
            </div>
            <div className="flex gap-1.5">
              <Btn v="outline" sm disabled={!!busy} onClick={() => confirm(`לשחזר את המערכת למצב של ${fmtTime(b.at)}?\nכל הנתונים הנוכחיים יוחלפו. לפני השחזור יישמר גיבוי בטיחות.`) && run('טוען גיבוי…', async () => safeRestore(await loadBackup(b.id), `שחזור מגיבוי ${fmtTime(b.at)}`))}><RotateCcw size={13} />שחזר</Btn>
              <Btn v="outline" sm onClick={() => run('מוריד…', async () => download(`leder-backup-${stamp(b.at)}.json`, JSON.stringify(await loadBackup(b.id))))}><Download size={13} /></Btn>
              <Btn v="danger" sm onClick={() => confirm('למחוק את הגיבוי?') && run('מוחק…', () => deleteBackup(b.id))}><Trash2 size={13} /></Btn>
            </div>
          </div>
        ))}
        {!backups.length && <div className="p-4"><Empty>עדיין אין גיבויים</Empty></div>}
      </Card>
    </div>
  )
}

function ActivityLog() {
  const log = [...useCol('log')].sort((a, b) => b.at - a.at)
  const [who, setWho] = useState('')
  const [col, setCol] = useState('')
  const people = [...new Set(log.map((l) => l.by))]
  const list = log.filter((l) => (!who || l.by === who) && (!col || l.col === col)).slice(0, 150)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Select value={who} onChange={(e) => setWho(e.target.value)} placeholder="כל המשתמשים" options={people} />
        <Select value={col} onChange={(e) => setCol(e.target.value)} placeholder="כל סוגי הנתונים" options={COL_HE} />
      </div>
      <Card className="divide-y divide-slate-100">
        {list.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
            <span className="w-28 text-xs text-slate-500">{fmtTime(l.at)}</span>
            <b className="w-28 truncate">{l.by}</b>
            <Badge tone={ACT[l.action]?.[1]}>{ACT[l.action]?.[0] || l.action}</Badge>
            <span className="text-slate-500">{COL_HE[l.col] || l.col}</span>
            <span className="min-w-0 flex-1 truncate text-slate-700">{l.label}</span>
          </div>
        ))}
        {!list.length && <div className="p-4 text-sm text-slate-500">אין פעילות מתועדת עדיין. כל יצירה, עדכון ומחיקה נרשמים כאן מרגע זה.</div>}
      </Card>
      <p className="text-xs text-slate-500">מוצגות עד 150 הרשומות האחרונות. הודעות צ'אט אינן נרשמות ביומן.</p>
    </div>
  )
}

export default function Admin() {
  const db = useDbState()
  const backups = useCol('backups')
  const log = useCol('log')
  const counts = Object.fromEntries(COLS.map((c) => [c, useCol(c).length])) // eslint-disable-line
  const [tab, setTab] = useState('backups')
  const last = backups.length ? Math.max(...backups.map((b) => b.at)) : 0
  const stale = !last || Date.now() - last > 7 * 864e5
  const today = log.filter((l) => Date.now() - l.at < 864e5).length
  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="text-sky-700" size={22} />פאנל בקרה</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="בסיס הנתונים" value={db.backend === 'firebase' ? 'Firestore' : 'מקומי'} tone={db.backend === 'firebase' ? 'text-emerald-700' : 'text-amber-600'} sub={db.backend === 'firebase' ? 'מחובר ומסונכרן' : 'נשמר בדפדפן זה בלבד'} />
        <Stat label="גיבוי אחרון" value={last ? fmtTime(last) : 'אין'} tone={stale ? 'text-rose-600' : undefined} sub={`${backups.length} גיבויים שמורים`} />
        <Stat label="פעולות ב-24 שעות" value={today} sub="מתוך יומן הפעילות" />
        <Stat label="רשומות במערכת" value={Object.values(counts).reduce((a, b) => a + b, 0)} sub={`${counts.projects} פרויקטים · ${counts.users} עובדים`} />
      </div>
      {stale && <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{last ? 'עבר יותר משבוע מהגיבוי האחרון.' : 'עדיין לא נוצר גיבוי.'} מומלץ ליצור גיבוי עכשיו.</div>}
      {db.error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">החיבור ל-Firestore נכשל והמערכת עובדת על נתונים מקומיים: {db.error}</div>}
      <Tabs value={tab} onChange={setTab} tabs={[['backups', 'גיבויים ושחזור'], ['log', 'יומן פעילות'], ['data', 'נתונים']]} />
      {tab === 'backups' && <Backups />}
      {tab === 'log' && <ActivityLog />}
      {tab === 'data' && (
        <div className="space-y-4">
          <Card className="grid grid-cols-2 gap-px overflow-hidden bg-slate-100 sm:grid-cols-3">
            {COLS.map((c) => <div key={c} className="bg-white p-4"><div className="text-xs text-slate-500">{COL_HE[c]}</div><div className="text-xl font-bold">{counts[c]}</div></div>)}
          </Card>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm"><b>איפוס נתוני דוגמה</b><div className="text-xs text-slate-500">מוחק את כל הנתונים העסקיים ומחזיר את נתוני ההדגמה המקוריים. גיבויים ויומן הפעילות נשמרים.</div></div>
            <Btn v="danger" onClick={async () => { if (confirm('לאפס את כל הנתונים לנתוני הדוגמה? מומלץ ליצור גיבוי לפני כן.')) { await resetDemo(); toast('נתוני הדוגמה אופסו') } }}><History size={15} />איפוס</Btn>
          </Card>
        </div>
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { HashRouter, Routes, Route, NavLink, Outlet, Navigate } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, CheckSquare, Users, FileStack, Wallet, UserCog, ShieldCheck, Menu } from 'lucide-react'
import { useCol, useDbState, useDoc, setActor, createBackup, deleteBackup } from './lib/db'
import { ROLE } from './lib/util'
import { MeCtx, useMe, Toaster, Logo } from './ui'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Project from './pages/Project'
import Clients from './pages/Clients'
import TasksPage from './pages/Tasks'
import Templates from './pages/Templates'
import FinancePage from './pages/FinancePage'
import ChannelPublic from './pages/ChannelPublic'
import Employees from './pages/Employees'
import Admin from './pages/Admin'

const NAV = [
  ['/', 'לוח בקרה', LayoutDashboard, ['admin', 'pm', 'inspector']],
  ['/projects', 'פרויקטים', FolderKanban, ['admin', 'pm', 'inspector']],
  ['/tasks', 'משימות', CheckSquare, ['admin', 'pm', 'inspector']],
  ['/employees', 'עובדים', UserCog, ['admin', 'pm']],
  ['/clients', 'לקוחות', Users, ['admin', 'pm']],
  ['/templates', 'תבניות', FileStack, ['admin', 'pm']],
  ['/finance', 'כספים', Wallet, ['admin']],
  ['/admin', 'פאנל בקרה', ShieldCheck, ['admin']],
]

function Layout() {
  const { me, setMeId } = useMe()
  const users = useCol('users')
  const db = useDbState()
  const [more, setMore] = useState(false)
  const nav = NAV.filter((n) => n[3].includes(me.role))
  const link = ({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-sky-700 text-white' : 'text-slate-200 hover:bg-slate-700'}`
  const mlink = ({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-sky-700 font-semibold' : 'text-slate-500'}`
  return (
    <div className="flex h-full">
      <aside className="hidden w-56 shrink-0 flex-col bg-slate-800 p-3 md:flex no-print">
        <div className="mb-4 rounded-xl bg-white px-3 py-3"><Logo className="h-10 mx-auto" /><div className="mt-1.5 text-center text-[11px] text-slate-500">מערכת ניהול פרויקטים · Demo</div></div>
        <nav className="space-y-1">{nav.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={link}><Icon size={17} />{label}</NavLink>)}</nav>
        <div className="mt-auto space-y-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 px-2"><span className={`h-2 w-2 rounded-full ${db.backend === 'firebase' ? 'bg-emerald-400' : 'bg-amber-400'}`} />{db.backend === 'firebase' ? 'מחובר ל-Firestore' : 'נתונים מקומיים בדפדפן'}</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5 safe-t sm:px-4 no-print">
          <div className="md:hidden"><Logo className="h-8" /></div>
          <div className="hidden text-xs text-slate-500 md:block">נתוני הדגמה – שמות הפרויקטים אמיתיים, כל השאר בדוי</div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline">מציג כ:</span>
            <select value={me.id} onChange={(e) => setMeId(e.target.value)} aria-label="מציג כ" className="max-w-[46vw] truncate rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium text-slate-800">
              {users.filter((u) => u.active !== false || u.id === me.id).map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE[u.role]}</option>)}
            </select>
          </label>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-28 sm:p-4 sm:pb-28 md:p-6 md:pb-6"><div className="mx-auto min-w-0 max-w-6xl"><Outlet /></div></main>
        <nav className="fixed inset-x-0 bottom-0 z-[900] flex border-t border-slate-200 bg-white safe-b md:hidden no-print">
          {(nav.length > 5 ? nav.slice(0, 4) : nav).map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} className={mlink} onClick={() => setMore(false)}><Icon size={20} />{label}</NavLink>)}
          {nav.length > 5 && <button onClick={() => setMore(!more)} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${more ? 'font-semibold text-sky-700' : 'text-slate-500'}`}><Menu size={20} />עוד</button>}
        </nav>
        {more && (
          <div className="fixed inset-0 z-[890] bg-slate-900/40 md:hidden" onClick={() => setMore(false)}>
            <div className="absolute inset-x-0 bottom-14 rounded-t-2xl bg-white p-3 pb-5 shadow-xl safe-b" onClick={(e) => e.stopPropagation()}>
              <div className="grid grid-cols-2 gap-2">
                {nav.slice(4).map(([to, label, Icon]) => <NavLink key={to} to={to} onClick={() => setMore(false)} className={({ isActive }) => `flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium ${isActive ? 'border-sky-600 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-700'}`}><Icon size={18} />{label}</NavLink>)}
              </div>
              <div className="mt-3 flex items-center gap-1.5 px-1 text-xs text-slate-500"><span className={`h-2 w-2 rounded-full ${db.backend === 'firebase' ? 'bg-emerald-500' : 'bg-amber-400'}`} />{db.backend === 'firebase' ? 'מחובר ל-Firestore' : 'נתונים מקומיים בדפדפן'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const db = useDbState()
  const users = useCol('users')
  const [meId, setMeIdRaw] = useState(() => { try { return localStorage.getItem('leder-me') || 'u1' } catch { return 'u1' } })
  const setMeId = (id) => { setMeIdRaw(id); try { localStorage.setItem('leder-me', id) } catch { /* ignore */ } }
  const me = useMemo(() => users.find((u) => u.id === meId) || users[0], [users, meId])
  const backups = useCol('backups')
  const settings = useDoc('settings', 'main')
  useEffect(() => { if (me) setActor(me.name) }, [me])
  // demo-level automatic backup: runs when the office manager opens the app and the last backup is older than 24h
  useEffect(() => {
    if (!db.ready || me?.role !== 'admin' || settings?.autoBackup === false) return
    const last = backups.length ? Math.max(...backups.map((b) => b.at)) : 0
    if (Date.now() - last < 864e5) return
    const t = setTimeout(async () => {
      try {
        await createBackup('גיבוי אוטומטי יומי', true)
        const old = backups.filter((b) => b.auto).sort((a, b) => b.at - a.at).slice((settings?.keep || 7) - 1)
        for (const b of old) await deleteBackup(b.id)
      } catch (e) { console.warn('auto backup failed', e) }
    }, 4000)
    return () => clearTimeout(t)
  }, [db.ready, me?.id, backups.length, settings?.autoBackup]) // eslint-disable-line
  if (!db.ready || !me) return <div className="flex h-full items-center justify-center text-slate-500">טוען נתונים…</div>
  return (
    <MeCtx.Provider value={{ me, setMeId }}>
      <HashRouter>
        <Routes>
          <Route path="/c/:id" element={<ChannelPublic />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<Project />} />
            <Route path="/projects/:id/:tab" element={<Project />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/employees" element={me.role === 'inspector' ? <Navigate to="/" /> : <Employees />} />
            <Route path="/admin" element={me.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/finance" element={me.role === 'admin' ? <FinancePage /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </HashRouter>
      <Toaster />
    </MeCtx.Provider>
  )
}

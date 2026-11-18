import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { compressImage, TONE } from './lib/util'

export const MeCtx = createContext(null)
export const useMe = () => useContext(MeCtx)

const tones = {
  gray: 'bg-slate-100 text-slate-700', blue: 'bg-sky-100 text-sky-800', amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-emerald-800', red: 'bg-rose-100 text-rose-800',
}
export const Badge = ({ tone, st, children }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone || TONE[st] || 'gray']}`}>{children}</span>
)
export const Card = ({ className = '', children, ...p }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`} {...p}>{children}</div>
)
const btn = {
  primary: 'bg-sky-700 text-white hover:bg-sky-800', ghost: 'text-slate-700 hover:bg-slate-100', outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white',
  danger: 'text-rose-700 hover:bg-rose-50', ok: 'bg-emerald-600 text-white hover:bg-emerald-700',
}
export const Btn = ({ v = 'primary', sm, className = '', children, ...p }) => (
  <button type="button" className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-40 ${sm ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'} ${btn[v]} ${className}`} {...p}>{children}</button>
)
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500'
export const Field = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>
)
export const Input = (p) => <input className={inputCls} {...p} />
export const Textarea = (p) => <textarea rows={3} className={inputCls} {...p} />
export const Select = ({ options, placeholder, ...p }) => (
  <select className={inputCls} {...p}>
    {placeholder != null && <option value="">{placeholder}</option>}
    {(Array.isArray(options) ? options.map((o) => (typeof o === 'string' ? [o, o] : o)) : Object.entries(options)).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
)
export const Progress = ({ value, tone = 'bg-sky-600', className = '' }) => (
  <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
)
export const Empty = ({ children }) => <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</div>
export const Stat = ({ label, value, tone = 'text-slate-900', sub }) => (
  <Card className="p-4"><div className="text-xs text-slate-500">{label}</div><div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>{sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}</Card>
)

export function Modal({ title, onClose, children, wide, footer }) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 no-print">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="סגור"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3 no-print">{footer}</div>}
      </div>
    </div>
  )
}

export function ImgPick({ onPick, label = 'צלם / צרף תמונה', sm = true }) {
  const ref = useRef()
  return (
    <>
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const f = e.target.files[0]; if (f) onPick(await compressImage(f)); e.target.value = '' }} />
      <Btn v="outline" sm={sm} onClick={() => ref.current.click()}><Camera size={14} />{label}</Btn>
    </>
  )
}
export const Thumbs = ({ imgs = [], onRemove }) => {
  const [open, setOpen] = useState(null)
  if (!imgs.length) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {imgs.map((src, i) => (
        <div key={i} className="relative">
          <img src={src} alt="" onClick={() => setOpen(src)} className="h-16 w-16 cursor-pointer rounded-lg border border-slate-200 object-cover" />
          {onRemove && <button onClick={() => onRemove(i)} className="absolute -top-1.5 -start-1.5 rounded-full bg-slate-800 p-0.5 text-white"><X size={10} /></button>}
        </div>
      ))}
      {open && <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(null)}><img src={open} alt="" className="max-h-full max-w-full rounded-lg" /></div>}
    </div>
  )
}

let pushToast = () => {}
export const toast = (m) => pushToast(m)
export function Toaster() {
  const [msg, setMsg] = useState(null)
  useEffect(() => { pushToast = (m) => { setMsg(m); setTimeout(() => setMsg(null), 2600) } }, [])
  return msg ? <div className="fixed bottom-20 left-1/2 z-[3000] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg md:bottom-6">{msg}</div> : null
}
export const Tabs = ({ tabs, value, onChange }) => (
  <div className="flex gap-1 overflow-x-auto border-b border-slate-200 no-print">
    {tabs.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${value === k ? 'border-sky-700 text-sky-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{l}</button>
    ))}
  </div>
)

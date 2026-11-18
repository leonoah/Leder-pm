// Data layer. Uses Firestore when VITE_FIREBASE_* env vars are set, otherwise localStorage with the same API.
import { useSyncExternalStore } from 'react'
import { buildSeed } from './seed'

const E = import.meta.env
const cfg = {
  apiKey: E.VITE_FIREBASE_API_KEY,
  authDomain: E.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: E.VITE_FIREBASE_PROJECT_ID,
  appId: E.VITE_FIREBASE_APP_ID,
}
// business data (included in backups and in demo reset)
export const COLS = ['users', 'clients', 'projects', 'tasks', 'visits', 'defects', 'templates', 'protocols', 'messages']
// system data (kept across reset / restore)
export const SYS = ['log', 'backups', 'settings']
const ALL = [...COLS, ...SYS]
const PART = 300000 // chars per backup part, keeps each Firestore doc under 1MB
const EMPTY = []
const cache = {}
const subs = new Set()
export const state = { ready: false, backend: 'local', error: null }
let version = 0
let actor = 'מערכת'
export const setActor = (name) => { actor = name }
const emit = () => { version++; subs.forEach((f) => f()) }
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
const clean = (o) => JSON.parse(JSON.stringify(o))
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const toMap = (obj) => { const o = {}; COLS.forEach((c) => { o[c] = {}; (obj[c] || []).forEach((d) => (o[c][d.id] = d)) }); return o }
let api

function makeLocal() {
  const KEY = 'leder-demo-v1'
  let data
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel(KEY) : null
  const persist = (notify = true) => { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch (e) { console.warn('storage full', e) } if (notify) bc?.postMessage(1) }
  const fill = () => { ALL.forEach((c) => { data[c] ||= {}; cache[c] = Object.values(data[c]) }); data.backupParts ||= {}; emit() }
  const load = () => { try { data = JSON.parse(localStorage.getItem(KEY)) } catch { data = null } if (!data) { data = toMap(buildSeed()); persist(false) } fill() }
  const touch = (c) => { cache[c] = Object.values(data[c]); persist(); emit() }
  if (bc) bc.onmessage = () => load()
  window.addEventListener('storage', (e) => { if (e.key === KEY) load() })
  load()
  return {
    set(c, id, d) { data[c][id] = clean(d); touch(c) },
    patch(c, id, d) { data[c][id] = { ...data[c][id], ...clean(d) }; touch(c) },
    del(c, id) { delete data[c][id]; touch(c) },
    async replaceAll(obj) { data = { ...data, ...toMap(obj) }; persist(); fill() },
    async setPart(bid, i, s) { data.backupParts[`${bid}_${i}`] = { backupId: bid, i, data: s }; persist(false) },
    async parts(bid) { return Object.values(data.backupParts).filter((p) => p.backupId === bid).sort((a, b) => a.i - b.i).map((p) => p.data) },
    async delParts(bid) { Object.keys(data.backupParts).forEach((k) => data.backupParts[k].backupId === bid && delete data.backupParts[k]); persist(false) },
  }
}

async function makeFirebase() {
  const { initializeApp } = await import('firebase/app')
  const fs = await import('firebase/firestore')
  const db = fs.getFirestore(initializeApp(cfg))
  const writeAll = async (obj) => {
    const docs = COLS.flatMap((c) => (obj[c] || []).map((d) => [c, d]))
    for (let i = 0; i < docs.length; i += 100) {
      const batch = fs.writeBatch(db)
      docs.slice(i, i + 100).forEach(([c, d]) => batch.set(fs.doc(db, c, d.id), clean(d)))
      await batch.commit()
    }
  }
  const seedDoc = await fs.getDoc(fs.doc(db, 'meta', 'seed'))
  if (!seedDoc.exists()) { await writeAll(buildSeed()); await fs.setDoc(fs.doc(db, 'meta', 'seed'), { at: Date.now() }) }
  await Promise.all(ALL.map((c) => new Promise((res, rej) =>
    fs.onSnapshot(fs.collection(db, c), (snap) => { cache[c] = snap.docs.map((d) => ({ ...d.data(), id: d.id })); emit(); res() }, rej))))
  const partsQ = (bid) => fs.getDocs(fs.query(fs.collection(db, 'backupParts'), fs.where('backupId', '==', bid)))
  return {
    set: (c, id, d) => fs.setDoc(fs.doc(db, c, id), clean(d)),
    patch: (c, id, d) => fs.updateDoc(fs.doc(db, c, id), clean(d)),
    del: (c, id) => fs.deleteDoc(fs.doc(db, c, id)),
    async replaceAll(obj) {
      for (const c of COLS) { const snap = await fs.getDocs(fs.collection(db, c)); await Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref))) }
      await writeAll(obj)
    },
    setPart: (bid, i, s) => fs.setDoc(fs.doc(db, 'backupParts', `${bid}_${i}`), { backupId: bid, i, data: s }),
    async parts(bid) { const snap = await partsQ(bid); return snap.docs.map((d) => d.data()).sort((a, b) => a.i - b.i).map((p) => p.data) },
    async delParts(bid) { const snap = await partsQ(bid); await Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref))) },
  }
}

export async function initDb() {
  if (cfg.projectId) {
    try { api = await makeFirebase(); state.backend = 'firebase' }
    catch (e) { console.error('Firebase init failed, using local data', e); state.error = String(e?.message || e); api = makeLocal() }
  } else api = makeLocal()
  state.ready = true
  emit()
}

const NOLOG = [...SYS, 'messages']
const logIt = (action, c, id, d) => {
  if (NOLOG.includes(c)) return
  const cur = d || (cache[c] || []).find((x) => x.id === id) || {}
  api.set('log', uid(), { at: Date.now(), by: actor, action, col: c, docId: id || '', label: String(cur.name || cur.title || cur.desc || '').slice(0, 80) })
}
export const logEvent = (action, label) => api.set('log', uid(), { at: Date.now(), by: actor, action, col: 'system', docId: '', label })

export const useCol = (c) => useSyncExternalStore(subscribe, () => cache[c] || EMPTY)
export const useDoc = (c, id) => useCol(c).find((d) => d.id === id)
export const useDbState = () => { useSyncExternalStore(subscribe, () => version); return state }
export const add = (c, d) => { const id = d.id || uid(); api.set(c, id, { ...d, id }); logIt('create', c, id, d); return id }
export const patch = (c, id, d) => { logIt('update', c, id); return api.patch(c, id, d) }
export const del = (c, id) => { logIt('delete', c, id); return api.del(c, id) }
export const postMessage = (projectId, viewer, extra) =>
  add('messages', { projectId, at: Date.now(), by: viewer.name, role: viewer.role, internal: !!viewer.internal, text: '', ...extra })

// ---- backups ----
export const snapshot = () => { const data = {}; COLS.forEach((c) => (data[c] = cache[c] || [])); return { app: 'leder-pm', version: 1, at: Date.now(), by: actor, data } }
export const validSnapshot = (s) => !!s && s.app === 'leder-pm' && s.data && COLS.every((c) => Array.isArray(s.data[c] || []))
export async function createBackup(note = '', auto = false) {
  const snap = snapshot()
  const payload = JSON.stringify(snap)
  const id = uid()
  const n = Math.ceil(payload.length / PART)
  for (let i = 0; i < n; i++) await api.setPart(id, i, payload.slice(i * PART, (i + 1) * PART))
  await api.set('backups', id, { id, at: snap.at, by: auto ? 'מערכת' : actor, note, auto, size: payload.length, parts: n, counts: Object.fromEntries(COLS.map((c) => [c, snap.data[c].length])) })
  if (!auto) logEvent('backup', note || 'גיבוי ידני')
  return id
}
export async function loadBackup(id) { const parts = await api.parts(id); if (!parts.length) throw new Error('הגיבוי ריק או נמחק'); return JSON.parse(parts.join('')) }
export async function deleteBackup(id) { await api.delParts(id); await api.del('backups', id) }
export async function restoreSnapshot(snap, label) {
  if (!validSnapshot(snap)) throw new Error('קובץ הגיבוי אינו תקין')
  await api.replaceAll(snap.data)
  logEvent('restore', label)
}
export const resetDemo = async () => { await api.replaceAll(buildSeed()); logEvent('reset', 'איפוס נתוני דוגמה') }
export const saveSettings = (d) => api.set('settings', 'main', { id: 'main', ...d })

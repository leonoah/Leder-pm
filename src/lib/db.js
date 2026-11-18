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
export const COLS = ['users', 'clients', 'projects', 'tasks', 'visits', 'defects', 'templates', 'protocols', 'messages']
const EMPTY = []
const cache = {}
const subs = new Set()
export const state = { ready: false, backend: 'local', error: null }
let version = 0
const emit = () => { version++; subs.forEach((f) => f()) }
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
const clean = (o) => JSON.parse(JSON.stringify(o))
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
let api

function makeLocal() {
  const KEY = 'leder-demo-v1'
  let data
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel(KEY) : null
  const fromSeed = () => { const s = buildSeed(); const o = {}; COLS.forEach((c) => { o[c] = {}; (s[c] || []).forEach((d) => (o[c][d.id] = d)) }); return o }
  const persist = (notify = true) => { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch (e) { console.warn('storage full', e) } if (notify) bc?.postMessage(1) }
  const fill = () => { COLS.forEach((c) => { data[c] ||= {}; cache[c] = Object.values(data[c]) }); emit() }
  const load = () => { try { data = JSON.parse(localStorage.getItem(KEY)) } catch { data = null } if (!data) { data = fromSeed(); persist(false) } fill() }
  const touch = (c) => { cache[c] = Object.values(data[c]); persist(); emit() }
  if (bc) bc.onmessage = () => load()
  window.addEventListener('storage', (e) => { if (e.key === KEY) load() })
  load()
  return {
    set(c, id, d) { data[c][id] = clean(d); touch(c) },
    patch(c, id, d) { data[c][id] = { ...data[c][id], ...clean(d) }; touch(c) },
    del(c, id) { delete data[c][id]; touch(c) },
    async reset() { data = fromSeed(); persist(); fill() },
  }
}

async function makeFirebase() {
  const { initializeApp } = await import('firebase/app')
  const fs = await import('firebase/firestore')
  const db = fs.getFirestore(initializeApp(cfg))
  const writeSeed = async () => {
    const s = buildSeed()
    const batch = fs.writeBatch(db)
    COLS.forEach((c) => (s[c] || []).forEach((d) => batch.set(fs.doc(db, c, d.id), clean(d))))
    batch.set(fs.doc(db, 'meta', 'seed'), { at: Date.now() })
    await batch.commit()
  }
  const seedDoc = await fs.getDoc(fs.doc(db, 'meta', 'seed'))
  if (!seedDoc.exists()) await writeSeed()
  await Promise.all(COLS.map((c) => new Promise((res, rej) =>
    fs.onSnapshot(fs.collection(db, c), (snap) => { cache[c] = snap.docs.map((d) => ({ ...d.data(), id: d.id })); emit(); res() }, rej))))
  return {
    set: (c, id, d) => fs.setDoc(fs.doc(db, c, id), clean(d)),
    patch: (c, id, d) => fs.updateDoc(fs.doc(db, c, id), clean(d)),
    del: (c, id) => fs.deleteDoc(fs.doc(db, c, id)),
    async reset() {
      for (const c of COLS) { const snap = await fs.getDocs(fs.collection(db, c)); await Promise.all(snap.docs.map((d) => fs.deleteDoc(d.ref))) }
      await writeSeed()
    },
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

export const useCol = (c) => useSyncExternalStore(subscribe, () => cache[c] || EMPTY)
export const useDoc = (c, id) => useCol(c).find((d) => d.id === id)
export const useDbState = () => { useSyncExternalStore(subscribe, () => version); return state }
export const add = (c, d) => { const id = d.id || uid(); api.set(c, id, { ...d, id }); return id }
export const patch = (c, id, d) => api.patch(c, id, d)
export const del = (c, id) => api.del(c, id)
export const resetDemo = () => api.reset()
export const postMessage = (projectId, viewer, extra) =>
  add('messages', { projectId, at: Date.now(), by: viewer.name, role: viewer.role, internal: !!viewer.internal, text: '', ...extra })

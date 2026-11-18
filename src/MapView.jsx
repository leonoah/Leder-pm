import { Fragment, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import { progress, sliceRoute, center, SEG_COLOR, SEG_ST, segPct, isOpenDefect } from './lib/util'

const STAGE_COLOR = { 'ביצוע': '#0369a1', 'תכנון': '#7c3aed', 'מסירה': '#16a34a', 'מכרז': '#d97706' }
const stageColor = (s) => STAGE_COLOR[s] || '#64748b'

function Fit({ pts, k }) {
  const map = useMap()
  useEffect(() => {
    if (!pts.length) return
    if (pts.length === 1) map.setView(pts[0], 14, { animate: false })
    else map.fitBounds(pts, { padding: [30, 30], maxZoom: 16, animate: false })
    const t = setTimeout(() => { try { map.invalidateSize() } catch { /* map already removed */ } }, 50)
    return () => clearTimeout(t)
  }, [k]) // eslint-disable-line
  return null
}

// projects: overview of many projects; single: one project with segments / defects
export default function MapView({ projects = [], single, defects = [], height = 320, onPick }) {
  const pts = useMemo(() => {
    const list = single ? [single] : projects
    return list.flatMap((p) => (p.geometry === 'line' && p.route?.length ? p.route.map((r) => [r.lat, r.lng]) : p.location ? [[p.location.lat, p.location.lng]] : []))
  }, [projects, single])
  const k = (single ? single.id : projects.map((p) => p.id).join()) + pts.length
  const total = single?.segments?.length ? single.segments[single.segments.length - 1].to : 1
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height }}>
      <MapContainer center={[31.4, 34.9]} zoom={8} zoomAnimation={false} fadeAnimation={false} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Fit pts={pts} k={k} />
        {!single && projects.map((p) => (
          <Fragment key={p.id}>
            {p.geometry === 'line' && p.route?.length > 1 && <Polyline positions={p.route.map((r) => [r.lat, r.lng])} pathOptions={{ color: stageColor(p.stage), weight: 5 }} />}
            <CircleMarker center={center(p)} radius={p.geometry === 'line' ? 6 : 9} pathOptions={{ color: '#fff', weight: 2, fillColor: stageColor(p.stage), fillOpacity: 1 }} eventHandlers={{ click: () => onPick?.(p) }}>
              <Tooltip direction="top"><b>{p.name}</b><br />{p.stage} · {progress(p)}%</Tooltip>
            </CircleMarker>
          </Fragment>
        ))}
        {single && single.geometry === 'line' && (single.segments || []).map((s) => {
          const line = sliceRoute(single.route, s.from / total, s.to / total)
          const mid = line[Math.floor(line.length / 2)]
          const open = defects.filter((d) => isOpenDefect(d) && d.loc === s.name).length
          return (
            <Fragment key={s.id}>
              <Polyline positions={line} pathOptions={{ color: SEG_COLOR[s.status], weight: 8, opacity: 0.9 }}>
                <Tooltip sticky><b>{s.name}</b><br /><span dir="ltr">{s.from}–{s.to}</span> מ' · {SEG_ST[s.status]} · {segPct(s)}%</Tooltip>
              </Polyline>
              {open > 0 && mid && <CircleMarker center={mid} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: '#e11d48', fillOpacity: 1 }}><Tooltip direction="top" permanent>{open} ליקויים</Tooltip></CircleMarker>}
            </Fragment>
          )
        })}
        {single && single.geometry !== 'line' && single.location && (
          <CircleMarker center={[single.location.lat, single.location.lng]} radius={14} pathOptions={{ color: '#fff', weight: 3, fillColor: '#0369a1', fillOpacity: 1 }}>
            <Tooltip direction="top" permanent>{progress(single)}%</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  )
}
export const MapLegend = () => (
  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
    {Object.entries(SEG_ST).map(([k, l]) => <span key={k} className="flex items-center gap-1.5"><span className="h-2 w-5 rounded" style={{ background: SEG_COLOR[k] }} />{l}</span>)}
    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-600" />ליקויים פתוחים</span>
  </div>
)

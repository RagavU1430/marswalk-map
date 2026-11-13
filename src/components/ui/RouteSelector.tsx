import React from 'react'
import { useMapStore } from '@/stores/map-store'

export const RouteSelector: React.FC = () => {
  const { activeRouteResult } = useMapStore()

  if (!activeRouteResult || !activeRouteResult.segments || activeRouteResult.segments.length === 0) {
    return (
      <div className="bg-mars-shadow/90 border border-mars-dust/30 rounded-xl p-4 shadow-xl backdrop-blur-md text-mars-surface">
        <h3 className="text-sm font-bold uppercase tracking-wider text-mars-dust mb-2">
          Route Segments
        </h3>
        <p className="text-xs text-mars-dust">No active route planned.</p>
      </div>
    )
  }

  return (
    <div className="bg-mars-shadow/90 border border-mars-dust/30 rounded-xl p-4 shadow-xl backdrop-blur-md text-mars-surface space-y-3">
      <div className="flex items-center justify-between border-b border-mars-dust/20 pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-mars-dust">
          📍 EVA Navigation Cue Sheet
        </h3>
        <span className="text-xs font-mono text-cyan-300">
          {activeRouteResult.segments.length} Legs
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {activeRouteResult.segments.map((seg, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-black/30 border border-mars-dust/20 text-xs space-y-1 hover:border-mars-dust/40 transition"
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-mars-surface">Leg {idx + 1}</span>
              <span className="font-mono text-cyan-300 font-medium">
                {(seg.distanceMeters / 1000).toFixed(2)} km · ~{seg.durationMinutes} min
              </span>
            </div>
            <p className="text-[11px] text-gray-300 truncate">
              {seg.from} <span className="text-mars-dust">➔</span> {seg.to}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

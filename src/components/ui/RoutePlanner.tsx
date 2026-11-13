import React from 'react'
import { useMapStore } from '@/stores/map-store'
import { JEZERO_SCIENCE_STOPS } from '@/data/jezeroData'

interface RoutePlannerProps {
  hudMode?: boolean
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({ hudMode = false }) => {
  const {
    plannedStops,
    activeRouteResult,
    selectedStop,
    selectScienceStop,
    removeScienceStop,
    addScienceStop,
    recalculateRoute,
    isClickToAddWaypoint,
    toggleClickToAddMode,
  } = useMapStore()

  const availableStopsToAdd = JEZERO_SCIENCE_STOPS.filter(
    (cand) => !plannedStops.some((s) => s.id === cand.id)
  )

  return (
    <div
      className={`bg-mars-shadow/90 border border-mars-dust/30 rounded-xl p-4 shadow-xl backdrop-blur-md text-mars-surface space-y-3 ${
        hudMode ? 'pointer-events-auto border-red-500/40' : ''
      }`}
    >
      <div className="flex items-center justify-between border-b border-mars-dust/20 pb-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-mars-dust">
            🧭 EVA Waypoint Sequence & Router
          </h3>
          <span className="text-[11px] text-gray-400">
            {plannedStops.length} stops planned · Loop Traverse
          </span>
        </div>

        <button
          onClick={toggleClickToAddMode}
          className={`text-xs px-2.5 py-1 rounded-md border font-medium transition ${
            isClickToAddWaypoint
              ? 'bg-red-600 text-white border-red-400 shadow-md animate-pulse'
              : 'bg-black/40 border-mars-dust/30 text-mars-surface hover:border-mars-dust/60'
          }`}
        >
          {isClickToAddWaypoint ? '🎯 Click Map to Place' : '+ Tap Map Tool'}
        </button>
      </div>

      {/* Planned Stops List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {plannedStops.map((stop, idx) => {
          const isSelected = selectedStop?.id === stop.id
          const isStartOrEnd = idx === 0 || idx === plannedStops.length - 1

          return (
            <div
              key={`${stop.id}-${idx}`}
              onClick={() => selectScienceStop(stop)}
              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                isSelected
                  ? 'bg-red-950/40 border-red-500/80 text-white'
                  : 'bg-black/30 border-mars-dust/20 hover:border-mars-dust/40 text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <span
                  className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                    isStartOrEnd
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-600/80 text-white'
                  }`}
                >
                  {idx === 0 ? 'H' : idx === plannedStops.length - 1 && stop.targetType === 'Hab' ? 'H' : idx}
                </span>

                <div className="overflow-hidden">
                  <span className="text-xs font-semibold block truncate">{stop.name}</span>
                  <span className="text-[10px] text-mars-dust block truncate">
                    {stop.targetType} · {stop.geologicUnit.split(' ')[0]}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {idx > 0 && idx < plannedStops.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeScienceStop(stop.id)
                    }}
                    className="text-mars-dust hover:text-red-400 p-1 text-xs"
                    title="Remove stop"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Add Available Jezero Stops */}
      {availableStopsToAdd.length > 0 && (
        <div className="pt-2 border-t border-mars-dust/15">
          <span className="text-[10px] text-mars-dust uppercase tracking-wider block mb-1">
            Add Known Target:
          </span>
          <div className="flex flex-wrap gap-1">
            {availableStopsToAdd.map((cand) => (
              <button
                key={cand.id}
                onClick={() => addScienceStop(cand)}
                className="text-[11px] bg-black/40 hover:bg-black/70 border border-mars-dust/30 px-2 py-0.5 rounded text-mars-surface transition"
              >
                + {cand.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recalculate Button & Route Engine Summary */}
      <div className="pt-2 border-t border-mars-dust/15 space-y-2">
        <button
          onClick={recalculateRoute}
          className="w-full py-2 px-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-semibold text-xs rounded-lg shadow-lg transition active:scale-[0.99] flex items-center justify-center gap-1.5"
        >
          <span>⚡ Recalculate A* Hazard-Avoidance Route</span>
        </button>

        {activeRouteResult && activeRouteResult.hazardCrossings.length > 0 && (
          <div className="p-2 bg-amber-950/30 border border-amber-500/30 rounded text-[11px] text-amber-200">
            <span className="font-semibold block">⚠️ Route Engine Advisory:</span>
            <span>
              Route auto-diverted around dangerous terrain: {activeRouteResult.hazardCrossings.join(', ')}.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

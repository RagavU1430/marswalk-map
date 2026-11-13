import React from 'react'
import { useMapStore } from '@/stores/map-store'
import { MISSION_PRESETS } from '@/data/jezeroData'

export const MissionPresets: React.FC = () => {
  const { activePresetId, loadPresetMission } = useMapStore()

  return (
    <div className="bg-mars-shadow/90 border border-mars-dust/30 rounded-xl p-4 shadow-xl backdrop-blur-md text-mars-surface space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-mars-dust">
          🚀 Mission Scenarios (1-Click Presets)
        </h3>
        <span className="text-[10px] bg-red-900/40 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-mono">
          Jezero Delta Front
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {MISSION_PRESETS.map((preset) => {
          const isSelected = activePresetId === preset.id

          return (
            <button
              key={preset.id}
              onClick={() => loadPresetMission(preset.id)}
              className={`text-left p-3 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-mars-dust/20 border-red-500/80 shadow-md ring-1 ring-red-500/50'
                  : 'bg-black/30 border-mars-dust/20 hover:border-mars-dust/50 hover:bg-black/50'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold text-sm text-mars-surface">{preset.name}</span>
                <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                  {preset.estimatedDistanceKm} km · {preset.targetDurationHours}h
                </span>
              </div>
              <p className="text-xs text-mars-dust mt-1 leading-snug">{preset.tagline}</p>

              {isSelected && (
                <div className="mt-2.5 pt-2 border-t border-mars-dust/20 text-[11px] space-y-1 text-gray-300">
                  <span className="font-medium text-mars-dust block">Key Objectives:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                    {preset.scienceObjectives.slice(0, 2).map((obj, i) => (
                      <li key={i} className="truncate">
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}


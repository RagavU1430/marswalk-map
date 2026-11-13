import React from 'react'
import { useMapStore } from '@/stores/map-store'

export const StopCard: React.FC = () => {
  const { selectedStop, selectScienceStop } = useMapStore()

  if (!selectedStop) {
    return null
  }

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-500/20 text-red-300 border-red-500/40'
      case 2:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
    }
  }

  const getOrganicsBadge = (potential: string) => {
    if (potential.includes('Critical') || potential.includes('High')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    }
    return 'bg-gray-500/20 text-gray-300 border-gray-500/40'
  }

  return (
    <div className="bg-mars-shadow/95 border border-mars-dust/30 rounded-xl p-4 shadow-2xl backdrop-blur-md text-mars-surface flex flex-col gap-3 relative transition-all animate-fadeIn">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-mars-dust/20 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold border bg-mars-dust/10 text-mars-dust">
              {selectedStop.targetType}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityBadge(
                selectedStop.samplePriority
              )}`}
            >
              Priority {selectedStop.samplePriority} Sample
            </span>
          </div>
          <h3 className="text-lg font-bold text-mars-surface mt-1">{selectedStop.name}</h3>
          <p className="text-xs text-mars-dust font-mono">
            {selectedStop.lat.toFixed(4)}°N, {selectedStop.lon.toFixed(4)}°E · Elev: {selectedStop.elevation}m
          </p>
        </div>

        <button
          onClick={() => selectScienceStop(null)}
          className="text-mars-dust hover:text-mars-surface text-sm p-1 rounded hover:bg-white/5 transition"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Ground POV Imagery (Perseverance Mastcam-Z) */}
      <div className="relative rounded-lg overflow-hidden border border-mars-dust/20 bg-black/40 group">
        <img
          src={selectedStop.povImageUrl}
          alt={selectedStop.name}
          className="w-full h-44 object-cover object-center group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            // Fallback placeholder if offline
            ;(e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
          }}
        />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-xs text-mars-surface">
          <span className="font-semibold text-mars-dust block">Perseverance POV Telemetry</span>
          <span className="line-clamp-2 text-[11px] leading-tight opacity-90">
            {selectedStop.povImageCaption}
          </span>
        </div>
      </div>

      {/* Science & Geology Metadata */}
      <div className="space-y-2 text-xs">
        <div>
          <span className="text-mars-dust font-medium block">Science Objective:</span>
          <p className="text-gray-200 mt-0.5 leading-relaxed">{selectedStop.scienceGoal}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-mars-dust/15">
          <div>
            <span className="text-mars-dust block font-medium">USGS Geologic Unit:</span>
            <span className="text-amber-200/90 font-mono text-[11px] block mt-0.5">
              {selectedStop.geologicUnit}
            </span>
          </div>
          <div>
            <span className="text-mars-dust block font-medium">Organics Potential:</span>
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] mt-0.5 border ${getOrganicsBadge(
                selectedStop.organicsPotential
              )}`}
            >
              {selectedStop.organicsPotential}
            </span>
          </div>
        </div>

        <div>
          <span className="text-mars-dust block font-medium mb-1">CRISM Mineral Signatures:</span>
          <div className="flex flex-wrap gap-1.5">
            {selectedStop.minerals.map((mineral, i) => (
              <span
                key={i}
                className="bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 px-2 py-0.5 rounded text-[11px]"
              >
                {mineral}
              </span>
            ))}
          </div>
        </div>

        {/* Hazard Check at this Stop */}
        <div className="bg-black/30 rounded p-2 border border-mars-dust/15 flex justify-between items-center text-[11px]">
          <div>
            <span className="text-mars-dust block">Slope Grade</span>
            <span className="font-bold text-mars-surface">{selectedStop.hazardMetrics.slopeDegrees}°</span>
          </div>
          <div>
            <span className="text-mars-dust block">Rock Density</span>
            <span className="font-bold text-mars-surface">
              {Math.round(selectedStop.hazardMetrics.rockDensityScore * 100)}%
            </span>
          </div>
          <div>
            <span className="text-mars-dust block">RAD Exposure</span>
            <span className="font-bold text-emerald-400">
              {selectedStop.hazardMetrics.radiationDoseRate} µSv/h
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ScienceStopCard = StopCard


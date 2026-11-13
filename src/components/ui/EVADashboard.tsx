import React, { useState } from 'react'
import { useMapStore } from '@/stores/map-store'

interface EVADashboardProps {
  compactByDefault?: boolean
}

export const EVADashboard: React.FC<EVADashboardProps> = ({ compactByDefault = false }) => {
  const { activeRouteResult, plannedStops } = useMapStore()
  const [isExpanded, setIsExpanded] = useState(!compactByDefault)

  if (!activeRouteResult) {
    return (
      <div className="bg-black/85 border border-mars-dust/30 rounded-xl p-3 shadow-2xl backdrop-blur-md text-mars-surface">
        <h3 className="text-xs font-bold uppercase tracking-wider text-mars-dust">
          📊 EVA Mission Dashboard
        </h3>
        <p className="text-[11px] text-mars-dust mt-1">Plan a route to display mission telemetry.</p>
      </div>
    )
  }

  const {
    totalDistanceMeters,
    estimatedDurationMinutes,
    accumulatedRadiationMicroSv,
    maxSlopeDegrees,
    safetyScore,
    hazardCrossings,
    segments,
    waypoints,
  } = activeRouteResult

  const distanceKm = (totalDistanceMeters / 1000).toFixed(1)
  const durationHours = (estimatedDurationMinutes / 60).toFixed(1)
  const radiationMSv = (accumulatedRadiationMicroSv / 1000).toFixed(2)
  const dailyBudgetMSv = 1.0

  const riskColor = safetyScore >= 80 ? 'green' : safetyScore >= 60 ? 'amber' : 'red'
  const riskLabel = safetyScore >= 80 ? 'GO FOR EVA' : safetyScore >= 60 ? 'CAUTION' : 'NO-GO'
  const radiationBudgetPercent = Math.min(100, (accumulatedRadiationMicroSv / 1000) * 100)

  return (
    <div className="bg-black/85 border border-mars-dust/30 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-mars-surface space-y-2.5 transition-all">
      {/* Header bar with toggle */}
      <div className="flex items-center justify-between border-b border-mars-dust/20 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            EVA Telemetry HUD
          </h3>
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              riskColor === 'green'
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                : riskColor === 'amber'
                ? 'bg-amber-950/70 text-amber-400 border border-amber-500/40'
                : 'bg-red-950/70 text-red-400 border border-red-500/40'
            }`}
          >
            {riskLabel} · {safetyScore}%
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] font-mono text-cyan-300 hover:text-white px-1.5 py-0.5 rounded bg-white/5 border border-white/10 transition"
        >
          {isExpanded ? '▲ Compact' : '▼ Details'}
        </button>
      </div>

      {/* Primary 3-Metric Bar (always visible) */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-black/50 border border-mars-dust/20 rounded-lg p-2">
          <span className="text-[9px] text-mars-dust uppercase tracking-wider block">Traverse</span>
          <span className="text-base font-bold font-mono text-white">{distanceKm}</span>
          <span className="text-[9px] text-mars-dust ml-0.5">km</span>
        </div>

        <div className="bg-black/50 border border-mars-dust/20 rounded-lg p-2">
          <span className="text-[9px] text-mars-dust uppercase tracking-wider block">Duration</span>
          <span className="text-base font-bold font-mono text-white">{durationHours}</span>
          <span className="text-[9px] text-mars-dust ml-0.5">hrs</span>
        </div>

        <div className="bg-black/50 border border-mars-dust/20 rounded-lg p-2">
          <span className="text-[9px] text-mars-dust uppercase tracking-wider block">Radiation</span>
          <span className="text-base font-bold font-mono text-emerald-400">{radiationMSv}</span>
          <span className="text-[9px] text-mars-dust ml-0.5">mSv</span>
        </div>
      </div>

      {/* Compact Radiation Budget Gauge Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-mars-dust font-mono">
          <span>Dose Budget: {accumulatedRadiationMicroSv.toFixed(0)} / 1000 µSv</span>
          <span className="text-emerald-400 font-bold">{radiationBudgetPercent.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/10">
          <div
            className={`h-full transition-all duration-500 ${
              radiationBudgetPercent > 80
                ? 'bg-red-500'
                : radiationBudgetPercent > 50
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.max(4, radiationBudgetPercent)}%` }}
          />
        </div>
      </div>

      {/* Expanded Details Drawer */}
      {isExpanded && (
        <div className="pt-2 border-t border-mars-dust/20 space-y-2 text-xs animate-fadeIn">
          {/* Slope & Risk summary */}
          <div className="flex justify-between items-center text-[11px] text-mars-dust">
            <span>Terrain Max Grade:</span>
            <span className="font-mono text-white font-semibold">{maxSlopeDegrees.toFixed(1)}°</span>
          </div>

          {hazardCrossings.length > 0 && (
            <div className="p-2 bg-amber-950/40 border border-amber-500/40 rounded text-[11px] text-amber-200">
              <span className="font-semibold block">⚠️ Route Diverted:</span>
              <span>Bypassed high-risk areas: {hazardCrossings.join(', ')}</span>
            </div>
          )}

          {/* Planned Legs Breakdown */}
          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
            <span className="text-[10px] uppercase tracking-wider text-mars-dust block">
              Leg Checklist:
            </span>
            {segments.map((seg, i) => (
              <div
                key={i}
                className="flex justify-between items-center text-[10px] px-2 py-1 bg-black/40 rounded border border-white/5 font-mono"
              >
                <span className="text-gray-200 truncate pr-2">
                  {seg.from.split(' (')[0]} → {seg.to.split(' (')[0]}
                </span>
                <span className="text-cyan-300 shrink-0">
                  {(seg.distanceMeters / 1000).toFixed(1)}km · {seg.durationMinutes}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useState } from 'react'
import { useMapStore } from '@/stores/map-store'
import { calculateRoute, calculateTotalDistance } from '@/lib/pathfinding'

interface RoutePlannerProps {
  hudMode?: boolean
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({ hudMode = false }) => {
  const [start, setStart] = useState<{ lat: number; lon: number } | null>(null)
  const [end, setEnd] = useState<{ lat: number; lon: number } | null>(null)
  const [route, setRoute] = useState<
    { lat: number; lon: number; distance: number }[]
  >([])

  const { addRoute, clearWaypoints, clearRoutes } = useMapStore()

  const handleCalculateRoute = () => {
    if (start && end) {
      const calculatedRoute = calculateRoute(start, end)
      setRoute(calculatedRoute)

      // Create route ID and name
      const routeId = `route-${Date.now()}`
      const routeName = `Route from (${start.lat.toFixed(2)}, ${start.lon.toFixed(2)}) to (${end.lat.toFixed(2)}, ${end.lon.toFixed(2)})`

      // Create waypoints with hazard data
      const waypoints = calculatedRoute.map((wp, index) => ({
        id: `wp-${routeId}-${index}`,
        name: index === 0 ? 'Start' : index === calculatedRoute.length - 1 ? 'End' : `WP${index}`,
        lat: wp.lat,
        lon: wp.lon,
        distance: wp.distance,
        hazard: {
          slope: Math.sin((wp.lat + wp.lon) * 0.02) * 10 + 15,
          radiation: Math.abs(Math.cos(wp.lat * 0.1) * 0.3 + 0.2),
          rock: Math.abs(Math.sin(wp.lon * 0.05) * 0.4 + 0.3),
        },
      }))

      // Dispatch route to store
      addRoute({
        id: routeId,
        name: routeName,
        waypoints,
        distance: calculateTotalDistance(waypoints as any),
        createdAt: new Date(),
      })
    }
  }

  const clearRoute = () => {
    setRoute([])
    setStart(null)
    setEnd(null)
    clearWaypoints()
    clearRoutes()
  }

  const formatDistance = (meters: number) => {
    return `${Math.round(meters / 1000)} km`
  }

  // HUD mode styling
  const hudClasses = hudMode
    ? 'absolute bottom-4 left-4 right-4 pointer-events-auto select-none'
    : ''

  const backgroundClass = hudMode
    ? 'bg-mars-shadow/80 backdrop-blur-sm border border-mars-dust/30'
    : 'hud-panel'

  return (
    <div className={`${backgroundClass} rounded-xl ${hudClasses}`}>
      <h3 className="text-lg font-semibold mb-3 text-mars-surface">
        Route Planner
      </h3>

      {route.length === 0 && (
        <div className="space-y-3">
          <div>
            <label className="text-sm text-mars-dust block mb-1">Start (Lat, Lon)</label>
            <input
              type="text"
              placeholder="18.4, 77.5"
              className="w-full px-3 py-2 bg-opace border border-mars-dust/30 rounded text-mars-surface placeholder-mars-dust"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const [lat, lon] = (e.target as HTMLInputElement).value.split(',').map(Number)
                  if (lat && lon) setStart({ lat, lon })
                }
              }}
            />
          </div>

          <div>
            <label className="text-sm text-mars-dust block mb-1">End (Lat, Lon)</label>
            <input
              type="text"
              placeholder="18.5, 77.6"
              className="w-full px-3 py-2 bg-opace border border-mars-dust/30 rounded text-mars-surface placeholder-mars-dust"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const [lat, lon] = (e.target as HTMLInputElement).value.split(',').map(Number)
                  if (lat && lon) setEnd({ lat, lon })
                }
              }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCalculateRoute}
              disabled={!start || !end}
              className="flex-1 px-4 py-2 bg-mars-surface text-opace rounded hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Calculate Route
            </button>
            {route.length > 0 && (
              <button
                onClick={clearRoute}
                className="px-3 py-2 text-sm text-mars-dust hover:text-mars-surface transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {route.length > 0 && (
        <div className="space-y-3">
          <div className="p-3 bg-mars-shadow/30 rounded-lg">
            <p className="text-sm text-mars-dust">
              <span className="text-mars-surface font-semibold">Distance:</span>{' '}
              {formatDistance(route.reduce((sum, p) => sum + p.distance, 0))}
            </p>
            <p className="text-xs text-mars-dust mt-1">
              Route calculated with terrain hazards
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-radiation-low/20 text-radiation-low rounded">
              Low Radiation
            </span>
            <span className="px-2 py-1 bg-radiation-med/20 text-radiation-med rounded">
              Medium Terrain
            </span>
            <span className="px-2 py-1 bg-radiation-high/20 text-radiation-high rounded">
              High Slope
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
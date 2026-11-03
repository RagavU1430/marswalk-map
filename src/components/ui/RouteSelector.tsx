import React from 'react'
import { useMapStore } from '@/stores/map-store'

export const RouteSelector: React.FC = () => {
  const { routes, selectedRoute, selectRoute, removeRoute, clearRoutes } = useMapStore()

  if (routes.length === 0) {
    return (
      <div className="bg-mars-shadow/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-mars-surface mb-2">Routes</h3>
        <p className="text-xs text-mars-dust">No routes calculated yet</p>
      </div>
    )
  }

  return (
    <div className="bg-mars-shadow/30 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-mars-surface">Routes</h3>
        {routes.length > 0 && (
          <button
            onClick={clearRoutes}
            className="text-xs text-mars-dust hover:text-radiation-high transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {routes.map(route => (
          <div
            key={route.id}
            onClick={() => selectRoute(route.id)}
            className={`p-2 rounded border transition-colors cursor-pointer ${
              selectedRoute === route.id
                ? 'bg-mars-surface text-opace border-mars-surface'
                : 'bg-opace/50 hover:bg-opace/30 border-transparent hover:border-mars-dust/30'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-medium text-mars-surface truncate">{route.name}</p>
                <p className="text-xs text-mars-dust">
                  {(route.distance / 1000).toFixed(1)} km •{' '}
                  {new Date(route.createdAt).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeRoute(route.id)
                }}
                className="text-mars-dust hover:text-radiation-high transition-colors"
                title="Delete route"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
import React from 'react'
import { useMapStore } from '@/stores/map-store'

export const LayerManager: React.FC = () => {
  const { layers, toggleLayer } = useMapStore()

  return (
    <div className="hud-panel">
      <h3 className="text-lg font-semibold mb-3 text-mars-surface">Map Layers</h3>

      <div className="space-y-2">
        {Object.entries(layers).map(([key, layer]) => (
          <label key={key} className="flex items-center justify-between layer-toggle p-2 rounded cursor-pointer">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={() => toggleLayer(key)}
                className="mt-0.5 w-4 h-4 border border-mars-dust/50 rounded"
              />
              <span className="text-sm">{layer.label}</span>
            </div>

            {layer.opacity !== undefined && (
              <input
                type="range"
                min="0"
                max="100"
                value={layer.opacity * 100}
                onChange={(e) => {
                  const store = useMapStore.getState()
                  store.setLayerOpacity(key, e.target.value / 100)
                }}
                className="w-20"
              />
            )}
          </label>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-mars-dust/20">
        <button
          onClick={() => useMapStore.getState().resetLayers()}
          className="w-full text-sm text-mars-dust hover:text-mars-surface"
        >
          Reset All Layers
        </button>
      </div>
    </div>
  )
}
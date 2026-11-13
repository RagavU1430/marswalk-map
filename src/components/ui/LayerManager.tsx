import React from 'react'
import { useMapStore } from '@/stores/map-store'

export const LayerManager: React.FC = () => {
  const { layers, toggleLayer, setLayerOpacity, resetLayers } = useMapStore()

  const layerOrder = [
    'basemap', 'slope', 'minerals', 'surface', 'geologic', 'weather', 'radiation'
  ]

  return (
    <div className="bg-mars-shadow/90 border border-mars-dust/30 rounded-xl p-4 shadow-xl backdrop-blur-md text-mars-surface space-y-3">
      <div className="flex items-center justify-between border-b border-mars-dust/20 pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-mars-dust">
          🗺️ Map Layers (7 NASA Datasets)
        </h3>
        <button
          onClick={resetLayers}
          className="text-[10px] px-2 py-1 bg-black/30 border border-mars-dust/30 rounded hover:bg-black/50 transition text-mars-dust"
        >
          Reset All
        </button>
      </div>

      <div className="space-y-2">
        {layerOrder.map((layerId) => {
          const layer = layers[layerId]
          if (!layer) return null

          return (
            <label key={layerId} className="flex items-center justify-between p-2 rounded-lg border cursor-pointer transition hover:bg-black/20 hover:border-mars-dust/30">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => toggleLayer(layerId)}
                  className="w-4 h-4 accent-red-600 border-mars-dust/50 rounded bg-black/30"
                />
                <div>
                  <span className="text-xs font-medium block">{layer.label}</span>
                  <span className="text-[10px] text-mars-dust block">{layer.kind}</span>
                </div>
              </div>

              {layer.visible && layer.opacity !== undefined && (
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) => setLayerOpacity(layerId, Number(e.target.value) / 100)}
                  className="w-24 h-1.5 accent-red-600"
                  aria-label={`${layer.label} opacity`}
                />
              )}
            </label>
          )
        })}
      </div>

      <div className="pt-2 border-t border-mars-dust/15 text-[10px] text-mars-dust">
        Data: HiRISE/CTX · MOLA/HRSC · CRISM · THEMIS · USGS · MEDA · RAD
      </div>
    </div>
  )
}
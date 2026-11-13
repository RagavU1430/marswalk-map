import { create } from 'zustand'
import {
  NASA_DATA_LAYERS,
  JEZERO_SCIENCE_STOPS,
  MISSION_PRESETS,
  ScienceStop,
  MissionPreset,
} from '@/data/jezeroData'
import {
  planMultiStopEVARoute,
  CalculatedRouteResult,
  RouteWaypoint,
} from '@/lib/pathfinding'

export interface LayerConfig {
  id: string
  label: string
  kind: string
  source: string
  description: string
  visible: boolean
  opacity: number
}

interface MapState {
  layers: Record<string, LayerConfig>
  activePresetId: string
  activePreset: MissionPreset | null
  plannedStops: ScienceStop[]
  activeRouteResult: CalculatedRouteResult | null
  selectedStop: ScienceStop | null
  isClickToAddWaypoint: boolean

  // Actions
  toggleLayer: (layerId: string) => void
  setLayerOpacity: (layerId: string, opacity: number) => void
  resetLayers: () => void
  loadPresetMission: (presetId: string) => void
  selectScienceStop: (stop: ScienceStop | null) => void
  addScienceStop: (stop: ScienceStop) => void
  removeScienceStop: (stopId: string) => void
  recalculateRoute: () => void
  toggleClickToAddMode: () => void
}

// Initial default route based on Jezero Organics Hunt
const initialPreset = MISSION_PRESETS[0]
const initialRoute = planMultiStopEVARoute(initialPreset.stops, initialPreset.name)

export const useMapStore = create<MapState>((set, get) => ({
  layers: { ...NASA_DATA_LAYERS },
  activePresetId: initialPreset.id,
  activePreset: initialPreset,
  plannedStops: [...initialPreset.stops],
  activeRouteResult: initialRoute,
  selectedStop: null,
  isClickToAddWaypoint: false,

  toggleLayer: (layerId) =>
    set((state) => {
      const current = state.layers[layerId]
      if (!current) return state
      return {
        layers: {
          ...state.layers,
          [layerId]: { ...current, visible: !current.visible },
        },
      }
    }),

  setLayerOpacity: (layerId, opacity) =>
    set((state) => {
      const current = state.layers[layerId]
      if (!current) return state
      return {
        layers: {
          ...state.layers,
          [layerId]: { ...current, opacity },
        },
      }
    }),

  resetLayers: () =>
    set(() => ({
      layers: { ...NASA_DATA_LAYERS },
    })),

  loadPresetMission: (presetId) => {
    const preset = MISSION_PRESETS.find((p) => p.id === presetId) || MISSION_PRESETS[0]
    const route = planMultiStopEVARoute(preset.stops, preset.name)
    set({
      activePresetId: preset.id,
      activePreset: preset,
      plannedStops: [...preset.stops],
      activeRouteResult: route,
      selectedStop: null,
    })
  },

  selectScienceStop: (stop) =>
    set({
      selectedStop: stop,
    }),

  addScienceStop: (stop) => {
    const updatedStops = [...get().plannedStops, stop]
    const route = planMultiStopEVARoute(updatedStops, 'Custom EVA Traverse')
    set({
      plannedStops: updatedStops,
      activeRouteResult: route,
      selectedStop: stop,
      activePresetId: 'custom',
    })
  },

  removeScienceStop: (stopId) => {
    const updatedStops = get().plannedStops.filter((s) => s.id !== stopId)
    if (updatedStops.length >= 2) {
      const route = planMultiStopEVARoute(updatedStops, 'Custom EVA Traverse')
      set({
        plannedStops: updatedStops,
        activeRouteResult: route,
        selectedStop: updatedStops[0] || null,
      })
    } else {
      set({
        plannedStops: updatedStops,
        activeRouteResult: null,
      })
    }
  },

  recalculateRoute: () => {
    const stops = get().plannedStops
    if (stops.length >= 2) {
      const route = planMultiStopEVARoute(stops, 'Updated EVA Traverse')
      set({ activeRouteResult: route })
    }
  },

  toggleClickToAddMode: () =>
    set((state) => ({
      isClickToAddWaypoint: !state.isClickToAddWaypoint,
    })),
}))

import { create } from 'zustand'

interface Layer {
  label: string
  visible: boolean
  opacity?: number
  source?: string
}

interface MapLayerConfig {
  [key: string]: Layer
}

interface Waypoint {
  id: string
  name: string
  lat: number
  lon: number
  elevation?: number
}

interface MapState {
  layers: MapLayerConfig
  waypoints: Waypoint[]
  selectedSite: string | null

  // Actions
  toggleLayer: (layerId: string) => void
  setLayerOpacity: (layerId: string, opacity: number) => void
  resetLayers: () => void
  addWaypoint: (waypoint: Waypoint) => void
  removeWaypoint: (id: string) => void
  clearWaypoints: () => void
  selectSite: (siteId: string) => void
}

const defaultLayers: MapLayerConfig = {
  'dem': {
    label: 'Terrain (DEM)',
    visible: true,
    source: 'Cesium Ion Mars DEM',
  },
  'ctx': {
    label: 'MRO Context Imagery',
    visible: true,
    opacity: 0.9,
    source: 'MRO CTX (6m/pixel)',
  },
  'hirose': {
    label: 'HiRISE Detail',
    visible: false,
    opacity: 1.0,
    source: 'MRO HiRISE (0.3m/pixel)',
  },
  'themsis': {
    label: 'THEMIS Thermal',
    visible: false,
    opacity: 0.7,
    source: 'THEMIS IR',
  },
  'crism': {
    label: 'CRISM Spectral',
    visible: false,
    opacity: 0.6,
    source: 'CRISM Mineral Map',
  },
  'radiation': {
    label: 'Radiation Hazard',
    visible: false,
    opacity: 0.6,
    source: 'MAVEN/EPM',
  },
  'rovers': {
    label: 'Rover Traverses',
    visible: true,
    opacity: 0.8,
    source: 'Curiosity/Perseverance tracks',
  },
}

export const useMapStore = create<MapState>()((set) => ({
  layers: defaultLayers,
  waypoints: [],
  selectedSite: null,

  toggleLayer: (layerId) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          visible: !state.layers[layerId].visible,
        },
      },
    })),

  setLayerOpacity: (layerId, opacity) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layerId]: {
          ...state.layers[layerId],
          opacity,
        },
      },
    })),

  resetLayers: () => set({ layers: defaultLayers }),

  selectSite: (siteId) => set({ selectedSite: siteId }),

  addWaypoint: (waypoint) =>
    set((state) => ({
      waypoints: [...state.waypoints, waypoint],
    })),

  removeWaypoint: (id) =>
    set((state) => ({
      waypoints: state.waypoints.filter((wp) => wp.id !== id),
    })),

  clearWaypoints: () => set({ waypoints: [] }),
}))
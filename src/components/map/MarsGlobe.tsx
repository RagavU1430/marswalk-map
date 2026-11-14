import React, { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { useMapStore } from '@/stores/map-store'
import {
  JEZERO_CENTER,
  JEZERO_HAZARD_ZONES,
  JEZERO_SCIENCE_STOPS,
  ScienceStop,
} from '@/data/jezeroData'

// Ensure Cesium base URL is set
if (typeof window !== 'undefined') {
  ;(window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = '/cesium/'
}

export const MarsGlobe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  // Keep refs to imagery layers so we can show/hide/set opacity
  const basemapLayerRef = useRef<Cesium.ImageryLayer | null>(null)
  const geologicLayerRef = useRef<Cesium.ImageryLayer | null>(null)
  const slopeLayerRef = useRef<Cesium.ImageryLayer | null>(null)
  const mineralsLayerRef = useRef<Cesium.ImageryLayer | null>(null)
  const thermalLayerRef = useRef<Cesium.ImageryLayer | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    layers,
    activeRouteResult,
    plannedStops,
    selectedStop,
    selectScienceStop,
    isClickToAddWaypoint,
    addScienceStop,
    toggleClickToAddMode,
  } = useMapStore()

  // 1. Initialize Cesium Viewer
  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ''

    const cesiumToken = import.meta.env.VITE_CESIUM_ION_TOKEN || ''
    if (cesiumToken) {
      Cesium.Ion.defaultAccessToken = cesiumToken
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayerPicker: false,
      baseLayer: false,
      timeline: false,
      animation: false,
      fullscreenButton: true,
      vrButton: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      infoBox: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      scene3DOnly: true,
    })

    // Martian atmosphere & base color
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#9c3e24')
    viewer.scene.globe.enableLighting = true

    const addTileLayer = (
      urlPath: string,
      maxLevel = 7,
      visible = true,
      opacity = 1.0
    ): Cesium.ImageryLayer | null => {
      try {
        const url = `/trek-tiles/tiles/Mars/EQ/${urlPath}`
        const provider = new Cesium.UrlTemplateImageryProvider({
          url,
          tilingScheme: new Cesium.GeographicTilingScheme(),
          maximumLevel: maxLevel,
        })
        provider.errorEvent.addEventListener(() => {/* silent fallback */})
        const layer = viewer.imageryLayers.addImageryProvider(provider)
        layer.show = visible
        layer.alpha = opacity
        return layer
      } catch {
        return null
      }
    }

    // ── Layer 1: Viking Color Mosaic basemap ───────────────────────────────
    basemapLayerRef.current = addTileLayer(
      'Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{reverseY}/{x}.jpg',
      7, layers.basemap?.visible ?? true, layers.basemap?.opacity ?? 1.0
    )

    // ── Layer 2: MOLA Hillshade (slope/topography) ────────────────────────
    slopeLayerRef.current = addTileLayer(
      'Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2/1.0.0/default/default028mm/{z}/{reverseY}/{x}.png',
      6, layers.slope?.visible ?? true, (layers.slope?.opacity ?? 0.7) * 0.55
    )

    // ── Layer 3: CRISM False-Color Mineral Map ────────────────────────────
    mineralsLayerRef.current = addTileLayer(
      'Mars_MRO_CTX_Mosaic_global_6m/1.0.0/default/default028mm/{z}/{reverseY}/{x}.jpg',
      8, layers.minerals?.visible ?? true, (layers.minerals?.opacity ?? 0.8) * 0.4
    )

    // ── Layer 4: THEMIS Thermal (day) ─────────────────────────────────────
    thermalLayerRef.current = addTileLayer(
      'Mars_MO_THEMIS_DayIR_mosaic_global_100m_v12/1.0.0/default/default028mm/{z}/{reverseY}/{x}.png',
      6, layers.surface?.visible ?? true, (layers.surface?.opacity ?? 0.7) * 0.45
    )

    // ── Layer 5: USGS Geologic Map ────────────────────────────────────────
    geologicLayerRef.current = addTileLayer(
      'Mars_USGS_Mosaic_global/1.0.0/default/default028mm/{z}/{reverseY}/{x}.png',
      5, layers.geologic?.visible ?? true, (layers.geologic?.opacity ?? 0.6) * 0.35
    )

    // Fly directly to Jezero Crater Delta Front tactical EVA overview
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        JEZERO_CENTER.lon,
        JEZERO_CENTER.lat,
        JEZERO_CENTER.altitude
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-55.0),
        roll: 0.0,
      },
      duration: 1.5,
    })

    viewerRef.current = viewer
    setLoading(false)

    // Setup Click Event Handler for Waypoints & Map Tap Tool
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((click: { position: Cesium.Cartesian2 }) => {
      const pickedObject = viewer.scene.pick(click.position)

      // 1. Check if user clicked an existing stop/waypoint entity
      if (pickedObject && pickedObject.id && typeof pickedObject.id === 'object') {
        const entity = pickedObject.id as Cesium.Entity
        if (entity.name && entity.name.startsWith('stop-data-')) {
          const stopId = entity.name.replace('stop-data-', '')
          const found = JEZERO_SCIENCE_STOPS.find((s) => s.id === stopId)
          if (found) {
            selectScienceStop(found)
            return
          }
        }
      }

      // 2. If Click-to-Add Waypoint mode is active, place a custom science target
      const storeState = useMapStore.getState()
      if (storeState.isClickToAddWaypoint) {
        const ray = viewer.camera.getPickRay(click.position)
        if (!ray) return
        const cartesian = viewer.scene.globe.pick(ray, viewer.scene)
        if (cartesian) {
          const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
          const lon = Cesium.Math.toDegrees(cartographic.longitude)
          const lat = Cesium.Math.toDegrees(cartographic.latitude)

          const customStop: ScienceStop = {
            id: `custom-stop-${Date.now()}`,
            name: `EVA Point (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`,
            lat,
            lon,
            elevation: Math.round(cartographic.height) || -2520,
            targetType: 'Delta Scarp',
            scienceGoal: 'Crew-selected field reconnaissance target for regolith & sedimentary bedding',
            minerals: ['Hydrated Silicates', 'Basaltic Fines'],
            geologicUnit: 'Crater Floor / Delta Marginal',
            organicsPotential: 'Moderate',
            povImageUrl: 'https://mars.nasa.gov/system/resources/detail_files/26058_PIA24750-web.jpg',
            povImageCaption: 'Astronaut vantage point toward localized delta stratification.',
            samplePriority: 2,
            hazardMetrics: {
              slopeDegrees: 7.2,
              rockDensityScore: 0.35,
              thermalInertia: '310',
              radiationDoseRate: 24.2,
            },
          }

          addScienceStop(customStop)
          toggleClickToAddMode()
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    return () => {
      handler.destroy()
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy()
      }
      viewerRef.current = null
    }
  }, [])

  // 2. Sync imagery layers to store toggles & opacity sliders
  useEffect(() => {
    const applyLayer = (
      layerRef: React.MutableRefObject<Cesium.ImageryLayer | null>,
      layerId: string,
      scale = 1.0
    ) => {
      const il = layerRef.current
      if (!il) return
      il.show = layers[layerId]?.visible ?? true
      il.alpha = (layers[layerId]?.opacity ?? 1.0) * scale
    }

    applyLayer(basemapLayerRef,  'basemap',   1.0)
    applyLayer(slopeLayerRef,    'slope',     0.55)
    applyLayer(mineralsLayerRef, 'minerals',  0.40)
    applyLayer(thermalLayerRef,  'surface',   0.45)
    applyLayer(geologicLayerRef, 'geologic',  0.35)
    // Note: weather (MEDA) and radiation (RAD) are shown as entity HUDs, not imagery tiles.
  }, [
    layers.basemap?.visible,  layers.basemap?.opacity,
    layers.slope?.visible,    layers.slope?.opacity,
    layers.minerals?.visible, layers.minerals?.opacity,
    layers.surface?.visible,  layers.surface?.opacity,
    layers.geologic?.visible, layers.geologic?.opacity,
  ])

  // 3. Render Hazard Zones
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    // Remove existing hazard entities
    const hazardEntities = viewer.entities.values.filter((e) =>
      e.id.startsWith('hazard-zone-')
    )
    hazardEntities.forEach((e) => viewer.entities.remove(e))

    // Check layer visibility
    const slopeVisible = layers.slope?.visible
    const surfaceVisible = layers.surface?.visible
    const opacity = layers.slope?.opacity || 0.7

    JEZERO_HAZARD_ZONES.forEach((zone) => {
      // Determine if this hazard should be displayed based on layer toggles
      if (zone.type === 'steep_scarp' && !slopeVisible) return
      if (zone.type === 'dust_sink' && !surfaceVisible) return

      const degreesArray: number[] = []
      zone.coordinates.forEach(([lat, lon]) => {
        degreesArray.push(lon, lat)
      })

      const fillColor =
        zone.riskLevel === 'critical'
          ? Cesium.Color.RED.withAlpha(0.35 * opacity)
          : Cesium.Color.ORANGE.withAlpha(0.35 * opacity)

      const outlineColor =
        zone.riskLevel === 'critical'
          ? Cesium.Color.RED.withAlpha(0.9)
          : Cesium.Color.ORANGE.withAlpha(0.9)

      // Add polygon
      viewer.entities.add({
        id: `hazard-zone-${zone.id}`,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(degreesArray),
          material: fillColor,
          outline: true,
          outlineColor,
          outlineWidth: 2,
          height: 10,
        },
      })

      // Add label at centroid
      const centerLat =
        zone.coordinates.reduce((acc, c) => acc + c[0], 0) / zone.coordinates.length
      const centerLon =
        zone.coordinates.reduce((acc, c) => acc + c[1], 0) / zone.coordinates.length

      viewer.entities.add({
        id: `hazard-zone-label-${zone.id}`,
        position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 50),
        label: {
          text: `⚠️ ${zone.name}`,
          font: 'bold 16px system-ui, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, 0),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 1.0,
          backgroundColor: new Cesium.Color(0, 0, 0, 0.65),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(8, 5),
        },
      })
    })
  }, [layers.slope?.visible, layers.slope?.opacity, layers.surface?.visible])

  // 3. Render CRISM Minerals & Geologic Spectral Overlay Polygons
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    const mineralEntities = viewer.entities.values.filter((e) =>
      e.id.startsWith('crism-mineral-')
    )
    mineralEntities.forEach((e) => viewer.entities.remove(e))

    if (!layers.minerals?.visible) return

    const opacity = layers.minerals.opacity || 0.8

    // Visual indicators for clay and carbonate zones
    const mineralOutcrops = [
      {
        id: 'clays-footprint',
        name: 'CRISM: Fe/Mg-Smectites',
        color: Cesium.Color.CYAN.withAlpha(0.3 * opacity),
        outline: Cesium.Color.CYAN,
        coords: [77.428, 18.452, 77.436, 18.457, 77.438, 18.451, 77.430, 18.448],
      },
      {
        id: 'carbonates-footprint',
        name: 'CRISM: Mg-Carbonates',
        color: Cesium.Color.MAGENTA.withAlpha(0.3 * opacity),
        outline: Cesium.Color.MAGENTA,
        coords: [77.415, 18.465, 77.423, 18.471, 77.425, 18.463, 77.417, 18.460],
      },
    ]

    mineralOutcrops.forEach((mo) => {
      viewer.entities.add({
        id: `crism-mineral-${mo.id}`,
        polygon: {
          hierarchy: Cesium.Cartesian3.fromDegreesArray(mo.coords),
          material: mo.color,
          outline: true,
          outlineColor: mo.outline,
          outlineWidth: 2,
          height: 15,
        },
      })
    })
  }, [layers.minerals?.visible, layers.minerals?.opacity])

  // 5. Weather (MEDA) — show wind direction indicators over Jezero
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    const existing = viewer.entities.values.filter(e => e.id.startsWith('meda-'))
    existing.forEach(e => viewer.entities.remove(e))

    if (!layers.weather?.visible) return

    // Wind-rose indicators at key positions across Jezero
    const windStations = [
      { id: 'jezero-center',  lat: 18.4447, lon: 77.4508, label: 'MEDA: 4.2 m/s SW\n–55°C | 730 Pa' },
      { id: 'delta-front',    lat: 18.460,  lon: 77.430,  label: 'MEDA: 3.8 m/s SW\n–51°C | 731 Pa' },
      { id: 'kodiak-butte',   lat: 18.4284, lon: 77.4308, label: 'MEDA: 5.1 m/s W\n–58°C | 729 Pa' },
    ]

    windStations.forEach(ws => {
      viewer.entities.add({
        id: `meda-${ws.id}`,
        position: Cesium.Cartesian3.fromDegrees(ws.lon, ws.lat, 120),
        label: {
          text: ws.label,
          font: 'bold 15px system-ui, monospace',
          fillColor: Cesium.Color.fromCssColorString('#7dd3fc'),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 1.0,
          backgroundColor: new Cesium.Color(0, 0.08, 0.25, 0.85),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(10, 6),
        },
      })
    })
  }, [layers.weather?.visible, layers.weather?.opacity])

  // 6. Radiation (RAD) — heat-map circles showing dose rate zones
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    const existing = viewer.entities.values.filter(e => e.id.startsWith('rad-'))
    existing.forEach(e => viewer.entities.remove(e))

    if (!layers.radiation?.visible) return

    const opacity = layers.radiation?.opacity ?? 1.0

    // Radiation dose rate zones (µSv/hr) across the EVA area
    const radZones = [
      { id: 'open-plain',   lat: 18.4447, lon: 77.4508, dose: 24.1, r: 0.012 },
      { id: 'scarp-shadow', lat: 18.455,  lon: 77.420,  dose: 18.6, r: 0.008 },
      { id: 'high-ground',  lat: 18.428,  lon: 77.448,  dose: 27.3, r: 0.009 },
    ]

    radZones.forEach(rz => {
      // Color: green (low) → yellow → red (high)
      const t = Math.min((rz.dose - 15) / 15, 1)
      const color = new Cesium.Color(t, 1 - t * 0.7, 0, 0.28 * opacity)
      const outline = new Cesium.Color(t, 1 - t * 0.7, 0, 0.9)

      viewer.entities.add({
        id: `rad-zone-${rz.id}`,
        position: Cesium.Cartesian3.fromDegrees(rz.lon, rz.lat, 10),
        ellipse: {
          semiMajorAxis: rz.r * 111000,
          semiMinorAxis: rz.r * 111000 * 0.85,
          material: color,
          outline: true,
          outlineColor: outline,
          height: 10,
        },
      })

      viewer.entities.add({
        id: `rad-label-${rz.id}`,
        position: Cesium.Cartesian3.fromDegrees(rz.lon, rz.lat, 150),
        label: {
          text: `☢ ${rz.dose} µSv/hr`,
          font: 'bold 15px system-ui, sans-serif',
          fillColor: new Cesium.Color(1, 0.9 - t * 0.5, 0.1, 1),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 1.0,
          backgroundColor: new Cesium.Color(0.1, 0, 0, 0.75),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(8, 5),
        },
      })
    })
  }, [layers.radiation?.visible, layers.radiation?.opacity])

  // 7. Render Active Route Polyline & Waypoints
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return

    // Clear old route entities
    const routeEntities = viewer.entities.values.filter(
      (e) =>
        e.id.startsWith('route-line-') ||
        e.id.startsWith('route-node-') ||
        e.id.startsWith('stop-pin-') ||
        e.id.startsWith('stop-label-')
    )
    routeEntities.forEach((e) => viewer.entities.remove(e))

    // Draw route polyline if available
    if (activeRouteResult && activeRouteResult.waypoints.length > 0) {
      const positions = activeRouteResult.waypoints.map((wp) =>
        Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, 25)
      )

      viewer.entities.add({
        id: `route-line-${activeRouteResult.id}`,
        polyline: {
          positions,
          width: 5,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.25,
            color: Cesium.Color.fromCssColorString('#00f0ff'), // Vibrant cyan astronaut path
          }),
        },
      })
    }

    // Render planned science stops
    plannedStops.forEach((stop, idx) => {
      const isSelected = selectedStop?.id === stop.id
      const isHab = stop.targetType === 'Hab'

      const pinColor = isHab
        ? Cesium.Color.fromCssColorString('#10b981') // Emerald Hab
        : isSelected
        ? Cesium.Color.fromCssColorString('#ef4444') // Red Selected
        : Cesium.Color.fromCssColorString('#f59e0b') // Amber Stop

      // Stop Point Entity
      viewer.entities.add({
        id: `stop-pin-${stop.id}-${idx}`,
        name: `stop-data-${stop.id}`,
        position: Cesium.Cartesian3.fromDegrees(stop.lon, stop.lat, 40),
        point: {
          pixelSize: isSelected ? 16 : isHab ? 14 : 11,
          color: pinColor,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      })

      // Stop Label Entity
      viewer.entities.add({
        id: `stop-label-${stop.id}-${idx}`,
        position: Cesium.Cartesian3.fromDegrees(stop.lon, stop.lat, 80),
        label: {
          text: `${isHab ? '🏠' : idx} ${stop.name.split(' (')[0]}`,
          font: 'bold 15px system-ui, sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -22),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scale: 1.0,
          backgroundColor: new Cesium.Color(0, 0, 0, 0.7),
          showBackground: true,
          backgroundPadding: new Cesium.Cartesian2(10, 6),
        },
      })
    })
  }, [activeRouteResult, plannedStops, selectedStop])

  return (
    <div className="relative w-full h-full select-none overflow-hidden rounded-xl border border-mars-dust/20 shadow-2xl">
      <div ref={containerRef} className="w-full h-full" />

      {/* Tap Mode Active Banner */}
      {isClickToAddWaypoint && (
        <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-20">
          <div className="bg-red-600/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg border border-red-300 animate-pulse flex items-center gap-2">
            <span>🎯 WAYPOINT TAP ACTIVE: Click anywhere on Jezero Crater to place stop</span>
          </div>
        </div>
      )}

      {/* Loading state overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30 pointer-events-none">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-mars-surface">Loading Jezero Delta 3D Surface...</p>
          </div>
        </div>
      )}
    </div>
  )
}

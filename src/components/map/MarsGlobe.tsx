import React, { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { useMapStore } from '@/stores/map-store'

// Cesium CSS loader
let cesiumCssLoaded = false

const loadCesiumCss = () => {
  if (cesiumCssLoaded) return
  cesiumCssLoaded = true

  const cesiumCssLink = document.createElement('link')
  cesiumCssLink.rel = 'stylesheet'
  cesiumCssLink.href = 'https://cesium.com/downloads/cesiumjs/releases/1.146/Build/Cesium/Widgets/widgets.css'
  document.head.appendChild(cesiumCssLink)
}

export const MarsGlobe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const [loading, setLoading] = useState(true)

  // Subscribe to store for routes and waypoints
  const { routes, waypoints, selectedRoute } = useMapStore()

  useEffect(() => {
    // Load Cesium CSS
    loadCesiumCss()

    if (!containerRef.current) return

    // Configure Cesium Ion access token
    const cesiumToken = import.meta.env.VITE_CESIUM_ION_TOKEN || ''

    // Initialize Cesium Viewer
    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayerPicker: false,
      timeline: false,
      animation: false,
      fullscreenButton: true,
      vrButton: false,
      geocoder: false,
      homeButton: true,
      sceneModePicker: false,
      selectionIndicator: false,
      infoBox: false,
      navigationHelpButton: true,
      navigationInstructionsInitiallyVisible: false,
      scene3DOnly: true,
      radar: true,
      physicsAcceleration: true,
      enableLighting: true,
    })

    // Configure for Mars visualization
    // Mars ellipsoid: equatorial radius 3,396.19 km, polar radius 3,376.2 km
    // We use a custom ellipsoid by modifying the globe material
    const earthEquatorial = 6378137 // Earth's equatorial radius in meters
    const earthPolar = 6356752 // Earth's polar radius in meters
    const marsEquatorialRatio = 3396.19 / earthEquatorial
    const marsPolarRatio = 3376.2 / earthPolar

    const marsEllipsoid = new Cesium.Ellipsoid(
      marsEquatorialRatio,
      marsEquatorialRatio,
      marsPolarRatio
    )

    // Replace the globe with our Mars ellipsoid
    viewer.scene.destroyGlobe()
    viewer.scene.globe = new Cesium.Globe(marsEllipsoid)

    // Add Mars imagery from Cesium Ion if token is available
    if (cesiumToken) {
      Cesium.Ion.defaultAccessToken = cesiumToken

      // Try to add Mars imagery using Ion asset
      try {
        const marsImageryProvider = new Cesium.IonImageryProvider({
          assetId: 6391738018388480,
        })
        viewer.imageryLayers.addImageryProvider(marsImageryProvider)
      } catch (e) {
        console.warn('Could not load Mars imagery from Cesium Ion:', e)
      }
    }

    // Add visual styling for Mars surface - use Mars-like material
    viewer.scene.globe.tileCacheSize = 100
    // Set a Mars-like material color
    viewer.scene.globe.material = new Cesium.Material({
      fabricated: false,
    })

    // Set initial view to center of Mars (Prime Meridian)
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(0.0, 0.0, 3000000.0),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-0.6),
        roll: 0.0,
      },
    })

    // Enable terrain exaggeration
    viewer.scene.globe.verticalExaggeration = 1.1

    viewerRef.current = viewer
    setLoading(false)

    // Cleanup
    return () => {
      if (viewer) {
        viewer.destroy()
      }
    }
  }, [])

  // Render routes on the globe
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    // Get the current route if one is selected, or the last one
    const targetRoute = selectedRoute
      ? routes.find(r => r.id === selectedRoute)
      : routes[routes.length - 1]

    // Clear all existing route entities if no route to display
    if (!targetRoute) {
      viewer.entities.values.forEach(entity => {
        if (entity.id?.startsWith('route-polyline-') ||
            entity.id?.startsWith('waypoint-') ||
            entity.id?.startsWith('label-') ||
            entity.id?.startsWith('route-label-')) {
          viewer.entities.remove(entity)
        }
      })
      return
    }

    // Clear existing route entities for this route
    viewer.entities.values.forEach(entity => {
      if (entity.id?.startsWith(`route-polyline-${targetRoute.id}`) ||
          entity.id?.startsWith(`waypoint-${targetRoute.id}`) ||
          entity.id?.startsWith(`label-${targetRoute.id}`) ||
          entity.id?.startsWith(`route-label-${targetRoute.id}`)) {
        viewer.entities.remove(entity)
      }
    })

    // Create route polyline entity
    const positions = targetRoute.waypoints.map(wp =>
      Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, 0)
    )

    // Add polyline for route
    viewer.entities.add({
      id: `route-polyline-${targetRoute.id}`,
      polyline: {
        positions,
        width: 5,
        material: Cesium.Color.fromCssColorString('#CD853F'), // Mars gold/orange
        clampToGround: true,
      },
    })

    // Create waypoint markers
    targetRoute.waypoints.forEach((wp, index) => {
      const isStart = index === 0
      const isEnd = index === targetRoute.waypoints.length - 1

      // Determine marker color based on position
      const color = isStart
        ? Cesium.Color.fromCssColorString('#228B2F') // Green for start
        : isEnd
          ? Cesium.Color.fromCssColorString('#8B0000') // Dark red for end
          : Cesium.Color.fromCssColorString('#DAA520') // Gold for intermediate

      const labelText = isStart ? 'Start' : isEnd ? 'End' : ''

      // Create waypoint point entity
      viewer.entities.add({
        id: `waypoint-${targetRoute.id}-${wp.id}`,
        point: {
          pixelSize: isStart || isEnd ? 12 : 8,
          color: color.withAlpha(0.95),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        },
        position: Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, 100),
      })

      // Add label for start and end points
      if (isStart || isEnd) {
        viewer.entities.add({
          id: `label-${targetRoute.id}-${index}`,
          position: Cesium.Cartesian3.fromDegrees(wp.lon, wp.lat, 150),
          label: {
            text: labelText,
            font: '14px sans-serif',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -30),
            disableDepthTest: true,
          },
        })
      }
    })

    // Add route name label at center
    const centerIdx = Math.floor(targetRoute.waypoints.length / 2)
    const centerWp = targetRoute.waypoints[centerIdx]

    viewer.entities.add({
      id: `route-label-${targetRoute.id}`,
      position: Cesium.Cartesian3.fromDegrees(centerWp.lon, centerWp.lat, 200),
      label: {
        text: targetRoute.name,
        font: '14px sans-serif',
        fillColor: Cesium.Color.fromCssColorString('#CD853F'),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, 50),
        disableDepthTest: true,
      },
    })

  }, [routes, selectedRoute])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ position: 'relative' }}
    >
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-opace z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-mars-dust border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-mars-surface">Loading Mars Globe...</p>
          </div>
        </div>
      )}
    </div>
  )
}
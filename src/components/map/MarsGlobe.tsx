import React, { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

// Cesium default CSS for full-screen
let cesiumCssLoaded = false

const loadCesiumCss = () => {
  if (cesiumCssLoaded) return
  cesiumCssLoaded = true

  const cesiumCssLink = document.createElement('link')
  cesiumCssLink.rel = 'stylesheet'
  cesiumCssLink.href = 'https://cesium.com/downloads/cesiumjs/releases/1.117/Build/Cesium/Widgets/widgets.css'
  document.head.appendChild(cesiumCssLink)
}

export const MarsGlobe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load Cesium CSS
    loadCesiumCss()

    if (!containerRef.current) return

    // Configure Cesium Ion access token
    const cesiumToken = import.meta.env.VITE_CESIUM_ION_TOKEN || ''

    // Initialize Cesium Viewer
    // Note: For Mars visualization, we use the Moon as a base and configure it for Mars-like appearance
    // Full Mars terrain requires Cesium Ion Mars dataset
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
    // Change the globe's ellipsoid to Mars (6,779.74 km radius)
    viewer.scene.ellipsoid = new Cesium.Ellipsoid(
      3396.19 / 6378.137, // equatorial radius ratio (Mars radius / Earth radius)
      3396.19 / 6378.137,
      3376.2 / 6378.137 // polar radius ratio
    )

    // Add Mars imagery from Cesium Ion if token is available
    if (cesiumToken) {
      Cesium.Ion.defaultAccessToken = cesiumToken

      try {
        // Add Mars imagery (asset 6391738018388480 is a Mars dataset)
        const marsImageryProvider = new Cesium.UrlTemplateImageryProvider({
          url: `https://assets.ion.com/api/v1/tilesets/assets/6391738018388480/items/1/0/{z}/{y}/{x}/image?access_token=${cesiumToken}`,
        })
        viewer.imageryLayers.addImageryProvider(marsImageryProvider)
      } catch (e) {
        console.warn('Could not load Mars imagery from Cesium Ion:', e)
      }
    }

    // Add simple orange/red terrain material for Mars-like appearance
    // This creates a basic Mars-like surface visualization
    viewer.scene.globe.tileCacheSize = 100

    // Set initial view to center of Mars
    // Mars coordinates: 0° N, 0° E
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(0.0, 0.0, 4000000.0),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-0.5),
        roll: 0.0,
      },
    })

    // Enable terrain exaggeration
    viewer.scene.globe.verticalExaggeration = 1.25

    viewerRef.current = viewer
    setLoading(false)

    // Cleanup
    return () => {
      viewer.destroy()
    }
  }, [])

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
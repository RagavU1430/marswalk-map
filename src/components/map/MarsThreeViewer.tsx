import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useMapStore } from '@/stores/map-store'
import { JEZERO_SCIENCE_STOPS, ScienceStop } from '@/data/jezeroData'

export type CameraViewMode = 'orbital' | 'follow' | 'fps'

export interface MarsThreeViewerProps {
  isPlayingWalk?: boolean
  setIsPlayingWalk?: (playing: boolean) => void
  cameraView?: CameraViewMode
  setCameraView?: (mode: CameraViewMode) => void
  onWalkProgressChange?: (progress: number) => void
  showInternalOverlay?: boolean
}

export const MarsThreeViewer: React.FC<MarsThreeViewerProps> = ({
  isPlayingWalk: externalIsPlayingWalk,
  setIsPlayingWalk: externalSetIsPlayingWalk,
  cameraView: externalCameraView,
  setCameraView: externalSetCameraView,
  onWalkProgressChange,
  showInternalOverlay = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null)
  const { activeRouteResult, plannedStops, selectedStop, selectScienceStop } = useMapStore()

  const [internalIsPlayingWalk, setInternalIsPlayingWalk] = useState(false)
  const [internalCameraView, setInternalCameraView] = useState<CameraViewMode>('orbital')
  const [walkProgress, setWalkProgress] = useState(0)

  const isWalkingRef = useRef(false)
  const walkProgressRef = useRef(0)
  const cameraViewRef = useRef<CameraViewMode>('orbital')

  const isPlayingWalk = externalIsPlayingWalk !== undefined ? externalIsPlayingWalk : internalIsPlayingWalk
  const setIsPlayingWalk = externalSetIsPlayingWalk || setInternalIsPlayingWalk

  const cameraView = externalCameraView !== undefined ? externalCameraView : internalCameraView
  const setCameraView = externalSetCameraView || setInternalCameraView

  useEffect(() => {
    isWalkingRef.current = isPlayingWalk
  }, [isPlayingWalk])

  useEffect(() => {
    cameraViewRef.current = cameraView
  }, [cameraView])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    container.innerHTML = ''
    const width = container.clientWidth || 800
    const height = container.clientHeight || 600

    // 1. Scene, Fog & Renderer
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 3000)
    camera.position.set(0, 110, 180)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.4
    container.appendChild(renderer.domElement)

    // ── Procedural Sky Dome ───────────────────────────────────────────────
    // Martian sky: dusty butterscotch horizon, pinkish-tan zenith
    const skyGeo = new THREE.SphereGeometry(1400, 32, 16)
    skyGeo.scale(-1, 1, 1) // render inside
    const skyCanvas = document.createElement('canvas')
    skyCanvas.width = 2; skyCanvas.height = 512
    const skyCtx = skyCanvas.getContext('2d')!
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512)
    skyGrad.addColorStop(0.0,  '#c47a4a') // zenith – dusty pink
    skyGrad.addColorStop(0.35, '#d9834d') // mid
    skyGrad.addColorStop(0.65, '#e8955a') // near horizon warm
    skyGrad.addColorStop(0.85, '#f0a96a') // horizon haze glow
    skyGrad.addColorStop(1.0,  '#d8814a') // ground bleed
    skyCtx.fillStyle = skyGrad
    skyCtx.fillRect(0, 0, 2, 512)
    const skyTex = new THREE.CanvasTexture(skyCanvas)
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    scene.add(new THREE.Mesh(skyGeo, skyMat))
    scene.background = null

    // Layered fog: near-ground dust + distant atmospheric haze
    scene.fog = new THREE.FogExp2(0xd48060, 0.0028)

    // 2. Orbit Controls

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2 - 0.03
    controls.minDistance = 6
    controls.maxDistance = 450
    controls.target.set(0, 4, 0)

    // 3. Martian Atmosphere & Sunlight
    // Main Sun - low angled, warm Martian solar disk (38% of Earth brightness)
    const sunLight = new THREE.DirectionalLight(0xffd5a0, 2.6)
    sunLight.position.set(200, 120, 90)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 4096
    sunLight.shadow.mapSize.height = 4096
    sunLight.shadow.camera.near = 10
    sunLight.shadow.camera.far = 600
    sunLight.shadow.camera.left = -200
    sunLight.shadow.camera.right = 200
    sunLight.shadow.camera.top = 200
    sunLight.shadow.camera.bottom = -200
    sunLight.shadow.bias = -0.0006
    sunLight.shadow.normalBias = 0.03
    scene.add(sunLight)

    // Martian sky scatter — pinkish-tan hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xd4845a, 0x3a1510, 1.3)
    scene.add(hemiLight)

    // Weak bounce fill from warm regolith
    const fillLight = new THREE.DirectionalLight(0xb85c3a, 0.6)
    fillLight.position.set(-120, 30, -100)
    scene.add(fillLight)

    // 4. Procedural High-Detail Martian Terrain ─────────────────────────
    // Fractional Brownian Motion helpers (no external deps)
    const hash2 = (ix: number, iy: number): number => {
      let n = ix + iy * 57
      n = (n << 13) ^ n
      return 1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0
    }
    const smoothNoise = (x: number, y: number): number => {
      const ix = Math.floor(x), iy = Math.floor(y)
      const fx = x - ix, fy = y - iy
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
      return (
        hash2(ix, iy) * (1 - ux) * (1 - uy) +
        hash2(ix + 1, iy) * ux * (1 - uy) +
        hash2(ix, iy + 1) * (1 - ux) * uy +
        hash2(ix + 1, iy + 1) * ux * uy
      )
    }
    const fbm = (x: number, y: number, octaves: number): number => {
      let val = 0, amp = 0.5, freq = 1, max = 0
      for (let o = 0; o < octaves; o++) {
        val += smoothNoise(x * freq, y * freq) * amp
        max += amp
        amp *= 0.52; freq *= 2.1
      }
      return val / max
    }
    const warpFbm = (x: number, y: number): number => {
      // Domain-warped FBM for more organic ridges
      const qx = fbm(x, y, 5)
      const qy = fbm(x + 5.2, y + 1.3, 5)
      return fbm(x + 1.7 * qx, y + 1.7 * qy, 6)
    }

    const terrainSize = 380
    const terrainSegments = 220   // denser mesh = sharper detail
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments)
    terrainGeo.rotateX(-Math.PI / 2)

    // Shared height function used by terrain + rock placement + beacons
    const getTerrainY = (x: number, z: number): number => {
      const nx = x / terrainSize * 4.5
      const nz = z / terrainSize * 4.5

      // ① Large-scale Jezero delta descent (W→E slope)
      const deltaSlope = -(x / terrainSize) * 20

      // ② Domain-warped FBM for primary topography
      const primary = (warpFbm(nx + 10, nz + 10) - 0.5) * 36

      // ③ Smaller erosion channels overlaid
      const erosion = (fbm(nx * 2.8 + 3, nz * 2.8 + 7, 4) - 0.5) * 10

      // ④ Fine-grain aeolian ripples (wind dunes)
      const dunes = Math.sin(x * 0.18 + z * 0.09) * 1.4
                  + Math.cos(x * 0.11 - z * 0.14) * 0.8

      // ⑤ Crater depressions
      const cr1 = Math.sqrt((x - 48) ** 2 + (z + 36) ** 2)
      const crater1 = cr1 < 28 ? -Math.pow(Math.cos((cr1 / 28) * Math.PI * 0.5), 2) * 7 : 0
      const cr2 = Math.sqrt((x + 70) ** 2 + (z - 55) ** 2)
      const crater2 = cr2 < 18 ? -Math.pow(Math.cos((cr2 / 18) * Math.PI * 0.5), 2) * 4.5 : 0

      // ⑥ Delta scarp cliff (prominent geological boundary)
      const scarp = Math.tanh((x + 20) * 0.08) * 9

      return deltaSlope + primary + erosion + dunes + crater1 + crater2 + scarp
    }

    const pos = terrainGeo.attributes.position
    const heightCache: Float32Array = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i)
      const y = getTerrainY(x, z)
      pos.setY(i, y)
      heightCache[i] = y
    }
    terrainGeo.computeVertexNormals()

    // ── Terrain Texture: 4-layer Mars regolith ───────────────────────────
    const TEX_SIZE = 2048
    const textureCanvas = document.createElement('canvas')
    textureCanvas.width = TEX_SIZE; textureCanvas.height = TEX_SIZE
    const tCtx = textureCanvas.getContext('2d')!

    // Layer 1: Base iron-oxide regolith
    const bgGrad = tCtx.createRadialGradient(TEX_SIZE/2, TEX_SIZE/2, 60, TEX_SIZE/2, TEX_SIZE/2, 1100)
    bgGrad.addColorStop(0.0, '#c86238')
    bgGrad.addColorStop(0.3, '#b04e28')
    bgGrad.addColorStop(0.65, '#8c3a1a')
    bgGrad.addColorStop(1.0,  '#6a2510')
    tCtx.fillStyle = bgGrad
    tCtx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)

    // Layer 2: Lighter dust patches (wind deposits)
    tCtx.globalAlpha = 0.28
    for (let i = 0; i < 240; i++) {
      const cx = Math.random() * TEX_SIZE, cy = Math.random() * TEX_SIZE
      const r  = 18 + Math.random() * 90
      const g  = tCtx.createRadialGradient(cx, cy, 0, cx, cy, r)
      g.addColorStop(0, '#e8a060'); g.addColorStop(1, 'transparent')
      tCtx.fillStyle = g
      tCtx.beginPath(); tCtx.ellipse(cx, cy, r, r * (0.4 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2)
      tCtx.fill()
    }

    // Layer 3: Dark basalt veins / rock outcrops
    tCtx.globalAlpha = 0.22
    tCtx.fillStyle = '#3d1a0c'
    for (let i = 0; i < 60; i++) {
      const cx = Math.random() * TEX_SIZE, cy = Math.random() * TEX_SIZE
      const r = 6 + Math.random() * 28
      tCtx.beginPath(); tCtx.ellipse(cx, cy, r, r * (0.3 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2)
      tCtx.fill()
    }

    // Layer 4: Windblown stripe ripples
    tCtx.globalAlpha = 0.12
    tCtx.fillStyle = '#d87848'
    for (let s = 0; s < TEX_SIZE; s += 7) {
      const offset = Math.sin(s * 0.06) * 14
      tCtx.fillRect(0, s + offset, TEX_SIZE, 2.5)
    }

    // Layer 5: Grainy per-pixel stochastic noise for micro-detail
    tCtx.globalAlpha = 1
    const imgData = tCtx.getImageData(0, 0, TEX_SIZE, TEX_SIZE)
    const data = imgData.data
    for (let p = 0; p < data.length; p += 4) {
      const n = (Math.random() - 0.5) * 32
      data[p]   = Math.min(255, Math.max(0, data[p]   + n))
      data[p+1] = Math.min(255, Math.max(0, data[p+1] + n * 0.65))
      data[p+2] = Math.min(255, Math.max(0, data[p+2] + n * 0.35))
    }
    tCtx.putImageData(imgData, 0, 0)

    const marsTexture = new THREE.CanvasTexture(textureCanvas)
    marsTexture.wrapS = THREE.RepeatWrapping
    marsTexture.wrapT = THREE.RepeatWrapping
    marsTexture.repeat.set(10, 10)
    marsTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()

    // ── Roughness map: dark patches = smoother (fine dust), bright = rough rock ─
    const roughCanvas = document.createElement('canvas')
    roughCanvas.width = 512; roughCanvas.height = 512
    const rCtx = roughCanvas.getContext('2d')!
    rCtx.fillStyle = '#c0c0c0'
    rCtx.fillRect(0, 0, 512, 512)
    for (let p = 0; p < 512 * 512 * 4; p += 4) {
      const v = 150 + (Math.random() - 0.5) * 70
      rCtx.fillStyle = `rgb(${v|0},${v|0},${v|0})`
    }
    // lighter patches = rougher outcrops
    for (let i = 0; i < 80; i++) {
      const cx = Math.random() * 512, cy = Math.random() * 512
      const gr = rCtx.createRadialGradient(cx, cy, 0, cx, cy, 20 + Math.random() * 40)
      gr.addColorStop(0, 'rgba(240,240,240,0.9)'); gr.addColorStop(1, 'transparent')
      rCtx.fillStyle = gr
      rCtx.beginPath(); rCtx.arc(cx, cy, 40 + Math.random() * 30, 0, Math.PI * 2); rCtx.fill()
    }
    const roughMap = new THREE.CanvasTexture(roughCanvas)
    roughMap.wrapS = THREE.RepeatWrapping; roughMap.wrapT = THREE.RepeatWrapping
    roughMap.repeat.set(10, 10)

    const terrainMat = new THREE.MeshStandardMaterial({
      map: marsTexture,
      roughnessMap: roughMap,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: false,
      envMapIntensity: 0.4,
    })
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat)
    terrainMesh.receiveShadow = true
    scene.add(terrainMesh)

    // ── Dust / Sand Drift Plane (thin translucent layer for shallow dune valleys) ─
    const driftGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 1, 1)
    driftGeo.rotateX(-Math.PI / 2)
    const driftMat = new THREE.MeshStandardMaterial({
      color: 0xe8a060,
      transparent: true,
      opacity: 0.09,
      roughness: 1,
      metalness: 0,
      depthWrite: false,
    })
    const driftMesh = new THREE.Mesh(driftGeo, driftMat)
    driftMesh.position.y = -1.5
    scene.add(driftMesh)

    // 5. Realistic Martian Rock Clusters ─────────────────────────────────
    const rocksGroup = new THREE.Group()

    // Material palette: 3 rock types (basalt, sedimentary, iron-rich)
    const rockMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x4a2214, roughness: 0.95, metalness: 0.08, flatShading: true }), // dark basalt
      new THREE.MeshStandardMaterial({ color: 0x7a3e22, roughness: 0.88, metalness: 0.05, flatShading: true }), // mid regolith
      new THREE.MeshStandardMaterial({ color: 0x9a4e2a, roughness: 0.80, metalness: 0.12, flatShading: true }), // iron-rich
      new THREE.MeshStandardMaterial({ color: 0x3a1a0c, roughness: 0.97, metalness: 0.02, flatShading: true }), // very dark outcrop
    ]

    const rng = (s: number) => { const v = Math.sin(s) * 10000; return v - Math.floor(v) }

    for (let r = 0; r < 180; r++) {
      const radius = 0.35 + rng(r * 3.1) * 2.4
      const geoType = r % 3
      let geo: THREE.BufferGeometry

      if (geoType === 0) {
        geo = new THREE.DodecahedronGeometry(radius, r % 2 === 0 ? 1 : 0)
      } else if (geoType === 1) {
        // Flattened for sedimentary slabs
        geo = new THREE.BoxGeometry(radius * (1.4 + rng(r) * 0.8), radius * 0.4, radius * (1.2 + rng(r * 2) * 0.6))
      } else {
        geo = new THREE.IcosahedronGeometry(radius, 1)
      }

      // Deform vertices for organic shapes
      const rPos = geo.attributes.position
      for (let v = 0; v < rPos.count; v++) {
        const vx = rPos.getX(v), vy = rPos.getY(v), vz = rPos.getZ(v)
        const d = 1 + (rng(v * 0.7 + r) - 0.5) * 0.42
        rPos.setXYZ(v, vx * d, vy * (d * 0.75), vz * d)
      }
      geo.computeVertexNormals()

      const mat = rockMaterials[r % rockMaterials.length]
      const rock = new THREE.Mesh(geo, mat)

      const px = (rng(r * 5.7) - 0.5) * (terrainSize * 0.82)
      const pz = (rng(r * 9.3) - 0.5) * (terrainSize * 0.82)
      const py = getTerrainY(px, pz) + radius * 0.38

      rock.position.set(px, py, pz)
      rock.rotation.set(rng(r * 2) * Math.PI, rng(r * 4) * Math.PI, rng(r * 6) * 0.8)
      rock.castShadow = true
      rock.receiveShadow = true
      rocksGroup.add(rock)
    }

    // ── Layered Sedimentary Ridge Outcrops (Jezero delta-characteristic) ─
    for (let rc = 0; rc < 8; rc++) {
      const cx = (rng(rc * 13) - 0.5) * terrainSize * 0.6
      const cz = (rng(rc * 17) - 0.5) * terrainSize * 0.6
      const baseY = getTerrainY(cx, cz)
      const layers = 2 + Math.floor(rng(rc * 7) * 4)

      for (let l = 0; l < layers; l++) {
        const lw = 4 + rng(rc * l + 3) * 8, ld = 1 + rng(rc * l + 7) * 2.5, lh = 0.4 + rng(rc * l + 11) * 0.6
        const slabGeo = new THREE.BoxGeometry(lw, lh, ld)
        const slab = new THREE.Mesh(slabGeo, rockMaterials[l % 2 === 0 ? 1 : 3])
        slab.position.set(cx + (rng(rc + l) - 0.5) * 1.5, baseY + l * (lh + 0.1) + lh / 2, cz)
        slab.rotation.y = rng(rc + l * 3) * 0.4
        slab.castShadow = true
        slab.receiveShadow = true
        rocksGroup.add(slab)
      }
    }
    scene.add(rocksGroup)

    // 6. Coordinate Mapping (Jezero lat/lon to 3D Space)
    const mapTo3D = (lat: number, lon: number): THREE.Vector3 => {
      const scale = 3200
      const x = (lon - 77.4508) * scale
      const z = -(lat - 18.4447) * scale
      const y = getTerrainY(x, z) + 2.5
      return new THREE.Vector3(x, y, z)
    }

    // 7. Glowing Holographic Laser Path (Animated Energy Pulses)
    let pathCurve: THREE.CatmullRomCurve3 | null = null
    const routeGroup = new THREE.Group()
    scene.add(routeGroup)

    let pathPoints: THREE.Vector3[] = []
    if (activeRouteResult && activeRouteResult.waypoints.length > 0) {
      pathPoints = activeRouteResult.waypoints.map((wp) => mapTo3D(wp.lat, wp.lon))
      pathCurve = new THREE.CatmullRomCurve3(pathPoints, false)

      // Solid inner core laser tube
      const coreGeo = new THREE.TubeGeometry(pathCurve, 140, 0.4, 8, false)
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.95,
      })
      const coreMesh = new THREE.Mesh(coreGeo, coreMat)
      routeGroup.add(coreMesh)

      // Translucent outer glowing energy aura
      const auraGeo = new THREE.TubeGeometry(pathCurve, 140, 0.95, 8, false)
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0x0099ff,
        transparent: true,
        opacity: 0.35,
        wireframe: true,
      })
      const auraMesh = new THREE.Mesh(auraGeo, auraMat)
      routeGroup.add(auraMesh)
    }

    // 8. Holographic Science Waypoint Beacons
    const beaconObjects: { mesh: THREE.Object3D; stop: ScienceStop }[] = []
    const beaconsGroup = new THREE.Group()
    scene.add(beaconsGroup)

    plannedStops.forEach((stop, idx) => {
      const pos = mapTo3D(stop.lat, stop.lon)
      const isSelected = selectedStop?.id === stop.id
      const isHab = stop.targetType === 'Hab'

      const colorHex = isHab ? 0x10b981 : isSelected ? 0xef4444 : 0xf59e0b

      // Vertical holographic beam
      const beamGeo = new THREE.CylinderGeometry(0.2, 0.4, 22, 12)
      const beamMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.75,
      })
      const beamMesh = new THREE.Mesh(beamGeo, beamMat)
      beamMesh.position.set(pos.x, pos.y + 11, pos.z)
      beaconsGroup.add(beamMesh)

      // Rotating diamond marker
      const diamondGeo = new THREE.OctahedronGeometry(1.6)
      const diamondMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 1.6,
        roughness: 0.2,
      })
      const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat)
      diamondMesh.position.set(pos.x, pos.y + 23, pos.z)
      beaconsGroup.add(diamondMesh)

      // Concentric ground pulse rings
      const ringGeo = new THREE.RingGeometry(2.4, 3.2, 28)
      ringGeo.rotateX(-Math.PI / 2)
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.position.set(pos.x, pos.y + 0.15, pos.z)
      beaconsGroup.add(ringMesh)

      beaconObjects.push({ mesh: diamondMesh, stop })
    })

    // 9. High-Detail Articulated Astronaut Model (NASA EMU Spacesuit)
    const astronaut = new THREE.Group()
    const suitFabricMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8, // Off-white orthofabric
      roughness: 0.7,
      metalness: 0.05,
    })
    const goldVisorMat = new THREE.MeshStandardMaterial({
      color: 0xdfab2a, // Gold reflective extravehicular visor
      roughness: 0.1,
      metalness: 0.95,
    })
    const techMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.4,
      metalness: 0.6,
    })
    const redAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd92626, // Commander red stripe
      roughness: 0.5,
    })

    // Torso / Hard Upper Torso (HUT)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 1.0), suitFabricMat)
    torso.position.y = 2.4
    torso.castShadow = true
    astronaut.add(torso)

    // Red commander mission stripe on torso
    const redStripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.81, 1.02), redAccentMat)
    redStripe.position.set(0.35, 2.4, 0)
    astronaut.add(redStripe)

    // Chest Control Module (DCM) with status lights
    const dcm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.3), techMat)
    dcm.position.set(0, 2.6, 0.6)
    astronaut.add(dcm)

    const dcmLed = new THREE.Mesh(
      new THREE.SphereGeometry(0.08),
      new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    )
    dcmLed.position.set(0.18, 2.7, 0.76)
    astronaut.add(dcmLed)

    // Helmet & Extravehicular Visor Assembly (EVVA)
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 20), suitFabricMat)
    helmet.position.y = 3.8
    helmet.castShadow = true
    astronaut.add(helmet)

    const visor = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 20, 20, 0, Math.PI, 0, Math.PI * 0.65),
      goldVisorMat
    )
    visor.position.set(0, 3.8, 0.3)
    visor.rotation.x = -0.15
    astronaut.add(visor)

    // Helmet mounted spotlight
    const helmetLight = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.25), techMat)
    helmetLight.rotation.z = Math.PI / 2
    helmetLight.position.set(0.72, 4.2, 0.2)
    astronaut.add(helmetLight)

    // Portable Life Support System (PLSS) Backpack
    const plss = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.9, 0.8), techMat)
    plss.position.set(0, 2.5, -0.75)
    plss.castShadow = true
    astronaut.add(plss)

    // Oxygen Tank Cylinders on top of PLSS
    const o2Tank = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.2, 12), suitFabricMat)
    o2Tank.rotation.z = Math.PI / 2
    o2Tank.position.set(0, 3.4, -0.75)
    astronaut.add(o2Tank)

    // High-gain comms whip antenna
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8), techMat)
    antenna.position.set(0.48, 4.1, -0.75)
    astronaut.add(antenna)

    // Left Arm & Glove
    const armGeo = new THREE.CylinderGeometry(0.24, 0.22, 1.3, 8)
    const leftArm = new THREE.Mesh(armGeo, suitFabricMat)
    leftArm.position.set(-0.95, 2.2, 0)
    leftArm.rotation.z = 0.15
    astronaut.add(leftArm)

    // Right Arm & Glove
    const rightArm = new THREE.Mesh(armGeo, suitFabricMat)
    rightArm.position.set(0.95, 2.2, 0)
    rightArm.rotation.z = -0.15
    astronaut.add(rightArm)

    // Left & Right Boots
    const bootGeo = new THREE.BoxGeometry(0.5, 0.45, 0.8)
    const leftBoot = new THREE.Mesh(bootGeo, techMat)
    leftBoot.position.set(-0.4, 0.25, 0.1)
    astronaut.add(leftBoot)

    const rightBoot = new THREE.Mesh(bootGeo, techMat)
    rightBoot.position.set(0.4, 0.25, 0.1)
    astronaut.add(rightBoot)

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.26, 0.24, 1.5, 8)
    const leftLeg = new THREE.Mesh(legGeo, suitFabricMat)
    leftLeg.position.set(-0.4, 1.0, 0)
    astronaut.add(leftLeg)

    const rightLeg = new THREE.Mesh(legGeo, suitFabricMat)
    rightLeg.position.set(0.4, 1.0, 0)
    astronaut.add(rightLeg)

    // Position at beginning of traverse
    if (plannedStops.length > 0) {
      const startCoord = mapTo3D(plannedStops[0].lat, plannedStops[0].lon)
      astronaut.position.copy(startCoord)
    }
    scene.add(astronaut)

    // 10. Martian Dust Suspension ─────────────────────────────────────────
    // Fine high-altitude dust layer
    const dustCount = 1800
    const dustGeo = new THREE.BufferGeometry()
    const dustPos = new Float32Array(dustCount * 3)
    const dustSizes = new Float32Array(dustCount)
    for (let d = 0; d < dustCount; d++) {
      dustPos[d * 3]     = (Math.random() - 0.5) * 400
      dustPos[d * 3 + 1] = Math.random() * 80 + 2
      dustPos[d * 3 + 2] = (Math.random() - 0.5) * 400
      dustSizes[d] = 0.6 + Math.random() * 1.8
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dustMat = new THREE.PointsMaterial({
      color: 0xe09060,
      size: 1.2,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })
    const dustMotes = new THREE.Points(dustGeo, dustMat)
    scene.add(dustMotes)

    // Ground-level coarse sand particles (near-surface saltation layer)
    const sandCount = 600
    const sandGeo = new THREE.BufferGeometry()
    const sandPos = new Float32Array(sandCount * 3)
    for (let d = 0; d < sandCount; d++) {
      sandPos[d * 3]     = (Math.random() - 0.5) * 180
      sandPos[d * 3 + 1] = Math.random() * 3.5
      sandPos[d * 3 + 2] = (Math.random() - 0.5) * 180
    }
    sandGeo.setAttribute('position', new THREE.BufferAttribute(sandPos, 3))
    const sandMat = new THREE.PointsMaterial({ color: 0xc87040, size: 0.6, transparent: true, opacity: 0.7 })
    const sandMotes = new THREE.Points(sandGeo, sandMat)
    scene.add(sandMotes)

    // 11. Interactive Raycaster (Tap Waypoints)
    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const targets = beaconObjects.map((b) => b.mesh)
      const hits = raycaster.intersectObjects(targets)

      if (hits.length > 0) {
        const match = beaconObjects.find((b) => b.mesh === hits[0].object)
        if (match) {
          selectScienceStop(match.stop)
        }
      }
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)

    // 12. 60 FPS Render & Animation Loop
    let animId: number
    const clock = new THREE.Clock()

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop)
      const elapsed = clock.getElapsedTime()

      // Rotate holographic diamonds
      beaconObjects.forEach(({ mesh }) => {
        mesh.rotation.y += 0.025
        mesh.position.y += Math.sin(elapsed * 2.5) * 0.02
      })

      // Drift dust motes (wind direction: +X)
      const dArr = dustMotes.geometry.attributes.position.array as Float32Array
      for (let d = 0; d < dustCount * 3; d += 3) {
        dArr[d]     += 0.04 + Math.sin(elapsed * 0.3 + dArr[d + 2] * 0.01) * 0.02
        dArr[d + 1] += Math.sin(elapsed * 0.8 + d) * 0.005  // gentle vertical bob
        if (dArr[d] > 200) dArr[d] = -200
        if (dArr[d + 1] > 85) dArr[d + 1] = 2
      }
      dustMotes.geometry.attributes.position.needsUpdate = true

      // Drift ground sand saltation layer (faster, lower)
      const sArr = sandMotes.geometry.attributes.position.array as Float32Array
      for (let d = 0; d < sandCount * 3; d += 3) {
        sArr[d] += 0.09 + Math.random() * 0.04
        if (sArr[d] > 90) sArr[d] = -90
      }
      sandMotes.geometry.attributes.position.needsUpdate = true

      // Pulsing sky haze (opacity breath)
      dustMat.opacity = 0.42 + Math.sin(elapsed * 0.4) * 0.08

      // Walkthrough Animation Logic
      if (isWalkingRef.current && pathCurve) {
        // Increment progress (approx 1 min per full loop in demo speed)
        walkProgressRef.current = (walkProgressRef.current + 0.0012) % 1
        setWalkProgress(walkProgressRef.current)
        if (onWalkProgressChange) onWalkProgressChange(walkProgressRef.current)

        const currentPos = pathCurve.getPointAt(walkProgressRef.current)
        const tangent = pathCurve.getTangentAt(walkProgressRef.current)

        // Stride bobbing animation
        const strideBob = Math.sin(elapsed * 9) * 0.18
        astronaut.position.set(currentPos.x, currentPos.y + strideBob, currentPos.z)
        astronaut.lookAt(currentPos.clone().add(tangent))

        // Leg swing animation during walking
        leftLeg.rotation.x = Math.sin(elapsed * 9) * 0.45
        rightLeg.rotation.x = -Math.sin(elapsed * 9) * 0.45
        leftArm.rotation.x = -Math.sin(elapsed * 9) * 0.35
        rightArm.rotation.x = Math.sin(elapsed * 9) * 0.35

        // Camera Modes
        if (cameraViewRef.current === 'follow') {
          // 3rd Person Follow Chase Cam (Behind astronaut shoulders)
          const chaseCam = currentPos
            .clone()
            .add(tangent.clone().multiplyScalar(-18))
            .add(new THREE.Vector3(0, 8.5, 0))

          camera.position.lerp(chaseCam, 0.08)
          controls.target.lerp(currentPos, 0.08)
        } else if (cameraViewRef.current === 'fps') {
          // 1st Person Astronaut Helmet Visor Cam
          const eyeLevel = currentPos.clone().add(new THREE.Vector3(0, 3.8, 0))
          const lookAhead = eyeLevel.clone().add(tangent.clone().multiplyScalar(30))

          camera.position.lerp(eyeLevel, 0.12)
          camera.lookAt(lookAhead)
          controls.target.copy(lookAhead)
        }
      } else {
        // Reset limbs when standing still
        leftLeg.rotation.x = 0
        rightLeg.rotation.x = 0
        leftArm.rotation.x = 0
        rightArm.rotation.x = 0
      }

      controls.update()
      renderer.render(scene, camera)
    }
    renderLoop()

    // Handle Resize
    const onResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      cancelAnimationFrame(animId)
      renderer.dispose()
      marsTexture.dispose(); roughMap.dispose(); skyTex.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [activeRouteResult, plannedStops, selectedStop])

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-[#160907]">
      <div ref={mountRef} className="w-full h-full" />

      {/* Optional Legacy Internal Overlay */}
      {showInternalOverlay && (
        <>
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
            <div className="bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg border border-red-500/30 text-xs font-mono text-mars-surface shadow-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold text-white tracking-wide">Three.js Tactical Sandtable</span>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={() => setIsPlayingWalk(!isPlayingWalk)}
              className="px-4 py-2 rounded-xl text-xs font-bold font-mono bg-red-600 text-white"
            >
              <span>{isPlayingWalk ? '⏸ Pause' : '▶ Simulate Walk'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

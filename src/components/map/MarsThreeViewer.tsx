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
    // Authentic Martian butterscotch/dusty sky transition
    scene.background = new THREE.Color(0x28120c)
    const baseFog = new THREE.FogExp2(0x3e1c14, 0.003)
    scene.fog = baseFog

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 2000)
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
    renderer.toneMappingExposure = 1.25
    container.appendChild(renderer.domElement)

    // 2. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.06
    controls.maxPolarAngle = Math.PI / 2 - 0.03
    controls.minDistance = 6
    controls.maxDistance = 450
    controls.target.set(0, 4, 0)

    // 3. Martian Atmosphere & Sunlight
    // Main Sun - low angled, warm Martian solar disk
    const sunLight = new THREE.DirectionalLight(0xffeed8, 2.8)
    sunLight.position.set(150, 140, 110)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 10
    sunLight.shadow.camera.far = 500
    sunLight.shadow.camera.left = -160
    sunLight.shadow.camera.right = 160
    sunLight.shadow.camera.top = 160
    sunLight.shadow.camera.bottom = -160
    sunLight.shadow.bias = -0.0008
    scene.add(sunLight)

    // Sky dome ambient fill
    const hemiLight = new THREE.HemisphereLight(0xff9f73, 0x3d170d, 1.1)
    scene.add(hemiLight)

    const fillLight = new THREE.DirectionalLight(0xcc6644, 0.9)
    fillLight.position.set(-100, 50, -80)
    scene.add(fillLight)

    // 4. Procedural High-Detail Martian Terrain
    const terrainSize = 340
    const terrainSegments = 140
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments)
    terrainGeo.rotateX(-Math.PI / 2)

    // Generate high-fidelity Jezero Delta topography: delta fan + scarp wall + sand dunes
    const pos = terrainGeo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)

      // Main Jezero delta fan descent from West (-X) to East (+X)
      const deltaFan = -(x / terrainSize) * 22

      // Prominent Delta Scarp Cliff (the geological drop-off)
      const scarpEdge = Math.sin((x + 25) * 0.032) * Math.cos(z * 0.025) * 14

      // Transverse Aeolian Sand Dune ripples (characteristic of Jezero floor)
      const duneRipples = Math.sin(x * 0.22 + z * 0.12) * 1.1 + Math.cos(x * 0.14 - z * 0.18) * 0.9

      // Crater depressions
      const craterDist = Math.sqrt((x - 45) ** 2 + (z + 40) ** 2)
      const smallCrater = craterDist < 26 ? -Math.cos((craterDist / 26) * (Math.PI / 2)) * 6.5 : 0

      const y = deltaFan + scarpEdge + duneRipples + smallCrater
      pos.setY(i, y)
    }
    terrainGeo.computeVertexNormals()

    // High-resolution procedural texture generator for realistic Mars sand & regolith
    const textureCanvas = document.createElement('canvas')
    textureCanvas.width = 1024
    textureCanvas.height = 1024
    const tCtx = textureCanvas.getContext('2d')
    if (tCtx) {
      // Base layer gradient: rusty iron oxide to sedimentary tan
      const bgGrad = tCtx.createRadialGradient(512, 512, 50, 512, 512, 700)
      bgGrad.addColorStop(0, '#c75836') // Warm oxidized red
      bgGrad.addColorStop(0.35, '#a44122') // Standard Martian regolith
      bgGrad.addColorStop(0.7, '#853118') // Deep basaltic shadow
      bgGrad.addColorStop(1, '#66220e') // Basalt outcrop
      tCtx.fillStyle = bgGrad
      tCtx.fillRect(0, 0, 1024, 1024)

      // Layer 2: Windblown ripple striations
      tCtx.fillStyle = 'rgba(215, 115, 75, 0.18)'
      for (let s = 0; s < 1024; s += 8) {
        tCtx.fillRect(0, s + (Math.sin(s * 0.08) * 6), 1024, 3)
      }

      // Layer 3: Pebble & sand granule noise
      const imgData = tCtx.getImageData(0, 0, 1024, 1024)
      const data = imgData.data
      for (let p = 0; p < data.length; p += 4) {
        const noise = (Math.random() - 0.5) * 28
        data[p] = Math.min(255, Math.max(0, data[p] + noise))
        data[p + 1] = Math.min(255, Math.max(0, data[p + 1] + noise * 0.7))
        data[p + 2] = Math.min(255, Math.max(0, data[p + 2] + noise * 0.4))
      }
      tCtx.putImageData(imgData, 0, 0)
    }

    const marsTexture = new THREE.CanvasTexture(textureCanvas)
    marsTexture.wrapS = THREE.RepeatWrapping
    marsTexture.wrapT = THREE.RepeatWrapping
    marsTexture.repeat.set(8, 8)

    const terrainMat = new THREE.MeshStandardMaterial({
      map: marsTexture,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: false,
    })
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat)
    terrainMesh.receiveShadow = true
    scene.add(terrainMesh)

    // 5. Realistic Martian Rock Clusters (properly scaled, shaded & embedded)
    const rocksGroup = new THREE.Group()
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x5a2d1d,
      roughness: 0.92,
      metalness: 0.15,
      flatShading: true,
    })

    // Seeded random helper for natural organic distribution
    const rng = (s: number) => {
      const v = Math.sin(s) * 10000
      return v - Math.floor(v)
    }

    for (let r = 0; r < 90; r++) {
      // Natural varied boulder geometries
      const radius = 0.5 + rng(r * 3.1) * 1.8
      const geo = new THREE.DodecahedronGeometry(radius, 1)

      // Deform vertices slightly to make organic volcanic rocks
      const rPos = geo.attributes.position
      for (let v = 0; v < rPos.count; v++) {
        const vx = rPos.getX(v)
        const vy = rPos.getY(v)
        const vz = rPos.getZ(v)
        const d = 1 + (rng(v + r) - 0.5) * 0.35
        rPos.setXYZ(v, vx * d, vy * (d * 0.8), vz * d)
      }
      geo.computeVertexNormals()

      const rock = new THREE.Mesh(geo, rockMat)
      const px = (rng(r * 5.7) - 0.5) * (terrainSize * 0.78)
      const pz = (rng(r * 9.3) - 0.5) * (terrainSize * 0.78)

      // Approximate terrain height at (px, pz)
      const deltaFan = -(px / terrainSize) * 22
      const scarpEdge = Math.sin((px + 25) * 0.032) * Math.cos(pz * 0.025) * 14
      const py = deltaFan + scarpEdge + radius * 0.45

      rock.position.set(px, py, pz)
      rock.rotation.set(rng(r * 2), rng(r * 4), rng(r * 6))
      rock.castShadow = true
      rock.receiveShadow = true
      rocksGroup.add(rock)
    }
    scene.add(rocksGroup)

    // 6. Coordinate Mapping (Jezero lat/lon to 3D Space)
    const mapTo3D = (lat: number, lon: number): THREE.Vector3 => {
      const scale = 3200
      const x = (lon - 77.4508) * scale
      const z = -(lat - 18.4447) * scale

      const deltaFan = -(x / terrainSize) * 22
      const scarpEdge = Math.sin((x + 25) * 0.032) * Math.cos(z * 0.025) * 14
      const y = deltaFan + scarpEdge + 2.5
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

    // 10. Ambient Dust Particles (Drifting Martian Haze)
    const dustCount = 800
    const dustGeo = new THREE.BufferGeometry()
    const dustPos = new Float32Array(dustCount * 3)
    for (let d = 0; d < dustCount * 3; d += 3) {
      dustPos[d] = (Math.random() - 0.5) * 320
      dustPos[d + 1] = Math.random() * 60 + 1
      dustPos[d + 2] = (Math.random() - 0.5) * 320
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dustMat = new THREE.PointsMaterial({
      color: 0xdf845f,
      size: 1.4,
      transparent: true,
      opacity: 0.65,
    })
    const dustMotes = new THREE.Points(dustGeo, dustMat)
    scene.add(dustMotes)

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

      // Drift dust motes
      const dArr = dustMotes.geometry.attributes.position.array as Float32Array
      for (let d = 0; d < dustCount * 3; d += 3) {
        dArr[d] += 0.06
        if (dArr[d] > 160) dArr[d] = -160
      }
      dustMotes.geometry.attributes.position.needsUpdate = true

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

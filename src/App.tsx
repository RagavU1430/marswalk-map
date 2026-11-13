import React, { useState } from 'react'
import { MarsGlobe } from './components/map/MarsGlobe'
import { MarsThreeViewer, CameraViewMode } from './components/map/MarsThreeViewer'
import { LayerManager } from './components/ui/LayerManager'
import { RoutePlanner } from './components/ui/RoutePlanner'
import { RouteSelector } from './components/ui/RouteSelector'
import { EVADashboard } from './components/ui/EVADashboard'
import { StopCard } from './components/ui/StopCard'
import { MissionPresets } from './components/ui/MissionPresets'
import { useMapStore } from '@/stores/map-store'
import { MISSION_PRESETS } from '@/data/jezeroData'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

function MainApp() {
  const { activeRouteResult, activePresetId, loadPresetMission } = useMapStore()

  // UI state: Simple, clean and uncluttered
  const [engine, setEngine] = useState<'three' | 'cesium'>('three')
  const [isPlayingWalk, setIsPlayingWalk] = useState(false)
  const [cameraView, setCameraView] = useState<CameraViewMode>('orbital')
  const [walkProgress, setWalkProgress] = useState(0)
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<'missions' | 'router' | 'layers'>('missions')
  const [isMetricsOpen, setIsMetricsOpen] = useState(false)

  const distanceKm = activeRouteResult ? (activeRouteResult.totalDistanceMeters / 1000).toFixed(1) : '3.4'
  const durationHours = activeRouteResult ? (activeRouteResult.estimatedDurationMinutes / 60).toFixed(1) : '2.1'
  const safetyScore = activeRouteResult ? activeRouteResult.safetyScore : 99

  return (
    <div className="relative w-screen h-screen bg-[#0d0706] text-white font-sans overflow-hidden select-none">
      {/* 1. Full-Bleed 3D Canvas (Zero clutter, maximum immersion) */}
      <div className="absolute inset-0 z-0">
        {engine === 'three' ? (
          <MarsThreeViewer
            isPlayingWalk={isPlayingWalk}
            setIsPlayingWalk={setIsPlayingWalk}
            cameraView={cameraView}
            setCameraView={setCameraView}
            onWalkProgressChange={setWalkProgress}
            showInternalOverlay={false}
          />
        ) : (
          <MarsGlobe />
        )}
      </div>

      {/* 2. Sleek Floating Top Navigation Pill */}
      <header className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Brand & Mission Scenario Pill */}
        <div className="flex items-center gap-2 pointer-events-auto bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-2xl">
          <span className="text-xl">🪐</span>
          <div className="hidden sm:block">
            <span className="text-xs font-bold tracking-tight text-white block">Marswalk Map</span>
            <span className="text-[10px] text-mars-dust font-mono block -mt-0.5">Jezero Delta Front</span>
          </div>

          <div className="h-4 w-[1px] bg-white/15 mx-1 hidden sm:block" />

          {/* Preset Scenario Selector Dropdown */}
          <select
            value={activePresetId}
            onChange={(e) => loadPresetMission(e.target.value)}
            className="bg-white/5 border border-white/10 text-xs font-medium rounded-xl px-2.5 py-1 text-white hover:bg-white/10 transition cursor-pointer focus:outline-none"
          >
            {MISSION_PRESETS.map((p) => (
              <option key={p.id} value={p.id} className="bg-gray-950 text-white">
                {p.name} ({(p.estimatedDistanceKm).toFixed(1)} km)
              </option>
            ))}
          </select>
        </div>

        {/* Engine Switcher & Drawer Toggle */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* View Engine: 3D vs Globe */}
          <div className="bg-black/80 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-2xl flex text-xs font-mono">
            <button
              onClick={() => setEngine('three')}
              className={`px-3 py-1.5 rounded-xl transition ${
                engine === 'three'
                  ? 'bg-red-600 text-white font-bold shadow-md shadow-red-900/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🚀 3D Surface
            </button>
            <button
              onClick={() => setEngine('cesium')}
              className={`px-3 py-1.5 rounded-xl transition ${
                engine === 'cesium'
                  ? 'bg-red-600 text-white font-bold shadow-md shadow-red-900/50'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🌍 Globe
            </button>
          </div>

          {/* Side Drawer Toggle Button */}
          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className={`p-2 sm:px-3 sm:py-2 rounded-2xl border text-xs font-medium transition backdrop-blur-md shadow-2xl flex items-center gap-2 ${
              isSidePanelOpen
                ? 'bg-white text-black border-white shadow-white/10'
                : 'bg-black/80 text-white border-white/10 hover:bg-black/95'
            }`}
          >
            <span className="text-sm">≡</span>
            <span className="hidden sm:inline">Layers & Plan</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          </button>
        </div>
      </header>

      {/* 3. Floating Stop Card (Displays only when a science target is selected) */}
      <div className="absolute top-20 left-4 z-20 max-w-sm w-full pointer-events-auto">
        <StopCard />
      </div>

      {/* 4. Single Unified Bottom Dock (Controls + Telemetry in ONE clean bar) */}
      <footer className="absolute bottom-5 inset-x-0 z-30 flex flex-col items-center pointer-events-none px-4">
        {/* Optional Collapsible Detailed Metrics Card */}
        {isMetricsOpen && (
          <div className="max-w-md w-full mb-3 pointer-events-auto animate-fadeIn">
            <EVADashboard compactByDefault={false} />
          </div>
        )}

        {/* The Clean Unified Dock Capsule */}
        <div className="bg-black/85 backdrop-blur-xl border border-white/15 rounded-2xl px-3 py-2 shadow-2xl pointer-events-auto flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
          {/* Walk Play/Pause Button */}
          <button
            onClick={() => {
              if (engine !== 'three') setEngine('three')
              setIsPlayingWalk(!isPlayingWalk)
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition flex items-center gap-2 shadow-lg ${
              isPlayingWalk
                ? 'bg-red-600 text-white shadow-red-500/40 ring-1 ring-red-400'
                : 'bg-white/10 hover:bg-white/20 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            <span>{isPlayingWalk ? '⏸ Pause' : '▶ Walk EVA'}</span>
            {isPlayingWalk && (
              <span className="text-[10px] text-white opacity-80">
                {Math.round(walkProgress * 100)}%
              </span>
            )}
          </button>

          {/* Camera View Mode Pills (if in Three.js mode) */}
          {engine === 'three' && (
            <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/10 text-xs font-mono">
              <button
                onClick={() => setCameraView('orbital')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  cameraView === 'orbital' ? 'bg-white/20 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="Orbital Drone View"
              >
                Orbit
              </button>
              <button
                onClick={() => {
                  setCameraView('follow')
                  setIsPlayingWalk(true)
                }}
                className={`px-2.5 py-1 rounded-lg transition ${
                  cameraView === 'follow' ? 'bg-white/20 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="3rd-Person Chase Cam"
              >
                Chase
              </button>
              <button
                onClick={() => {
                  setCameraView('fps')
                  setIsPlayingWalk(true)
                }}
                className={`px-2.5 py-1 rounded-lg transition ${
                  cameraView === 'fps' ? 'bg-white/20 text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
                title="Visor First-Person POV"
              >
                POV
              </button>
            </div>
          )}

          {/* Quick Metrics Capsule */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono px-2 text-gray-300">
            <span className="flex items-center gap-1">
              <span className="text-gray-500">DIST:</span>
              <span className="text-white font-bold">{distanceKm} km</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-gray-500">TIME:</span>
              <span className="text-white font-bold">{durationHours} h</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-gray-500">STATUS:</span>
              <span className="text-emerald-400 font-bold">GO ({safetyScore}%)</span>
            </span>
          </div>

          {/* Details Toggle Button */}
          <button
            onClick={() => setIsMetricsOpen(!isMetricsOpen)}
            className="text-[11px] font-mono px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition"
          >
            {isMetricsOpen ? '▲ Close' : '▼ Stats'}
          </button>
        </div>
      </footer>

      {/* 5. Slide-Over Drawer: Opens only when user requests it */}
      {isSidePanelOpen && (
        <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] bg-black/90 backdrop-blur-2xl border-l border-white/15 shadow-2xl flex flex-col animate-fadeIn">
          {/* Drawer Header */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-black/40">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>Mission Controls & Layers</span>
            </h2>
            <button
              onClick={() => setIsSidePanelOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 flex items-center justify-center text-sm transition"
            >
              ✕
            </button>
          </div>

          {/* Tab Selector inside Drawer */}
          <div className="p-2 border-b border-white/10 bg-black/20 flex gap-1">
            <button
              onClick={() => setSidebarTab('missions')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                sidebarTab === 'missions'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🚀 Missions
            </button>
            <button
              onClick={() => setSidebarTab('router')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                sidebarTab === 'router'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🧭 Router
            </button>
            <button
              onClick={() => setSidebarTab('layers')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                sidebarTab === 'layers'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🛰 7 Layers
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {sidebarTab === 'missions' && (
              <>
                <MissionPresets />
                <RouteSelector />
                <EVADashboard compactByDefault={false} />
              </>
            )}

            {sidebarTab === 'router' && (
              <>
                <RoutePlanner />
                <RouteSelector />
              </>
            )}

            {sidebarTab === 'layers' && (
              <>
                <LayerManager />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  )
}

export default App

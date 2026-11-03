import React, { useState } from 'react'
import { MarsGlobe } from './components/map/MarsGlobe'
import { LayerManager } from './components/ui/LayerManager'
import { RoutePlanner } from './components/ui/RoutePlanner'
import { ModeSelector } from './components/ui/ModeSelector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

type Mode = 'globe' | 'tablet' | 'hud'

function App() {
  const [mode, setMode] = useState<Mode>('globe')
  const queryClient = new QueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative w-full h-full bg-opace text-mars-surface font-sans">
        <header className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-mars-shadow/80 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-mars-surface">
            🪐 Martian Map
            <span className="text-sm text-mars-dust block -mt-1">NASA Space Apps Challenge 2026</span>
          </h1>

          <ModeSelector mode={mode} setMode={setMode} />
        </header>

        <main className="pt-16 h-full">
          {mode === 'globe' && <MarsGlobe />}

          {mode === 'tablet' && (
            <div className="flex flex-col md:flex-row h-full p-4 gap-4">
              <div className="flex-1 relative">
                <MarsGlobe />
              </div>
              <div className="w-full md:w-96 flex flex-col gap-4 overflow-y-auto">
                <LayerManager />
                <RoutePlanner />
              </div>
            </div>
          )}

          {mode === 'hud' && (
            <div className="relative h-full">
              <MarsGlobe />
              <div className="absolute top-4 left-4 right-4 bottom-4 pointer-events-none">
                <RoutePlanner hudMode />
              </div>
            </div>
          )}
        </main>

        <footer className="absolute bottom-0 left-0 right-0 z-50 text-center py-2 text-sm text-mars-dust">
          Data from NASA, JPL, Cesium Ion, USGS | Built for Space Apps Challenge
        </footer>
      </div>
    </QueryClientProvider>
  )
}

export default App
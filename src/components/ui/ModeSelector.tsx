import React from 'react'

export type Mode = 'globe' | 'tablet' | 'three' | 'hud'

interface ModeSelectorProps {
  mode: Mode
  setMode: (mode: Mode) => void
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, setMode }) => {
  const modes: { id: Mode; label: string; icon: string }[] = [
    { id: 'tablet', label: 'Tablet Mode', icon: '📱' },
    { id: 'three', label: '3D Walk (Three.js)', icon: '🚀' },
    { id: 'globe', label: 'Globe View', icon: '🌍' },
    { id: 'hud', label: 'HUD Visor', icon: '🕶️' },
  ]

  return (
    <div className="flex gap-1.5 p-1 bg-black/60 border border-mars-dust/20 rounded-xl">
      {modes.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 ${
            mode === id
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40 ring-1 ring-red-400'
              : 'text-mars-dust hover:text-mars-surface hover:bg-white/5'
          }`}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

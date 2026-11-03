import React from 'react'

type Mode = 'globe' | 'tablet' | 'hud'

interface ModeSelectorProps {
  mode: Mode
  setMode: (mode: Mode) => void
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, setMode }) => {
  const modes: { id: Mode; label: string; icon: string }[] = [
    { id: 'globe', label: 'Globe View', icon: '🌍' },
    { id: 'tablet', label: 'Tablet Mode', icon: '📱' },
    { id: 'hud', label: 'HUD Mode', icon: '🕶️' },
  ]

  return (
    <div className="flex gap-2 p-1 bg-mars-shadow/50 rounded-lg">
      {modes.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            mode === id
              ? 'bg-mars-surface text-opace shadow-md'
              : 'text-mars-dust hover:text-mars-surface'
          }`}
        >
          <span className="mr-1">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  )
}
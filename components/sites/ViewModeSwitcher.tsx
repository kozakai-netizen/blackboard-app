'use client'

import { ViewMode, VIEW_MODES } from '@/lib/ui/viewModes'

interface ViewModeSwitcherProps {
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
}

export function ViewModeSwitcher({ currentMode, onModeChange }: ViewModeSwitcherProps) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm p-2">
      {(Object.keys(VIEW_MODES) as ViewMode[]).map((mode) => {
        const metadata = VIEW_MODES[mode]
        const isActive = currentMode === mode

        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            title={`${metadata.name} (${metadata.shortcut})`}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${isActive
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
              }
            `}
          >
            <span className="mr-2">{metadata.icon}</span>
            {metadata.name}
          </button>
        )
      })}
    </div>
  )
}

'use client'

import * as React from 'react'

interface ToggleGroupProps {
  type: 'single'
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface ToggleGroupItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const ToggleGroupContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
} | null>(null)

export function ToggleGroup({
  type,
  value,
  onValueChange,
  children,
  className,
  ...props
}: ToggleGroupProps) {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div className={className} role="group" {...props}>
        {children}
      </div>
    </ToggleGroupContext.Provider>
  )
}

export function ToggleGroupItem({ value, children, className }: ToggleGroupItemProps) {
  const context = React.useContext(ToggleGroupContext)
  if (!context) throw new Error('ToggleGroupItem must be used within ToggleGroup')

  const isActive = context.value === value

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      data-state={isActive ? 'on' : 'off'}
      className={className}
    >
      {children}
    </button>
  )
}

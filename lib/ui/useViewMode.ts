'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ViewMode, DEFAULT_VIEW_MODE, VIEW_MODES } from './viewModes'

const STORAGE_KEY = 'sites-view-mode'

export function useViewMode() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE)

  // Initialize view mode from URL or sessionStorage
  useEffect(() => {
    const urlView = searchParams.get('view') as ViewMode | null

    if (urlView && VIEW_MODES[urlView]) {
      setViewMode(urlView)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, urlView)
      }
    } else {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(STORAGE_KEY) as ViewMode | null
        if (stored && VIEW_MODES[stored]) {
          setViewMode(stored)
        }
      }
    }
  }, [searchParams])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = e.key.toUpperCase()
      const mode = Object.values(VIEW_MODES).find(m => m.shortcut === key)

      if (mode) {
        changeViewMode(mode.id)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, mode)
    }

    // Update URL query params
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', mode)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return {
    viewMode,
    setViewMode: changeViewMode,
    perPage: VIEW_MODES[viewMode].perPage
  }
}

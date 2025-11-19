'use client'

import { SiteTable } from '@/components/SiteTable'

interface Site {
  site_code: string
  site_name: string
  site_type?: string
  address?: string
  updated_at?: string
  created_at?: string
  status?: string
  manager_name?: string
  sub_manager_name?: string
  role?: string
  role_manager_name?: string
  owner_name?: string
  place_code?: string
}

interface ListViewProps {
  sites: Site[]
  placeCode: string
}

export function ListView({ sites, placeCode }: ListViewProps) {
  return (
    <div data-testid="sites-list">
      <SiteTable sites={sites} placeCode={placeCode} />
    </div>
  )
}

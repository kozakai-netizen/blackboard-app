'use client'

import { SiteCard } from '@/components/SiteCard'
import { cardSize } from '@/lib/ui/theme'

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

interface GridViewProps {
  sites: Site[]
  placeCode: string
  onCardClick?: (site: Site) => void
}

export function GridView({ sites, placeCode, onCardClick }: GridViewProps) {
  return (
    <div
      data-testid="sites-grid"
      className={cardSize.gridCols}
    >
      {sites.map((site) => (
        <SiteCard
          key={site.site_code}
          site={site}
          placeCode={placeCode}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  )
}

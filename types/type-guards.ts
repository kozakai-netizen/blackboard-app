// types/type-guards.ts
import type { BlackboardDesignSettings } from '@/types';
import type { LayoutConfig } from '@/types/layouts';

export function isLayoutConfig(
  s: BlackboardDesignSettings | LayoutConfig
): s is LayoutConfig {
  return !!s && typeof s === 'object' && 'board' in s && 'grid' in s;
}

export function isLegacyDesign(
  s: BlackboardDesignSettings | LayoutConfig
): s is BlackboardDesignSettings {
  return !!s && typeof s === 'object'
    && 'position' in s && 'width' in s && 'height' in s;
}

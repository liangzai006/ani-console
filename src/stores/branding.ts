import { create } from 'zustand'

export interface BrandingConfig {
  platform_name?: string
  logo_light_url?: string
  logo_dark_url?: string
  favicon_url?: string
  primary_color?: string
  secondary_color?: string
  icp_number?: string
}

interface BrandingState {
  branding: BrandingConfig | null
  setBranding: (branding: BrandingConfig | null) => void
}

export const useBrandingStore = create<BrandingState>((set) => ({
  branding: null,
  setBranding: (branding) => set({ branding }),
}))

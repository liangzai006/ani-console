import { create } from "zustand";
import type { BrandingConfig } from "@/api/branding";

export type { BrandingConfig } from "@/api/branding";

interface BrandingState {
  branding: BrandingConfig | null;
  setBranding: (branding: BrandingConfig | null) => void;
}

export const useBrandingStore = create<BrandingState>((set) => ({
  branding: null,
  setBranding: (branding) => set({ branding }),
}));

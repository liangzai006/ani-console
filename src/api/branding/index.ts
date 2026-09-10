import { coreRequest } from "@/api/request";
import type { BrandingConfig } from "./types";

export function getBranding(): Promise<BrandingConfig> {
  return coreRequest<BrandingConfig>("/branding", {
    method: "GET",
    auth: "public",
  });
}

export type { BrandingConfig } from "./types";

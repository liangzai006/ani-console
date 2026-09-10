import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranding } from "@/api/branding";
import { useBrandingStore } from "@/stores/branding";

export function useBranding() {
  const setBranding = useBrandingStore((s) => s.setBranding);

  const query = useQuery({
    queryKey: ["branding"],
    queryFn: getBranding,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (query.data) {
      setBranding(query.data);
      if (query.data.favicon_url) {
        let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = query.data.favicon_url;
      }
    }
  }, [query.data, setBranding]);

  return query;
}

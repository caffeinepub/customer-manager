import { useState } from "react";

const KEY = "business_logo";

export function useBusinessLogo() {
  const [logoUrl, setLogoUrlState] = useState<string | null>(() =>
    localStorage.getItem(KEY),
  );

  function setLogoUrl(url: string | null) {
    if (url) {
      localStorage.setItem(KEY, url);
    } else {
      localStorage.removeItem(KEY);
    }
    setLogoUrlState(url);
  }

  return { logoUrl, setLogoUrl };
}

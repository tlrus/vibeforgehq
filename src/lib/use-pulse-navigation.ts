"use client";
import { useEffect, useState } from 'react';

export function usePulseNavigation() {
  const [query, setQuery] = useState<URLSearchParams>(new URLSearchParams());
  useEffect(() => {
    const sync = () => setQuery(new URLSearchParams(location.search));
    sync(); window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  const navigate = (changes: Record<string, string | null>, replace = false) => {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') url.searchParams.delete(key); else url.searchParams.set(key, value);
    }
    if (url.href === location.href) return;
    window.history[replace ? 'replaceState' : 'pushState']({ ...window.history.state, pulseNavigation: true }, '', url);
    setQuery(new URLSearchParams(url.search));
  };
  return { query, navigate };
}

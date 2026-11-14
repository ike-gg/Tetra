import { queryOptions } from "@tanstack/react-query";

/**
 * One file of the local library with its saved settings, or `null` when this browser
 * doesn't have it. The editor page and the panel's breadcrumb read the same query. Read
 * once per visit (`gcTime: 0`): the settings saved while editing must be read fresh next
 * time, never served from the cache.
 */
export const libraryFileQueryOptions = (key: string) =>
  queryOptions({
    queryKey: ["library-file", key],
    // Imported lazily, so the panel's chrome doesn't ship the library
    queryFn: async () => (await import("./local-library")).openFromLibrary(key),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
  });

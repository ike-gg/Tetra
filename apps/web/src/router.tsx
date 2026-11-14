import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import { ApiError } from "@/lib/api";
import { isUnauthorized, sessionQueryOptions } from "@/lib/session";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  // A 401 from any request means the session ended mid-use: recheck it, so the panel's
  // gate falls back to the login screen
  const onError = (error: unknown) => {
    if (isUnauthorized(error)) {
      void queryClient.invalidateQueries({ queryKey: sessionQueryOptions.queryKey });
    }
  };

  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A 4xx won't change on retry; network errors and 5xx get the usual 3 tries
        retry: (failures, error) =>
          !(error instanceof ApiError && error.status < 500) && failures < 3,
      },
    },
  });

  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}

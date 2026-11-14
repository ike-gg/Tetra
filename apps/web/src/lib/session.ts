import { queryOptions } from "@tanstack/react-query";

import { ApiError, api, unwrap } from "@/lib/api";

export const isUnauthorized = (error: unknown) =>
  error instanceof ApiError && error.status === 401;

/** Whether the browser has a valid panel session. Only a 401 means "logged out". */
export const sessionQueryOptions = queryOptions({
  queryKey: ["session"],
  queryFn: async () => {
    try {
      await unwrap(api.me.state.$get());
      return true;
    } catch (error) {
      if (isUnauthorized(error)) return false;
      throw error;
    }
  },
  // The whole panel waits on this check: show a failure quickly, the screen has a retry
  retry: 1,
});

/** The logged-in user's Discord profile. */
export const meQueryOptions = queryOptions({
  queryKey: ["me"],
  queryFn: () => unwrap(api.me.$get()),
});

/**
 * The API's login endpoint, opened as a plain navigation (it redirects to Discord and
 * back). `returnPath` must be a panel path; the API ignores anything else.
 */
export const loginUrl = (returnPath: string) => {
  const url = api.auth.$url();
  url.searchParams.set("redirect", returnPath);
  return url.href;
};

/** `pathname` + `search` without the `error` param the OAuth callback adds. */
export const panelReturnPath = (pathname: string, search: string) => {
  const params = new URLSearchParams(search);
  params.delete("error");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export const logout = () => unwrap(api.auth.logout.$post());

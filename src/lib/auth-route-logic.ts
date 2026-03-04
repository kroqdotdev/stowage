export type RouteAuthState = {
  firstRun: boolean;
  isAuthenticated: boolean;
};

export function getProtectedAppRedirect(state: RouteAuthState): string | null {
  if (state.isAuthenticated) {
    return null;
  }

  return state.firstRun ? "/setup" : "/login";
}

export function getHomeRedirect(state: RouteAuthState): string {
  return getProtectedAppRedirect(state) ?? "/dashboard";
}

export function getLoginPageRedirect(state: RouteAuthState): string | null {
  if (state.isAuthenticated) {
    return "/dashboard";
  }

  if (state.firstRun) {
    return "/setup";
  }

  return null;
}

export function getSetupPageRedirect(state: RouteAuthState): string | null {
  if (state.isAuthenticated) {
    return "/dashboard";
  }

  if (!state.firstRun) {
    return "/login";
  }

  return null;
}

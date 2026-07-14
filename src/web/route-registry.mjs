function splitPath(pathname) {
  return String(pathname || '').split('/').filter(Boolean);
}

function matchParamRoute(route, pathSegments) {
  if (route.segments.length !== pathSegments.length) {
    return null;
  }

  const params = {};
  for (let index = 0; index < route.segments.length; index += 1) {
    const routeSegment = route.segments[index];
    const pathSegment = pathSegments[index];

    if (routeSegment.startsWith(':')) {
      params[routeSegment.slice(1)] = pathSegment;
      continue;
    }

    if (routeSegment !== pathSegment) {
      return null;
    }
  }

  return params;
}

export function createRouteRegistry() {
  const exactRoutes = new Map();
  const paramRoutes = [];

  function registerExactRoute(method, pathname, handler) {
    exactRoutes.set(`${method} ${pathname}`, handler);
  }

  function registerParamRoute(method, pattern, handler) {
    paramRoutes.push({
      handler,
      method,
      segments: splitPath(pattern),
    });
  }

  function matchRoute(method, pathname) {
    const exactHandler = exactRoutes.get(`${method} ${pathname}`);
    if (exactHandler) {
      return {
        handler: exactHandler,
        params: {},
      };
    }

    const pathSegments = splitPath(pathname);
    for (const route of paramRoutes) {
      if (route.method !== method) {
        continue;
      }

      const params = matchParamRoute(route, pathSegments);
      if (params) {
        return {
          handler: route.handler,
          params,
        };
      }
    }

    return null;
  }

  return {
    matchRoute,
    registerExactRoute,
    registerParamRoute,
  };
}

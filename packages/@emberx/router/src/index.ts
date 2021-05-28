import RouterJSRouter from './services/router';
import EmberXRoute from './route';
import RouteMapContext from './route-map-context';

export interface FreeObject {
  [propName: string]: any;
}

export interface RouteDefinition {
  path?: string;
  route: EmberXRoute | undefined;
  routeName: string;
  options?: FreeObject;
  indexRoute?: EmberXRoute;
}

export interface RouteRegistry {
  [propName: string]: RouteDefinition;
}

export interface routerJSRouteDefinition {
  path?: string;
  route: EmberXRoute | undefined;
  options?: FreeObject;
  routeName: string;
  nestedRoutes?: [routerJSRouteDefinition?];
}

// NOTE: check Route.toReadOnlyRouteInfo
// NOTE: there is this.recognizer.add (when recognizer is an instance via new RouteRecognizer())

// TODO: { path: '/' } resets the path, by default route($segment) is { path: /$segment }, also people can use '/:dynamic' or ':dynamic';
export default class EmberXRouter {
  static LOG_ROUTES = true;
  static LOG_MODELS = true;
  static SERVICES: FreeObject = {};
  static ROUTE_REGISTRY: RouteRegistry = {};
  static routerjs: RouterJSRouter | null = null;

  // static IS_TESTING() {
  //   return !!globalThis.QUnit;
  // }

  static start(
    arrayOfRouteDefinitions: Array<RouteDefinition> = [],
    routeMap: any = undefined
  ): RouterJSRouter {
    this.ROUTE_REGISTRY = {};

    let routeMapRegistry = routeMap ? this.map(routeMap) : {}; // move this to super.map since it just mutates the module
    let registry = this.definitionsToRegistry(arrayOfRouteDefinitions);
    let routerJSRouteArray = this.convertToRouterJSRouteArray(Object.assign(routeMapRegistry, registry));

    this.routerjs = new RouterJSRouter();
    this.routerjs.map(function (match) {
      RouteMapContext.map(RouteMapContext.map, match, routerJSRouteArray);
    });
    this.SERVICES.router = this.routerjs;

    return this.routerjs;
  }

  static definitionsToRegistry(arrayOfRouteDefinitions: Array<RouteDefinition> = []): RouteRegistry {
    arrayOfRouteDefinitions.forEach((routeElement: RouteDefinition) => {
      if (!routeElement.path) {
        throw new Error('One of the error definitions on Router.start(definitions[]) misses "path" key');
      }

      let routeName =
        routeElement.routeName ||
        createRouteNameFromRouteClass(routeElement.route) ||
        createRouteNameFromPath(routeElement.path as string); // NOTE: when /create-user type of paths are defined create a better routeName guess, should I replace order?
      let routeNameSegments = routeName.split('.');
      let normalizedPath = routeElement.path.startsWith('/') ? routeElement.path.slice(1) : routeElement.path;
      let routePathSegments = normalizedPath.split('/');

      routeNameSegments.reduce((currentSegment, routeSegment, index) => {
        const targetSegmentName = currentSegment ? `${currentSegment}.${routeSegment}` : routeSegment;
        const targetIndex = index >= routePathSegments.length ? routePathSegments.length - 1 : index;

        checkInRouteRegistryOrCreateRoute(this.ROUTE_REGISTRY, {
          routeName: targetSegmentName,
          options: { path: `/${routePathSegments[targetIndex]}` },
          route: index === routeNameSegments.length - 1 ? routeElement.route : undefined,
        } as routerJSRouteDefinition);

        if (currentSegment && !this.ROUTE_REGISTRY[`${currentSegment}.index`]) {
          this.ROUTE_REGISTRY[`${currentSegment}.index`] = {
            routeName: `${currentSegment}.index`,
            options: { path: '/' },
            route: undefined,
          };
        }

        return targetSegmentName;
      }, null);

      if (routeElement.indexRoute && routeName !== 'index') {
        this.ROUTE_REGISTRY[`${routeName}.index`] = {
          routeName: `${routeName}.index`,
          options: { path: '/' },
          route: routeElement.indexRoute,
        };
      }
    });

    return this.ROUTE_REGISTRY;
  }

  static convertToRouterJSRouteArray(routerRegistry: RouteRegistry): Array<routerJSRouteDefinition> {
    return Object.keys(routerRegistry)
      .sort()
      .reduce((result: Array<routerJSRouteDefinition>, routeName) => {
        let routeSegments = routeName.split('.');

        routeSegments.pop();

        if (routeSegments.length === 0) {
          return result.concat([
            { ...routerRegistry[routeName], nestedRoutes: [] } as routerJSRouteDefinition,
          ]);
        }

        let foundParentRoute = findNestedRoute(result, routeSegments);
        if (!foundParentRoute) {
          return result.concat([
            { ...routerRegistry[routeName], nestedRoutes: [] } as routerJSRouteDefinition,
          ]);
        }

        foundParentRoute.nestedRoutes.push({ ...routerRegistry[routeName], nestedRoutes: [] });

        return result;
      }, []);
  }

  static map(routerDefinition: () => {}): RouteRegistry {
    this.ROUTE_REGISTRY = {};

    RouteMapContext.ROUTE_REGISTRY = this.ROUTE_REGISTRY;
    routerDefinition.apply(RouteMapContext); // routerDefinition.apply(this); // TODO: this uses this.route

    return this.ROUTE_REGISTRY;
  }

  // NOTE: add to registry by demand
  // NOTE: add to actual router by demand
}

export function createRouteNameFromRouteClass(routeClass: EmberXRoute | void): string | void {
  if (routeClass) {
    return routeClass.constructor.name
      .replace(/Route$/g, '')
      .split('')
      .reduce((result, character, index) => {
        if (index === 0) {
          return character.toLowerCase();
        } else if (character.toUpperCase() === character) {
          return `${result}.${character.toLowerCase()}`;
        }

        return `${result}${character}`;
      }, '');
  }
}

export function createRouteNameFromPath(routePath: string): string {
  const targetPath = routePath[0] === '/' ? routePath.slice(1) : routePath;

  return targetPath.replace(/\//g, '.').replace(/:/g, '');
}

function checkInRouteRegistryOrCreateRoute(registry: RouteRegistry, targetRoute: routerJSRouteDefinition) {
  const routeName = targetRoute.routeName;
  const foundRoute = registry[targetRoute.routeName];

  if (!foundRoute) {
    registry[routeName] = targetRoute;

    return registry[routeName];
  }

  if (targetRoute.route) {
    if (foundRoute.route && foundRoute.routeName !== targetRoute.routeName) {
      console.log(
        `[WARNING]: ${routeName}.route already has ${foundRoute.routeName}. You tried to overwrite ${routeName}.route with ${targetRoute.routeName}`
      );
    }

    registry[routeName] = Object.assign(foundRoute, { route: targetRoute.route });
  }

  return registry[routeName];
}

function findNestedRoute(routerJSRouteArray: Array<routerJSRouteDefinition>, routeNameSegments: string[]) {
  return routeNameSegments.reduce((result, routeNameSegment, index) => {
    const target = result.nestedRoutes || routerJSRouteArray;
    const targetRouteName = index === 0 ? routeNameSegment : routeNameSegments.slice(0, index + 1).join('.');

    return target.find((routeObject: routerJSRouteDefinition) => routeObject.routeName === targetRouteName);
  }, {} as FreeObject);
}

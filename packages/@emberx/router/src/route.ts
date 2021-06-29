// TODO: test that redirect hook works and dont get called on parent routes
// NOTE: params could be manipulated if needed during routeWillChange and routeDidChange
// TODO: make this sticky params if needed
import RouterService from './router-service';
import Router from './index';
import EmberXComponent, { renderComponent, service } from '@emberx/component';

interface FreeObject {
  [propName: string]: any;
}

// class Args implements FreeObject {};

// TODO: maybe provide the associated routeInfo for router_js hacking and expose the Route itself on didTransition
// TODO: serialize() model hook might be needed to make default params and queryParams for the route links
// TODO: this must have .refresh() // NOTE: this has to be both on static and instance
// TODO: implement didTransition, error, loading, willTransition hooks // this has to be on the static? how will it interact with the instance
export default class Route extends EmberXComponent<FreeObject> {
  static router: RouterService;

  @service router: RouterService;

  static includes = {};
  static template = `
    <div id="intro">
      <h1 data-test-route-title>Route: {{this.routeName}}. This route is missing a template!</h1>
      <h5>Route params: {{debug @params}}</h5>
      <h5>Route queryParams: {{debug @queryParams}}</h5>
    </div>
  `;

  static modelFor(routeKey: string) {
    let transition = this.router.activeTransition;
    if (!transition || !transition.resolvedModels[routeKey]) {
      debugger;
      throw new Error(`@emberx/router Route: ${routeKey} not found on current transition!`);
    }

    return transition.resolvedModels[routeKey];
  }
  static getParams() {
    return {}; // TODO: build this up
  }
  static getQueryParams() {
    return {}; // TODO: build this up
  }

  // NOTE: maybe move these to instance methods only?
  static activate() {}

  static enter() {
    this.activate();
  }

  static deactivate(_transition: any) {}

  static exit(transition: any) {
    this.deactivate(transition);
  }

  static model() {
    return {};
  }

  static async setup(model: object, transition: FreeObject): Promise<any> {
    if (Router.LOG_MODELS) {
      console.log(`'${transition.targetName}' Route[model] is`, model);
      console.log(`'${transition.targetName}' Route[transition] is`, transition);
    }

    // @ts-ignore
    const containerElement: HTMLElement = globalThis.QUnit
      ? document.getElementById('ember-testing')
      : document.getElementById('app');

    if (!containerElement) {
      throw new Error(
        '#app or #ember-testing not found for the @emberx/router to boot/render the application!'
      );
    }

    containerElement.innerHTML = ''; // TODO: temporary solution, clear previously rendered route

    if (transition.routeInfos[transition.routeInfos.length - 1]._route === this) {
      debugger;
      await renderComponent(this, {
        element: containerElement as HTMLElement, // containerElement,
        args: { model: model || {}, params: this.getParams(), queryParams: this.getQueryParams() },
        owner: { services: Router.SERVICES },
      });
    }
  }

  static events = {
    finalizeQueryParamChange(queryParams: string[], finalQueryParams: FreeObject[]): boolean {
      // NOTE: what is the default implementation of this?
      // NOTE: gets called on transition, finalParams is what gets shown on the route?
      // NOTE: this makes to registered to router.state.queryParams ?
      console.log('finalizeQueryParamChange call');
      console.log('queryParams:', queryParams);
      console.log('finalQueryParams:', finalQueryParams);
      // TODO: cast parameters here correctly
      for (let key in queryParams) {
        let value = castCorrectValueFromString(queryParams[key]);
        if (value === null) {
          delete queryParams[key];
          delete finalQueryParams[key];
          delete this.router.queryParams[key];
        } else {
          Object.assign(this.router.queryParams, { [key]: value });
          finalQueryParams.push({ key: key, value });
        }
      }

      return true;
    },
    // TODO: refresh problem, sometimes it refreshes something it doesnt probably a problem with the transitionTo handler
    queryParamsDidChange(changed: FreeObject, all: FreeObject) {
      console.log('queryParamsDidChange', 'changed:', changed, 'all:', all);
      return true;
    },
  };

  get routeName(): string {
    return this.router.currentRouteName as string; // NOTE: there is also a this.router.routeName most likely
  }

  get model(): any {
    return this.args.model;
  }
}

function castCorrectValueFromString(value) {
  if (Array.isArray(value)) {
    return value.map((element) => castCorrectValueFromString(element));
  } else if (Number(value) && parseInt(value, 10)) {
    return Number(value);
  } else if (value === 'false') {
    return false;
  } else if (value === 'true') {
    return true;
  } else if (['null', 'undefined'].includes(value)) {
    return null;
  }

  return nilifyStrings(value);
}

function nilifyStrings(value) {
  if (value !== null && typeof value === 'object') {
    return Object.keys(value).reduce((object, key) => {
      return Object.assign(object, { [key]: nilifyStrings(value[key]) });
    }, {});
  } else if (value === '') {
    return null;
  }

  return value;
}

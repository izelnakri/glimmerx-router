import QUnit from 'qunitx';
import { setup } from 'qunit-dom/dist/addon-test-support/index';
import { setupRenderingTest as upstreamSetupApplicationTest } from '@emberx/test-helpers';

export default function setupTest(hooks, startRouterFunc) {
  setup(QUnit.assert);
  upstreamSetupApplicationTest(hooks, startRouterFunc);
}
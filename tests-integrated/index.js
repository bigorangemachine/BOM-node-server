import sequelize from '../src/sql/instance';
import AppFactory from '../src/server';
import uploadUtils from '../src/utils/upload';
import testUtils from '../tests/utils';
import integrationUtils from './utils';

const { shutDownApp } = integrationUtils;
const { sinonRestoreAndVerify } = testUtils;

describe('Application Start Up', () => {
  let stubs;
  let mocks;
  beforeEach(() => {
    stubs = {};
    mocks = {};
  });
  describe('Everything', () => {
    beforeEach(() => {
      if (process.env.NODE_ENV === 'test') {
        stubs.VerifyBucket = sinon.stub(uploadUtils, 's3VerifyBucket');
        stubs.VerifyBucket.resolves({});
        stubs.sequelizeAuth = sinon.stub(sequelize, 'authenticate');
        stubs.sequelizeAuth.resolves({});
        stubs.sequelizeQuery = sinon.stub(sequelize, 'query');
        stubs.sequelizeQuery.resolves({});
      }
    });
    it('is great', () => {
      const testDone = (resp) => {
        assert(!(resp instanceof Error), '🐶 ☕ 🔥 This Is Fine 🔥 ☕ 🐶');
        return Promise.resolve(resp);
      };
      const App = AppFactory();
      return App
        .then(shutDownApp.bind(null, App, testDone))
        .catch(shutDownApp.bind(null, App, testDone));

    });
  });
  // describe('Everything else', () => {});
  afterEach(() => {
    sinonRestoreAndVerify({ stubs, mocks });
  });
});

import chainUtils from '../../src/utils/chainUtils';
import testUtils from '../../tests/utils';

const  { chainAsPromise } = chainUtils;
const { sinonRestoreAndVerify, throwIfArrayContainsErrors, throwIfResolved } = testUtils;
const DEFAULT_ERR_TEXT = 'Something went wrong';

class TestTimedClass {
  constructor(opts = {}) {
    this.indexTable = opts.indexTable && opts.indexTable.constructor === Object ? { ...opts.indexTable } : {};
  }

  unchainedMethod(key, value) {
    if (!(key in this.indexTable)) {
      this.indexTable[key] = value;
    }
    return this;
  }

  callInQuarterSec(res) {
    return new Promise(resolve => {
      setTimeout(resolve.bind(null, res), 250);
    });
  }

  callInHalfSec(res) {
    return new Promise(resolve => {
      setTimeout(resolve.bind(null, res), 500);
    });
  }

  callInThreeQuarterSec(res) {
    return new Promise(resolve => {
      setTimeout(resolve.bind(null, res), 750);
    });
  }

  callInOneSec(res) {
    return new Promise(resolve => {
      setTimeout(resolve.bind(null, res), 1000);
    });
  }

  callInSecN(n, res) {
    return new Promise(resolve => {
      setTimeout(resolve.bind(null, res), 1000 * n);
    });
  }

  throwInQuarterSec(err = null) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(err || new Error(DEFAULT_ERR_TEXT));
      },
      250);
    });
  }

  throwInHalfSec(err = null) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(err || new Error(DEFAULT_ERR_TEXT));
      },
      500);
    });
  }

  throwInThreeQuarterSec(err = null) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(err || new Error(DEFAULT_ERR_TEXT));
      },
      750);
    });
  }

  throwInOneSec(err = null) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(err || new Error(DEFAULT_ERR_TEXT));
      },
      1000);
    });
  }

  throwInSecN(n, err = null) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(err || new Error(DEFAULT_ERR_TEXT));
      },
      1000 * n);
    });
  }
}
class TestWrappedTimedClass extends TestTimedClass{
  constructor(...args) {
    super(...args);

    Object.getOwnPropertyNames(TestTimedClass.prototype).forEach((key) => {
      // exclude!!!!
      if ([
          'constructor', // wrapping this is asking for trouble
          'unchainedMethod' // test the existing chained functions can work with a wrapped class
        ].includes(key)) {
        return;
      }

      // wrap everything else that should be returning a promise
      this[key] = (...a) => {
        return chainAsPromise(this, TestTimedClass.prototype[key].bind(this)(...a));
      };
    });
  }
}
describe('Chaining Utils Spec', function() {
  this.timeout(5000);
  const stubs = {};
  const mocks = {};


  let expectedUnhandled = [];
  let bouncePromiseSpy;
  let instanceBase;
  let instanceWrapped;
  let resultsWrapped;
  let resultsBase;

  const spyOnPromisePattern = (context, ...args) => {
    const result = [...args].pop(); // non-destructive
    const ident = [...args].shift(); // non-destructive
    context.history.push({
      ident,
      result,
      stamp: new Date(),
      args: args.slice(1, -1),
      // eslint-disable-next-line no-param-reassign
      index: context.called++
    });
    if (bouncePromiseSpy || !(result instanceof Error)) {
      return result; // we don't care if its an error we just want to bounce it
    }
    throw result;
  };
  const assertOnPromisePattern = (resp) => {
    if (bouncePromiseSpy && resp instanceof AssertionError) { throw resp; } // block recurrsion;
    if (resp instanceof Error && !expectedUnhandled.includes(resp)) { throw resp; } // block recurrsion;

    assert.equal(resultsWrapped.called, resultsBase.called, `Call count should match`);
    assert.deepEqual(resultsWrapped.history.map(item => item.ident), resultsBase.history.map(item => item.ident), `Chain event sequence should match`);
    // assert.fail(`Test Fail`);
    return Promise.resolve(bouncePromiseSpy);
  };
  beforeEach(() => {
    expectedUnhandled = [];
    bouncePromiseSpy = false;
    instanceBase = new TestTimedClass();
    instanceWrapped = new TestWrappedTimedClass();
    resultsWrapped = {
      history: [],
      called: 0,
      final: (...args) => spyOnPromisePattern(resultsWrapped, ...args)
    };
    resultsBase = {
      history: [],
      called: 0,
      final: (...args) => spyOnPromisePattern(resultsBase, ...args)
    };
  });
  describe('Match Promise Patterns', () => {
    const unhandledPromRejection = (err, prom) => {
      if (!expectedUnhandled.includes(err)) {
        console.log('Unhandled Promise Rejection ', prom.toString(),'\n',
          'err:', err.message,'\n',
          '', err.stack.split('\n')
            .filter(s => !s.includes('/node_modules/') && s.includes('/'))
            .map(s => s.trim()).slice(0,3)
        );
      }
    };
    beforeEach(() => {
      expectedUnhandled = [];
      process.on('unhandledRejection', unhandledPromRejection);
    });
    it('Double resolve chains correctly', () => {
      bouncePromiseSpy = true; // if there is an error just carry on
      return Promise.all([
        instanceWrapped.callInThreeQuarterSec()
          .then(resultsWrapped.final.bind(null, 'call-0'))
          .then(resultsWrapped.final.bind(null, 'call-1'))
          .catch(resultsWrapped.final),
        instanceBase.callInThreeQuarterSec()
          .then(resultsBase.final.bind(null, 'call-0'))
          .then(resultsBase.final.bind(null, 'call-1'))
          .catch(resultsBase.final)
      ])
      .catch((err) => {
        assert(!(err instanceof Error), `Could not run successfully; Rejected when should have resolved`);
      })
      .then((r) => {
        // we bounced the promises so we need to check the content
        assert(!(resultsWrapped.history.find(item => item.result instanceof Error)), `One of the wrapped results errored`);
        assert(!(resultsBase.history.find(item => item.result instanceof Error)), `One of the base results errored`);
        assert.deepEqual(resultsWrapped.history.map(item => item.ident), ['call-0', 'call-1'], `Wrapped results should only contain results that are 'call-#'`);
        assert.deepEqual(resultsBase.history.map(item => item.ident), ['call-0', 'call-1'], `Base results should only contain results that are 'call-#'`);
        return r;
      })
      .then(assertOnPromisePattern)
      .catch(assertOnPromisePattern);
    });

    it('Chain rejects correctly when first link rejects/throws', () => {
      const thrownErrorA = new Error(DEFAULT_ERR_TEXT);
      const thrownErrorB = new Error(DEFAULT_ERR_TEXT);
      expectedUnhandled.push(thrownErrorA);
      expectedUnhandled.push(thrownErrorB);
      // proms (the Promise.all) self bounce so we get all history possible and full chain runs
      return Promise.all([
        instanceWrapped.throwInThreeQuarterSec(thrownErrorA)
          .then(resultsWrapped.final.bind(null, 'call-0'))
          .then(resultsWrapped.final.bind(null, 'call-1'))
          .catch(resultsWrapped.final.bind(null, 'catch-2'))
          .catch(resultsWrapped.final.bind(null, 'catch-3'))
          .catch(e => e),
        instanceBase.throwInThreeQuarterSec(thrownErrorB)
          .then(resultsBase.final.bind(null, 'call-0'))
          .then(resultsBase.final.bind(null, 'call-1'))
          .catch(resultsBase.final.bind(null, 'catch-2'))
          .catch(resultsBase.final.bind(null, 'catch-3'))
          .catch(e => e)
      ])
      .then(throwIfArrayContainsErrors([thrownErrorA,thrownErrorB]))
      .then(throwIfResolved)
      .catch((err) => {
        if (err instanceof Error && !([thrownErrorA, thrownErrorB].includes(err))) { throw err; }
        assert([...resultsWrapped.history].find(item => item.result === thrownErrorA), `Wrapped results contains the wrong error`);
        assert([...resultsBase.history].find(item => item.result === thrownErrorB), `Base results contains the wrong error`);
        assert.notInclude(resultsWrapped.history.map(item => item.ident), ['call-0', 'call-1'], `Wrapped results should only contain results that are 'catch-#'`);
        assert.notInclude(resultsBase.history.map(item => item.ident), ['call-0', 'call-1'], `Base results should only contain results that are 'catch-#'`);
      })
      .catch(assertOnPromisePattern);
    });

    it('Chain rejects correctly when second link rejects/throws', () => {
      const thrownError = new Error(DEFAULT_ERR_TEXT);
      expectedUnhandled.push(thrownError);
      bouncePromiseSpy = true; // if there is an error just carry on -> results.final.bind(...)
      return Promise.all([
        instanceWrapped.callInThreeQuarterSec()
          .then(resultsWrapped.final.bind(null, 'call-0'))
          .catch(resultsWrapped.final.bind(null, 'catch-1'))
          .then(() => instanceWrapped.throwInThreeQuarterSec(thrownError))
          .then(resultsWrapped.final.bind(null, 'call-2'))
          .catch(resultsWrapped.final.bind(null, 'catch-3'))
          .catch(e => e),
        instanceBase.callInThreeQuarterSec()
          .then(resultsBase.final.bind(null, 'call-0'))
          .catch(resultsBase.final.bind(null, 'catch-1'))
          .then(() => instanceBase.throwInThreeQuarterSec(thrownError))
          .then(resultsBase.final.bind(null, 'call-2'))
          .catch(resultsBase.final.bind(null, 'catch-3'))
          .catch(e => e)
      ])
      .then(throwIfArrayContainsErrors([thrownError])) // need this because we bounce above with .catch(e => e)
      .then(throwIfResolved)
      .catch((err) => {
        if (err instanceof Error && ![thrownError].includes(err)) { throw err; }
        // console.log('resultsBase.history[1].result', resultsBase.history[1].result);
        assert.equal(resultsWrapped.history[1].result, thrownError, `Wrapped results contains the wrong error`);
        assert.equal(resultsBase.history[1].result, thrownError, `Base results contains the wrong error`);
        assert.notInclude(resultsWrapped.history.map(item => item.ident), ['catch-1', 'call-2'], `Wrapped results should only contain results that are 'catch-#'`);
        assert.notInclude(resultsBase.history.map(item => item.ident), ['catch-1', 'call-2'], `Base results should only contain results that are 'catch-#'`);
      })
      .catch(assertOnPromisePattern);
    });

    afterEach(() => {
      process.removeListener('unhandledRejection', unhandledPromRejection);
    });
  });
  describe('Async Magic', () => {});
  describe('Property Synchronization', () => {});
  afterEach(() => {
    sinonRestoreAndVerify({ stubs, mocks });
  });
});

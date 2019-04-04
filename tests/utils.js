const testUtils = {
  sinonRestoreAndVerify: ({ stubs, mocks }) => {
    Object.keys(stubs).forEach(key => {
      stubs[key].restore();
    });
    Object.keys(mocks).forEach(key => {
      mocks[key].verify();
      mocks[key].restore();
    });
  },
  throwIfResolved: () => {
    assert.fail(`Should not be resolved`);
  },
  throwIfArrayContainsErrors: (expected) => (results) => {
    if(results instanceof Error) {
      throw results;
    }
    if (expected instanceof Array) {
      for(const key in results) {
        if(results[key] instanceof Error && !expected.includes(results[key])) {
          throw results[key];
        }
      }
    }
    for(const key in results) {
      if(results[key] instanceof Error) {
        throw results[key];
      }
    }
    return results;
  }
};

export default testUtils;

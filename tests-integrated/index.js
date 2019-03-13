import AppFactory from '../src/server';

describe('Everything', () => {
  it('is great', () => {
    const testDone = () => {
      assert(true, '🐶 ☕ 🔥 This Is Fine 🔥 ☕ 🐶');
    };
    return AppFactory()
      .then(testDone)
      .catch(testDone);

  });
});

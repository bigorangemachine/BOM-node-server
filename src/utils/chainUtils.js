const chainUtils = {
  chainPromiseMiddleware: (orig, prom, extended) => {
    let promiseStatus = null;
    prom.then((r) => {
      promiseStatus = 'resolved';
      return r;
    }).catch((e) => {
      promiseStatus = 'rejected';
      throw e;
    });
    return (func, context, { ident, key }) => {
      if (ident === 'method' || extended[key] === func) { // extended shows up as a prop
        return (...args) => {
          // console.log('\n-------------------------');
          // console.log('APPLIED KEY: ', key,
          //   '\nARGS:', ...args.map(item => typeof item === 'function' ? item.toString().replace(/(\s\s|\t|\n|\r)+/gi, '').substring(0,150) : item));
          // console.log('promiseStatus: ', promiseStatus);
          if (extended[key] === func) {
            // just do the work if its an extended function (promise method)
            // console.log('prom chained!!!!');
            return func(...args); // .then(arg[0], arg[1]) || .catch(arg[0]) || .finally(arg[0])
          }
          if (promiseStatus) {
            // console.log('broken chain');
            return (orig.$rootObject || orig)[key](...args); // intentional -> error if not in the truthy object
          }
          // if(!promiseStatus) {
            // call the chained after resolved/rejected
            // console.log(`ELSE'd`,'\n',key, ...args,' -- prom: ', prom ? prom.constructor.name: typeof prom);
            extended.then(() => func(...args)); // .catch(() => func(...args));
          // }
          return context;
        };
      }
      return func;
    };
  },
  chainAsPromise: (orig, prom = Promise.resolve()) => {
    const extended = { then: prom.then.bind(prom), catch: prom.catch.bind(prom) };
    if (typeof prom.finally === 'function') extended.finally = prom.finally.bind(prom);
    if (typeof prom.done === 'function') extended.done = prom.done.bind(prom);
    const middleware = chainUtils.chainPromiseMiddleware(orig, prom, extended);
    return chainUtils.chainObject(orig, extended, middleware);
  },
  chainObject: (orig, extended = {}, cb = null) => {
    const output = Object.create(orig.$rootObject || orig); // do not reextend an extended object
    let middleware = cb;
    if (typeof middleware !== 'function') {
      middleware = v => v; // return it
    }

    Object.getOwnPropertyNames(orig.constructor.prototype).forEach(key => {
      Object.defineProperty(output, key, {
        get: () => {
          let gotVal = orig[key];
          if (key in orig) {
            gotVal = middleware(orig[key].bind(orig), output, { key, ident: 'method', extended });
          }
          return gotVal;
        }
      });
    });
    [...Object.keys({ ...orig, ...extended })].forEach(key => {
      Object.defineProperty(output, key, {
        get: () => {
          return middleware(orig[key] || extended[key], output, { key, ident:  'prop', extended });
        },
        set: (v) => {
          // eslint-disable-next-line no-param-reassign
          orig[key] = v;
        }
      });
    });
    Object.defineProperty(output, '$rootObject', {
      writable: false,
      configurable: false,
      enumerable: false,
      value: orig.$rootObject || orig
    });
    return output;
  }
};
export default chainUtils;

import Promise from 'bluebird';
// import constants from '../constants';

const utils = {
/**
 * @param {Array} promiseArray - A list of arrays for a dataset
 * @param {Function(promiseArrayItem)} promiseFactory - the callback for the above array item to create a new promise
   Must return a promise
 */
  serialPromiseMapper: (arr, fn) => arr.reduce(
    (p, v) => p.then(a => fn(v).then(r => a.concat([r]))),
    Promise.resolve([])
  ),
  /* eslint-disable no-return-assign */
  cleanExport: expObj => Object.keys(expObj).reduce((acc, key) => (key !== 'default' ? (() => acc)(acc[key] = expObj[key]) : acc), {})
  /* eslint-enable no-return-assign */
};


module.exports = utils;
module.exports.default = utils;

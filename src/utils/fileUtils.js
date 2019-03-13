import fs from 'fs';
import Promise from 'bluebird';
// import constants from '../constants';
/**
 * @namespace
 */
const fileUtils = {
  /**
   * @param {String} pathStr - Path to create
   * @param {Object} [events] - Event calblacks
   * @example <caption>Using events.</caption>
   * mkDirRecursive('./some/sub/dir', {
   *   onStart: (path = './') => {},
   *   onError: (error = new Error(), path = './') => {},
   *   onDir: ({path = './', isDir = false}, pathIn = './') => {},
   *   onFound: ({path = './', isDir = false}, index = 0, length = 0, dataPath = './') => {},
   *   onDirError: (error = new Error(), path = './') => {},
   *   onCreate: (path = './') => {},
   *   onCreateError: (error = new Error(), path = './') => {}
   * })
   * @param {function} [events.onStart] - Event 'onStart' calblack:
    when the promise to check that portion of the path is called
   * @param {function} [events.onError] -
    Event 'onError' calblack: when the promise to check portion of the path is rejected
   * @param {function} [events.onFound] - Event 'onFound' calblack: when that portion of the path was resolved after being found.
    In a sense its safe to continue onto the creation portion
   * @param {function} [events.onDir] - Event 'onDir' calblack: when its been determined its safe to create that portion of the path
   * @param {function} [events.onDirError] - Event 'onDirError' calblack:
    when there was an error related to trying to determine if it is safe to create that path
   * @param {function} [events.onCreate] - Event 'onCreate' calblack: when
    it was able to create that poriton of the path
   * @param {function} [events.onCreateError] - Event 'onCreateError' calblack: when an error
    was thrown related to create that poriton of the path
   */
  mkDirRecursive: (pathStr, events = {}) => {
    const paths = pathStr.split('/');
    const { isDirPromises } = paths.reduce((acc, seg, index) => {
      acc.path = `${acc.path}${seg}/`;
      const accPath = acc.path;

      (typeof events.onStart === 'function' ? events.onStart : () => {}).apply(null, [accPath]);
      acc.isDirPromises.push(fileUtils.isDir(accPath, events)
        .then((pathInfo) => pathInfo.isDir ? pathInfo: fileUtils.createDir(accPath, events))
        .then((data) => {
          (typeof events.onFound === 'function' ? events.onFound : () => {}).apply(null, [data, index, paths.length, data.path]);
          return data;
        })
        .catch(err => {
          (typeof events.onError === 'function' ? events.onError : () => {}).apply(null, [err, accPath]);
          throw err;
        })
      );
      return acc;
    }, { path: '', isDirPromises: []});
    return Promise.all(isDirPromises);
  },
  isDir: (pathIn, events = {}) => new Promise((resolve, reject) => {
    fs.stat(pathIn, (err, stat) => {
      if (err) { // not found code
        (typeof events.onDirError === 'function' ? events.onDirError : () => {}).apply(null, [err, pathIn]);
        if (!['ENOENT'].includes(err.code)) { // ENOENT: the directory isn't created
          reject(err);
          return;
        }
      }

      let output = { path: pathIn, isDir: false };
      if (stat && stat.isDirectory()) {
        output = { path: pathIn, isDir: true };
      }
      (typeof events.onDir === 'function' ? events.onDir : () => {}).apply(null, [output, pathIn]);
      resolve(output);
    });
  }),
  isFile: (pathIn, events = {}) => new Promise((resolve, reject) => {
    fs.stat(pathIn, (err, stat) => {
      if (err) { // not found code
        (typeof events.onFileError === 'function' ? events.onFileError : () => {}).apply(null, [err, pathIn]);
        if (!['ENOENT'].includes(err.code)) { // ENOENT: the file isn't there
          reject(err);
          return;
        }
      }

      let output = { path: pathIn, isFile: false };
      if (stat && stat.isFile()) {
        output = { path: pathIn, isFile: true };
      }
      (typeof events.onFile === 'function' ? events.onFile : () => {}).apply(null, [output, pathIn]);
      resolve(output);
    });
  }),
  createDir: (pathIn, events = {}) => new Promise((resolve, reject) => {
    fs.mkdir(pathIn, (err) => {
      if (err) {
        (typeof events.onCreateError === 'function' ? events.onCreateError : () => {}).apply(null, [err, pathIn]);
        if (!['EEXIST'].includes(err.code)) { // EEXIST: the directory already exists
          reject(err);
          return;
        }
      }
      (typeof events.onCreate === 'function' ? events.onCreate : () => {}).apply(null, [pathIn]);
      resolve({ path: pathIn, isDir: true });
    });
  }),

  /**
   * @param {Object[]} copyPaths - List/Set of sources & destinations
   * @property {string} copyPaths[].src - The source file path
   * @property {string} copyPaths[].dest - The destination file path
   * @returns {Promise}
   */
  mapCopy: copyPaths => Promise.all(copyPaths.map(copyJob => new Promise((resolve, reject) => {
        fs.copyFile(copyJob.src, copyJob.dest, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(copyJob);
        });
      })
      .catch(err => err) // bounce promise
    )
  )
  // if all errored give a proper reject!
  .then(results => results
    .filter(r => !(r instanceof Error)).length === 0 ? ((err) => {throw err;})(results[0]) : results
  ),
  sortDepth: paths => paths.sort((pA, pB) => {
    const aSplit = pA.split('/').length;
    const bSplit = pB.split('/').length;
    if (aSplit === bSplit) return 0;
    return aSplit > bSplit ? 1 : -1;
  })
};

module.exports = fileUtils;
module.exports.default = fileUtils;

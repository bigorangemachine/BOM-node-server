import path from 'path';
import constants from '../constants';

const { APP_ROOT } = constants;

const helpers = {
  verifyInstance: (self, opts) => {
    if (!self.loggingMiddleware && (opts.pino || opts.pinoMiddle)) {
      console.warn('Option \'loggingMiddleware\' was passed into constructor; option \'pino\' and \'pinoMiddle\' will ignored');
    }
    if (typeof self.imageAssetPath !== 'string' || !self.imageAssetPath.endsWith('/') || !self.imageAssetPath.startsWith('/')) {
      console.warn(`Instance property 'imageAssetPath' of '${self.imageAssetPath}' should be a string and start & end with '/'`);
    }
    try {
      path.resolve(self.uploadCachePath);
    } catch (pathUploadError) {
      if (pathUploadError instanceof Error) {
        console.warn(`Instance property 'uploadCachePath' of '${self.uploadCachePath}' could not be resolved`);
      }
    }
    if (!self.uploadCachePath.startsWith(APP_ROOT)) {
      console.warn(`Instance property 'uploadCachePath' of '${self.uploadCachePath}' doesn't contain 'APP_ROOT' of ${APP_ROOT}`);
    }
  },
  mockedLogger: (level) => (...args) => console.log(
    `[${level.toUpperCase()}] ${new Date().getTime()} -|- (${new Date().toISOString()
      .replace(/(T|Z)+/g, (match, p1) => [p1].reduce((acc, s) => `${acc}${s === 'T' ? ' T ' : ' Z'}`, ''))
    })\n`,
    ...args),
  middlewareMatchedLogging: () => (req, res, next) => {
  // mock out the logger to lessen if statements all over the place
    const matchedLogger = {
      info: process.env.VERBOSE ? helpers.mockedLogger('info') : () => {},
      log: process.env.VERBOSE ? helpers.mockedLogger('log') : () => {},
      warn: process.env.VERBOSE ? console.warn.bind(console) : () => {},
      error: console.error.bind(console)
    };
    res.log = matchedLogger;
    req.log = matchedLogger;
    next();
  }
};

export default helpers;

import Promise from 'bluebird';
import express from 'express';
import bodyParser from 'body-parser';
import pinoFactory from 'pino';
import pinoMiddleFactory from 'pino-http';
import multer from 'multer';
import sequelize from '../sql/instance';
import constants from '../constants';
import uploadUtils from '../utils/upload';
import expressUtils from '../utils/expressUtils';
import models from '../sql/models';
import helpers  from './helpers';

const {  FILE_CACHES } = constants;
const { UPLOAD_CACHE_PATH } = FILE_CACHES;

class App {
  /**
   * @param {Object} opts - App Configuration Options
   * @param {string} opts.awsRegionS3 - AWS S3 Bucket Region
   * @param {string} opts.awsAccessKeyIdS3 - AWS-SDK S3 Key/Pair for Key ID
   * @param {string} opts.awsSecretAccessKeyS3 - AWS-SDK S3 Key/Pair for IAM Secret
   * @param {string} opts.awsS3BucketRootDir - AWS S3 Root Directory: This APP uses environments within the same Bucket.
   * Ideally Production uses different SDK keys
   * @param {string} opts.awsS3Bucket - AWS S3 Bucket Name (unique ID to AWS)
   * @param {string} opts.s3 - s3 Object override
   * @param {string} opts.app - Express Object override. Defaults to: `express()`
   * @param {string} opts.port - s3 Object override Defaults to: `process.env.PORT` then to `3000`
   * @param {string} opts.models - Sequelize models overrride Defaults to: `import models from '../sql/models';`
   * @param {string} opts.imageAssetPath - Public facing image asset path prefix
   * @param {boolean} opts.useLogging - Turn on/off request logging
   * @param {object} opts.pino - Logger Instance defaults to dependency `pino`
   * @param {function} opts.pinoMiddle - Express-Logger Factory that defaults to dependency `express-pino-logger`
   * dependency which populates `{ logger: opts.pino }` option into middleware
   * @param {function} opts.loggingMiddleware - Logging Middleware to be used; overrides need for above `pino` and `pinoMiddle`
   * @param {string} opts.uploadCachePath - Uploading file cache path that defaults to constant string `FILE_CACHES.UPLOAD_CACHE_PATH`
   * @param {function} opts.uploadMiddleware - Uploading file Middleware to be used defaults to dependency `multer`
  */
  constructor(opts = {}) {
    this.opts = { ...opts };
    this.s3 = opts.s3 || null;
    if (!opts.s3) {
      const { s3, awsS3Bucket, awsS3BucketRootDir } = uploadUtils.s3Vars(opts);
      this.awsS3BucketRootDir = awsS3BucketRootDir;
      this.awsS3Bucket = awsS3Bucket;
      this.s3 = s3;
    }

    this.app = opts.app || express();
    this.port = opts.port || process.env.PORT || 3000;
    this.models = opts.models || models;
    this.imageAssetPath = opts.imageAssetPath || '/img/';
    this.authPasswordField = opts.authPasswordField || null;
    this.authUsernameField = opts.authUsernameField || null;

    this.uploadCachePath = opts.uploadCachePath || UPLOAD_CACHE_PATH;
    this.uploadMiddleware = (opts.uploadMiddleware || (dest => multer({ dest })))(this.uploadCachePath);

    this.useLogging = opts.useLogging || process.env.NODE_ENV !== 'local';
    this.loggingMiddleware = opts.loggingMiddleware || null;
    if (!this.loggingMiddleware) {
      this.pino = opts.pino;
      this.pinoMiddle = opts.pinoMiddle;
    }
    helpers.verifyInstance(this, opts);
    this.init();
  }

  // synconous start
  init() {
    this.middlewares = [];
    return this.initLogging();
  }

  initLogging() {
    if (!this.loggingMiddleware) {
      this.loggingMiddleware = (this.pinoMiddle || pinoMiddleFactory)({
        logger: this.pino || pinoFactory()
      });
    }
    return this;
  }


  // asynconous start
  start() {
    const { app, port, awsS3Bucket, s3 } = this;

    return Promise.all([
      (new Promise((resolve, reject) => {
        app.listen(port, () => {
          console.log(`Listening on port ${port}`);
          resolve({ app, port });
        })
        .on('error', reject);
      })),
      sequelize.authenticate()
        .then(results => sequelize.query(`SET GLOBAL sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`, { raw: true }).then(results))
        .catch((err) => {
          process.env.VERBOSE && console.error('sequelize Could not authenticate', err.message || err.toString());
          throw err;
      }),
      uploadUtils.s3VerifyBucket({ s3, awsS3Bucket })
        .catch((err) => {
          process.env.VERBOSE && console.error('AWS-S3 Could not connect', err.message || err.toString());
          throw err;
        })
    ])
    .then(([ appResult, mysqlResult, s3Result ]) => ({ appResult, mysqlResult, s3Result }));
  }

  setup() {
    // returns this
    return this.setupMiddlewares()
      .setupLogging()
      .setupRemoteBucketToLocalCaching()
      .setupCORSMiddlewares() // keep this the VERY LAST middleware!!!
      .setupRoutes()
      .setupErrorsMiddlewares(); // this must be the VERY LASY ANYTHING!
  }

  setupRoutes() {
    const { app } = this;
    this.applyAppHandler('routes');
    app.all('*', expressUtils.catchAll);
    return this;
  }

  setupErrorsMiddlewares() {
    const { app } = this;
    this.applyAppHandler('errors');
    app.use(expressUtils.doCatchableErrors);
    return this;
  }

  // // Serve any cached files
  setupRemoteBucketToLocalCaching() {
    return this.applyAppHandler('bucket-cache-middleware');
  }

  setupCORSMiddlewares() {
    const { app } = this;
    if (process.env.FRONTEND_URL) {
      app.use(expressUtils.doCORS());
      app.use(expressUtils.doOptionsMiddleware()); // keep this the VERY LAST
    }
    return this;
  }

  setupLogging() {
    const { app, loggingMiddleware } = this;
    if (!this.useLogging) {
      console.log('Logging has been disabled');
      app.use(helpers.middlewareMatchedLogging());
    } else {
      app.use(loggingMiddleware);
    }

    return this;
  }

  setupMiddlewares() {
    const { app } = this;
    app.disable('x-powered-by');

    this.applyAppHandler('pre-parsers');

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    this.applyAppHandler('parsers');
    this.applyAppHandler('pre-middlewares');

    // custom middlewares
    expressUtils.setupRequestObjects({ app });
    expressUtils.setupRequestValidator({ app }, [this.imageAssetPath]);

    this.applyAppHandler('middlewares');

    return this;
  }

  registerAppHandler(ident, ...args) {
    const eventList = ['pre-parsers', 'parsers', 'pre-middlewares', 'middlewares', 'bucket-cache-middleware', 'routes'];
    if(!ident || !eventList.includes((ident || '').toLowerCase())) {
      console.warn(`Ident: '${ident}' is not in the list of allowed events`);
      return this;
    }
    if(args.length === 0 || (typeof args[args.length - 1] !== 'function' && !(args[args.length - 1] instanceof Array))) {
      console.warn(`When adding listener '${ident}': the last param must be a function`);
      return this;
    }
    const options = args[0].constructor === Object ? args[0] : null;
    const cb = args.slice(options ? 1 : 0, args.length);
    const opts = options && options.constructor === Object ? options : {};
    this.middlewares.push(...(cb instanceof Array ? cb : [cb])
      .filter(item => typeof item === 'function')
      .map(item => ({
        callback: item,
        type: ident,
        priority: typeof opts.priority === 'number' ? opts.priority : 0
      })));
    return this;
  }

  applyAppHandler(ident) {
    this.middlewares
      .filter(middleware => middleware.type === ident)
      .sort((a, b) => (b.priority - a.priority)) // highest to lowest
      .map(middleware => middleware.callback(this));
    return this;
  }
}

export default App;
export { helpers };

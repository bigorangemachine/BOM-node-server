import { Layer } from 'express';
import URL from 'url-parse';
import ExpressResponder from '../express/ExpressResponder';
import { ExpressRequestTypeError, AuthenticationError, ExpressRequestFileError } from '../customErrors';
import jsUtils from './jsUtils';

const expressUtils = {
  catchAll: (req, res) => {
    res.locals.responder.fail();
  },
  logoutRoute: (req, res) => {
    const { responder } = res.locals;
    req.logout();
    const output = responder.makeSuccessSchema({});
    output.redirect = '/';
    responder.respond(output, res);
  },
  isAuth: () => (req, res, next) => {
    if (!req.isAuthenticated()) {
      next(new AuthenticationError('Login Required'));
      return false;
    }
    next();
    return true;
  },
  maskKeys: (obj, keys = []) => (keys || [])
    .reduce((acc, key) => {
      acc[key] = jsUtils.objectKeyType(obj[key]);
      return acc;
    }, {}),
  reqInfoLogger: (deps, opts = {}) => (req, res, next) => {
    const excludeHeaderKeys = [
        'cookie',
        opts.tokenKey || 'authorization',
        ...((opts.infoLoggerMaskHeaders instanceof Array && opts.infoLoggerMaskHeaders) || [])
      ].filter(exHeaderKey => (exHeaderKey in req.headers));
    const objectMasker = process.env.REQUEST_LOGGING_MASK ? jsUtils.objectKeyType : arg => arg;
    (process.env.VERBOSE ? req.log.info(
      'REQUEST URI: ', req.originalUrl, '\n',
      'METHOD: ', req.method, '\n',
      'REQUEST BODY: ', objectMasker(req.body), '\n',
      ...(process.env.REQUEST_LOGGING_SESSION || process.env.VERBOSE === 'all' ? ['SESSION: ', req.session, '\n'] : []),
      ...((process.env.REQUEST_LOGGING_COOKIE || process.env.VERBOSE === 'all') && (req.cookies || req.headers.cookie) ? ['COOKIE:', objectMasker(req.cookies || req.headers.cookie), '\n'] : []),
      'HEADERS: ', {
        // mask out the cookies
        ...{ ...req.headers, cookie: objectMasker(req.cookies ? req.cookies : req.headers.cookie) },
        ...(expressUtils.maskKeys(req.headers, excludeHeaderKeys))
      }, '\n',
      ...(opts.constructor === Object && Object.keys(opts).length > 0 ? ['CONFIGURE OPTIONS: ', objectMasker(opts) ] : [])
    ) : null);
    next();
  },
  handleRequestWithoutMultipartFiles: deps => (req, res, next) => {
    const { uploadMiddleware } = deps;
    if (req.is('multipart/form-data')) {
      uploadMiddleware.none()(req, res, err => next(err || null));
      return;
    }
    next();
  },
  handleRequestWithMultipartFiles: deps => (fields, req, res, next) => {
    const { uploadMiddleware } = deps;
    if (fields.length === 0) {
      expressUtils(deps, req, res, next);
      return;
    }
    if (req.is('multipart/form-data')) {
      uploadMiddleware
        .fields(fields
          .map(field => typeof field === 'string' ? { name: field, maxCount: 1 } : field)
        )(req, res, err => next(err || null));
      return;
    }
    next();
  },
  validateRequestType: (req, additionalTypes = []) => additionalTypes.concat(['application/json', 'multipart/form-data'])
    .filter(reqType => req.is(reqType)).length > 0,
  cleanMethod: (method) => {
    const cleanedMethod = method.toString().toUpperCase().trim();
    if (expressUtils.allowedMethods().includes(cleanedMethod)) { return cleanedMethod; }
    return null;
  },
  allowedMethods: (additional = []) => ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH'].concat(additional),
  doOptionsMiddleware: () => (req, res, next) => {
    if (expressUtils.cleanMethod(req.method) === 'OPTIONS') { // needed for CORS
      res.sendStatus(200);
      return;
    }
    next();
  },
  doCatchableErrors: (err, req, res, next) => {  // Custom Error Handling
    const { responder } = res.locals;
    const instances = [
      { abstract: ExpressRequestFileError, message: 'File Asset could not be found' },
      { abstract: ExpressRequestTypeError, message: 'Invalid Request Type' },
      { abstract: AuthenticationError, message: null }
    ].filter(inst => err instanceof inst.abstract);
    if (instances.length === 0) { // not a helpful error
      next(err);
      return;
    }
    responder.failAs(instances[0] && instances[0].message ? instances[0].message : err);
  },
  corsEnvUrlParse: req => {
    const origin =
      req.get('Origin') ||
      `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const injectReferredProps = urlStr => {
      // match the PORT & PROTOCOL to the referrer/orgin
      const myURL = new URL(urlStr);
      const originURL = new URL(origin);
      return `${originURL.protocol}//${myURL.hostname}${
        myURL.port !== '80' && myURL.port !== '443' && myURL.port.length > 0
          ? `:${myURL.port}`
          : myURL.port
      }`;
    };

    let foundUrl = process.env.FRONTEND_URL || process.env.NODE_ENV !== 'local' ? process.env.FRONTEND_URL : origin;
    if (foundUrl && typeof foundUrl === 'string') {
      if (foundUrl.includes(',')) {
        const arrayUrls = foundUrl
          .split(',')
          .map(url => url.trim())
          .filter(url => {
            // parseable ?
            try {
              ;(u => new URL(u))(url);
            } catch (e) {
              return false;
            }
            return true;
          })
          .map(url => injectReferredProps(url))
          .filter(url => url) // truthy?
          .filter(url => new URL(url).hostname === new URL(origin).hostname); // can only return 1
        foundUrl = arrayUrls.length > 0 ? arrayUrls[0] : foundUrl;
      } else {
        foundUrl = injectReferredProps(foundUrl);
      }
    }
    return foundUrl;
  },
  doCORS: () => (req, res, next) => {
    // allow CORS from ENV Variable FRONTEND_URL
    const myURLStr = expressUtils.corsEnvUrlParse(req);
    if (myURLStr) {
      res.header('Access-Control-Allow-Origin', myURLStr);
    }
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept'
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    next();
  },
  setupRequestObjects: ({ app }) => app.use((req, res, next) => { // use responder & setup locals
    const responder = new ExpressResponder({ res });
    res.locals = res.locals || {};
    req.locals = req.locals || {};
    res.locals.responder = responder;
    req.locals.responder = responder;
    // req.session = res.session || {}; // <- don't do this!!
    req.session.jwts = req.session.jwts && req.session.jwts.length > 0 ? req.session.jwts : [];

    next();
  }),
  matchUriAsExpress: (path, matchTo) => {
    try {
      return new Layer(path, {}, () => {}).match(matchTo);
    } catch (err) {
      return err;
    }
  },
  setupRequestValidator: ({ app }, exclusions = []) => app.use((req, res, next) => {
    if (!exclusions.find(ex => expressUtils.matchUriAsExpress(ex, req.url)) && !expressUtils.validateRequestType(req)) {
      next(new ExpressRequestTypeError('Invalid Request Type'));
      return;
    }
    next();
  })
};


module.exports = expressUtils;
module.exports.default = expressUtils;

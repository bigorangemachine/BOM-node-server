import expressSessionMiddleware from 'express-session';
import expressCookieParser from 'cookie-parser';

const helpers = {
  setupCookies: ({ app, cookieParser = expressCookieParser }) => ({ middlewares: [ app.use(cookieParser()) ] }),
  setupSession: (deps, opts = {}) => {
    const {
      app,
      // store = RedisStore,
      session = expressSessionMiddleware
    } = deps;
    const cookie = {
      ...( process.env.NODE_ENV !== 'local' && typeof opts.cookieSecure === 'string' ?
        { secure: opts.cookieSecure } :
        {}
      ),
      httpOnly: opts.cookieHttpOnly || false
    };
    const sessionOpts = {
      // store: store || RedisStore,
      secret: opts.secret || process.env.SESSION_SECRET,
      resave: opts.resave || true,
      saveUninitialized: opts.saveUninitialized || true,
      cookie
    };

    return { middlewares: [ app.use(session(sessionOpts)) ] };
  }
};

export default helpers;

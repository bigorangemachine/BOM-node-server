import  passport from 'passport';
import constants from '../../../constants';
import models from '../../../sql/models';
import { AuthenticationError } from '../../../customErrors';
import RESTRequestSchema from '../../../schemas/RESTRequestSchema';

const { META_KEYS } = constants;
const { UNAME } = META_KEYS.USER;

const helpers = {
  loginLocalAuthentication: (req, res, opts = {}) => helpers.triggerMiddleWareLocalStrategy(req, res, opts)
    .then(authUser => helpers.lookupUser(authUser, opts))
    .then(user => helpers.requestLogin(req, user, opts) // not needed? because of triggerMiddleWareLocalStrategy???
      .then(() => req.locals.authenticationContext.setCrudContext(user, user.userId))
      .then(() => user)
  ),
  requestLogin: (req, user, opts = {}) => new Promise((resolve, reject) => {
    req.login(user, (err) => { // serializeUser() from user.userId
      if (err) {
        req.log.error('localAuthentication helpers -> requestLogin -> res.login', err);
        reject(err);
        return;
      }
      helpers.setSessionPermissions(req, user.accessIndex || [], opts);
      resolve(user);
    });
  }),
  setSessionPermissions: (req, accessIndex, opts = {}) => {
    // eslint-disable-next-line no-param-reassign
    req.session[opts.sessionPermisionKey || 'permissions'] = {
      permsCache: opts.setPermissionsIntoSession ? accessIndex : [],
      size: accessIndex.length
    };
  },
  lookupUser: (user, opts = {}) => { // match serializeUser()
    const { User } = models;
    return User.login(user.userId, opts)
      .then(authentication => ({
        ...(user.isMatched ? { isMatched: user.isMatched } : {}),
        ...(user[UNAME] ? { [UNAME]: user[UNAME] } : {}),
        userId: user.userId,
        accessIndex: authentication.accessIndex
      }));
  },
  triggerMiddleWareLocalStrategy: (req, res, opts = {}) => new Promise((resolve, reject) => { // login by raw username & password
    const fakeNext = (err) => { // middleware escape hatch
      if (err) {
        console.log('localAuthentication -> routes -> triggerMiddleWareLocalStrategy fakeNext', err);
        reject(err);
        return;
      }
      resolve(); // next no error -> should not happen
    };
    // req.login() manually called!!!!!
    passport.authenticate(opts.passportAuth || 'local', (err, user) => {
      if (err || !user) {
        reject(new AuthenticationError());
        return;
      }
      resolve(user); // resolve object containing userId if successful
    })(req, res, fakeNext);
  })
};

const authRoutes = {
  setupContext: () => (req, res, next) => {
    req.locals.authenticationContext = new RESTRequestSchema();
    req.locals.authenticationContext.setCrudOperation(req.method);
    next();
  },
  allResponder: () => (req) => {
    const { responder, authenticationContext } = req.locals;
    responder.success(authenticationContext);
  },
  allHandler: (deps, opts = {}) => (req, res, next) => helpers.loginLocalAuthentication(req, res, opts)
    .then(() => next())
    .catch((err) => {
      console.error('localAuthentication -> routes -> allHandler', err);
      next(err);
    })
};


export default authRoutes;
export { helpers };

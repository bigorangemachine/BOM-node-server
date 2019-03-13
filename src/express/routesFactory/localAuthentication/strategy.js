import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import constants from '../../../constants';
import { AuthenticationError } from '../../../customErrors';
import models from '../../../sql/models';

const { META_KEYS } = constants;
const { UNAME } = META_KEYS.USER;

const helpers = {
  serialize: (deps, opts = {}) => (req, user, cb) => {
    if (!user || !user.userId) {
      cb(new Error('Invalid Data; could not Serialize user for Authentication'));
      return;
    }
    if (opts.cacheAccessIndex) {
      // eslint-disable-next-line no-param-reassign
      req.session[opts.sessionPermisionKey || 'permissions'] = user.accessIndex;
    }
    cb(null, user.userId);
  },
  deserialize: (deps, opts = {}) => (id, cb) => {
    const { User } = models;
    return User.login(id, { update: null })
      .then((authentication) => {
        if (!authentication) {
          throw new AuthenticationError();
        }
        /* eslint-disable no-param-reassign */
        Object.assign(
          authentication,
          (opts.authenticationData && opts.authenticationData.constructor === Object && opts.authenticationData) || {},
          (typeof opts.authenticationData === 'function' && opts.authenticationData(authentication)) || {}
        );
        authentication.userId = authentication.id;
        authentication.accountStatusId = authentication.account_status_id;
        delete authentication.id;
        delete authentication.account_status_id;
        /* eslint-enable no-param-reassign */
        return authentication;
      })
        .then(cb.bind(null, null)) // null into error argument -> cb(null, result)
        .catch(cb.bind(null)); // error into callback -> cb(err)
  }
};
const localAuthMiddlewares = {
  setSerializers: (deps, opts = {}) => {
    passport.serializeUser(helpers.serialize(deps, opts));
    passport.deserializeUser(helpers.deserialize(deps, opts));
  },
  passportStrategyFetch: ({ accountIdent, password }, req = {}) => new Promise((resolve, reject) => {
    const { User } = models;
    return User.localAuthentication({ accountIdent, password })
      .then((userRow) => {
        if (!userRow || !userRow.isMatched) {
          req && req.log.error(`passportStrategyFetch -> User ${accountIdent} failed to login`);
          reject(new AuthenticationError());
          return;
        }
        resolve({
          isMatched: userRow.isMatched,
          [UNAME]: userRow[UNAME],
          ...(userRow.userId ? { userId: userRow.userId } : {})
        });
      });
  }),
  passportStrategy: (opts = {}) => new LocalStrategy({
      usernameField: opts.authUsernameField || 'username',
      passwordField: opts.authPasswordField || 'password',
      passReqToCallback: true
    },
    (req, accountIdent, password, cb) => {
      localAuthMiddlewares.passportStrategyFetch({ accountIdent, password }, req)
        .then(cb.bind(null, null)) // null into error argument -> cb(null, results)
        .catch(cb.bind(null)); // error into callback -> cb(err);
    }
  )
};

const localAuthSetupFactory = ({ app }, opts = {}) => ({
  middlewares: [
    app.use(passport.initialize()),
    app.use(passport.session()),
    passport.use(localAuthMiddlewares.passportStrategy(opts))
  ]
});

export default localAuthSetupFactory;
export { helpers, localAuthMiddlewares };

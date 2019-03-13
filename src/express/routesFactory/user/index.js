import expressUtils from '../../../utils/expressUtils';
import userRoutes, { userMiddleWares } from './routes';

const userRouteFactory = (deps, opts = {}) => {
  const {
    urlLikeActionPattern = '/user/likes/:listItemId',
    urlPattern = '/user(/:userId?)',
    methods = ['all']
  } = opts;
  const { app } = deps; // allow for express() or Route()
  const appLikeActionUse = (urlPattern ? app.use.bind(app, urlLikeActionPattern) : app.use);
  const appUse = (urlPattern ? app.use.bind(app, urlPattern) : app.use);
  /*
   * Setups up:
   *   app.use(urlLikeActionPattern, ....userMiddleWares);
   *   app.use(urlPattern, ...userMiddleWares);
   *   app.all(urlLikeActionPattern, userRoutes.respondUserLike); // aka!
   *   app[methods[n]](urlLikeActionPattern, userRoutes.respondUserLike);
   *   app.all(urlPattern, userRoutes.respondUser); // aka!
   *   app[methods[n]](urlPattern, userRoutes.respondUser);
   */

  return {
    middlewares: [
      appLikeActionUse(
        expressUtils.reqInfoLogger({ ...deps }, opts),
        userMiddleWares.setupContext(deps)
      ),
      appUse(
        expressUtils.reqInfoLogger({ ...deps }, opts),
        userMiddleWares.setupContext(deps)
      )
    ],
    routes: [
      ...methods.map((method) => {
        const routeMethod = (urlLikeActionPattern ? app[method].bind(app, urlLikeActionPattern) : app[method]);
        return routeMethod(
          expressUtils.isAuth(),
          userRoutes.respondUserLike(deps, { urlLikeActionPattern })
        );
      }),
      ...methods.map((method) => {
        const routeMethod = (urlPattern ? app[method].bind(app, urlPattern) : app[method]);
        return routeMethod(
          expressUtils.isAuth(),
          userRoutes.respondUser(deps)
        );
      })
    ]
  };
};

export default userRouteFactory;

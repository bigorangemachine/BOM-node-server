import expressUtils from '../../../utils/expressUtils';
import authRoutes from './routes';
import localAuthSetupFactory, { localAuthMiddlewares } from './strategy';

const localAuthFactory  = (deps, opts = {}) => {
  const {
    routePrefix = '/login',
    methods = ['put', 'post']
  } = opts;
  const { app } = deps;
  const appUse = (routePrefix ? app.use.bind(app, routePrefix) : app.use);

  localAuthMiddlewares.setSerializers();

  /*
   * Setups up:
   *   app.use(routePrefix, expressUtils.handleRequestWithoutMultipartFiles, authRoutes.allHandler);
   *   app.post(routePrefix, authRoutes.allResponder);
   *   app.put(routePrefix, authRoutes.allResponder); // aka!
   *   app[methods[n]](urlPattern, authRoutes.allResponder);
   */
   return {
     middlewares: [
      appUse(
        expressUtils.reqInfoLogger({ ...deps }, opts),
        expressUtils.handleRequestWithoutMultipartFiles(deps),
        authRoutes.setupContext(),
        authRoutes.allHandler(deps, opts)
      )
    ],
    routes: [
      ...methods.map((method) => {
        const routeMethod = (routePrefix ? app[method].bind(app, routePrefix) : app[method]);
        return routeMethod(authRoutes.allResponder(deps));
      })
    ]
  };
};

export default localAuthFactory;
export { localAuthMiddlewares, localAuthSetupFactory };

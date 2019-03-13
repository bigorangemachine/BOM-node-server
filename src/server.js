import './envs';
import constants from './constants';
import { localAuthFactory, localAuthSetupFactory, userRouteFactory, s3AssetFactory, helpers } from './express/routesFactory';
import App from './express/App';

const {  FILE_CACHES, S3_PATHS } = constants;
const { LOCAL_CACHES } = FILE_CACHES;

const API_PATH = '/api';
const AppFactory = (opts = {}) => (new App(opts))
  .registerAppHandler('parsers', (deps) => {
    helpers.setupCookies(deps);
  })
  .registerAppHandler('pre-middlewares', (deps) => {
    helpers.setupSession(deps);
    localAuthSetupFactory(deps); // always keep after session
  })
  .registerAppHandler('bucket-cache-middleware', (deps) => {
    s3AssetFactory(deps, {
      assetPath: deps.imageAssetPath,
      localCachePath: LOCAL_CACHES.S3_IMAGES,
      // build filepath-indexes -> syncing constants s3Paths.js & fileCache.js
      localCacheIndex: Object.keys(LOCAL_CACHES).reduce((acc, key) => {
        acc[key] = {
          local: LOCAL_CACHES[key],
          bucket: S3_PATHS[key]
        };
        return acc;
      }, {})
    });
  })
  .registerAppHandler('routes', (deps) => {
    localAuthFactory(deps, { routePrefix: `${API_PATH}/login` });
    userRouteFactory(deps, {
      urlLikeActionPattern: `${API_PATH}/user/likes/(:listItemId?)`,
      urlPattern: `${API_PATH}/user(/:userId?)`
    });
  })
  .setup() // configure
  .start(); // do async stuff & listen to port

export default AppFactory;

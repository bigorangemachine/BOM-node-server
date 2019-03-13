import localAuthFactory, { localAuthSetupFactory } from './localAuthentication';
import userRouteFactory from './user';
import s3AssetFactory, { s3AssetMiddlewares } from './s3Assets';
import helpers from './helpers';

export default userRouteFactory;
export {
  helpers,
  s3AssetFactory,
  s3AssetMiddlewares,
  localAuthSetupFactory,
  localAuthFactory,
  userRouteFactory
};

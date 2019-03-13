import express from 'express';
import s3AssetMiddlewares from './middleware';
import jsUtils from '../../../utils/jsUtils';
import expressUtils from '../../../utils/expressUtils';


const s3AssetFactory = (deps, opts = {}) => {
  const { app } = deps;
  const { assetPath, localCacheIndex, localCachePath, excludePathList = [] } = opts;
  const exList = [localCachePath, ...(excludePathList.length > 0 ? excludePathList : []) ];
  const assocLocalCacheIndex = Object.keys(localCacheIndex).reduce((acc, key) => {
    // both truthy but skip the base asset path and excluded paths
    if (localCacheIndex[key].local && localCacheIndex[key].bucket && !exList.includes(localCacheIndex[key].local)) {
      acc[key] = {
        localBasePath: jsUtils.checkLTrim(localCacheIndex[key].local, `${localCachePath}/`),
        local: localCacheIndex[key].local,
        s3: localCacheIndex[key].bucket
      };
    }
    return acc;
  }, {});

  return {
    middlewares: [
      ...Object.keys(assocLocalCacheIndex)
        .map((key) => app.use( // if the local file exists the static handler will serve the file
          `${jsUtils.checkRTrim(assetPath, '/')}${jsUtils.checkLTrim(assocLocalCacheIndex[key].local, localCachePath)}`,
          ...(process.env.REQUEST_LOGGER_ASSETS || process.env.VERBOSE === 'all' ? [expressUtils.reqInfoLogger(deps, opts)] : []),
          express.static(assocLocalCacheIndex[key].local)
      )),
      app.use(
        `${assetPath}:imgPath`,
        s3AssetMiddlewares.allHandler(deps, {
          ...opts,
          pathIndex: assocLocalCacheIndex,
          assetPath,
          localCachePath
        }))
  ]};
};
export default s3AssetFactory;
export { s3AssetMiddlewares };

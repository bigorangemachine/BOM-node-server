import fs from 'fs';
import jsUtils from '../../../utils/jsUtils';
import { ExpressRequestFileError }  from '../../../customErrors';

/*
 * @namespace
 */
const s3AssetMiddlewares = {
  buildCacheAllowList: ({ pathIndex }) => Object.keys(pathIndex)
    .filter(key => pathIndex[key] && pathIndex[key].localBasePath && typeof pathIndex[key].localBasePath === 'string')
    .map(key => pathIndex[key].localBasePath.toLowerCase())
    .filter(str => typeof str === 'string' && str.length > 0),
  transformMiddleware: (deps, opts = {}) => (req, res, next) => {
    const { allowList, assetPath } = opts;
    const pathname = jsUtils.checkLTrim(req.originalUrl, assetPath);
    const { imgPath } = req.params;
    if (!allowList.includes(imgPath.toLowerCase())) {
      req.log.info('Could not find ', imgPath, 'in allow list');
      return Promise.reject(new ExpressRequestFileError({ imgPath, pathname }))
        .catch(next);
    }
    req.log.info('Looking for', imgPath, pathname, ' on S3 bucket');

    const { foundKey, localPath, getS3Path } = s3AssetMiddlewares.matchS3RequestCachePath({...opts, imgPath, basePath: pathname });
    if (!foundKey) {
      return Promise.reject(new ExpressRequestFileError({ imgPath, pathname }))
        .catch(next);
    }
    process.env.VERBOSE && req.log.info(
      'Transforming local cache to remote storage/bucket','\n',
      'foundKey: ', foundKey, '\n',
      'localPath: ', localPath, '\n',
      'getS3Path: ', getS3Path
    );
    return s3AssetMiddlewares.doS3LocalCaching(deps, { localPath, getS3Path })
      .then(() => res.sendFile(localPath))
      .then(() => {
        process.env.VERBOSE && req.log.info('Transformed', '\n', getS3Path , ' -> ', jsUtils.checkLTrim(localPath, opts.localCachePath || '/'));
        return localPath;
      })
      .catch((err) => {
        console.error(err);
        req.log.error('Couldn\'t serve', imgPath, pathname, ' from S3 bucket');
        next(new ExpressRequestFileError({ imgPath, pathname }));
      });
  },
  matchS3RequestCachePath: ({ pathIndex, imgPath, basePath, localCachePath }) => {
    const localPath = `${localCachePath}/${jsUtils.checkLTrim(basePath, '/')}`;
    const foundKey = Object.keys(pathIndex).find(pathKey => pathIndex[pathKey].localBasePath.toLowerCase() === imgPath.toLowerCase());
    if (!foundKey) {
      return {
        foundKey: null,
        getS3Path: null,
        localPath,
        basePath
      };
    }
    // convert matched url to s3 path & create file streams
    const getS3Path = `${pathIndex[foundKey].s3}${jsUtils.checkLTrim(basePath, imgPath)}`;
    return {
      foundKey,
      getS3Path,
      localPath,
      basePath
    };
  },

  /**
   * @typedef {function} S3LocalCachingEvent
   * @param {eventPayload} eventPayload - Remote read stream to AWS
   * @param {stream.Readable} eventPayload.remoteFileStream - Remote read stream to AWS
   * @param {stream.Writeable} eventPayload.localFileStream - Local write stream to filesystem
   * @param {string} eventPayload.s3Path - The path of where the S3 Object is expected to be found
   * @param {string} eventPayload.localPath - The path of where file system Object is expected to be found
   */
  /**
   * @param {string} localPath - The Filepath for the local cache
   * @param {string} getS3Path - The S3 Bucket path of the requested file
   * @param {Object} events - Event calblacks
   * @param {S3LocalCachingEvent} events.onInitPipe - When the Read/Write streams are created
   * @param {S3LocalCachingEvent} events.onCleanUpLocal - When there is a need to delete the created cache file
   * @param {S3LocalCachingEvent} events.onDeleteLocal - When the local file was deleted successfully
   * @param {function} events.onDeleteLocalError - When the local file was deleted with an error
   * @param {S3LocalCachingEvent} events.onSuccess - When the file was downloaded & cached successfully
   * @param {function} events.onLocalStreamError - Something went wrong with the cached file
   * @param {function} events.onRemoteStreamError - Something went wrong with the AWS S3 Connection
   *
   * @returns {Promise}
   */
  doS3LocalCaching: (deps , { localPath, getS3Path, events = {} }) => {
    const { s3, awsS3Bucket, awsS3BucketRootDir } = deps;
    const localFileStream = fs.createWriteStream(localPath);
    const remoteFileStream = s3.getObject({
        Bucket: awsS3Bucket,
        Key: `${awsS3BucketRootDir}${getS3Path}`
      })
      .createReadStream();
    remoteFileStream.pipe(localFileStream);

    const eventObject = { remoteFileStream, localFileStream, s3Path: getS3Path, localPath };
    typeof events.onInitPipe === 'function' && events.onInitPipe(eventObject);

    return new Promise((resolve, reject) => {
      localFileStream.on('close', (closeEvent) => {
        typeof events.onSuccess === 'function' && events.onSuccess(eventObject);
        resolve({ ...eventObject, closeEvent });
      });
      localFileStream.on('error', (localStreamError) => {
        typeof events.onLocalStreamError === 'function' && events.onLocalStreamError(localStreamError);
        reject(localStreamError);
      });
      remoteFileStream.on('error', (err) => {
        typeof events.onRemoteStreamError === 'function' && events.onRemoteStreamError(err);
        reject(err);
      });
    })
    .catch((e) => {
      s3AssetMiddlewares.doCleanUpFailedLocalCaching({ localPath, localFileStream, remoteFileStream, eventObject, events });
      throw e;
    });
  },
  doCleanUpFailedLocalCaching: ({ localPath = '', localFileStream, remoteFileStream, eventObject = {}, events = {} }) => {
    remoteFileStream.unpipe(localFileStream);
    localFileStream.destroy();
    remoteFileStream.destroy();

    typeof events.onCleanUpLocal === 'function' && events.onCleanUpLocal(eventObject);

    return new Promise((resolve, reject) => {
      fs.unlink(localPath, (err) => {
        if (err) {
          typeof events.onDeleteLocalError === 'function' && events.onDeleteLocalError(err);
          console.error(`Failed to delete ${localPath} after failing to download`, err);
          reject(err);
          return;
        }
        typeof events.onDeleteLocal === 'function' && events.onDeleteLocal(eventObject);
        resolve(localPath);
      });
    });
  },
  allHandler: (deps, opts = {}) => s3AssetMiddlewares
    .transformMiddleware( // the actual middleware
      deps,
      {
        ...opts,
        allowList: s3AssetMiddlewares.buildCacheAllowList(opts)
      }
    )
};

export default s3AssetMiddlewares;

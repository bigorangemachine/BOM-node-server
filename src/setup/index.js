import Promise from 'bluebird';
import path from 'path';
import constants from '../constants';
import utils from '../utils';
import fileUtils from '../utils/fileUtils';
import uploadUtils from '../utils/upload';
import jsUtils from '../utils/jsUtils';
import '../envs';

const { FILE_CACHES, APP_ROOT, S3_PATHS } = constants;
const { CACHE_PATH, LOCAL_CACHES } = FILE_CACHES;
const { s3, awsS3Bucket, awsS3BucketRootDir } = uploadUtils.s3Vars();

const copyFromDevImages = (imageName) => {
  let src;
  try {
    if (imageName.trim().length === 0) {
      throw new TypeError('Argument imageName must be a non-empty string');
    }
    src = path.resolve(APP_ROOT, 'dev/images/', imageName);
  } catch (err) {
    return Promise.reject(err);
  }

  const copyList = [
      { src, dest: `${LOCAL_CACHES.BANNERS}/${imageName}` },
      { src, dest: `${LOCAL_CACHES.USER_AVATARS}/${imageName}` }
    ];
  return fileUtils.mapCopy(copyList)
    .then(results => results.map((item, index) => {
      if (item instanceof Error) {
        console.warn('Failed to copy', copyList[index].src, ' to ', copyList[index].dest);
      }
      return item;
    }));
};
const initalizeS3Objects = () => utils.serialPromiseMapper(
  Object.keys(S3_PATHS)
    .map(p => `${jsUtils.checkRTrim(S3_PATHS[p],'/')}/`)
    .sort(uploadUtils.sortDepth),
  p => uploadUtils.s3Upload({ s3, awsS3Bucket, awsS3BucketRootDir }, null, p).then(r => r.s3Path)
);
const initalizeLocalCache = () => utils.serialPromiseMapper(
  Object.keys(LOCAL_CACHES)
    .map(p => LOCAL_CACHES[p])
    .sort(uploadUtils.sortDepth),
  p => fileUtils.mkDirRecursive(p).then(() => p)
);
const initalizeFileDeps = () => Promise.all([
  fileUtils.mkDirRecursive(CACHE_PATH),
  uploadUtils.s3CreateBucket({ s3 })
]);
const setupApp = () => fileUtils.mkDirRecursive(CACHE_PATH).then(() => Promise.all([].concat(initalizeLocalCache(), initalizeS3Objects())))
  .then(copyFromDevImages.bind(null, 'broken-window.jpg'));

export default setupApp;
export { copyFromDevImages, initalizeFileDeps, initalizeS3Objects };

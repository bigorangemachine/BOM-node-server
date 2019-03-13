import path from 'path';
import appRoot from './appRoot';

const CACHE_PATH = path.resolve(appRoot, '_cache');
const UPLOAD_CACHE_PATH = `${CACHE_PATH}/tmp`;

const S3_PATHS = {
  BANNERS: '/banners',
  USER_AVATARS: '/user-avatars'
};

const LOCAL_CACHES = {
  S3_IMAGES: `${CACHE_PATH}/S3-images`, // base asset path
  BANNERS: `${CACHE_PATH}/S3-images${S3_PATHS.BANNERS}`,
  USER_AVATARS: `${CACHE_PATH}/S3-images${S3_PATHS.USER_AVATARS}`
};

const FILE_CACHES = {
  S3_PATHS,
  LOCAL_CACHES,
  CACHE_PATH,
  UPLOAD_CACHE_PATH
};

module.exports = FILE_CACHES;
module.exports.default = FILE_CACHES;

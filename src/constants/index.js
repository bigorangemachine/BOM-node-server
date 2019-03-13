import APP_ROOT from './appRoot';
import USER_LEVELS from './userLevels';
import FILE_CACHES from './fileCache';
import FILE_TYPES from './fileTypes';
import EXTERNAL_TYPES from './externalTypes';
import S3_PATHS from './s3Paths';
import META_KEYS from './sqlMetaKeys';
import utils from '../utils';

const { cleanExport } = utils;

const constants = {
  S3_PATHS: cleanExport(S3_PATHS),
  EXTERNAL_TYPES: cleanExport(EXTERNAL_TYPES),
  FILE_TYPES: cleanExport(FILE_TYPES),
  FILE_CACHES: cleanExport(FILE_CACHES),
  META_KEYS: cleanExport(META_KEYS),
  APP_ROOT,
  ...USER_LEVELS
};

export default constants;

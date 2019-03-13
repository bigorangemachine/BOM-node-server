import fs from 'fs';
import path from 'path';
import Promise from 'bluebird';
import jsUtils from '../../src/utils/jsUtils';
import passwordUtils from '../../src/utils/passwordUtils';
import uploadUtils from '../../src/utils/upload';
import models from '../../src/sql/models';
import constants from '../../src/constants';

const { s3, awsS3Bucket, awsS3BucketRootDir } = uploadUtils.s3Vars();
const {
  APP_ROOT,
  FILE_CACHES,
  ACCESS_LEVEL,
  ACCOUNT_STATUS,
  META_KEYS,
  S3_PATHS
} = constants;
const { LOCAL_CACHES } = FILE_CACHES;
const {
  UNAME,
  PASS,
  EMAIL,
  FNAME,
  LNAME,
  MNAME,
  AVATAR,
  BANNER
} = META_KEYS.USER;
const {
  TITLE_EN
} = META_KEYS.LIST_ITEM;
const TEST_FIXTURE_PASSWORD = 'testing123';
const { User, ListItem, UserAccessIndex, UserExternal } = models;
const seederUtils = {
  endLogger: (message, dataSet, results) => {
    console.log(`${message} of DataSet Completed:\n`, typeof dataSet === 'object' ? JSON.stringify(dataSet) : dataSet, '\n');

    process.env.VERBOSE && console.log(
      'userRecord', results.userRecord.dataValues, '\n',
      'listItems', results.listItems && results.listItems.dataValues, '\n',
      'externalAccounts', results.externalAccounts && results.externalAccounts.dataValues
    );
    return results;
  },
  removeListItem: (userRecord, dataSet) => seederUtils.modelRemove(ListItem, dataSet.itemPk),
  removeUserExternal: (userRecord, dataSet) => seederUtils.modelRemove(UserExternal, dataSet.userPK),
  removeUser: dataSet => seederUtils.modelRemove(User, dataSet.userPK),
  setupMetaCreate: (metaSet, record) => Promise.all(Object.keys(metaSet)
      .map(metaKey => ({key: metaKey, value: metaSet[metaKey] }))
      .filter(meta => meta.value)
      .map(meta => record.setMeta(meta))
    )
    .then(() => record),
  setupItemData: (dataSet) => {
    const itemData = {
      [TITLE_EN]: dataSet.label
    };
    const { label } = dataSet;
    if (typeof label !== 'string' || label.trim().length === 0) {
      throw new TypeError('Invalid label: Must be a type of string greater than 0 length');
    }
    let { isPublic } = dataSet;
    isPublic = isPublic ? 1 : 0;
    return { itemData, isPublic, label };
  },
  setupUserData: (dataSet) => {
    const userData = {
      [EMAIL]: dataSet.email,
      [UNAME]: dataSet.userName,
      [FNAME]: dataSet.firstName,
      [LNAME]: dataSet.lastName,
      [AVATAR]: dataSet.userAvatar
    };
    if (dataSet.middleName) {
      userData[MNAME] = dataSet.middleName;
    }
    let accessId = dataSet.userAccess;
    let accountStatusId = dataSet.accountStatus;
    accountStatusId = typeof accountStatusId === 'string' ? ACCOUNT_STATUS[accountStatusId] : accountStatusId;
    accessId = typeof accessId === 'string' ? ACCESS_LEVEL[accessId] : accessId;
    return { userData, accountStatusId, accessId };
  },
  addUser: (dataSet) => {
    const cleaned = seederUtils.setupUserData(dataSet);
    const { userData, accountStatusId, accessId } = cleaned;
    return seederUtils.modelUpdateOrCreateAndSetMetaData(
      User,
      dataSet.userPk,
      {
        account_status_id: accountStatusId,
        access_id: accessId
      },
      userData,
      seederUtils.addUserInterceptor.bind(null, dataSet)
    )
    .then((rec) => passwordUtils.saltAndHash(dataSet.password || TEST_FIXTURE_PASSWORD)
      .then(hashPass => rec.setMeta({key: PASS, value: hashPass }))
      .then(() => rec)
    );
  },
  addListItem: (userRecord, dataSet) => {
    const cleaned = seederUtils.setupItemData(dataSet);
    const { itemData, isPublic, label } = cleaned;
    return seederUtils.modelUpdateOrCreateAndSetMetaData(ListItem, dataSet.itemPk, { is_public: isPublic, label }, itemData)
      .then(() => seederUtils.modelUpdateOrCreateForeign(UserAccessIndex, {
        user_id: userRecord.dataValues.id,
        access_id: ACCESS_LEVEL.OWNER,
        list_item_id: dataSet.itemPk
      }));
  },
  addUserExternal: (userRecord, dataSet) => {
    return seederUtils.modelUpdateOrCreateForeign(UserExternal, { user_id: userRecord.dataValues.id }, {
      external_ident: dataSet.externalIdent,
      external_type_id: dataSet.externalTypeId
    });
  },
  addUserInterceptor: (dataSet, record, metaData) => {
    const uploadFile = uploadUtils.uploadS3WithDateStamp.bind(null, { s3, awsS3Bucket, awsS3BucketRootDir }); // , localPath, s3Path)
    jsUtils.checkLTrim(dataSet.userAvatar, APP_ROOT);

    return Promise.all([
      dataSet.userAvatar ?
        uploadFile(dataSet.userAvatar, `${S3_PATHS.USER_AVATARS}/${path.parse(dataSet.userAvatar).base}`) :
        null,
      dataSet.userBanner ?
        uploadFile(dataSet.userBanner, `${S3_PATHS.BANNERS}/${path.parse(dataSet.userBanner).base}`) :
        null
    ])
    .then(([ avatarUpload, bannerUpload ]) => {
      const copyPaths = [];
      /*
       * eslint disabled:
       * 'no-param-reassign':
       *   disabled because we need to return a promise and
       *   sequelize requires a active record change
       */
      /* eslint-disable no-param-reassign */
      if (avatarUpload && avatarUpload.s3File.base) {
        metaData[AVATAR] = avatarUpload.s3File.base;
        copyPaths.push({ src: avatarUpload.localFile.path, dest: `${LOCAL_CACHES.USER_AVATARS}/${avatarUpload.s3File.base}` });
      }
      if (bannerUpload && bannerUpload.s3File.base) {
        metaData[BANNER] = bannerUpload.s3File.base;
        copyPaths.push({ src: bannerUpload.localFile.path, dest: `${LOCAL_CACHES.BANNERS}/${bannerUpload.s3File.base}` });
      }
      /* eslint-enable no-param-reassign */

      return Promise.all(copyPaths.map(copyJob => new Promise((resolve, reject) => {
        fs.copyFile(copyJob.src, copyJob.dest, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(copyJob);
        });
      })));
    });
  },
  modelRemove: (Model, pk) => {
    return Model.findOne({ where: { id: pk } })
      .then(record => record && record.destroy());
  },
  modelUpdateOrCreateAndSetMetaData: (Model, pk, dataSet, metaData, interceptor) => {
    const setMetas = seederUtils.setupMetaCreate.bind(null, metaData);
    return Model.findOne({ where: { id: pk } })
      .then(result => result ? setMetas(result) : Model.create({
          id: pk,
          ...dataSet
        }))
      .then(record => (typeof interceptor === 'function' ? interceptor(record, metaData) : Promise.resolve()).then(() => record))
      .then(setMetas);
  },
  modelUpdateOrCreateForeign: (Model, pkWhere, dataSet) => {
    return Model.findOne({ where: pkWhere })
      .then(() => Model.create({
          ...pkWhere,
          ...dataSet
        }
      )
    );
  }
};
export default seederUtils;

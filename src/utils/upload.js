import dateFns from 'date-fns';
import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import jsUtils from './jsUtils';

/*
 * @namespace
 */
const uploadUtils = {
  s3BucketName: awsS3Bucket => awsS3Bucket || process.env.AWS_S3_BUCKET,
  s3BucketRootPath: awsS3BucketRootDir => `env-${awsS3BucketRootDir || process.env.NODE_ENV || `unspecified-env-${uploadUtils.fileVersionPrefix()}`}`,
  fileVersionPrefix: () => dateFns.format(new Date(), 'YYYYMMDD-HHmmss(ZZ)'),
  s3Vars: (opts = {}) => {
    const { awsRegionS3, awsAccessKeyIdS3, awsSecretAccessKeyS3 } = opts;
    let { s3, awsS3Bucket, awsS3BucketRootDir } = opts;
    s3 = s3 || uploadUtils.s3InitBucket({ awsRegionS3, awsAccessKeyIdS3, awsSecretAccessKeyS3 });
    awsS3Bucket = awsS3Bucket || uploadUtils.s3BucketName();
    awsS3BucketRootDir = awsS3BucketRootDir || uploadUtils.s3BucketRootPath(awsS3BucketRootDir);
    return { s3, awsS3Bucket, awsS3BucketRootDir };
  },
  s3ConfigBucket: (opts = {}) => {
    const { awsRegionS3, awsAccessKeyIdS3, awsSecretAccessKeyS3 } = opts;
    AWS.config = new AWS.Config({
      region: awsRegionS3 || process.env.AWS_S3_REGION || 'us-east-1',
      accessKeyId: awsAccessKeyIdS3 || process.env.AWS_S3_SDK_KEY,
      secretAccessKey: awsSecretAccessKeyS3 || process.env.AWS_S3_SDK_SECRET
    });
    return AWS.config;
  },
  s3InitBucket: (opts = {}) => {
    const { awsRegionS3, awsAccessKeyIdS3, awsSecretAccessKeyS3 } = opts;
    uploadUtils.s3ConfigBucket({awsRegionS3, awsAccessKeyIdS3, awsSecretAccessKeyS3});
    return new AWS.S3();
  },
  s3VerifyBucket: ({ s3, awsS3Bucket }) => s3.getBucketLocation({ Bucket: awsS3Bucket }).promise(),
  s3CreateBucket: (opts = {}) => {
    const { s3, awsS3Bucket } = opts;
    const bucketName = uploadUtils.s3BucketName(awsS3Bucket);
    // const query = () => s3.getBucketLocation({ Bucket }).promise();

    return s3.createBucket({ Bucket: bucketName })
      .promise()
      .then(() => uploadUtils.s3VerifyBucket({ ...opts, awsS3Bucket: bucketName }))
      .catch(err => {
          if (!['BucketAlreadyOwnedByYou', 'AccessDenied'].includes(err.code)) {
            throw err;
          }
          if (['AccessDenied'].includes(err.code)) {
            console.warn('You do not have permissions to create a bucket');
          }
          return uploadUtils.s3VerifyBucket(opts);
        }
      );
  },
  s3Upload: (dependancies, localPath, s3Path) => {
    const { s3, awsS3Bucket, awsS3BucketRootDir } = dependancies;
    const savedS3Path = `${jsUtils.checkRTrim(awsS3BucketRootDir, '/')}/${jsUtils.checkLTrim(s3Path, '/')}`; // path on S3 bucket
    return new Promise((resolve, reject) => {
      if (typeof localPath === 'string' && localPath.trim()) {
        fs.readFile(localPath, (err, data) => (err ? reject(err) : resolve(data)));
        return;
      }
      if (localPath instanceof Buffer) {
        resolve(localPath);
        return;
      }
      resolve();
    })
      .then((fileBuffer) => {
        const params = {
          Bucket: awsS3Bucket,
          Key: savedS3Path
        };
        if (fileBuffer) {
          params.Body = fileBuffer;
        }
        return s3.putObject(params).promise();
      })
      .then(awsPayload => ({ awsPayload, s3Path: savedS3Path }))
      .catch((err) => {console.error('ERRR', err.code);throw err;});
  },
  uploadS3WithDateStamp: (dependancies, localPath, s3RelativePath, opts = {}) => {
    const { s3, awsS3Bucket, awsS3BucketRootDir } = dependancies;
    const pathSchema = path.parse(s3RelativePath);
    const bucketFilepath = `${opts.filePathPrefix || uploadUtils.fileVersionPrefix()}--${pathSchema.name}${pathSchema.ext}`;
    return uploadUtils.s3Upload({ s3, awsS3Bucket, awsS3BucketRootDir }, localPath, `${jsUtils.checkLTrim(pathSchema.dir, '/')}/${bucketFilepath}`)
      .then(({ awsPayload, s3Path }) => ({
        localFile: {
          ...path.parse(localPath),
          path: localPath
        },
        s3File: {
          ...path.parse(bucketFilepath),
          path: s3Path
        },
        awsPayload
      }));
  }
};

module.exports = uploadUtils;
module.exports.default = uploadUtils;

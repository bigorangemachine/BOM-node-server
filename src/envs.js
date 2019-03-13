const useVcaps = () => process.env.VCAP_SERVICES && process.env.NODE_ENV !== 'local';
const getVcapCredsFromName = (str, mainKey = 'user-provided') => {
  const userProvided = JSON.parse(process.env.VCAP_SERVICES)[mainKey] || [];
  const foundValue = userProvided.filter(envData => envData.name === str);
  return foundValue.length ? foundValue[0].credentials : null;
};

const boolFromEnv = (key, defaultEnv) => {
  if (key instanceof Array) {
    return key.map(k => boolFromEnv(k, defaultEnv));
  }
  if (!['string', 'boolean'].includes(typeof process.env[key]) && typeof defaultEnv !== 'boolean') {
    return process.env[key];
  }

  const trueList = ['true', '1', 'yes'];
  const falseList = ['false', '0', 'no'];
  const origEnv = process.env[key] || '';
  const cleanEnv = origEnv.toString().toLowerCase();
  const getterSetter = {
    get: () => {
      if (typeof defaultEnv === 'boolean') return defaultEnv;
      if (trueList.includes(cleanEnv)) return true;
      if (falseList.includes(cleanEnv)) return false;
      return origEnv;
    }
  };
  if ([ ...trueList, ...falseList ].includes(cleanEnv) || typeof defaultEnv === 'boolean') {
    delete process.env[key];
    Object.defineProperty(process.env, key, getterSetter);
  }
  return process.env[key];
};

if (useVcaps()) {
  const vcaps = {
    ...getVcapCredsFromName('awsconfig'), // aws keys
    ...getVcapCredsFromName('appconfig') // app variables
  };
  for (const key in vcaps) {
    if (!process.env[key] && vcaps[key]) { // not set - overwrite safe
      process.env[key] = vcaps[key];
    }
  }
 // weird bug; process.env converts to string if set to 'undefined'
  if (vcaps.NODE_ENV || process.env.NODE_ENV) {
    process.env.NODE_ENV = vcaps.NODE_ENV || process.env.NODE_ENV;
  }
}

/*
 * configure into into a bools:
 *   process.env.DEBUG_SQL
 *   process.env.REQUEST_LOGGING process.env.REQUEST_LOGGING_SESSION process.env.REQUEST_LOGGING_MASK
 *   process.env.VERBOSE
 */
 // transform into a default of false
boolFromEnv(['DEBUG_SQL','VERBOSE', 'REQUEST_LOGGING', 'REQUEST_LOGGING_SESSION', 'REQUEST_LOGGER_ASSETS']);
// transform into a default of true
boolFromEnv(['REQUEST_LOGGING_MASK'], true);


if (!useVcaps()) {
  if (!process.env.NODE_ENV) {
    process.env.VERBOSE && console.warn('NODE_ENV environment variable should be set');
  }
  // use .env files if not on PCF
  // dotenv doesn't overrite - .env is the default
  require('dotenv').config(process.env.NODE_ENV ? { path: `.env.${process.env.NODE_ENV}` } : {});
  require('dotenv').config(process.env.NODE_ENV ? { path: `.env` } : {});
}

export default process.env;
export { getVcapCredsFromName, useVcaps };

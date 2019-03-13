import { useVcaps } from '../envs';

const dialect = 'mysql';

const env = {
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect
};
// not the exact same as env but close
let vcapCreds = {
  username: null,
  password: null,
  hostname: null,
  name: null,
  port: 3306
};
if (useVcaps()) {
  const parsedJSON = JSON.parse(process.env.VCAP_SERVICES);
  if (parsedJSON.cleardb) {
    vcapCreds = parsedJSON.cleardb[0].credentials;
  }
}
// keep mapped to env
const vcap = {
  username: vcapCreds.username,
  password: vcapCreds.password,
  database: vcapCreds.name,
  host: vcapCreds.hostname,
  port: vcapCreds.port ? vcapCreds.port : 3306,
  dialect
};

// PCF ClearDb Free needs the connections capped or you
// get lots of failures; develop with matched settings
env.maxConnections = 1;
env.pool = { max: 1 };
vcap.maxConnections = 1;
vcap.pool = { max: 1 };


const local = env;
const test = vcap.username ? vcap : env; // should always be env
const acceptance = vcap;
const development = vcap;
const production = vcap;

export default {
  local,
  test,
  acceptance,
  development,
  production
};
// named export
export {
  local,
  test,
  acceptance,
  development,
  production
};

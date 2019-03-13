import Promise from 'bluebird';
import constants from '../../../src/constants';
import utils from '../../../src/utils';
// import options from '../../../src/sql/options';

const {
  EXTERNAL_TYPES,
  ACCESS_LEVEL,
  ACCESS_LEVEL_WEIGHT,
  ACCOUNT_STATUS,
  ACCOUNT_STATUS_WEIGHT
} = constants;
const  { serialPromiseMapper } = utils;
const coreData = [
  {
    tableName: 'access',
    records: Object.keys(ACCESS_LEVEL).reduce((acc, key) => {
      acc.push({ id: ACCESS_LEVEL[key], label: key.toLowerCase(), status_weight: ACCESS_LEVEL_WEIGHT[key] });
      return acc;
    }, [])
  },
  {
    tableName: 'account_status',
    records: Object.keys(ACCOUNT_STATUS).reduce((acc, key) => {
      acc.push({ id: ACCOUNT_STATUS[key], label: key.toLowerCase(), status_weight: ACCOUNT_STATUS_WEIGHT[key] });
      return acc;
    }, [])
  },
  {
    tableName: 'external_type',
    records: Object.keys(EXTERNAL_TYPES).reduce((acc, key) => {
      acc.push({ id: EXTERNAL_TYPES[key], label: key.toUpperCase() });
      return acc;
    }, [])
  }
];

const downData = [
  {
    tableName: 'access',
    records: []
  },
  {
    tableName: 'account_status',
    records: []
  },
  {
    tableName: 'external_type',
    records: []
  }
].concat(coreData);

module.exports = {
  up: queryInterface => Promise.all(serialPromiseMapper(coreData, dataSet =>
       new Promise((resolve) => {
         console.log(`Adding Records to table "${dataSet.tableName}": `);
         return queryInterface.bulkInsert(dataSet.tableName, dataSet.records)
          .then((data) => {
            console.log(`\tCompleted Records to table "${dataSet.tableName}"`);
            resolve(data);
          })
          .catch((error) => {
            console.error(`\tFailed Records to "${dataSet.tableName}":\n\n`, error);
            resolve();
          });
       })
    )
  ),
  down: queryInterface => Promise.all(serialPromiseMapper(downData.reverse(), dataSet =>
       new Promise((resolve) => {
         console.log(`Removing from table "${dataSet.tableName}": `);
         queryInterface.bulkDelete(dataSet.tableName)
          .then(() => {
            console.log(`\tCompleted removal from "${dataSet.tableName}"`);
            resolve();
          })
          .catch((error) => {
            console.error(`\tFailed removal from "${dataSet.tableName}":\n\n`, error);
            resolve();
          });
       })
    )
  )
};

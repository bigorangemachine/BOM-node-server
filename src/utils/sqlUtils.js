import sequelize from '../sql/instance';
import jsUtils from './jsUtils';

const sqlUtils = {
  updateDateModified: (instance) => {
    /* eslint-disable no-param-reassign */
    instance.date_modified = sequelize.fn('NOW');
    /* eslint-enable no-param-reassign */
  },
  indexReKey: (record) => { // preserve original object
    return Object.keys(record)
      .filter(key => key.endsWith('_indices'))
      .reduce((acc, key) => {
        const newKey = `${jsUtils.checkRTrim(key, '_indices')}_index`;
        /* eslint-disable no-param-reassign */
        acc[newKey] = acc[key];
        delete acc[key];
      /* eslint-enable no-param-reassign */
        return acc;
      }, record);
  }
};

module.exports = sqlUtils;
module.exports.default = sqlUtils;

import Sequelize from 'sequelize';
import sequelize from '../sql/instance';

const metaModelUtils = {
  writeMetaSchema: ({ key, value }) => {
    let writeValue = value;
    let valueType = typeof writeValue;
    if (writeValue && typeof writeValue === 'object') {
      valueType = writeValue instanceof Date ? 'date' : 'json';
      writeValue = JSON.stringify(writeValue);
    }
    return { key, value: writeValue, type: valueType };
  },
  readMetaSchema: (metaRecord) => {
    const type = metaRecord.meta_value_type;
    const key = metaRecord.meta_key;
    const value = metaRecord.meta_value;
    let returnValue = value;
    // let valueType = typeof writeValue;
    if (type === 'date') {
      returnValue = new Date(JSON.parse(returnValue));
    } else if (type === 'json') {
      returnValue = JSON.parse(returnValue);
    }
    return { type, key, value: returnValue };
  },
  getMeta: function (foreignModel, foreignKey, metaKey, opts = {}) {
    return this.queryMeta({ key: metaKey }, { ...(opts.constructor === Object ? opts : {}), pk: this.dataValues.id });
  },
  queryMetaQueryConfig: function(foreignKey, metaObj) {
    const queryObj = { meta_key: metaObj.key };
    if (metaObj.type && metaObj.value) {
      if (metaObj.type) {
        queryObj.meta_value_type = metaObj.type;
      }
      queryObj.meta_value = metaObj.value;
    }
    if (this.dataValues[foreignKey]) {
      queryObj[foreignKey] = this.dataValues[foreignKey];
    }
    return queryObj;
  },
  queryMetaAttrsConfig: function(foreignKey, columns, opts = {}) {
    const specialAttrs = {};
    if (opts.grouped) {
      specialAttrs.group = [foreignKey];
    }
    if (opts.pk) {
      specialAttrs.having = sequelize.where(
        sequelize.col(foreignKey), { [Sequelize.Op.eq]: opts.pk }
      );
      if (specialAttrs.group) { // compains I'm not grouping by what we're selecting by
        specialAttrs.group = specialAttrs.group.concat(
          columns.filter(column => (column.key !== foreignKey)).map(column => column.col));
      }
    }
    if (typeof opts.order === 'string' && ['DESC', 'ASC'].includes(opts.order.toUpperCase())) { // keep after above
      specialAttrs.order = [[sequelize.col('date_modified'), opts.order]];
      specialAttrs.group = (specialAttrs.group || []).concat(sequelize.col('date_modified'));
    }
    if (typeof opts.limit === 'number') {
      specialAttrs.limit = Math.abs(opts.limit);
    }
    if (typeof opts.offset === 'number') {
      specialAttrs.offset = Math.abs(opts.offset);
    }
    return specialAttrs;
  },
  queryMeta: function (foreignModel, foreignKey, { key, value }, optsIn = { order: 'DESC' }) {
    const opts = Object.assign({ order: 'DESC', grouped: true, limit: null, offset: null, pk: null, singular: false }, optsIn);
    const metaObj = metaModelUtils.writeMetaSchema({ key, value });
    const columns = [ // order matters for having by clause
      { col: sequelize.col(foreignKey), key: foreignKey },
      { col: sequelize.col('meta_key'), key: 'meta_key' },
      { col: sequelize.col('meta_value_type'), key: 'meta_value_type' },
      { col: sequelize.col('meta_value'), key: 'meta_value' }
    ];

    const queryObj = metaModelUtils.queryMetaQueryConfig.apply(this, [foreignKey, metaObj]);
    const specialAttrs = metaModelUtils.queryMetaAttrsConfig.apply(this, [columns, opts]);

    const queryAction = opts.singular ? foreignModel.findOne.bind(foreignModel) : foreignModel.findAll.bind(foreignModel);
    return queryAction({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col(foreignKey)), 'fkCount'],
        ...(columns.map(column => [column.col, column.key]))
      ],
      where: queryObj,
      ...specialAttrs
    })
      .then(records => (opts.singular ? [records] : records))
      .then(records => records.map((readMetaSchema) => {
        if (readMetaSchema) {
          /* eslint-disable no-param-reassign */
          delete readMetaSchema.dataValues.fkCount;
          delete readMetaSchema.fkCount;
          const metaRead = metaModelUtils.readMetaSchema(readMetaSchema.dataValues);
          Object.assign(readMetaSchema.dataValues, metaRead);
          Object.assign(readMetaSchema, metaRead);
          /* eslint-enable no-param-reassign */
        }
        return readMetaSchema;
      }));
  },
  setMeta: function (foreignModel, foreignKey, { key, value }) {
    if ((!value && value !== null) || !key) {
      throw new TypeError(`setMeta was not passed a valid key value pair key: ${key} value: ${value}`);
    }
    const writeRecord = metaModelUtils.writeMetaSchema({ key, value });
    const dbRecord = {
      [foreignKey]: this.id,
      meta_value: writeRecord.value,
      meta_value_type: writeRecord.type,
      meta_key: writeRecord.key
    };
    return foreignModel.create(dbRecord);
  }
};

const mysqlUtils = {
  bindMetaPattern: (model, metaModel, foreignKey) => {
    /* eslint-disable no-param-reassign */
    model.prototype.setMeta = mysqlUtils.bindSetMeta(metaModel, foreignKey);
    model.prototype.queryMeta = mysqlUtils.bindQueryMeta(metaModel, foreignKey);
    model.prototype.getMeta = mysqlUtils.bindGetMeta(metaModel, foreignKey);
    /* eslint-enable no-param-reassign */
  },
  bindGetMeta: function (foreignModel, foreignKey) {
    return function (...args) {
      return metaModelUtils.getMeta.apply(this, [foreignModel, foreignKey, ...args]);
    };
  },
  bindQueryMeta: function (foreignModel, foreignKey) {
    return function (...args) {
      return metaModelUtils.queryMeta.apply(this, [foreignModel, foreignKey, ...args]);
    };
  },
  bindSetMeta: function (foreignModel, foreignKey) {
    return function (...args) {
      return metaModelUtils.setMeta.apply(this, [foreignModel, foreignKey, ...args]);
    };
  }
};


export default mysqlUtils;
export { metaModelUtils };

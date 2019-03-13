import Promise from 'bluebird';
import shorthash from 'shorthash';
import utils from '../../../src/utils';
import options from '../../../src/sql/options';

const  { serialPromiseMapper } = utils;

const relationList = [
  {
    table: 'user',
    field: 'account_status_id',
    foreignTable: 'account_status',
    foreignId: 'id'
  },
  {
    table: 'user',
    field: 'access_id',
    foreignTable: 'access',
    foreignId: 'id'
  },
  {
    table: 'user_access_index',
    field: 'access_id',
    foreignTable: 'access',
    foreignId: 'id'
  },
  {
    table: 'user_access_index',
    field: 'user_id',
    foreignTable: 'user',
    foreignId: 'id'
  },
  {
    table: 'user_access_index',
    field: 'list_item_id',
    foreignTable: 'list_item',
    foreignId: 'id'
  },
  {
    table: 'user_meta',
    field: 'user_id',
    foreignTable: 'user',
    foreignId: 'id'
  },
  {
    table: 'user_external',
    field: 'user_id',
    foreignTable: 'user',
    foreignId: 'id'
  },
  {
    table: 'user_external',
    field: 'external_type_id',
    foreignTable: 'external_type',
    foreignId: 'id'
  },
  {
    table: 'list_item_meta',
    field: 'list_item_id',
    foreignTable: 'list_item',
    foreignId: 'id'
  }
];

module.exports = {
  up: queryInterface => Promise.all(serialPromiseMapper(relationList, constraint =>
    queryInterface.addConstraint(constraint.table, [constraint.field], {
      name: createConstraintName(constraint),
      type: 'FOREIGN KEY',
      references: {
        table: constraint.foreignTable,
        field: constraint.foreignId
      },
      onDelete: 'cascade',
      onUpdate: 'cascade'
    }, Object.assign({}, options))
  )),
  down: queryInterface => Promise.all(serialPromiseMapper(relationList, constraint =>
      queryInterface.removeConstraint(constraint.table, createConstraintName(constraint))
  ))
};
function createConstraintName(constraint) {
  const baseStr = `${constraint.table}_${constraint.field}_${constraint.foreignTable}`;
  let output = `${baseStr}_fk`;
  if (output.length > 64) {
    output = `${shorthash.unique(baseStr)}_fk`;
  }
  return output;
}

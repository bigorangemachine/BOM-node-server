import options from '../../../src/sql/options';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('user_access_index', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      access_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        index: true
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        index: true
      },
      list_item_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        index: true
      }
    }, Object.assign({}, options)),
  down: queryInterface =>
    queryInterface.dropTable('user_access_index')
};

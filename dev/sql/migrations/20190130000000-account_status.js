import options from '../../../src/sql/options';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('account_status', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      label: {
        type: Sequelize.STRING
      },
      status_weight: {
        type: Sequelize.INTEGER
      }
    }, Object.assign({}, options)),
  down: queryInterface =>
    queryInterface.dropTable('account_status')
};

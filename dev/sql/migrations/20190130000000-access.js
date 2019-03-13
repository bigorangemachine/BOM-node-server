import options from '../../../src/sql/options';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('access', {
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
    queryInterface.dropTable('access')
};

import options from '../../../src/sql/options';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('external_type', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      label: {
        type: Sequelize.STRING
      }
    }, Object.assign({}, options)),
  down: queryInterface =>
    queryInterface.dropTable('external_type')
};

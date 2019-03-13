import options from '../../../src/sql/options';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('list_item', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      is_public: {
        type: Sequelize.INTEGER(1).UNSIGNED,
        index: true
      },
      label: {
        type: Sequelize.STRING
      }
    }, Object.assign({}, options)),
  down: queryInterface =>
    queryInterface.dropTable('list_item')
};

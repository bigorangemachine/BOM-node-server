import options from '../../../src/sql/options';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('user_external', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        index: true
      },
      external_ident: {
        type: Sequelize.STRING
      },
      external_type_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        index: true
      }
    }, Object.assign({}, options)),
  down: queryInterface =>
    queryInterface.dropTable('user_external')
};

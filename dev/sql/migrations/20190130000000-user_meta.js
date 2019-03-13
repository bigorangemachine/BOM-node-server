import options from '../../../src/sql/options';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('user_meta', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        index: true
      },
      meta_value: {
        type: Sequelize.TEXT('medium')
      },
      meta_value_type: {
        type: Sequelize.STRING(6)
      },
      meta_key: {
        type: Sequelize.STRING,
        index: true
      },
      date_created: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      },
      date_modified: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('NOW()'),
        allowNull: false
      }
    }, Object.assign({}, options)),
  down: queryInterface =>
    queryInterface.dropTable('user_meta')
};

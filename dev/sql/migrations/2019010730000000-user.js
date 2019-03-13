import options from '../../../src/sql/options';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.createTable('user', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      account_status_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        index: true
      },
      access_id: {
        type: Sequelize.INTEGER.UNSIGNED,
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
      },
      date_last_login: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: true
      }
    }, Object.assign({}, options)),
  down: queryInterface =>
    queryInterface.dropTable('user')
};

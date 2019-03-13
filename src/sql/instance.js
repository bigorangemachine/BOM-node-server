import Sequelize from 'sequelize';
import config from './config';

const connection = config[process.env.NODE_ENV || 'local'];

export default new Sequelize(Object.assign({}, connection, {
  operatorsAliases: Sequelize.Op,
  logging: !process.env.DEBUG_SQL ? false : console.log
}));

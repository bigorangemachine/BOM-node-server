import Sequelize from 'sequelize';
import sequelize from './instance';
import models from './models';

/*
 * Need this to pass into sequelize CLI
 */

const db = {};

Object.keys(models).forEach((key) => {
  const model = models[key];
  db[model.name] = model;
});

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;

import Sequelize from 'sequelize';
import sequelize from './instance';
import opts from './options';
import modelsSetup from './modelsSetup';
import sqlUtils from '../utils/sqlUtils';

const Access = sequelize.define(
  'access', {
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
  },
  opts
);

const ExternalType = sequelize.define(
  'external_type', {
    id: {
      type: Sequelize.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    label: {
      type: Sequelize.STRING
    }
  },
  opts
);

const AccountStatus = sequelize.define(
  'account_status', {
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
  },
  opts
);

const UserExternal = sequelize.define(
  'user_external', {
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
  },
  opts
);

const UserAccessIndex = sequelize.define(
  'user_access_index', {
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
  },
  opts
);

const User = sequelize.define(
  'user', {
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
  },
  Object.assign({}, opts, {
    hooks: {
      beforeBulkUpdate: sqlUtils.updateDateModified,
      beforeUpdate: sqlUtils.updateDateModified
    }
  })
);

const UserMeta = sequelize.define(
  'user_meta', {
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
  },
  Object.assign({}, opts, {
    hooks: {
      beforeBulkUpdate: sqlUtils.updateDateModified,
      beforeUpdate: sqlUtils.updateDateModified
    }
  })
);

const ListItem = sequelize.define(
  'list_item', {
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
  },
  Object.assign({}, opts, {
    hooks: {
      beforeBulkUpdate: sqlUtils.updateDateModified,
      beforeUpdate: sqlUtils.updateDateModified
    }
  })
);

const ListItemMeta = sequelize.define(
  'list_item_meta', {
    id: {
      type: Sequelize.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    list_item_id: {
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
  },
  Object.assign({}, opts, {
    hooks: {
      beforeBulkUpdate: sqlUtils.updateDateModified,
      beforeUpdate: sqlUtils.updateDateModified
    }
  })
);

Access.hasMany(UserAccessIndex, { foreignKey: 'access_id' });
UserAccessIndex.belongsTo(Access);
User.hasMany(UserAccessIndex, { foreignKey: 'user_id' });
UserAccessIndex.belongsTo(User);
ListItem.hasMany(UserAccessIndex, { foreignKey: 'list_item_id' });
UserAccessIndex.belongsTo(ListItem);

AccountStatus.hasMany(User, { foreignKey: 'account_status_id' });
User.belongsTo(AccountStatus);

User.hasMany(UserExternal, { foreignKey: 'user_id' });
UserExternal.belongsTo(User);
ExternalType.hasMany(UserExternal, { foreignKey: 'external_type_id' });
UserExternal.belongsTo(ExternalType);

User.hasMany(UserMeta, { foreignKey: 'user_id' });
UserMeta.belongsTo(User);

ListItem.hasMany(ListItemMeta, { foreignKey: 'list_item_id' });
ListItemMeta.belongsTo(ListItem);


const models = modelsSetup({
  Access,
  AccountStatus,
  ListItem,
  ListItemMeta,
  ExternalType,
  User,
  UserExternal,
  UserAccessIndex,
  UserMeta
});

export default models;

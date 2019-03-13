import Sequelize from 'sequelize';
import sequelize from './instance';
import sqlMetaModelUtils from '../utils/sqlMetaModelUtils';
import sqlUtils from '../utils/sqlUtils';
import passwordUtils from '../utils/passwordUtils';
import constants from '../constants';

const { ACCESS_LEVEL_WEIGHT, ACCOUNT_STATUS, ACCESS_LEVEL, META_KEYS } = constants;
const {
  UNAME,
  PASS
} = META_KEYS.USER;

const helpers = {
  permsForOutput: (permIndex, opts = { focus: 'list_item' }) => permIndex.reduce((acc, access) => {
    const permKey = Object.keys(ACCESS_LEVEL).filter(level => ACCESS_LEVEL[level] === access.access_id)[0];
    const optionsExtra = {};
    if (opts.focus.toLowerCase() === 'list_item') {
      optionsExtra.listItemId = access.list_item_id;
    } else if (opts.focus.toLowerCase() === 'user') {
      optionsExtra.userId = access.user_id;
    }
    acc.push({
      perm: permKey,
      permWeight: ACCESS_LEVEL_WEIGHT[permKey],
      ...optionsExtra

    });
    return acc;
  }, [])
};
const configureModels = {
  UserListItemAccess: (UserAccessIndex) => {
    // User.ListItemAccess = function(userId) is below
    return function (userId) {
      return this.findOne({
        attributes: ['id', 'account_status_id'],
        where: {
          id: userId,
          account_status_id: { [Sequelize.Op.ne]: ACCOUNT_STATUS.INACTIVE }
        },
        include: [
          {
            attributes: ['access_id', 'user_id', 'list_item_id'],
            model: UserAccessIndex
          }
        ]
      })
      .then(sqlUtils.indexReKey);
    };
  },
  UserIsActiveAccount: () => {
    // User.isActiveAccount
    return function (userId) {
      return this.findOne({
        where: {
          id: userId,
          account_status_id: { [Sequelize.Op.ne]: ACCOUNT_STATUS.INACTIVE }
        } });
    };
  },
  UserLogin: () => {
    // User.login
    return function (userId, opts = { update: { loginStamp: true } }) {
      return this.isActiveAccount(userId)
        .then((activeRecord) => {
          if (opts.update && opts.update.loginStamp) {
            // eslint-disable-next-line no-param-reassign
            activeRecord.date_last_login = sequelize.fn('NOW');
          }
          const applyUpdates = Object.keys(opts.update || {})
            .filter(upKey => opts.update[upKey]);

          return Promise.all([
            applyUpdates.length > 0 ? activeRecord.save().then(sqlUtils.indexReKey) : {},
            this.listItemAccess(userId).then(sqlUtils.indexReKey)
          ]);
        })
        .then(([, accessResult]) => ({
          ...accessResult.dataValues,
          accessIndex: helpers.permsForOutput(accessResult.user_access_index, { focus: 'list_item' })
        }));
    };
  },
  UserMatchPasswordToUser: () => {
    // User.matchPasswordToUser
    return function (userId, password) {
      return this.isActiveAccount(userId)
        .then(record => (!record ? [] : record.getMeta(PASS, { singular: true }))) // find the newest password associated
        .then(metas => (metas instanceof Array && metas.length > 0 ? metas[0] : null))
        .then(metaRecord => (metaRecord ? passwordUtils.compare(password, metaRecord.dataValues.value) : false));
    };
  },
  UserLocalAuthentication: () => {
    // User.localAuthentication
    return function (auth) {
      const defaultOut = { [UNAME]: auth.accountIdent, isMatched: false }; // anonymized failure
      return this.build().queryMeta({ key: UNAME, value: auth.accountIdent }, { singular: true }) // reverse look up - find the newest username associated
        .then(records => records.map(record => (record && record.dataValues ? record.dataValues : {}))) // get only the values
        .then(userRows => Promise.all(userRows.map(userRow => this.matchPasswordToUser(userRow.user_id, auth.password) // look up user & match password
          // matchPasswordToUser thens!
          .then(isMatched => ({ isMatched, userId: userRow.user_id || null, [UNAME]: userRow.value || auth.accountIdent }))
          .catch((err) => { // keep the rest of the tasks going if there is any failture

            process.env.VERBOSE && console.error(`User.localAuthentication` +
              ` -> matchPasswordToUser( { accountIdent: ${auth.accountIdent} password: ******* } )`, err);
            return Promise.resolve(defaultOut); // bounce promise with truthy
          })
        )))
        // minimalist resolution - if no match don't return the id
        .then(authMatches => (authMatches && authMatches.length > 0 ? authMatches.find(r => r.isMatched) || defaultOut : defaultOut));
    };
  }
};

/* eslint-disable no-param-reassign */
const modelsSetup = (models) => {
  const { UserAccessIndex, User, UserMeta, ListItem, ListItemMeta } = models;
  sqlMetaModelUtils.bindMetaPattern(User, UserMeta, 'user_id');
  sqlMetaModelUtils.bindMetaPattern(ListItem, ListItemMeta, 'list_item_id');

  User.listItemAccess = configureModels.UserListItemAccess(UserAccessIndex);
  User.localAuthentication = configureModels.UserLocalAuthentication();
  User.isActiveAccount = configureModels.UserIsActiveAccount();
  User.matchPasswordToUser = configureModels.UserMatchPasswordToUser();
  User.login = configureModels.UserLogin();
  return models;
};
/* eslint-enable no-param-reassign */

export default modelsSetup;
export { configureModels };

import path from 'path';
import Promise from 'bluebird';
import helpers from '../helpers';
import utils from '../../../src/utils';
import constants from '../../../src/constants';

const {
  APP_ROOT,
  ACCESS_LEVEL,
  ACCOUNT_STATUS,
  EXTERNAL_TYPES
} = constants;
const { serialPromiseMapper } = utils;

const allData = [
  {
    User: {
      userPK: 1,
      userAccess: ACCESS_LEVEL.USER,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      userName: 'testing-firsty',
      firstName: 'Bob',
      lastName: 'Testing 1',
      userAvatar: path.resolve(APP_ROOT, 'dev/images/git-unicorn.png')
    }
  },
  {
    User: {
      userPK: 2,
      userAccess: ACCESS_LEVEL.USER,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      userName: 'testing-2',
      firstName: 'Sam',
      lastName: 'Testing 2'
    }
  },
  {
    User: {
      userPK: 3,
      userAccess: ACCESS_LEVEL.USER,
      accountStatus: ACCOUNT_STATUS.INACTIVE,
      userName: 'temporary-removed-user',
      firstName: 'Inactive User',
      lastName: 'Testing 3'
    }
  },
  {
    User: {
      userPK: 4,
      userAccess: ACCESS_LEVEL.ADMIN,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      userName: 'the-admin',
      firstName: 'Test',
      lastName: 'Admin',
      userAvatar: path.resolve(APP_ROOT, 'dev/images/git-unicorn.png'),
      userBanner: path.resolve(APP_ROOT, 'dev/images/git-unicorn.png')
    }
  },
  {
    User: {
      userPK: 5,
      userAccess: ACCESS_LEVEL.USER,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      userName: 'user-with-google-account',
      firstName: 'Test',
      lastName: 'External Google Account'
    },
    UserExternal: [
      {
        externalIdent: '11223344',
        externalTypeId: EXTERNAL_TYPES.GOOGLE
      }
    ]
  },
  {
    User: {
      userPK: 6,
      userAccess: ACCESS_LEVEL.USER,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      userName: 'owner-with-listings',
      firstName: 'Test Owner',
      middleName: 'W.',
      lastName: 'Listing'
    },
    ListItems: [
      {
        itemPk: 1,
        label: 'Test List Item #1',
        isPublic: 1
      },
      {
        itemPk: 2,
        label: 'Test List #2 (Non-Public)',
        isPublic: 0
      }
    ]
  },
  {
    User: {
      userPK: 7,
      userAccess: ACCESS_LEVEL.OWNER,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      userName: 'owner-without-listings',
      firstName: 'Test Owner',
      middleName: 'W. ',
      lastName: 'Out-Listing'
    },
    ListItems: [
      {
        itemPk: 3,
        label: 'Test Non-Public List Item #1',
        isPublic: 0
      },
      {
        itemPk: 4,
        label: 'Test Non-Public List #2',
        isPublic: 0
      }
    ]
  }
];

module.exports = {
  up: () => {
    return Promise.all(serialPromiseMapper(allData, (dataSet) => helpers.addUser(dataSet.User)
        .then(userRecord => Promise.all([
          userRecord,
          Promise.all(!(dataSet.ListItems instanceof Array) ?
            [null] :
            dataSet.ListItems.map(helpers.addListItem.bind(null, userRecord))),
          Promise.all(!(dataSet.UserExternal instanceof Array) ?
            [null] :
            dataSet.UserExternal.map(helpers.addUserExternal.bind(null, userRecord)))
        ]))
        .then(([ userRecord, listItems, externalAccounts ]) => ({ userRecord, listItems, externalAccounts }))
        .then(helpers.endLogger.bind(null, 'Creatation/Update', dataSet))
      )
    );
  },
  down: () => {
    return Promise.all(serialPromiseMapper(allData, (dataSet) => helpers.removeUser(dataSet.User)
        .then(userRecord => Promise.all([
          userRecord,
          Promise.all(!(dataSet.ListItems instanceof Array) ?
            [null] :
            dataSet.ListItems.map(helpers.removeListItem.bind(null, userRecord))),
          Promise.all(!(dataSet.UserExternal instanceof Array) ?
            [null] :
            dataSet.UserExternal.map(helpers.removeUserExternal.bind(null, userRecord)))
        ]))
        .then(([ userRecord, listItems, externalAccounts ]) => ({ userRecord, listItems, externalAccounts }))
        .then(helpers.endLogger.bind(null, 'Removal', dataSet))
    ));
  }
};

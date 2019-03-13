import bcrypt from 'bcrypt';

const saltRounds = 10;
const passwordUtils = {
  saltAndHash: (passwordStr, rnds = saltRounds) => passwordUtils.salt(rnds).then(salt => passwordUtils.hash(passwordStr, salt)),
  salt: (rnds = saltRounds) => bcrypt.genSalt(rnds),
  hash: (passwordStr, salt) => bcrypt.hash(passwordStr, salt),
  compare: (passwordStr, dbPass) => bcrypt.compare(passwordStr, dbPass)
};

export default passwordUtils;

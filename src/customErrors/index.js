class AuthenticationError extends Error {
  constructor(errorInput = 'Incorrect username or password', ...args) {
    super(errorInput, ...args);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}
class ExpressRequestTypeError extends Error {}
class ExpressRequestFileError extends Error {
  constructor({ imgPath, pathname }, ...args) {
    let errorInput = 'Unspecified Express Requested File Error';
    if (imgPath && pathname) {
      errorInput = `Invalid file; path not found to '${imgPath}${pathname}'`;
    } else if(imgPath) {
      errorInput = `Invalid base file path ${imgPath}`;
    }
    super(errorInput, ...args);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExpressRequestFileError);
    }
  }
}

const customErrors = { AuthenticationError, ExpressRequestTypeError, ExpressRequestFileError };

module.exports = customErrors;
module.exports.default = customErrors;

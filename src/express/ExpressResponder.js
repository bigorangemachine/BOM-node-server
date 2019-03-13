const responseSchema = {
  dateStamp: null,
  redirect: null,
  error: { message: 'Something went Wrong' },
  payload: null,
  code: 400
};
const successSchemaBase = Object.assign({}, responseSchema, {
  code: 200,
  payload: {},
  error: null
});
const failedSchemaBase = Object.assign({}, responseSchema);

class ExpressResponder {
  constructor({ res, successSchema, failedSchema }) {
    this.successSchema = Object.assign({}, successSchema || successSchemaBase);// break pass by reference
    this.failedSchema = Object.assign({}, failedSchema || failedSchemaBase);

    this.bindMethods({ res });
  }

  bindMethods({ res }) {
    this.failAs = this.failAs.bind(this, res);
    this.respond = this.respond.bind(this, res);
  }

  makeSuccessSchema(payload, opts = {}) {
    return Object.assign({}, this.successSchema, opts, { payload: payload });
  }

  makeFailSchema(err, code, redirect) {
    let error = err instanceof Error ? { message: err.message } : err;
    if (typeof err === 'string') {
      error = { message: err };
    } else if (err instanceof Array) {
      error = err;
    }
    return Object.assign({}, this.failedSchema, {
      code: typeof (code) !== 'undefined' ? code : 400,
      redirect: redirect || this.failedSchema.redirect,
      error
    });
  }

  success(payload) { // alias
    return this.succeed(payload);
  }

  succeedAs(payload) { // alias
    return this.succeed(payload);
  }

  succeed(payload, opts = {}) {
    return this.respond(this.makeSuccessSchema(payload, opts));
  }

  // convert list to key-pair
  failMap(failObj) {
    return failObj.reduce((acc, fail) => {
      // eslint-disable-next-line no-param-reassign
      acc[fail.field] = fail.message;
      return acc;
    }, {});
  }

  fail() {
    return this.failAs('Not Found');
  }

  failAs(res, error, status = 400, redirect = null) {
    const self = this;
    res.status(status);
    return self.respond(self.makeFailSchema(error, status, redirect));
  }

  respond(res, responseObj) {
    const output = responseObj;
    output.dateStamp = new Date().getTime();
    res.json(output);
    return output;
  }
}

export default ExpressResponder;

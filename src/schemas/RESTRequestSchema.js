import expressUtils from '../utils/expressUtils';

const whichCrud = {
  isCrudCreate: method => expressUtils.cleanMethod(method) === 'POST',
  isCrudRead: method => expressUtils.cleanMethod(method) === 'GET',
  isCrudUpdate: method => ['PUT', 'PATCH'].includes(expressUtils.cleanMethod(method)),
  isCrudDelete: method => expressUtils.cleanMethod(method) === 'DELETE'
};

class RESTRequestSchema {
  constructor(options = {}, crudOp = null){
    let opts;
    try {
      opts = { ...(typeof options === 'string' && options.trim().length > 0 ? JSON.parse(options) : options) };
    } catch (err) {
      console.error('RESTRequestSchema -> constructor', err);
    }
    this.create = opts.create || null;
    this.read = opts.read || null;
    this.update = opts.update || null;
    this.patchUpdate = opts.patchUpdate || null;
    this.remove = opts.remove || null;
    this.crudOp = (opts && crudOp) || null;
  }

  toJSON() {
    const { ident, payload } = this.getCrudOperation();
    return {
      ...(ident && typeof ident === 'object' ? ident : { ident }),
      ...payload
    };
  }

  setCrudOperation(method) {
    let validAction = false;
    if(whichCrud.isCrudRead(method)) {
      validAction = 'read';
    } else if(whichCrud.isCrudCreate(method)) {
      validAction = 'create';
    } else if(whichCrud.isCrudUpdate(method) && expressUtils.cleanMethod(method) === 'PATCH') {
      validAction = 'patchUpdate';
    } else if(whichCrud.isCrudUpdate(method)) {
      validAction = 'update';
    } else if(whichCrud.isCrudDelete(method)) {
      // don't use the word 'delete' because JS keyword...
      validAction = 'remove';
    }
    if (validAction) {
      this[validAction] = {};
      this.crudOp = validAction;
    }
    return validAction;
  }

  setCrudContext(data, ident) {
    const { crudOp } = this;
    this[crudOp] = {
      ident: ident || null,
      payload: {...(data.constructor === Object ? data : {})}
    };
    return this.getCrudOperation();
  }

  getCrudOperation() {
    const { crudOp } = this;
    // break reference
    return this.isOp() ? { ...this[crudOp] } : null;
  }

  isOp() {
    const { crudOp } = this;
    return crudOp && Object.keys(this[crudOp] || {}).length > 0;
  }

  isCreate() {
    const { crudOp } = this;
    return crudOp === 'create' && this.isOp();
  }

  isRead() {
    const { crudOp } = this;
    return crudOp === 'read' && this.isOp();
  }

  isUpdate(strict = false) {
    const { crudOp } = this;
    if (!strict && (crudOp === 'update' || crudOp === 'patchUpdate')) {
      return this.isOp();
    }
    return crudOp === 'update' && this.isOp();
  }

  isPatchUpdate() {
    const { crudOp } = this;
    return crudOp === 'patchUpdate' && this.isOp();
  }

  isDelete() {
    const { crudOp } = this;
    return crudOp === 'remove' && this.isOp();
  }
}
export default RESTRequestSchema;
export { whichCrud };

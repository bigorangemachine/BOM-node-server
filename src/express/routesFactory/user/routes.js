import expressUtils from '../../../utils/expressUtils';
import { ExpressRequestTypeError }  from '../../../customErrors';
import RESTRequestSchema from '../../../schemas/RESTRequestSchema';

const userMiddleWares = {
  setupContext: () => (req, res, next) => {
    req.locals.userContext = new RESTRequestSchema();
    const validAction = req.locals.userContext.setCrudOperation(req.method);
    const tempUserId = 13434234;
    if(validAction === 'patchUpdate') {
      req.locals.userContext.setCrudContext({}, {
        userId: tempUserId,
        listItemId: req.params.listItemId
      });
    } else {
      req.locals.userContext.setCrudContext({}, {
        userId: tempUserId
      });
    }
    next(!validAction ? new ExpressRequestTypeError() : null);
  }
};
const userRoutes = {
  respondUser: () => (req, res, next) => {
    const { locals } = req;
    const { responder, userContext } = locals;
    if (userContext.isOp()) {
      responder.success(userContext);
    } else {
      next();
    }
  },
  respondUserLike: (deps, opts = {}) => (req, res, next) => {
    const { locals, log } = req;
    const { responder, userContext } = locals;
    const { urlLikeActionPattern } = opts;

    if (!userContext.isPatchUpdate() || !expressUtils.matchUriAsExpress(urlLikeActionPattern, req.url)) {
      log.info('Bad patch update; URL didn\'t match or schema was falsey');
      next(new ExpressRequestTypeError());
      return;
    }
    responder.success(userContext);
  }
};


export default userRoutes;
export { userMiddleWares };

const WAIT_FOR_ACTION = Symbol('WAIT_FOR_ACTION');
const ERROR_ACTION = Symbol('ERROR_ACTION');

export { WAIT_FOR_ACTION, ERROR_ACTION };

export default function() {
  const resolveCallbackQueue = {};
  const rejectCallbackQueue = {};
  const resolveRejectMap = {};

  //eslint-disable-next-line
  return store => next => action => {

    if (!action.type) {
      return next(action);
    }

    if (resolveCallbackQueue[action.type]) {
      resolveCallbackQueue[action.type].forEach(resolveFunction =>
        resolveFunction(action.payload || action.data || {})
      );
      resolveCallbackQueue[action.type] = [];

      const mappedErrorAction = resolveRejectMap[action.type];
      if (mappedErrorAction) {
        rejectCallbackQueue[mappedErrorAction] = [];
      }
    }

    if (rejectCallbackQueue[action.type]) {
      rejectCallbackQueue[action.type].forEach(rejectFunction =>
        rejectFunction(action.error || action.err || new Error('action.error not specified.'))
      );
      rejectCallbackQueue[action.type] = [];

      for (let resolveAction in resolveRejectMap) {
        if (resolveRejectMap[resolveAction] === action.type) {
          let mappedResolveAction = resolveAction;
          resolveCallbackQueue[mappedResolveAction] = [];
        }
      }
    }

    if (!action[WAIT_FOR_ACTION]) {
      return next(action);
    }

    const resolveAction = action[WAIT_FOR_ACTION];
    const errorAction = action[ERROR_ACTION];

    resolveRejectMap[resolveAction] = errorAction;

    if (!resolveCallbackQueue[resolveAction]) {
      resolveCallbackQueue[resolveAction] = [];
    }

    if (errorAction && (!rejectCallbackQueue[errorAction])) {
      rejectCallbackQueue[errorAction] = [];
    }

    const promise = new Promise((resolve, reject) => {
      resolveCallbackQueue[resolveAction].push(resolve);

      if (errorAction) {
        rejectCallbackQueue[errorAction].push(reject);
      }
    });

    return promise;

  };
}

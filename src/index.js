const Symbol = require('es6-symbol');

const WAIT_FOR_ACTION = Symbol('WAIT_FOR_ACTION');
const ERROR_ACTION = Symbol('ERROR_ACTION');
const CALLBACK_ARGUMENT = Symbol('CALLBACK_ARGUMENT');
const CALLBACK_ERROR_ARGUMENT = Symbol('ERROR_CALLBACK_ARGUMENT');

export { WAIT_FOR_ACTION, ERROR_ACTION, CALLBACK_ARGUMENT, CALLBACK_ERROR_ARGUMENT };

const fsaCompliantArgumentCb = action => action.payload || action.data || {};
const fsaCompliantErrorArgumentCb = action => action.error || action.err || new Error('action.error not specified.');

export default function() {
  const pendingActionList = [];
  const promisesList = [];
  const getPromisesList = () => promisesList;

  //eslint-disable-next-line
  const middleware = store => next => action => {

    for (let i = pendingActionList.length - 1; i >= 0; i--) {
      const pendingActionInfo = pendingActionList[i];
      if (pendingActionInfo.isSuccessAction(action)) {
        pendingActionInfo.resolveCallback(pendingActionInfo.successArgumentCb(action));
      } else if (pendingActionInfo.isErrorAction(action)) {
        pendingActionInfo.rejectCallback(pendingActionInfo.errorArgumentCb(action));
      } else {
        continue;
      }
      pendingActionList.splice(pendingActionList.indexOf(pendingActionInfo), 1);
    }

    if (!action[WAIT_FOR_ACTION]) {
      return next(action);
    }

    const successAction = action[WAIT_FOR_ACTION];
    const errorAction = action[ERROR_ACTION];

    const newPendingActionInfo = {};

    if (typeof successAction === 'function') {
      newPendingActionInfo.isSuccessAction = successAction;
    } else {
      newPendingActionInfo.isSuccessAction = action => action.type === successAction;
    }

    if (errorAction) {
      if (typeof errorAction === 'function') {
        newPendingActionInfo.isErrorAction = errorAction;
      } else {
        newPendingActionInfo.isErrorAction = action => action.type === errorAction;
      }
    } else {
      newPendingActionInfo.isErrorAction = () => false;
    }

    newPendingActionInfo.successArgumentCb = action[CALLBACK_ARGUMENT] || fsaCompliantArgumentCb;
    newPendingActionInfo.errorArgumentCb = action[CALLBACK_ERROR_ARGUMENT] || fsaCompliantErrorArgumentCb;

    const promise = new Promise((resolve, reject) => {
      newPendingActionInfo.resolveCallback = resolve;
      newPendingActionInfo.rejectCallback = reject;
    });

    pendingActionList.push(newPendingActionInfo);
    promisesList.push(promise);

    next(action);

    return promise;

  };

  return Object.assign(middleware, { getPromisesList });
}

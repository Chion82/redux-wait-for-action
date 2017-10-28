'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  var pendingActionList = [];
  var promisesList = [];
  var getPromisesList = function getPromisesList() {
    return promisesList;
  };

  //eslint-disable-next-line
  var middleware = function middleware(store) {
    return function (next) {
      return function (action) {

        for (var i = pendingActionList.length - 1; i >= 0; i--) {
          var pendingActionInfo = pendingActionList[i];
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

        var successAction = action[WAIT_FOR_ACTION];
        var errorAction = action[ERROR_ACTION];

        var newPendingActionInfo = {};

        if (typeof successAction === 'function') {
          newPendingActionInfo.isSuccessAction = successAction;
        } else {
          newPendingActionInfo.isSuccessAction = function (action) {
            return action.type === successAction;
          };
        }

        if (errorAction) {
          if (typeof errorAction === 'function') {
            newPendingActionInfo.isErrorAction = errorAction;
          } else {
            newPendingActionInfo.isErrorAction = function (action) {
              return action.type === errorAction;
            };
          }
        } else {
          newPendingActionInfo.isErrorAction = function () {
            return false;
          };
        }

        newPendingActionInfo.successArgumentCb = action[CALLBACK_ARGUMENT] || fsaCompliantArgumentCb;
        newPendingActionInfo.errorArgumentCb = action[CALLBACK_ERROR_ARGUMENT] || fsaCompliantErrorArgumentCb;

        var promise = new Promise(function (resolve, reject) {
          newPendingActionInfo.resolveCallback = resolve;
          newPendingActionInfo.rejectCallback = reject;
        });

        pendingActionList.push(newPendingActionInfo);
        promisesList.push(promise);

        next(action);

        return promise;
      };
    };
  };

  return Object.assign(middleware, { getPromisesList: getPromisesList });
};

var WAIT_FOR_ACTION = Symbol('WAIT_FOR_ACTION');
var ERROR_ACTION = Symbol('ERROR_ACTION');
var CALLBACK_ARGUMENT = Symbol('CALLBACK_ARGUMENT');
var CALLBACK_ERROR_ARGUMENT = Symbol('ERROR_CALLBACK_ARGUMENT');

exports.WAIT_FOR_ACTION = WAIT_FOR_ACTION;
exports.ERROR_ACTION = ERROR_ACTION;
exports.CALLBACK_ARGUMENT = CALLBACK_ARGUMENT;
exports.CALLBACK_ERROR_ARGUMENT = CALLBACK_ERROR_ARGUMENT;


var fsaCompliantArgumentCb = function fsaCompliantArgumentCb(action) {
  return action.payload || action.data || {};
};
var fsaCompliantErrorArgumentCb = function fsaCompliantErrorArgumentCb(action) {
  return action.error || action.err || new Error('action.error not specified.');
};
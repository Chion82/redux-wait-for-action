'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  var pendingActionList = [];

  //eslint-disable-next-line
  return function (store) {
    return function (next) {
      return function (action) {

        for (var i = pendingActionList.length - 1; i >= 0; i--) {
          var pendingActionInfo = pendingActionList[i];
          if (pendingActionInfo.isSuccessAction(action)) {
            pendingActionInfo.resolveCallback(action.payload || action.data || {});
          } else if (pendingActionInfo.isErrorAction(action)) {
            pendingActionInfo.rejectCallback(action.error || action.err || new Error('action.error not specified.'));
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

        var promise = new Promise(function (resolve, reject) {
          newPendingActionInfo.resolveCallback = resolve;
          newPendingActionInfo.rejectCallback = reject;
        });

        pendingActionList.push(newPendingActionInfo);

        next(action);

        return promise;
      };
    };
  };
};

var WAIT_FOR_ACTION = Symbol('WAIT_FOR_ACTION');
var ERROR_ACTION = Symbol('ERROR_ACTION');

exports.WAIT_FOR_ACTION = WAIT_FOR_ACTION;
exports.ERROR_ACTION = ERROR_ACTION;
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  var resolveActionQueue = {};
  var rejectActionQueue = {};

  //eslint-disable-next-line
  return function (store) {
    return function (next) {
      return function (action) {

        if (resolveActionQueue[action.type]) {
          resolveActionQueue[action.type].forEach(function (resolveFunction) {
            return resolveFunction(action.payload || action.data || {});
          });
          resolveActionQueue[action.type] = [];
        }

        if (rejectActionQueue[action.type]) {
          rejectActionQueue[action.type].forEach(function (rejectFunction) {
            return rejectFunction(action.error || action.err || new Error('action.error not specified.'));
          });
          rejectActionQueue[action.type] = [];
        }

        if (!action[WAIT_FOR_ACTION]) {
          return next(action);
        }

        var resolveAction = action[WAIT_FOR_ACTION];
        var errorAction = action[ERROR_ACTION];

        if (!resolveActionQueue[resolveAction]) {
          resolveActionQueue[resolveAction] = [];
        }

        if (errorAction && !rejectActionQueue[errorAction]) {
          rejectActionQueue[errorAction] = [];
        }

        var promise = new Promise(function (resolve, reject) {
          resolveActionQueue[resolveAction].push(resolve);

          if (errorAction) {
            rejectActionQueue[errorAction].push(reject);
          }
        });

        return promise;
      };
    };
  };
};

var WAIT_FOR_ACTION = Symbol('WAIT_FOR_ACTION');
var ERROR_ACTION = Symbol('ERROR_ACTION');

exports.WAIT_FOR_ACTION = WAIT_FOR_ACTION;
exports.ERROR_ACTION = ERROR_ACTION;
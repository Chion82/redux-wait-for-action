'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function () {
  var resolveCallbackQueue = {};
  var rejectCallbackQueue = {};
  var resolveRejectMap = {};

  //eslint-disable-next-line
  return function (store) {
    return function (next) {
      return function (action) {

        if (!action.type) {
          return next(action);
        }

        if (resolveCallbackQueue[action.type]) {
          resolveCallbackQueue[action.type].forEach(function (resolveFunction) {
            return resolveFunction(action.payload || action.data || {});
          });
          resolveCallbackQueue[action.type] = [];

          var mappedErrorAction = resolveRejectMap[action.type];
          if (mappedErrorAction) {
            rejectCallbackQueue[mappedErrorAction] = [];
          }
        }

        if (rejectCallbackQueue[action.type]) {
          rejectCallbackQueue[action.type].forEach(function (rejectFunction) {
            return rejectFunction(action.error || action.err || new Error('action.error not specified.'));
          });
          rejectCallbackQueue[action.type] = [];

          for (var _resolveAction in resolveRejectMap) {
            if (resolveRejectMap[_resolveAction] === action.type) {
              var mappedResolveAction = _resolveAction;
              resolveCallbackQueue[mappedResolveAction] = [];
            }
          }
        }

        if (!action[WAIT_FOR_ACTION]) {
          return next(action);
        }

        var resolveAction = action[WAIT_FOR_ACTION];
        var errorAction = action[ERROR_ACTION];

        resolveRejectMap[resolveAction] = errorAction;

        if (!resolveCallbackQueue[resolveAction]) {
          resolveCallbackQueue[resolveAction] = [];
        }

        if (errorAction && !rejectCallbackQueue[errorAction]) {
          rejectCallbackQueue[errorAction] = [];
        }

        var promise = new Promise(function (resolve, reject) {
          resolveCallbackQueue[resolveAction].push(resolve);

          if (errorAction) {
            rejectCallbackQueue[errorAction].push(reject);
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
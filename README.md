Redux Wait for Action
--------------------
[![Build Status](https://travis-ci.org/Chion82/redux-wait-for-action.svg?branch=master)](https://travis-ci.org/Chion82/redux-wait-for-action)
[![npm version](https://badge.fury.io/js/redux-wait-for-action.svg)](https://badge.fury.io/js/redux-wait-for-action)

Redux middleware to make `store.dispatch()` return a promise which will be fulfilled when another specified action is dispatched, which is useful for universal(isomorphic) React Web Apps with redux and server-side rendering.

```
npm install --save redux-wait-for-action
```

Quick Start
-----------
[Minimal starter kit for universal apps with redux and redux-saga](https://github.com/Chion82/react-redux-universal-minimal)

Basic Usage
-----------
To fire `todos/get` action and subscribe for `todos/get/success` action:
```javascript
import { WAIT_FOR_ACTION, ERROR_ACTION } from 'redux-wait-for-action';
store.dispatch({
  type: 'todos/get',
  [ WAIT_FOR_ACTION ]: 'todos/get/success', // Specify which action we are waiting for
  [ ERROR_ACTION ]: 'todos/get/failed', // Optional
}).then( payload => console.log('Todos got!') )
.catch( error => console.error('Failed!' + error.message) );
```
Alternatively, use conditional functions as `WAIT_FOR_ACTION`, which is useful when firing multiple actions with same `action.type` in parallel:
```javascript
store.dispatch({
  type: 'profile/get',
  [ WAIT_FOR_ACTION ]: action => action.type === 'profile/get/success' && action.id === 1,
  // Only subscribe for profile/get/success action whose profile id equals 1
  [ ERROR_ACTION ]: action => action.type === 'profile/get/failed' && action.id === 1,
}).then( payload => console.log('ID #1 Profile got!') )
.catch( error => console.error('Failed!' + error.message) );
```

For Isomorphic Apps
-------------------
* For each React container, we define a static function `fetchData()` where we return a `store.dispatch()` call followed by automatic execution of side effects. We should call this `store.dispatch()` with an action that also contains information about which action we are waiting for.
* Use those `fetchData()`s to populate page data on **both client and server side**.
* On server side, we put the rendering logic in `fetchData().then(() => { /* rendering logic here! */ })`, where side effects are completed and an action with finishing flag is dispatched.
* If you are using [redux-thunk](https://github.com/gaearon/redux-thunk), `store.dispatch()` already returns a promise and you probably don't need this middleware. However, side effects like [redux-saga](https://github.com/yelouafi/redux-saga) running separately from primitive Redux flow don't explicitly notify us when a specific async fetch is finished, in which case redux-wait-for-action does the trick and makes those async tasks subscribable.
* Although redux-saga added `runSaga().done` support which returns a promise to tell when a specific saga task is completed, it's quite tricky where saga tasks aren't started by a `dispatch()` call and it does't work when using sagas containing infinite loops.

Usage with react-router and redux-saga
--------------------------------------
`configureStore()` function where a Redux store is created on **both client and server side**:
```javascript
import createReduxWaitForMiddleware from 'redux-wait-for-action';

function configureStore(initialState) {
  const sagaMiddleware = createSagaMiddleware();
  let enhancer = compose(
    applyMiddleware(sagaMiddleware),
    applyMiddleware(createReduxWaitForMiddleware()),
  );
  const store = createStore(rootReducer, initialState, enhancer);

  // ...
}
```
Assume we have saga effects like this:
```javascript
function* getTodosSaga() {
  const payload = yield call(APIService.getTodos);
  yield put({
    type: 'todos/get/success',
    payload
  });
}
function* rootSaga() {
  yield takeLatest('todos/get', getTodosSaga);
}
```
Define a `fetchData()` for each of our containers:
```javascript
import { WAIT_FOR_ACTION } from 'redux-wait-for-action';

class TodosContainer extends Component {
  static fetchData(dispatch) {
    return dispatch({
      type: 'todos/get',
      [ WAIT_FOR_ACTION ]: 'todos/get/success',
    });
  }
  componentDidMount() {
    // Populate page data on client side
    TodosContainer.fetchData(this.props.dispatch);
  }
  // ...
}
```
Here in our action we specify `WAIT_FOR_ACTION` as `'profile/get/success'`, which tells our promise to wait for another action `'profile/get/success'`. `WAIT_FOR_ACTION` is a ES6 `Symbol` instance rather than a string, so feel free using it and it won't contaminate your action.

Next for server side rendering, we reuse those `fetchData()`s to get the data we need:
```javascript
//handler for Express.js
app.use('*', handleRequest);
function handleRequest(req, res, next) {
  //...
  match({history, routes, location: req.url}, (error, redirectLocation, renderProps) => {
    //...handlers for redirection, error and null renderProps...

    const getReduxPromise = () => {
      const component = renderProps.components[renderProps.components.length - 1].WrappedComponent;
      const promise = component.fetchData ?
        component.fetchData(store.dispatch) :
        Promise.resolve();
      return promise;
    };

    getReduxPromise().then(() => {
      const initStateString = JSON.stringify(store.getState());
      const html = ReactDOMServer.renderToString(
        <Provider store={store}>
          { <RouterContext {...renderProps}/> }
        </Provider>
      );
      res.status(200).send(renderFullPage(html, initStateString));
    });
  });
}
```


Advanced Usage
--------------
### Error Handling

Use `try-catch` clause in saga effects. The `todos/get/failed` action object should contain a top-level key `error` or `err` whose value is an error descriptor(An `Error()` instance or a string).
```javascript
function* getTodosSaga() {
  yield take('todos/get');
  try {
    const payload = yield call(APIService.getTodos);
    yield put({
      type: 'todos/get/success',
      payload
    });
  } catch (error) {
    yield put({
      type: 'todos/get/failed',
      error
    });
  }
}
```
Make sure both `WAIT_FOR_ACTION` and `ERROR_ACTION` symbols are specified in your `todos/get` action:
```javascript
import { WAIT_FOR_ACTION, ERROR_ACTION } from 'redux-wait-for-action';

class TodosContainer extends Component {
  static fetchData(dispatch) {
    return dispatch({
      type: 'todos/get',
      [ WAIT_FOR_ACTION ]: 'todos/get/success',
      [ ERROR_ACTION ]: 'todos/get/failed',
    });
  }
  // ...
}
```
Server side rendering logic:
```javascript
getReduxPromise().then(() => {
  // ...
  res.status(200).send(renderFullPage(html, initStateString));
}).catch((error) => { //action.error is passed to here
  res.status(500).send(error.message);
});
```

### Overriding the Default Promise Arguments

By default the `payload` or `data` field on the `WAIT_FOR_ACTION` action is provided to the promise when it is resolved, or rejected with the `error` or `err` field.

There are two additional symbols, `CALLBACK_ARGUMENT` and `CALLBACK_ERROR_ARGUMENT`, which can be used to override this behavior. If functions are stored on the action using these symbols, they will be invoked and passed the entire action. The result returned from either function is used to resolve or reject the promise based on which symbol was used.

```javascript
import { WAIT_FOR_ACTION, ERROR_ACTION, CALLBACK_ARGUMENT, CALLBACK_ERROR_ARGUMENT} from 'redux-wait-for-action';
store.dispatch({
  type: 'todos/get',
  [ WAIT_FOR_ACTION ]: 'todos/get/success',
  [ ERROR_ACTION ]: 'todos/get/failed',
  [ CALLBACK_ARGUMENT ]: action => action.customData,
  [ CALLBACK_ERROR_ARGUMENT ]: action => action.customError,
}).then( customData => console.log('Custom Data: ', customData) )
.catch( customError => console.error('Custom Error: ', customError) );
```
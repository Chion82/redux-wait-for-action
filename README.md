Redux Wait for Action
--------------------
[![Build Status](https://travis-ci.org/Chion82/redux-wait-for-action.svg?branch=master)](https://travis-ci.org/Chion82/redux-wait-for-action)
[![npm version](https://badge.fury.io/js/redux-wait-for-action.svg)](https://badge.fury.io/js/redux-wait-for-action)

Redux middleware to make `store.dispatch()` return a promise which will be resolved when another specified action is dispatched, which is useful for universal(isomorphic) React Web Apps with redux and server-side rendering.

```
npm install --save redux-wait-for-action
```

Quick Start
-----------
[Minimal starter kit for universal apps with redux and redux-saga](https://github.com/Chion82/react-redux-universal-minimal) 

Basic Concept
-------------
* For each React container, we define a static function `fetchData()` where we return a `store.dispatch()` call followed by automatic execution of side effects.
* Use those `fetchData()`s to populate page data on **both client and server side**.
* On server side, we put the rendering logic in `fetchData().then(() => { /* rendering logic here! */ })`, where side effects are completed and an action with finishing flag is dispatched.
* If you are using [redux-thunk](https://github.com/gaearon/redux-thunk), `store.dispatch()` already returns a promise and you probably don't need this middleware. However, side effects like [redux-saga](https://github.com/yelouafi/redux-saga) running separately from primitive Redux flow don't explicitly notify us when a specific async fetch is finished, in which case redux-wait-for-action does the trick and makes those async tasks subscribable.

Usage with react-router and redux-saga
--------------------------------------
`configureStore()` function where a Redux store is created:
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
Assume we have a saga effect like this:
```javascript
function* getTodosSaga() {
  yield take('todos/get');
  const payload = yield call(APIService.getTodos);
  yield put({
    type: 'todos/get/success',
    payload
  });
}
```
Define `fetchData()` for our container:
```javascript
import { WAIT_FOR_ACTION } from 'redux-wait-for-action';

class TodosContainer extends Component {
  static fetchData(dispatch) {
    return dispatch({
      type: 'todos/get',
      [ WAIT_FOR_ACTION ]: 'todos/get/success',
    });
  }
  // ...
}
```
Here in our action we specify `WAIT_FOR_ACTION` as `'profile/get/success'`, which tells our promise to wait for another action `'profile/get/success'`. `WAIT_FOR_ACTION` is a ES6 `Symbol` instance rather than a string, so feel free using it and it won't contaminate your action.

Next, for server side rendering:
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

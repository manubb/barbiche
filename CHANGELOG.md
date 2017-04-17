3.0.0
=====

Drop support of old browsers (Chrome < 26, Firefox < 22, IE < 11, Opera < 15).

2.0.0
=====

Identifiers not found in merge arguments are not resolved in `window` anymore. This feature can be restored if needed by setting `window` as first argument of merge method:
```js
barbiche('my-template').merge(obj_k,..., obj_3, obj_2, obj_1);
//=>
barbiche('my-template').merge(window, obj_k,..., obj_3, obj_2, obj_1);
```

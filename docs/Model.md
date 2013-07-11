# Model

Promenade.Model adds one new feature to Backbone.Model: sub-type declaration.

## types

A `types` property that is a map of attribute names to class contructors for the appropriate model or collection that corresponds with that attribute. Consider the following Promenade.Model definition:

```javascript
define(['promenade/model', 'backbone'],
       function(Model, Backbone) {
  'use strict';

  var TreeNode = Model.extend({
    types: {
      children: Backbone.Collection
    }
  });

  return TreeNode;
});
```

In the example, when the `children` attribute is set or changed on the TreeNode model, it will automatically be converted to an instance of `Backbone.Collection` (if it is not already an instance of that class).

Similarly, when the `toJSON` method is called on an instance of `TreeNode`, the `children` attribute will be automatically serialized as JSON.


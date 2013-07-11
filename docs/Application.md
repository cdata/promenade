# Application

An Application is the central entry point for a Promenade app. It inherits from Backbone.Router. Here is a contrived usage example for Application:

```javascript
define(['application', 'controller/home'],
       function(Application, HomeController) {
  'use strict';

  var App = Application.extend({
    routes: {
      '': 'home', // Synonymous with 'home#index'
      'foo': 'home#foo'
    },
    controllers: {
      'home': HomeController.create()
    }
  });

  return App;
});
```

## Controller-delegated routing

Backbone.Router refers to its own implementation when calling route handlers. In a Promenade application, named controllers are declared, and the application refers to methods on those controllers to handle navigation changes.

## Controllers

Controllers are declared via a `controllers` property. The `controllers` property is a map, where the key is a name (which is referred to in declared routes), and the value is an instance of the controller.

By convention, controllers should be instantiated with the static `create` method, as the controller may be implemented as a singleton.

For more information on controllers, please refer to the controller documentation.

## Routes

The routes property maps Backbone-style route matchers to a controller / handler pair. A controller / handler pair is a string of the form, `'{{controller_name}}#{{controller_method}}'`. So in the example implementation above, the route `foo` would call the method `foo` on a controller named `home`.

## setLayoutView

Applications have a `setLayoutView` method. This method will render any provided view to the `rootElement` of the application.

## root

By default, an Application instance stores a reference to the document's `body` node as its `rootElement` property, and a jQuery wrapped version as its `$rootElement` property. When setLayoutView is called, the `rootElement` node is used to place the layout. You can customize the root element by passing a selector as the `root` option when instantiating an application.

define(['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';

  var Application = Backbone.Router.extend({
    root: 'body',
    layout: null,
    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);

      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);

      Backbone.history.start();
    },
    setLayoutView: function(layoutView) {
      if (this.layoutView === layoutView) {
        return;
      }

      if (this.layoutView) {
        this.layoutView.$el.detach();
      }

      if (layoutView) {
        this.$rootElement.append(layoutView.render().$el);
      }

      this.layoutView = layoutView;
    },
    eachRoute: function(callback, context) {
      if (!this.routes) {
        return;
      }

      for (var route in this.routes) {
        callback.call(this, route, this.routes[route]);
      }
    },
    _bindRoutes: function() {
      this.eachRoute(function(route, handler) {
        var handlerParts = handler.split('#');
        var controller = handlerParts[0];
        var method = handlerParts[1] || 'index';

        this.route(route, handler, function() {
          var routeArguments = Array.prototype.slice.call(arguments);
          var controllerInstance = this.controllers[controller];

          if (_.isFunction(controllerInstance)) {
            controllerInstance = controllerInstance.apply(this, routeArguments);
          }

          if (!controllerInstance) {
            console.error('Controller ' + controller + ' is not available on this application.');
            return;
          }

          if (!(method in controllerInstance)) {
            console.error('Controller ' + controller + ' has no handler ' + method + '.');
            return;
          }

          routeArguments.unshift(this);

          controllerInstance[method].apply(controllerInstance, routeArguments);
        });
      });
    }
  });

  return Application;
});

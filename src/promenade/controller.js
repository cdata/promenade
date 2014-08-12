define(['backbone', 'underscore', 'promenade/object', 'promenade/delegation', 'promenade/controller/action', 'promise'],
       function(Backbone, _, PromenadeObject, DelegationApi, ControllerAction, Promise) {
  'use strict';
  // Promenade.Controller
  // --------------------


  // Promenade.Controller is a contruct that is used to handle responses to
  // navigation events in the application. It extends ``Promenade.Object``, and
  // as such supports the ``Backbone.Events`` API.
  var Controller = PromenadeObject.extend({

    // When instantiated, the only option a ``Controller`` expects is ``app``,
    // which is a reference to the parent ``Application`` instance.
    initialize: function(options) {
      var rootAction = this.getRootAction();

      this.app = options && options.app;

      this._state = Controller.state.INACTIVE;
    },

    isActive: function() {
      return this._state === Controller.state.ACTIVE;
    },

    // When the state changes to ``active``, this method is called.
    activate: function() {},

    // Similarly, when the state changes to ``inactive``, this method is called.
    deactivate: function() {},

    getActions: function() {
      var rootAction;

      if (!this.actions) {
        rootAction = this.getRootAction();

        this.defineRoutes.call(rootAction.getMediator());
        this.actions = _.filter(rootAction.flatten(), function(action) {
          return action.hasHandler();
        });
      }

      return this.actions;
    },

    getRootAction: function() {
      if (!this.rootAction) {
        this.rootAction = new ControllerAction({
          controller: this
        });
      }

      return this.rootAction;
    },

    getBackboneRoutes: function() {
      if (!this.backboneRoutes) {
        this.backboneRoutes = _.invoke(this.getActions(), 'toBackboneRoute').reverse();
      }

      return this.backboneRoutes;
    },

    getRouteMatchers: function() {
      var routes;

      if (!this.routeMatchers) {
        routes = _.invoke(this.getActions(), 'getRoute');

        this.routeMatchers = _.map(routes, function(route) {
          return this.app._routeToRegExp(route);
        }, this);
      }

      return this.routeMatchers;
    },

    // ``_activate`` and ``_deactivate`` exist the handle kicking off state
    // transition whenever the state changes between ``active`` and
    // ``inactive``. In addition to calling the built-in ``activate`` and
    // ``deactivate`` handlers, they dispatch an ``activate`` and ``deactivate``
    // event.
    setActive: function() {
      if (this._state === Controller.state.INACTIVE) {
        this._state = Controller.state.ACTIVE;
        this.activate();
        this.trigger('activate');
      }
    },

    setInactive: function() {
      if (this._state === Controller.state.ACTIVE) {
        this._state = Controller.state.INACTIVE;
        this.deactivate();
        this.trigger('deactivate');
      }
    },

    // Navigation events are observed to determine when it is appropriate to
    // transition the state of the ``Controller``.
    handlesRoute: function(route) {
      var routeMatchers = this.getRouteMatchers();
      var index;
      var length;

      for (index = 0, length = routeMatchers.length; index < length; ++index) {
        if (routeMatchers[index].test(route)) {
          return true;
        }
      }

      return false;
    },

    // This method defaults to a no-op. Override it to define the routes that
    // your inherited Controller can handle. Example:
    //
    //   // ...
    //   defineRoutes: function() {
    //     this.handle('foo', 'fooHandler');
    //     this.show('bar', 'barHandler');
    //     this.handle('baz', function() {
    //       this.show('vim', 'bazVimHandler');
    //     });
    //   }
    //   // ...
    //
    // Will define the following routes:
    //
    //   {
    //     'foo': 'fooHandler',
    //     'bar': 'barHandler',
    //     'baz/vim/:param1': 'bazVimHandler'
    //   }
    //
    // These routes will be consumed by the Application when the Controller is
    // instantiated.
    defineRoutes: function() {},

    getFragment: function() {
      return Backbone.history.getFragment();
    }
  }, {
    state: {
      ACTIVE: 'active',
      INACTIVE: 'inactive'
    }
  });

  return Controller;
});

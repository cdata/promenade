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

      this.app = options && options.app;
      this.rootAction = new ControllerAction({
        controller: this
      });

      // Routes are defined immediately.
      this.defineRoutes.call(this.rootAction.getMediator());
      this.actions = this.rootAction.flatten();

      this.routes = [];
      this._routeMatchers = [];

      _.each(this.actions, function (action) {
        if (!action.hasHandler()) {
          return;
        }
        this._routeMatchers.push(this.app._routeToRegExp(action.getRoute()));
        this.routes.unshift({
          fragment: action.getRoute(),
          handler: action.createRouteHandlerForController(this)
        });
      }, this);

      this._state = Controller.state.INACTIVE;
    },

    isActive: function() {
      return this._state === Controller.state.ACTIVE;
    },

    // When the state changes to ``active``, this method is called.
    activate: function() {},

    // Similarly, when the state changes to ``inactive``, this method is called.
    deactivate: function() {},

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
      var index;
      var length;

      for (index = 0, length = this._routeMatchers.length; index < length; ++index) {
        if (this._routeMatchers[index].test(route)) {
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

    redirect: function(route, options) {
      var searchString = '';

      options = _.defaults(options || {}, {
        trigger: true,
        replace: true,
        forwardSearch: true
      });

      if (options.forwardSearch) {
        searchString = this.getSearchString();
      }

      return this.app.navigate(route + searchString, options);
    },

    getSearchString: function() {
      var routeExpression;
      var searchString;
      var match;

      if (!this.currentAction) {
        return '';
      }

      routeExpression = this.app._routeToRegExp(this.currentAction.getRoute());
      match = this.getFragment().match(routeExpression);

      searchString = match ? match.pop() : '';

      if (!searchString) {
        return '';
      }

      return '?' + searchString;
    },

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

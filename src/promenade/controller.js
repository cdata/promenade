define(['backbone', 'underscore', 'promenade/object'],
       function(Backbone, _, PromenadeObject) {
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

      // Routes are defined immediately.
      this.routes = {};
      this.defineRoutes.call(this._getDefinitionContext());

      // A ``_routeMatchers`` list is created to support observing state change
      // events based on navigation behavior.
      this._routeMatchers = _.map(this.routes, function(handler, route) {
        return this.app._routeToRegExp(route);
      }, this);

      this._state = Controller.state.INACTIVE;

      this.listenTo(this.app, 'route', this._onNavigationEvent);
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
    _activate: function() {
      if (this._state === Controller.state.INACTIVE) {
        this._state = Controller.state.ACTIVE;
        this.activate();
        this.trigger('activate');
      }
    },

    _deactivate: function() {
      if (this._state === Controller.state.ACTIVE) {
        this._state = Controller.state.INACTIVE;
        this.deactivate();
        this.trigger('deactivate');
      }
    },

    // Navigation events are observed to determine when it is appropriate to
    // transition the state of the ``Controller``.
    _onNavigationEvent: function(route) {
      for (var index = 0; index < this._routeMatchers.length; ++index) {
        if (this._routeMatchers[index].test(route)) {
          this._activate();
          return;
        }
      }

      this._deactivate();
    },

    // This method defaults to a no-op. Override it to define the routes that
    // your inherited Controller can handle. Example:
    //
    //   // ...
    //   defineRoutes: function() {
    //     this.handle('foo', 'fooHandler');
    //     this.resource('bar', 'barHandler');
    //     this.handle('baz', function() {
    //       this.resource('vim', 'bazVimHandler');
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


    // This method is an internal mechanism to generate ``route`` event handlers
    // which will later be consumed by the ``Application`` instance.
    _handle: function(fragment, handler, subdefine, generators) {
      if (!subdefine && _.isFunction(handler)) {
        subdefine = handler;
        handler = null;
      }

      if (handler) {
        this.routes[fragment] = _.bind(function() {
          var args = Array.prototype.slice.call(arguments);
          // All arguments to the ``route`` handler (typically in the form of
          // ``String`` values) are mapped to resources by using 'generator'
          // functions defined by the definition context.
          args = _.map(args, function(arg, index) {
            if (typeof arg !== 'undefined' && generators[index]) {
              return generators[index](arg);
            }
            return arg;
          });

          this[handler].apply(this, args);
        }, this);
      }

      // When the route is 'compound', we callback with a modified definition
      // context to enable additional route definitions.
      if (subdefine) {
        subdefine.call(this._getDefinitionContext(fragment, generators));
      }
    },

    // The definition context exposes an interface that allows the user to
    // define what the current fragment of a route means without having to
    // implement specific behavior to retrieve meaningful resources from the
    // application of said route.
    _createDefinitionContext: function(root, generators) {

      generators = generators || [];

      return {
        // A ``handle`` definition refers to a fragment that can be handled, but
        // which is not expected to include a parameter.
        handle: _.bind(function(_fragment, handler, subdefine) {
          this._handle(root + _fragment, handler, subdefine,
                       generators.slice());
        }, this),
        // A ``resource`` definition refers to a fragment that should be
        // expected to include a subsequent parameter.
        resource: _.bind(function(_fragment, handler, subdefine) {
          var _generators = generators.slice();
          // Resource generators are created when a ``resource`` definition
          // is made. During such a definition, the fragment can be expected to
          // refer to the ``type`` of the resource expected.
          _generators.push(_.bind(function(id) {
            var model = this.app.getResource(_fragment);

            if (model instanceof Backbone.Model ||
                model instanceof Backbone.Collection) {
              return model.get(id);
            }

            return id;
          }, this));
          this._handle(root + _fragment + '/:' + _fragment,
                       handler, subdefine, _generators);
        }, this),
        // An ``any`` definition behaves like a splat, and thus cannot support
        // subsequent definitions.
        any: _.bind(function(handler) {
          this._handle(root + '*' + _.uniqueId(), handler, null,
                       generators.slice());
        }, this)
      };
    },

    _canonicalizeRoot: function(fragment) {
      return fragment ? fragment + '/' : '';
    },

    _getDefinitionContext: function(fragment, generators) {
      return this._createDefinitionContext(this._canonicalizeRoot(fragment),
                                           generators);
    }
  }, {
    state: {
      ACTIVE: 'active',
      INACTIVE: 'inactive'
    }
  });

  return Controller;
});

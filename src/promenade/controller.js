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
      for (var index = 0; index < this._routeMatchers.length; ++index) {
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


    // This method is an internal mechanism to generate ``route`` event handlers
    // which will later be consumed by the ``Application`` instance.
    //_handle: function(fragment, handler, options, subdefine, generators) {
    _handle: function(state) {
      var handler = state.handler;
      var fragment = state.fragment;
      var options = state.options;
      var subdefine = state.subdefine;
      var generators = state.generators;

      if (handler) {
        this.routes[fragment] = _.bind(function() {
          var args = Array.prototype.slice.call(arguments);
          var params;
          // All arguments to the ``route`` handler (typically in the form of
          // ``String`` values) are mapped to resources by using 'generator'
          // functions defined by the definition context.
          params = _.map(generators, function(generator) {
            if (generator.consumesArgument) {
              return generator(args.shift());
            }

            return generator();
          }).concat(args);

          this.setActive();

          $.when.apply($, params).then(_.bind(function() {
            if (this.isActive()) {
              this[handler].apply(this, arguments);
            }
          }, this));
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
        handle: this._createDefinitionStateParser(function(state) {
          state.generators = generators.slice();
          state.fragment = root + state.fragment;
          this._handle(state);
        }),
        // A ``show`` definition refers to a fragment that should be
        // expected to include a subsequent parameter.
        show: this._createDefinitionStateParser(function(state) {
          var _generators = generators.slice();
          var fragment = state.fragment;
          var options = state.options;
          var type = options && options.type;
          var generator;
          // Resource generators are created when a ``show`` definition
          // is made. During such a definition, the fragment can be expected to
          // refer to the ``type`` of the resource expected.
          generator = _.bind(function(id) {
            var model = this.app.getResource(type || fragment);

            if (model instanceof Backbone.Model ||
                model instanceof Backbone.Collection) {
              model = model.get(id);
              return _.result(model, 'syncs') || model;
            }

            return id;
          }, this);
          generator.consumesArgument = true;
          _generators.push(generator);
          state.generators = _generators;
          state.fragment = this._formatRoot(root + fragment) + ':' +
              (type || fragment);
          this._handle(state);
        }),
        index: this._createDefinitionStateParser(function(state) {
          var _generators = generators.slice();
          var fragment = state.fragment;
          var options = state.options;
          var type = options && options.type;

          _generators.push(_.bind(function() {
            var model = this.app.getResource(type || fragment);

            if (model instanceof Backbone.Model ||
                model instanceof Backbone.Collection) {

              if (_.result(model, 'isSparse') !== false &&
                  _.result(model, 'hasSynced') !== true) {
                model.fetch();
              }

              model = _.result(model, 'syncs') || model;
            }

            return model;
          }, this));
          state.generators = _generators;
          state.fragment = root + fragment;
          this._handle(state);
        }),
        // An ``any`` definition behaves like a splat, and thus cannot support
        // subsequent definitions.
        any: this._createDefinitionStateParser(function(state) {
          state.generators = generators.slice();
          state.handler = state.fragment;
          state.fragment = root + '*any';
          this._handle(state);
        })
      };
    },

    // The interface for defining a route hierarchy is a simple abstraction of
    // non-trivial behavior. This method parses the arguments for each route
    // definition and converts them to a state object for further processing.
    _createDefinitionStateParser: function(fn) {
      return _.bind(function(fragment, handler, options, subdefine) {
        var state = {};
        state.fragment = fragment;

        if (_.isString(handler)) {
          state.handler = handler;
          if (_.isFunction(options)) {
            state.subdefine = options;
          } else {
            state.options = options;
            state.subdefine = subdefine;
          }
        }

        if (_.isFunction(handler)) {
          state.subdefine = handler;
        } else if (_.isObject(handler)) {
          state.options = handler;
          if (_.isFunction(options)) {
            state.subdefine = options;
          }
        }

        fn.call(this, state);
      }, this);
    },

    // If a fragment is an empty string, it should not have a slash. Backbone
    // expects that fragments have no root path. In all other cases, a trailing
    // slash must be added to the fragment for the sake of any subsequently
    // appended parts.
    _formatRoot: function(fragment) {
      return fragment ? fragment + '/' : '';
    },

    _getDefinitionContext: function(fragment, generators) {
      return this._createDefinitionContext(this._formatRoot(fragment),
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

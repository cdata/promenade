define(['backbone', 'underscore', 'promenade/object'],
       function(Backbone, _, PromenadeObject) {
  'use strict';



  /**
   * Promenade.Controller is a contruct that is used to handle responses to
   * navigation events in the application.
   *
   * @extends {Promenade.Object}
   * @constructor
   */
  var Controller = PromenadeObject.extend({


    /**
     * @param {Promenade.Application} app The promenade application that
     * created this controller'
     */
    initialize: function(app) {
      this.app = app;
      this.routes = {};
      this.defineRoutes.call(this._getDefinitionContext());

      this._routeMatchers = _.map(this.routes, function(handler, route) {
        return this.app._routeToRegExp(route);
      }, this);

      this._state = Controller.state.INACTIVE;

      this.listenTo(this.app, 'route', this._onNavigationEvent);
    },

    activate: function() {},

    deactivate: function() {},

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

    _onNavigationEvent: function(route) {
      for (var index = 0; index < this._routeMatchers.length; ++index) {
        if (this._routeMatchers[index].test(route)) {
          this._activate();
          return;
        }
      }

      this._deactivate();
    },



    /**
     * This method defaults to a no-op. Override it to define the routes that
     * your inherited Controller can handle. Example:
     *
     * // ...
     * defineRoutes: function() {
     *   this.handle('foo', 'fooHandler');
     *   this.resource('bar', 'barHandler');
     *   this.handle('baz', function() {
     *     this.resource('vim', 'bazVimHandler');
     *   });
     * }
     * // ...
     *
     * Will define the following routes:
     *
     * {
     *   'foo': 'fooHandler',
     *   'bar': 'barHandler',
     *   'baz/vim/:param1': 'bazVimHandler'
     * }
     *
     * These routes will be consumed by the Application when the Controller is
     * instantiated.
     */
    defineRoutes: function() {},


    /**
     * @param {String} fragment A location fragment.
     * @param {String} handler A property name that refers to a handler on the
     * controller.
     * @param {Function} subdefine A function that contains definitions that
     * should be scoped to the provided fragment.
     * @param {Array} generators A list of generators that convert route params
     * to models where possible.
     * @private
     */
    _handle: function(fragment, handler, subdefine, generators) {
      if (!subdefine && _.isFunction(handler)) {
        subdefine = handler;
        handler = null;
      }

      if (handler) {
        this.routes[fragment] = _.bind(function() {
          var args = Array.prototype.slice.call(arguments);
          args = _.map(args, function(arg, index) {
            if (typeof arg !== 'undefined' && generators[index]) {
              return generators[index](arg);
            }
            return arg;
          });

          this[handler].apply(this, args);
        }, this);
      }

      if (subdefine) {
        subdefine.call(this._getDefinitionContext(fragment, generators));
      }
    },


    /**
     * @param {String} fragment A location fragment.
     * @return {String} A fragment formatted in a route-root-sensitive fashion.
     * @private
     */
    _canonicalizeRoot: function(fragment) {
      return fragment ? fragment + '/' : '';
    },


    /**
     * @param {String} root The fragment root to scope future definitions to.
     * @return {Object} A context for subdefinitions namespaced to the given
     * fragment to use.
     * @private
     */
    _createDefinitionContext: function(root, generators) {

      generators = generators || [];

      return {
        handle: _.bind(function(_fragment, handler, subdefine) {
          this._handle(root + _fragment, handler, subdefine,
                       generators.slice());
        }, this),
        resource: _.bind(function(_fragment, handler, subdefine) {
          var _generators = generators.slice();
          _generators.push(_.bind(function(id) {
            var model = this.app[_fragment];

            if (model instanceof Backbone.Model ||
                model instanceof Backbone.Collection) {
              return model.get(id);
            }

            return id;
          }, this));
          this._handle(root + _fragment + '/:' + _fragment,
                       handler, subdefine, _generators);
        }, this),
        any: _.bind(function(handler) {
          this._handle(root + '*' + _.uniqueId(), handler, null,
                       generators.slice());
        }, this)
      };
    },


    /**
     * @param {String} fragment The root to scope future definitions to.
     * @return {Object} A context for subdefinitions namespaces to the given
     * fragment to use.
     * @private
     */
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

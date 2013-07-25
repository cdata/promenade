define(['underscore', 'promenade/object'],
       function(_, PromenadeObject) {
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
     * @private
     */
    _handle: function(fragment, handler, subdefine) {
      if (!subdefine && _.isFunction(handler)) {
        subdefine = handler;
        handler = null;
      }

      if (handler) {
        this.routes[fragment] = handler;
      }

      if (subdefine) {
        subdefine.call(this._getDefinitionContext(fragment));
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
    _createDefinitionContext: function(root) {

      return {
        handle: _.bind(function(_fragment, handler, subdefine) {
          this._handle(root + _fragment, handler, subdefine);
        }, this),
        resource: _.bind(function(_fragment, handler, subdefine) {
          this._handle(root + _fragment + '/:' + _.uniqueId(),
                       handler, subdefine);
        }, this),
        any: _.bind(function(handler) {
          this._handle(root + '*' + _.uniqueId(), handler);
        }, this)
      };
    },


    /**
     * @param {String} fragment The root to scope future definitions to.
     * @return {Object} A context for subdefinitions namespaces to the given
     * fragment to use.
     * @private
     */
    _getDefinitionContext: function(fragment) {
      return this._createDefinitionContext(this._canonicalizeRoot(fragment));
    }
  });

  return Controller;
});

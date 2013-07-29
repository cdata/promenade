define(['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';
  /* # Promenade.Application # */

  /* An Application is the central entry point for a Promenade app.
   * It inherits from Backbone.Router.
   */
  var Application = Backbone.Router.extend({

    /* The ``root`` property on ``Application`` is a string selector that
     * refers to the root element that the ``Application`` should use for
     * any insertion of new DOM elements. When defined, a ``rootElement`` and
     * ``$rootElement`` property will be present on an ``Application`` instance
     * that refer to the corresponding DOM node and jQuery selection of the
     * ``root`` property, respectively.
     */
    root: 'body',

    /* The ``controllers`` property should be declared as an ``Array`` of
     * ``Promenade.Controller`` class references. These references are used
     * to instantiate ``Controller`` instances that will govern the routing
     * and behavior of the ``Application`` instance. After initialization is
     * complete, each class reference in this ``Array`` is replaced with a
     * corresponding class instance.
     */
    controllers: [],

    /* The ``models`` property should be declared as an ``Array`` of
     * ``Promenade.Model`` and / or ``Promenade.Collection`` class references.
     * These references are used to instantiate the core models and collections
     * that represent the data to be presented by the ``Application``.
     */
    models: [],

    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);

      this._initializeModels();

      // The ``$rootElement`` and ``rootElement`` properties are created on the
      // ``Application`` instance during initialization.
      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);
    },

    _initializeModels: function() {
      _.each(this.models, function(ModelClass) {
        var model = new ModelClass(null, {
          app: this
        });

        this.listenTo(model, 'sync', this._onModelSync);
        this[model.namespace] = model;

      }, this);
    },

    _onModelSync: function(model, response, options) {
      _.each(response, function(data, key) {
        var otherModel = this[key];

        if (key !== model.namespace &&
            (otherModel instanceof Backbone.Model ||
             otherModel instanceof Backbone.Collection)) {
          otherModel.set(data);
        }
      }, this);
    },


    /** @inheritDoc */
    _bindRoutes: function() {
      Backbone.Router.prototype._bindRoutes.apply(this, arguments);

      this.controllers = _.map(this.controllers, function(Controller) {

        var controller = new Controller(this);

        _.each(controller.routes, function(handler, route) {
          this.route(route, route, handler);
        }, this);

        return controller;
      }, this);
    }
  });

  return Application;
});

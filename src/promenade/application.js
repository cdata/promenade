define(['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';



  /**
   * An Application is the central entry point for a Promenade app.
   * It inherits from Backbone.Router.
   *
   * @extends {Backbone.Router}
   * @contructor
   */
  var Application = Backbone.Router.extend({


    /**
     * @type {String} A selector for the app's root element.
     */
    root: 'body',


    /**
     * @type {Array<Promenade.Controller>} An array of Controllers to
     * instantiate when routes are bound.
     */
    controllers: [],


    models: [],


    /** @inheritDoc */
    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);

      this._initializeModels();

      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);
    },

    _initializeModels: function() {
      _.each(this.models, function(ModelClass) {
        var model = new ModelClass();

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
          this.route(route, handler, function() {
            controller[handler].apply(controller, arguments);
          });
        }, this);

        return controller;
      }, this);
    }
  });

  return Application;
});

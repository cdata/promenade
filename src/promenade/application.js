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


    /** @inheritDoc */
    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);

      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);
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

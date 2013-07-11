define(['backbone', 'templates', 'underscore'],
       function(Backbone, templates, _) {
  'use strict';

  var View = Backbone.View.extend({
    initialize: function(options) {
      var model;

      Backbone.View.prototype.initialize.apply(this, arguments);

      options = options || {};

      this.collection = options.collection;
      this.template = options.template || this.template;

      if (this.template) {
        this.templateFactory = templates[this.template];
      }

      this.layout = this.layout || {};
      this.regions = {};
      this.$regions = {};
      this.subViews = {};
      this.rendered = false;

      if(!this.hasModel()) {
        return;
      }

      model = this.getModel();

      for (var eventName in this.modelEvents) {
        this.listenTo(model, eventName, this[this.modelEvents[eventName]]);
      }
    },
    modelEvents: {
      'add': 'render',
      'remove': 'render',
      'reset': 'render',
      'change': 'render'
    },
    template: '',
    render: function(recursive) {
      var region;
      var subview;
      var data;
      var html;

      this.trigger('before:render');

      for (region in this.subViews) {
        this.subViews[region].$el.detach();
      }

      if (this.templateFactory) {
        data = this.serializeModelData();
        html = this.templateFactory(data);

        this.$el.html(html);
      }

      for (region in this.layout) {
        if (!this.layout[region]) {
          continue;
        }

        this.$regions[region] = this.$(this.layout[region]).eq(0);
        this.regions[region] = this.$regions[region].get(0);
      }

      this.$regions.self = this.$el;
      this.regions.self = this.el;

      for (region in this.subViews) {
        subview = this.subViews[region];

        if (recursive) {
          if (subview.deepRender) {
            subview.deepRender();
          } else {
            subview.render();
          }
        } else if (subview.rendered === false) {
          subview.render();
        }

        this.$regions[region].append(subview.$el);
      }

      this.rendered = true;
      this.trigger('render');

      return this;
    },
    deepRender: function() {
      return this.render(true);
    },
    hasModel: function() {
      return !!this.getModel();
    },
    getModel: function() {
      return this.model || this.collection;
    },
    serializeModelData: function() {
      if (!this.hasModel()) {
        return {};
      }

      return this.getModel().toJSON();
    },
    setSubview: function(region, view) {

      if (!_.isString(region)) {
        view = region;
        region = 'self';
      }

      if (this.subViews[region]) {
        this.subViews[region].detach();
      }

      if (view && this.$regions[region]) {
        this.$regions[region].append(view.render().$el);
      }

      this.subViews[region] = view;
    }
  });

  return View;
});

define(['backbone', 'templates', 'underscore', 'promenade/region'],
       function(Backbone, templates, _, Region) {
  'use strict';

  var View = Backbone.View.extend({


    initialize: function(options) {
      var model;
      var region;

      Backbone.View.prototype.initialize.apply(this, arguments);

      options = options || {};

      this.collection = options.collection;
      this.template = options.template || this.template;

      if (this.template) {
        this.templateFactory = templates[this.template];
      }

      this.layout = options.layout || this.layout || {};

      for (region in this.layout) {
        this[this.getRegionProperty(region)] = new Region({
          superview: this,
          selector: this.layout[region]
        });
      }
    },


    delegateEvents: function() {
      var model;

      Backbone.View.prototype.delegateEvents.apply(this, arguments);

      if (this.hasModel()) {
        model = this.getModel();

        for (var eventName in this.modelEvents) {
          this.listenTo(model, eventName, this[this.modelEvents[eventName]]);
        }
      }

      return this;
    },


    undelegateEvents: function() {
      var model;

      Backbone.View.prototype.undelegateEvents.apply(this, arguments);

      if(this.hasModel()) {
        model = this.getModel();

        for (var eventName in this.modelEvents) {
          this.stopListening(model, eventName, this[this.modelEvents[eventName]]);
        }
      }

      return this;
    },


    render: function(recursive) {
      var data;
      var html;
      var region;

      this.trigger('before:render');

      if (this.templateFactory) {
        data = this.serializeModelData();
        html = this.templateFactory(data);

        this.$el.html(html);
      }

      if (recursive) {
        for (region in this.layout) {
          this.getRegion(region).renderSubview(recursive);
        }
      }

      this.trigger('render');

      return this;
    },


    remove: function() {
      this.undelegateEvents();
      Backbone.View.prototype.remove.apply(this, arguments);
      return this;
    },


    template: '',


    modelEvents: {
      'add': 'render',
      'remove': 'render',
      'reset': 'render',
      'change': 'render'
    },


    detach: function() {
      this.undelegateEvents();
      this.$el.detach();
      return this;
    },


    attachTo: function($parent) {
      this.$el.appendTo($parent);
      this.delegateEvents();
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


    getRegion: function(region) {
      return this[this.getRegionProperty(region)];
    },


    getRegionProperty: function(region) {
      return region + 'Region';
    },


    serializeModelData: function() {
      if (!this.hasModel()) {
        return {};
      }

      return this.getModel().toJSON();
    }
  });

  return View;
});

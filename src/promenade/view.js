define(['jquery', 'backbone', 'templates', 'underscore', 'promenade/region',
        'promenade/collection/retainer', 'promenade/event'],
       function($, Backbone, templates, _, Region, RetainerApi, EventApi) {
  'use strict';
  // Promenade.View
  // --------------

  // A ``Promenade.View`` extends ``Backbone.View`` with functionality that is
  // commonly re-implemented. The ``View`` is automatically able to handle
  // template rendering, data serialization and subview/parentview
  // relationships.
  var View = Backbone.View.extend({

    // Upon initialization, the ``View`` instance takes stock of optional
    // ``template`` and ``collection`` settings. If a ``template`` is defined,
    // either at the class level or overridden in the options, a template
    // is looked up on the resolved ``'templates'`` module.
    initialize: function(options) {
      Backbone.View.prototype.initialize.apply(this, arguments);

      options = options || {};

      this.collection = options.collection;
      this.template = options.template || this.template;

      if (this.template) {
        this.templateFactory = templates[this.template];
      }

      this.layout = options.layout || this.layout || {};

      this._ensureRegions();
      this._ensureRenderQueue();
    },

    supportedEventMaps: ['model', 'collection', 'self'],

    // ``delegateEvents`` is a built-in Backbone concept that handles creating
    // event handlers for DOM events. Promenade leverages this concept to
    // support managed event binding related to other event emitters.
    delegateEvents: function() {
      Backbone.View.prototype.delegateEvents.apply(this, arguments);

      this.delegateEventMaps();

      return this;
    },

    delegateModelEvents: function() {
      var maps = ['_modelEvents', 'modelEvents'];
      this._toggleEventMapsForTarget(maps, this.getModel(), 'listenTo');
    },

    delegateCollectionEvents: function() {
      var maps = ['_collectionEvents', 'collectionEvents'];
      this._toggleEventMapsForTarget(maps, this.getCollection(), 'listenTo');
    },

    // ``undelegateEvents`` undoes all of what ``delegateEvents`` does. It is
    // extended by the ``View`` to undo what the extended ``delegateEvents``
    // does in Promenade.
    undelegateEvents: function() {
      Backbone.View.prototype.undelegateEvents.apply(this, arguments);

      this.undelegateEventMaps();

      return this;
    },

    undelegateModelEvents: function() {
      var maps = ['_modelEvents', 'modelEvents'];
      this._toggleEventMapsForTarget(maps, this.getModel(), 'stopListening');
    },

    undelegateCollectionEvents: function() {
      var maps = ['_collectionEvents', 'collectionEvents'];
      this._toggleEventMapsForTarget(
          maps, this.getCollection(), 'stopListening');
    },

    // The default ``render`` routine of Backbone is a no-op. In Promenade,
    // ``render`` has been formalized to support subviews and templates.
    render: function(recursive) {
      var data;
      var html;
      var region;

      // We alert any interested parties that the ``View`` is about to be
      // rendered. This allows ``Region`` instances to safely remove subviews
      // while the parent ``View`` instance is being rendered.
      this.trigger('before:render');

      // If a ``templateFactory`` is available, it is used to generate an HTML
      // structure based on model data.
      if (this.templateFactory) {
        data = this.serializeModelData();
        html = this.templateFactory(data);

        this.$el.html(html);
      }

      // If recursive rendering is desired, each region is asked to re-render
      // its subviews.
      if (recursive) {
        for (region in this.layout) {
          this.getRegion(region).renderSubviews(recursive);
        }
      }

      // When ``render`` is done, a ``'render'`` event is dispatched to notify
      // any interested parties. ``Region`` instances will respond to this event
      // by re-attaching any previously detached subviews.
      this.trigger('render');

      return this;
    },

    // Remove has been expanded to automatically call ``undelegateEvents``. This
    // behavior is implied in Backbone because of the way jQuery.remove / empty
    // works, but we need to make sure that events bound to the ``model`` and
    // the ``View`` instance itself are also unbound.
    remove: function() {
      var region;

      for (region in this.layout) {
        this[this.getRegionProperty(region)].empty();
      }

      this.undelegateEvents();
      this.releaseConnections();

      Backbone.View.prototype.remove.apply(this, arguments);
      return this;
    },

    // The template can be declared on the class level.
    template: '',


    // A new ``detach`` method allows the ``View`` to be detached in a way that
    // is non-destructive for DOM event delegation.
    detach: function() {
      this.undelegateEvents();
      this.$el.detach();
      return this;
    },

    // The ``attachTo`` method allows easy re-attachment without also expecting
    // the user to subsequently call ``delegateEvents``.
    attachTo: function($parent) {
      this.$el.appendTo($parent);
      this.delegateEvents();
      return this;
    },

    // ``deepRender`` is a decorator for performing a recursive call to
    // ``render``.
    deepRender: function() {
      return this.render(true);
    },

    asyncRender: function() {
      return this._queueRenderOperation(this.render);
    },

    // Model lookup has been formalized so that there are distinct rules for
    // when ``model`` is used, and when ``collection`` is used.
    hasModel: function() {
      return !!this.getModel();
    },

    getModel: function() {
      return this.model || this.getCollection();
    },

    hasCollection: function() {
      return !!this.getCollection();
    },

    getCollection: function() {
      return this.collection;
    },

    // Region lookup has been formalized to support naming convention
    // agnosticism.
    getRegion: function(region) {
      return this[this.getRegionProperty(region)];
    },

    getRegionProperty: function(region) {
      return region + 'Region';
    },

    serializationDepth: 1,

    // The ``serializeModelData`` method is intended to provide an override-able
    // method for translating a ``model`` or ``collection`` into serialized
    // data consumable by the given template, if any.
    serializeModelData: function() {
      var data;

      if (!this.hasModel()) {
        data = {};
      } else {
        data = this.getModel().toJSON(_.result(this, 'serializationDepth'));
      }

      this.trigger('serialize', data);

      return data;
    },

    getRenderQueue: function() {
      return this._renderQueue.then(_.bind(function() {
        return this._tick();
      }, this));
    },

    pushRenderQueue: function(fn) {
      this._renderQueue = this.getRenderQueue().then(_.bind(fn, this));
      return this._renderQueue;
    },

    // By default, a ``View`` will re-render on most manipulation-implying
    // events dispatched by its ``model`` or ``collection``.
    _modelEvents: {
      'change': 'render'
    },

    _ensureRegions: function() {

      // Any regions of the ``View`` defined in the ``layout`` map
      // are created as ``Region`` instances associated with the ``View``
      // instance.
      for (var region in this.layout) {
        this[this.getRegionProperty(region)] = new Region({
          superview: this,
          selector: this.layout[region]
        });
      }
    },

    _ensureRenderQueue: function() {
      this._renderQueue = (new $.Deferred()).resolve().promise();
    },

    _tick: function() {
      var Result = new $.Deferred();

      if (typeof window.requestAnimationFrame !== 'undefined') {
        window.requestAnimationFrame(function() {
          Result.resolve();
        });
      } else {
        window.setTimeout(function() {
          Result.resolve();
        }, 0);
      }

      return Result.promise();
    }
  });

  _.extend(View.prototype, RetainerApi, EventApi);

  return View;
});

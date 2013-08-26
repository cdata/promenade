define(['promenade/view', 'promenade/collection'],
       function(View, Collection) {
  'use strict';
  // Promenade.CollectionView
  // ------------------------

  // The ``CollectionView`` handles a very common use case: using a
  // ``Backbone.View`` to represent a ``Backbone.Collection`` instance. The
  // ``CollectionView`` automatically handles insertion, removal and
  // re-rendering of ``View`` instances that correspond to ``Model`` instances
  // in a provided ``Collection`` instance.
  var CollectionView = View.extend({

    // The ``itemView`` declared on a ``CollectionView`` is the ``View`` class
    // that should be used to render individual items.
    itemView: View,

    // The default ``tagName`` for a ``CollectionView`` is changed from
    // ``'div'`` to ``'ul'``, as it is a very common case to use a list to
    // represent a collection of things in the DOM.
    tagName: 'ul',

    initialize: function() {
      // The layout always must have an ``'outlet'`` region which corresponds
      // the the place where items in the provided ``collection`` should be
      // rendered to.
      this.layout = _.defaults(this.layout || {}, {
        outlet: ''
      });
      this.items = {};

      View.prototype.initialize.apply(this, arguments);

      this.retains(this.getCollection());
    },

    // Upon render, we call ``resetItems`` to make sure that every contained
    // item gets rendered as well.
    _selfEvents: _.extend(View.prototype._selfEvents, {
      'render': 'resetItems'
    }),

    // A new mapping of ``collectionEvents`` can be declared. This allows a
    // distinction between the events bound to a ``model`` instance and a
    // ``collection`` instance. This means that a ``CollectionView`` can support
    // behavior in response to both a given ``model`` and a given
    // ``collection``.
    //
    // By default the ``collectionEvents`` are set up to respond to manipulation
    // events in the given ``collection`` by adding, removing or resetting its
    // subviews.
    _collectionEvents: {
      'add': '_addItemByModel',
      'remove': '_removeItemByModel',
      'reset': '_removeAllItems',
      'sort': '_sortItems'
    },

    // The semantics of looking up a given ``model`` or ``collection`` in a
    // ``CollectionView`` are slightly different. In ``Promenade.View``, a
    // ``model`` can be represented by either a ``model`` or ``collection`` (in
    // that order). In a ``CollectionView``, both a ``model`` and ``collection``
    // can be represented by the ``View`` at the same time.
    hasModel: function() {
      return !!this.model;
    },

    getModel: function() {
      return this.model;
    },

    createItemView: function(model) {
      return new this.itemView({
        model: model
      }).render();
    },

    // When a ``CollectionView`` needs to remove all items and re-add them
    // one at a time, this method can be called.
    resetItems: function() {
      this._removeAllItems();

      if (!this.hasCollection()) {
        return;
      }

      this.getCollection().each(function(model) {
        this._addItemByModel(model);
      }, this);
    },

    render: function() {
      View.prototype.render.apply(this, arguments);

      if (this.hasCollection() && this.getCollection().length === 0) {
        this.outletRegion.$container.addClass('empty');
      }

      return this;
    },

    // Subviews in a ``CollectionView`` are tracked by the ``cid`` of the models
    // that represent them. This allows us to look up a ``View`` instance by
    // a model instance.
    _containsItem: function(model) {
      return this.items[model.cid] !== null &&
             this.items[model.cid] !== undefined;
    },

    // The main mechanism for adding a subview to a ``CollectionView`` is by
    // a ``model`` reference. This ``model`` should be contained by the
    // ``collection`` that is associated with the ``CollectionView``.
    _addItemByModel: function(model) {
      var region;
      var index;
      var view;

      this.outletRegion.$container.removeClass('empty');

      // If we already have this ``model`` as a subview, we do nothing.
      if (this._containsItem(model)) {
        return;
      }

      // We look-up the ``'outlet'`` region, get the index of the model being
      // added, create a ``View`` instance, render it and insert the ``View``
      // instance into our ``'outlet'`` region.
      region = this.getRegion('outlet');
      index = this.getCollection().indexOf(model);
      view = this.createItemView(model);

      this.items[model.cid] = view;

      region.insertAt(view, index);
    },

    // Subviews are removed in a similar way to how they are added. A received
    // ``model`` instance is used to lookup a ``View`` instance previously
    // attached to the ``CollectionView``. If one exists, it is removed from
    // the ``'outlet'`` region and disposed of.
    _removeItemByModel: function(model) {
      var view = this.items[model.cid];
      var region = this.getRegion('outlet');

      if (!view) {
        return;
      }

      delete this.items[model.cid];

      region.remove(view);
      view.undelegateEvents();
    },

    // Sometimes we want to remove all subviews at once. For instance, when our
    // provided ``collection`` triggers a ``'reset'`` event, all models in that
    // ``collection`` are flushed. The ``collection`` will dispatch separate
    // ``'add'`` events if the ``'reset'`` was triggered by some kind of network
    // sync, so we don't need to re-add subviews in this case.
    _removeAllItems: function() {
      var region = this.getRegion('outlet');

      _.each(this.items, function(view) {
        region.remove(view);
        view.undelegateEvents();
      }, this);

      this.items = {};
    },

    _sortItems: function() {
      var region = this.getRegion('outlet');

      _.each(this.items, function(view) {
        region.detach(view);
      }, this);

      this.getCollection().each(function(model) {
        region.add(this.items[model.cid]);
      }, this);
    }
  });

  return CollectionView;
});

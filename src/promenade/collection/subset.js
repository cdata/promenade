define(['backbone', 'underscore', 'promenade/collection'],
       function(Backbone, _, Collection) {
  'use strict';
  var SubsetCollection = Collection.extend({
    initialize: function(models, options) {
      Collection.prototype.initialize.apply(this, arguments);
      options = options || {};

      // A provided superset will also be assigned to the ``SubsetCollection``.
      // This allows holders of a reference to a ``subset`` to refer to a
      // ``superset`` when adding, removing and reseting models is required.
      this.superset = options.superset;
      this.iterator = options.iterator;

      if (!this.iterator) {
        this.iterator = _.bind(this._filterAllowed, this);
      }

      this._connected = false;

      if (_.isArray(models)) {
        this._seed(models);
      }
    },

    connect: function() {

      // The ``'add'``, ``'remove'`` and ``'reset'`` events are listened to by
      // the ``subset`` on the superset ``Collection`` instance so that changes
      // to the superset are reflected automatically in the ``subset``.
      // When a ``subset`` is no longer being used, ``stopListening`` should
      // be called on it so that the automatically created listeners are cleaned
      // up.
      if (this.superset && !this._connected) {
        this.listenTo(this.superset, 'add', this._onSupersetAdd);
        this.listenTo(this.superset, 'remove', this._onSupersetRemove);
        this.listenTo(this.superset, 'reset', this._onSupersetReset);
        this.listenTo(this.superset, 'change', this._onSupersetChange);
        this._connected = true;
      }

      return this;
    },

    disconnect: function() {
      if (this.superset && this._connected) {
        this.stopListening(this.superset);
        this._connected = false;
      }

      return this;
    },

    _onSupersetAdd: function(model) {
      if (!this.iterator(model)) {
        return;
      }

      Backbone.Collection.prototype.add.call(this, model);
    },

    _onSupersetRemove: function(model) {
      Backbone.Collection.prototype.remove.call(this, model);
    },

    _onSupersetReset: function() {
      Backbone.Collection.prototype.reset.call(this);
    },

    _onSupersetChange: function(model) {
      if (this.contains(model) || !this.iterator(model)) {
        return;
      }

      Backbone.Collection.prototype.add.call(this, model);
    },

    // This method is used when a ``SubsetCollection`` is being instantiated
    // with a non-empty list of models. It represents the most silent way
    // possible to set an initial set of models on the ``SubsetCollection``.
    _seed: function(models) {
      var i;
      var model;

      this.models = models;
      this.length = models.length;

      for (i = 0; i < models.length; ++i) {
        model = models[i];

        model.on('all', this._onModelEvent, this);

        this._byId[model.cid] = model;

        if (model.id !== null && model.id !== undefined) {
          this._byId[model.id] = model;
        }
      }

      if (this.comparator) {
        this.sort({ silent: true });
      }
    },

    // These methods need to be neutered.
    push: function() {
      return this.length;
    },

    pop: function() {},

    unshift: function() {
      return this.length;
    },

    shift: function() {},

    reset: function() {
      return this;
    }
  });

  // When a ``superset`` is assigned to a ``SubsetCollection`` instance, any
  // in-place manipulation of the ``SubsetCollection`` instance is redirected to
  // the ``superset``. Changes will automatically reflect in the
  // ``SubsetCollection`` as events propagate.
  _.each(['add', 'remove', 'create', 'fetch'], function(method) {
    var originalMethod = SubsetCollection.prototype[method];

    SubsetCollection.prototype[method] = function() {
      if (this.superset && this._connected) {
        return this.superset[method].apply(this.superset, arguments);
      }

      return originalMethod.apply(this, arguments);
    };
  });

  return SubsetCollection;
});

define(['backbone', 'underscore', 'require', 'promenade/model',
        'promenade/collection/retainer', 'promenade/collection/subset',
        'promenade/delegation', 'promenade/sync'],
       function(Backbone, _, require, Model, RetainerApi, SubsetApi, DelegationApi, SyncApi) {
  'use strict';
  // Promenade.Collection
  // --------------------

  // A ``Promenade.Collection`` is the same as a ``Backbone.Collection``, with
  // some added functionality and pre-defined default behavior.
  var Collection = Backbone.Collection.extend({

    // The default model class for a Promenade ``Collection`` is the Promenade
    // ``Model``.
    model: Model,

    supportedEventMaps: Model.prototype.supportedEventMaps,

    setDefaults: {},

    propagates: {},

    // When defined for a ``Collection`` that is associated with an
    // ``Application``, the ``type`` is used as part of the property name that
    // the ``Collection`` instance is assigned to on the ``Application``
    // instance. E.g., a ``Collection`` with ``type`` that resolves to ``'foo'``
    // will be assigned to the ``'fooCollection'`` property on the
    // ``Application``. By default, a ``Collection`` defers to its designated
    // ``Model`` to resolve the value of ``type``.
    type: function() {
      return (this.model && _.result(this.model.prototype, 'type')) || '';
    },

    // An optional ``namespace`` can be declared. By default it is an empty
    // string and ignored as a falsey value. When a collection parses server
    // data, the ``namespace`` of a ``Collection`` will be used to discover the
    // data in the server response that corresponds to the ``Collection``
    // parsing it. By default, a ``Collection`` defers to its designated
    // ``Model`` to resolve the value of ``namespace``.
    namespace: function() {
      return _.result(this.model.prototype, 'namespace') || '';
    },

    initialize: function(models, options) {
      Backbone.Collection.prototype.initialize.apply(this, arguments);
      options = options || {};
      // On initialize, the ``Collection`` creates a class property that refers
      // to an app instance, if provided in the options. This behavior is used
      // to support reference passing of a top-level application down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      this.app = options.app;

      this.resources = {};

      this._needsSync = options.needsSync !== false;
      this._setOperations = 0;

      this.activateDelegation();

      this._resetSyncState();
    },

    dispose: Model.prototype.dispose,

    hasUpdated: Model.prototype.hasUpdated,

    updates: Model.prototype.updates,

    fetch: function(options) {
      this.trigger('before:fetch', this, options);
      return Backbone.Collection.prototype.fetch.apply(this, arguments);
    },

    create: function(options) {
      this.trigger('before:create', this, options);
      return Backbone.Collection.prototype.create.apply(this, arguments);
    },

    // Promenade's ``Collection`` extends the default behavior of the ``get``
    // method. When ``get`` is used to find a model by Number or String ``id``,
    // and the model does not already exist in the collection, the model is
    // created, added and fetched before being returned by the method.
    get: function(id, options) {
      var model;

      options = options || {
        fetch: true
      };

      if (this._isPerformingSetOperation()) {
        options.fetch = false;
      }
      // If ``get`` receives an ``Array`` of ``id`` values as the first
      // parameter, then ``Collection`` will return an ``Array`` containing the
      // result of a lookup on each of those ``id`` values.
      if (_.isArray(id)) {
        return _.map(id, function(_id) {
          return this.get(_id, options);
        }, this);
      }

      model = Backbone.Collection.prototype.get.apply(this, arguments);

      // If the model is found by Backbone's default ``get`` implementation,
      // we return the found model instance.
      if (model) {
        if (!(model instanceof Model)) {
          return model;
        }
      } else {
        if (_.isObject(id) && id instanceof Backbone.Model) {
          return;
        }

        if (this.model && id) {
          if (_.isString(id) || _.isNumber(id)) {
            model = {};
            model[this.model.prototype.idAttribute] = id;
          } else {
            model = id;
          }

          // Here we create the model via the mechanism used by
          // ``Backbone.Collection``.
          model = this._prepareModel(model, {
            needsSync: true
          });

          this.add(model);
        }
      }

      if (options.fetch && this._isCandidateForFetch(model)) {

        // We pre-emptively fetch the model from the server.
        model.fetch();
      }

      return model;
    },

    set: function(models, options) {
      var result;

      options = _.defaults(options || {}, _.extend({
        merge: true,
        remove: false
      }, _.result(this, 'setDefaults')));

      //this._performingSetOperation = true;
      this._pushSetOperation();

      result = Backbone.Collection.prototype.set.call(this, models, options);

      //this._performingSetOperation = false;
      this._popSetOperation();

      return result;
    },

    // The default behavior of parse is extended to support the added
    // ``namespace`` property. If a namespace is defined, server data is
    // expected to nest the intended data for a client ``Collection`` in
    // a property that matches the defined ``namespace``.
    parse: Model.prototype.parse,

    // A subset ``Collection`` instance can be created that represents the set
    // of ``models`` in the superset remaining when filtered by ``iterator``.
    // All semantics of ``_.filter`` apply when filtering a subset. The returned
    // ``Collection`` instance is an instance of ``Promenade.Collection`` by
    // default.
    subset: function(iterator, options) {
      var CollectionClass = this.constructor;
      var subset;

      options = _.extend(options || {}, {
        app: this.app,
        superset: this,
        iterator: iterator
      });

      subset = new CollectionClass(null, options);
      _.extend(subset, SubsetApi);
      subset.configure(options);

      return subset;
    },

    resource: function(url, options) {
      var resource = this.resources[url];
      var iterator;

      options = options || {};
      options.url = url;

      iterator = options.filter;

      if (resource) {
        if (iterator) {
          resource.iterator = iterator;
          resource.refresh();
        }

        return resource;
      }

      resource = this.subset(function(model) {
        var matchesResource = model.belongsToResource(url);

        if (!matchesResource) {
          return false;
        }

        return iterator ? iterator(model) : true;
      }, options);

      this.resources[url] = resource;

      return resource;
    },

    _pushSetOperation: function() {
      ++this._setOperations;
    },

    _popSetOperation: function() {
      if (this._isPerformingSetOperation()) {
        --this._setOperations;
      }
    },

    _isPerformingSetOperation: function() {
      return !!this._setOperations;
    },

    _isCandidateForFetch: function(model) {
      return this.url && model && model.url &&
          (!(model instanceof Model) ||
           (model.isSparse() && !model.hasSynced()));
    },

    // The internal ``_prepareModel`` method in the ``Collection`` is extended
    // to support propagation of any internal ``app`` references. This ensures
    // that ``Model`` instances created by the ``Collection`` will contain
    // matching references to a parent ``Application`` instance.
    _prepareModel: function(attrs, options) {
      var namespace;
      var namespaced;

      // Provided options, if any, are defaulted to contain a reference to this
      // ``Collection`` instance's corresponding ``app``.
      options = _.defaults(options || {}, {
        app: this.app,
        needsSync: false
      });

      namespace = _.result(this.model.prototype, 'namespace');

      // When we are preparing a ``Model`` instance with a declared
      // ``namespace``, the attributes must be nested in the ``namespace``
      // before they are parsed.
      if (options.parse && namespace) {
        namespaced = {};
        namespaced[namespace] = attrs;

        attrs = namespaced;
      }

      // With the option defaults set, the normal ``_prepareModel`` method is
      // used to finish creating the ``Model`` instance.
      return Backbone.Collection.prototype._prepareModel.call(this,
                                                              attrs, options);
    }
  });

  _.extend(Collection.prototype, RetainerApi, DelegationApi, SyncApi);

  Collection.Subset = SubsetApi;
  Collection.Retainer = RetainerApi;

  return Collection;
});

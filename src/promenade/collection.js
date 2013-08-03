define(['backbone', 'underscore', 'require', 'promenade/model'],
       function(Backbone, _, require, Model) {
  'use strict';
  // Promenade.Collection
  // --------------------

  // A ``Promenade.Collection`` is the same as a ``Backbone.Collection``, with
  // some added functionality and pre-defined default behavior.
  var Collection = Backbone.Collection.extend({

    // The default model class for a Promenade ``Collection`` is the Promenade
    // ``Model``.
    model: Model,

    // When defined for a ``Collection`` that is associated with an
    // ``Application``, the ``type`` is used as part of the property name that
    // the ``Collection`` instance is assigned to on the ``Application``
    // instance. E.g., a ``Collection`` with ``type`` that resolves to ``'foo'``
    // will be assigned to the ``'fooCollection'`` property on the
    // ``Application``. By default, a ``Collection`` defers to its designated
    // ``Model`` to resolve the value of ``type``.
    type: function() {
      return _.result(this.model.prototype, 'type') || '';
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
    },

    // Promenade's ``Collection`` extends the default behavior of the ``get``
    // method. When ``get`` is used to find a model by Number or String ``id``,
    // and the model does not already exist in the collection, the model is
    // created, added and fetched before being returned by the method.
    get: function(id) {
      var model;

      // If ``get`` receives an ``Array`` of ``id`` values as the first
      // parameter, then ``Collection`` will return an ``Array`` containing the
      // result of a lookup on each of those ``id`` values.
      if (_.isArray(id)) {
        return _.map(id, function(_id) {
          return this.get(_id);
        }, this);
      }

      model = Backbone.Collection.prototype.get.apply(this, arguments);

      // If the model is found by Backbone's default ``get`` implementation,
      // we return the found model instance.
      if (model) {
        return model;
      }

      if (_.isObject(id) && id instanceof Backbone.Model) {
        return;
      }

      if (this.model && id) {
        if (_.isString(id) || _.isNumber(id)) {
          id = { id: id };
        }

        // Here we create the model via the mechanism used by
        // ``Backbone.Collection``.
        model = this._prepareModel(id);
        id = model.id;
        this.add(model);
      }

      // If there is no ``url`` defined for this collection, we
      // can not automatically create and fetch the model.
      if (this.url && model) {

        // We pre-emptively fetch the model from the server.
        model.fetch();
      }

      return model;
    },

    set: function(models, options) {
      options = _.defaults(options || {}, {
        merge: true,
        remove: false
      });

      return Backbone.Collection.prototype.set.call(this, models, options);
    },

    // The default behavior of parse is extended to support the added
    // ``namespace`` property. If a namespace is defined, server data is
    // expected to nest the intended data for a client ``Collection`` in
    // a property that matches the defined ``namespace``.
    parse: function(data) {
      return Model.prototype.parse.apply(this, arguments);
    },

    sync: function() {
      return Model.prototype.sync.apply(this, arguments);
    },

    // A subset ``Collection`` instance can be created that represents the set
    // of ``models`` in the superset remaining when filtered by ``iterator``.
    // All semantics of ``_.filter`` apply when filtering a subset. The returned
    // ``Collection`` instance is an instance of ``Promenade.Collection`` by
    // default.
    subset: function(iterator, options) {
      var SubsetCollection = require('promenade/collection/subset');
      var models;

      if (_.isArray(iterator)) {
        models = iterator;
        iterator = undefined;
      } else {
        models = this.filter(iterator);
      }

      options = _.extend(options || {}, {
        app: this.app,
        superset: this,
        iterator: iterator
      });

      return new SubsetCollection(models, options);
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
        app: this.app
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

  return Collection;
});

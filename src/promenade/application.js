define(['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';
  // Promenade.Application
  // --------------------

  // An Application is the central entry point for a Promenade app.
  // It inherits from Backbone.Router.
  var Application = Backbone.Router.extend({

    // The ``root`` property on ``Application`` is a string selector that
    // refers to the root element that the ``Application`` should use for
    // any insertion of new DOM elements. When defined, a ``rootElement`` and
    // ``$rootElement`` property will be present on an ``Application`` instance
    // that refer to the corresponding DOM node and jQuery selection of the
    // ``root`` property, respectively.
    root: 'body',

    // The ``controllers`` property should be declared as an ``Array`` of
    // ``Promenade.Controller`` class references. These references are used
    // to instantiate ``Controller`` instances that will govern the routing
    // and behavior of the ``Application`` instance. After initialization is
    // complete, each class reference in this ``Array`` is replaced with a
    // corresponding class instance.
    controllers: [],

    // The ``models`` property should be declared as an ``Array`` of
    // ``Promenade.Model`` and / or ``Promenade.Collection`` class references.
    // These references are used to instantiate the core models and collections
    // that represent the data to be presented by the ``Application``.
    models: [],

    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);

      this._initializeModels();

      // The ``$rootElement`` and ``rootElement`` properties are created on the
      // ``Application`` instance during initialization.
      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);
    },

    // The ``getResource`` method can be called to lookup a backing datastore
    // when it can be either a ``Model`` or ``Collection`` instance. By default,
    // ``Collection`` instances are given preference.
    getResource: function(type) {
      return this.getCollectionForType(type) || this.getModelForType(type);
    },

    // Automatically looks up a ``Collection`` for a given ``type``.
    getCollectionForType: function(type) {
      return this[this.getCollectionName(type)];
    },

    // Similarly, looks up a ``Model`` for a given ``type``.
    getModelForType: function(type) {
      return this[this.getModelName(type)];
    },

    // These methods exist for the purpose of more predictable canonicalization
    // of property names given a ``type``.
    getCollectionName: function(type) {
      return type + 'Collection';
    },

    getModelName: function(type) {
      return type + 'Model';
    },

    // Upon initialization, and ``Application`` iterates through the list of
    // provided classes associated with its ``models`` property. Each of these
    // classes is instantiated and cached against its ``type`` and ``namespace``
    // values, separately, if available.
    _initializeModels: function() {
      this._namespace = {};

      _.each(this.models, function(ModelClass) {
        var model = new ModelClass(null, {
          app: this
        });
        var type = _.result(model, 'type');
        var namespace = _.result(model, 'namespace');

        // All instantiated resources are listened to for ``'sync'`` events in
        // order to support data propagation.
        this.listenTo(model, 'sync', this._onModelSync);

        if (model instanceof Backbone.Collection) {
          this[this.getCollectionName(type)] = model;
        } else if (model instanceof Backbone.Model) {
          this[this.getModelName(type)] = model;
        }

        if (namespace) {
          this._namespace[namespace] = model;
        }
      }, this);
    },

    // When a resource triggers a ``'sync'`` event, the ``Application`` observes
    // the network response to determine if there is any data that applies to
    // resources in other namespaces. If there is, the data in the namespace is
    // propagated to the known corresponding resources.
    _onModelSync: function(model, response, options) {
      var originalNamespace = _.result(model, 'namespace');

      _.each(response, function(data, key) {
        var otherModel = this._namespace[key];
        var otherData;

        if (key !== originalNamespace &&
            (otherModel instanceof Backbone.Model ||
             otherModel instanceof Backbone.Collection)) {
          otherData = otherModel.parse.call(otherModel, response);
          otherModel.set(otherData);
        }
      }, this);
    },

    // The default ``_bindRoutes`` behavior is extended to support the
    // ``controllers`` property of the ``Application``. All provided
    // ``Controller`` classes are instantiated and references are help
    // by the ``Application``.
    _bindRoutes: function() {
      Backbone.Router.prototype._bindRoutes.apply(this, arguments);

      this.controllers = _.map(this.controllers, function(Controller) {

        var controller = new Controller({
          app: this
        });

        // When a ``Controller`` is instantiated, it defines the ``routes`` that
        // it can support. These ``routes`` are each mapped to a ``route`` in
        // ``Application``, which is a ``Backbone.Router`` derivative.
        _.each(controller.routes, function(handler, route) {
          this.route(route, route, handler);
        }, this);

        return controller;
      }, this);
    }
  });

  return Application;
});

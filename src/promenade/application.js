define(['backbone', 'underscore', 'jquery', 'require'],
       function(Backbone, _, $, require) {
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

    session: 'user_session',

    updateLocation: true,

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

    view: null,

    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);
      var view = this.view;
      this.view = null;

      this._initializeModels();

      // All instantiated resources are listened to for ``'sync'`` events in
      // order to support data propagation.
      this.listenTo(this, 'before:sync', this._onBeforeSync);
      this.listenTo(this, 'sync', this._onSync);

      // The ``$rootElement`` and ``rootElement`` properties are created on the
      // ``Application`` instance during initialization.
      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);

      this.initializes = this.setup().then(_.bind(function() {
        this.useView(view);
      }, this));
    },

    navigate: function(fragment) {
      if (this.updateLocation === false) {
        return Backbone.history.loadUrl(fragment);
      }

      return Backbone.Router.prototype.navigate.apply(this, arguments);
    },

    setup: function() {
      return (new $.Deferred()).resolve().promise();
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
      return this.camelize(type) + 'Collection';
    },

    getModelName: function(type) {
      return this.camelize(type) + 'Model';
    },

    hasSession: function() {
      return !!this.getSession();
    },

    getSession: function() {
      return this.getModelForType(_.result(this, 'session'));
    },

    // When assigning ``Collection`` and ``Model`` instances to the
    // ``Application`` instance as properties, we must gracefully hadnle cases
    // where a resolved ``type`` value is not camelized. This helper function
    // converted strings separated with ``'_'`` characters into camel-cased
    // strings.
    camelize: function(string) {
      var parts = string.split('_');
      var part;
      var i;

      string = '';

      for (i = 0; i < parts.length; ++i) {
        part = parts[i].toLowerCase();

        if (!part) {
          continue;
        }

        if (i !== 0) {
          part = part.substr(0, 1).toUpperCase() +
                 part.substr(1, part.length - 1);
        }

        string += part;
      }

      return string;
    },

    // ``useView`` is an idempotent way to set the main layout of an
    // ``Application`` instance. The method accepts a string, class reference
    // or ``View`` instance.
    useView: function(View) {
      var view;

      // When no argument is provided, the method returns immediately.
      if (!View) {
        return;
      }

      // When the argument is a ``String``, it is resolved as a module using
      // an AMD API.
      if (_.isString(View)) {
        View = require(View);
      }

      // If we already have a ``view`` set on the ``Application`` instance, the
      // view is compared to the parameter provided. If ``view`` is an instance
      // of ``View``, or if ``view`` and ``View`` are the same, the method
      // returns immediately.
      if (this.view) {
        if ((_.isFunction(View) && this.view instanceof View) ||
            this.view === View) {
          return;
        }

        // Otherwise the current ``view`` is removed.
        this.view.remove();
      }

      // The new ``view`` is created either by instantiating a provided class,
      // or by setting a provided instance.
      if (_.isFunction(View)) {
        view = new View({
          model: this.getSession()
        });
      } else {
        view = View;
      }

      // Finally, the new ``view`` instance is rendered and appended to the
      // ``rootElement`` of the ``Application`` instance.
      view.render();
      this.$rootElement.append(view.$el);

      this.view = view;
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
    _onBeforeSync: function(model, response, options) {
      var originalNamespace = _.result(model, 'namespace');
      var propagates = _.result(model, 'propagates');

      options = _.defaults(options || {}, {
        propagate: true,
        update: true
      });

      if (!options.propagate) {
        return;
      }

      _.each(response, function(data, key) {
        var otherModel = this._namespace[key];
        var otherType;
        var otherData;

        if (key !== originalNamespace && propagates[key] !== false &&
            (otherModel instanceof Backbone.Model ||
             otherModel instanceof Backbone.Collection)) {
          otherData = otherModel.parse.call(otherModel, response);
          otherModel.set(otherData);

          otherType = _.result(otherModel, 'type');

          if (!options.update) {
            return;
          }

          if (otherType) {
            this.trigger('update:' + otherType, otherModel);
            otherModel.trigger('update', otherModel);
          }
        }
      }, this);
    },

    _onSync: function(model, response, options) {
      var type = _.result(model, 'type');

      options = _.defaults(options || {}, {
        update: true
      });

      if (!options.update) {
        return;
      }

      this.trigger('update:' + type, model);
      model.trigger('update', model);
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

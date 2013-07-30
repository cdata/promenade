
define('promenade/object',['backbone', 'underscore'],
       function(Backbone, _) {
  'use strict';
  /* # Promenade.Collection # */

  /* A ``Promenade.Object`` is a primitive class that is used by Promenade
   * types that do not inherit directly from a corresponding Backbone class.
   * It provides similar initialization behavior to that expected from the
   * base Backbone classes that most of Promenade inherit from. An options
   * argument provided to the ``Object`` constructor is passed on to an
   * ``initialize`` method, where a descendant class should put most of its
   * own contructor behavior.
   */
  var PromenadeObject = function(options) {
    this.options = options || {};
    this.initialize(options);
  };

  /* ``Promenade.Object`` re-purposes Backbone's ``extend`` static method to
   * mirror Backbone's inheritance semantics.
   */
  PromenadeObject.extend = Backbone.View.extend;

  PromenadeObject.prototype.initialize = function(){};

  /* All ``Promenade.Object`` instances have ``Backbone.Events`` mixed in to
   * their prototypes, and thus support Backbone's events API.
   */
  _.extend(PromenadeObject.prototype, Backbone.Events);

  return PromenadeObject;
});

define('promenade/region',['promenade/object', 'promenade/view', 'underscore'],
       function(PromenadeObject, View, _) {

  var Region = PromenadeObject.extend({


    initialize: function(options) {
      this.superview = options.superview;
      this.selector = options.selector;
      this.subviews = [];

      this._resetContainer();

      this.listenTo(this.superview, 'before:render', this._detachSubviews);
      this.listenTo(this.superview, 'render', this._attachSubviews);
    },

    _resetContainer: function() {
      if (this.selector) {
        this.$container = this.superview.$(this.selector);
      } else {
        this.$container = this.superview.$el;
      }
    },


    add: function(views) {
      var PromenadeView = require('promenade/view');

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        if (view instanceof PromenadeView) {
          view.attachTo(this.$container);
        } else {
          this.$container.append(view.el);
        }
      }, this);

      this.subviews = this.subviews.concat(views);
    },

    remove: function(views) {
      var PromenadeView = require('promenade/view');

      if (!_.isArray(views)) {
        views = [views];
      }

      _.each(views, function(view) {
        if (view instanceof PromenadeView) {
          view.detach();
        } else {
          view.remove();
        }
      }, this);

      this.subviews = _.without(this.subviews, views);
    },

    insertAt: function(views, index) {
      var PromenadeView = require('promenade/view');
      var sibling = this.subviews[index];

      if (!_.isArray(views)) {
        views = [views];
      }

      if (!sibling) {
        this.add(views);
        return;
      }

      _.each(views, function(view) {
        sibling.$el.before(view.$el);
      }, this);

      this.subviews.splice(index, 0, views);
    },

    show: function(views) {
      var PromenadeView = require('promenade/view');

      this.remove(this.subviews);

      this.add(views);
    },


    renderSubviews: function(recursive) {
      var PromenadeView = require('promenade/view');

      _.each(this.subviews, function(view) {
        if (recursive && view instanceof PromenadeView) {
          view.deepRender();
        } else {
          view.render();
        }
      }, this);
    },


    _detachSubviews: function() {
      _.each(this.subviews, function(view) {
        view.$el.detach();
      });
    },


    _attachSubviews: function() {
      this._resetContainer();

      _.each(this.subviews, function(view) {
        this.$container.append(view.$el);
      }, this);
    }
  });

  return Region;
});

define('promenade/view',['backbone', 'templates', 'underscore', 'promenade/region'],
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
      var eventName;

      Backbone.View.prototype.delegateEvents.apply(this, arguments);

      if (this.hasModel()) {
        model = this.getModel();

        for (eventName in this.modelEvents) {
          this.listenTo(model, eventName, this[this.modelEvents[eventName]]);
        }
      }

      for (eventName in this.selfEvents) {
        this.listenTo(this, eventName, this[this.selfEvents[eventName]]);
      }

      return this;
    },


    undelegateEvents: function() {
      var model;
      var eventName;

      Backbone.View.prototype.undelegateEvents.apply(this, arguments);

      if(this.hasModel()) {
        model = this.getModel();

        for (eventName in this.modelEvents) {
          this.stopListening(model, eventName, this[this.modelEvents[eventName]]);
        }
      }

      for (eventName in this.selfEvents) {
        this.stopListening(this, eventName, this[this.selfEvents[eventName]]);
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
          this.getRegion(region).renderSubviews(recursive);
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


    selfEvents: {},


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

define('promenade/view/collection',['promenade/view'],
       function(View) {
  'use strict';

  var CollectionView = View.extend({
    itemView: View,
    tagName: 'ul',
    initialize: function() {
      this.layout = _.defaults(this.layout || {}, {
        outlet: ''
      });
      this.items = {};

      View.prototype.initialize.apply(this, arguments);
    },
    selfEvents: {
      'render': 'resetItems'
    },
    modelEvents: {
      'add': '_addItemByModel',
      'remove': '_removeItemByModel',
      'reset': '_removeAllItems',
      'sort': 'resetItems'
    },
    _addItemByModel: function(model) {
      var region = this.getRegion('outlet');
      var index = this.collection.indexOf(model);
      var view = new this.itemView({
        model: model
      }).render();

      this.items[model.cid] = view;

      region.insertAt(view, index);
    },
    _removeItemByModel: function(model) {
      var view = this.items[model.cid];
      var region = this.getRegion('outlet');

      if (!view) {
        return;
      }

      this.items[model.cid] = null;

      region.remove(view);
      view.undelegateEvents();
    },
    _removeAllItems: function() {
      var region = this.getRegion('outlet');

      _.each(this.items, function(view) {
        region.remove(view);
        view.undelegateEvents();
      }, this);

      this.items = {};
    },
    resetItems: function() {
      this._removeAllItems();
      this.collection.each(function(model) {
        this._addItemByModel(model);
      }, this);
    }
  });

  return CollectionView;
});

define('promenade/model',['backbone', 'require'],
       function(Backbone, require) {
  'use strict';
  // Promenade.Model
  // ---------------

  // A ``Promenade.Model`` is the same as a ``Backbone.Model``, with some added
  // properties that formalize how nested data structures are composed.
  var Model = Backbone.Model.extend({

    // An optional ``namespace`` can be declared. By default it is an empty
    // string and ignored as a falsey value. When defined, the ``namespace``
    // has two important purposes. First, when a ``Model`` parses server data,
    // the ``namespace`` of the ``Model`` will be used to discover the data
    // in the server response that corresponds to the ``Model`` parsing it.
    // Second, when defined for a ``Model`` that is associated with an
    // ``Application``, the ``namespace`` is used as the property name that the
    // ``Model`` instance is assigned to on the ``Application`` instance.
    namespace: '',

    // If a ``types`` property is declared, it should be a mapping of ``type``
    // attribute names to class references, or to ``String`` values that can be
    // used to resolve a class reference via an AMD API.
    types: {},

    initialize: function(attrs, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);

      // On initialize, the ``Model`` creates a class property that refers to an
      // app instance, if provided in the options. This behavior is used to
      // support reference passing of a top-level ``Application`` down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      this.app = options && options.app;
    },

    // The default behavior of parse is extended to support the added
    // ``namespace`` property. If a namespace is defined, server data is
    // expected to nest the intended data for a client ``Model`` in
    // a property that matches the defined ``namespace``.
    parse: function(data) {

      if (this.namespace) {
        if (!(this.namespace in data)) {
          throw new Error('Response data namespaced to "' +
                          this.namespace + '" does not exist.');
        }

        data = data[this.namespace];
      }

      return data;
    },

    // The default ``set`` behavior has been significantly expanded to support
    // new relationships between ``Model``, ``Collection`` and ``Application``
    // instances.
    set: function(key, value, options) {
      var attrs;
      var attr;
      var Type;
      var current;

      // We borrow the options parsing mechanism specific to the original
      // Backbone implementation of this method.
      if (typeof key === 'object') {
        attrs = key;
        options = value;
      } else {
        (attrs = {})[key] = value;
      }

      // Then we iterate over all attributes being set.
      for (attr in attrs) {
        value = attrs[attr];

        // If an attribute is in our ``types`` map, it means we should ensure
        // that the ultimate attribute value is an instance of the class
        // associated with the declared type.
        if (attr in this.types) {
          Type = this.types[attr];

          // If the type value is a ``String``, then we resolve the class using
          // an AMD API.
          if (_.isString(Type)) {
            Type = require(Type);
          }

          // When we have both a class and a value, and the value is not an
          // instance of the declared type, then we either create a new instance
          // of that type or update an existing instance in place.
          if (Type && value && !(value instanceof Type)) {
            current = this.get(attr);

            if (current && current instanceof Type) {
              current.set(value);
              delete attrs[attr];
            } else {
              attrs[attr] = new Type(value);
            }
          }
        // Otherwise, if no matching type has been declared but the attribute
        // and value as a pair represent an embedded reference to another model
        // or set of models, then we create a brudge between the attribute and
        // the non-local value being referred to.
        } else if (this._isEmbeddedReference(attr, value)) {

          attrs[attr] = this._bridgeReference(attr, value);
        }
      }

      // Once our attributes being set have been formatted appropriately,
      // the attributes are sent through the normal Backbone ``set`` method.
      return Backbone.Model.prototype.set.call(this, attrs, options);
    },

    // The default ``get`` behavior has been expanded to automatically evaluate
    // functions embedded within the attributes of a ``Model``. This allows the
    // ``Model`` to return canonical instances of ``Models`` identified by
    // embedded references as the result of a call to ``get``.
    get: function(attr) {
      var value = Backbone.Model.prototype.get.apply(this, arguments);

      if (_.isFunction(value)) {
        value = value();
      }

      return value;
    },

    // This method returns true if the ``key`` and ``value`` attributes together
    // are determined to refer to an embedded reference.
    _isEmbeddedReference: function(key, value) {
      // If no ``Application`` reference exists, there is no way to look up
      // embedded references in the first place.
      if (!this.app) {
        return false;
      }

      // For values that are ``Array`` instances, observing the first index
      // will suffice as a test.
      if (_.isArray(value)) {
        value = value[0];
      }

      if (!value) {
        return false;
      }

      // A value is considered an embedded reference if it contains an ``id``
      // and a ``type`` attribute, with no other attributes present.
      for (var attr in value) {
        if (attr !== 'id' && attr !== 'type') {
          return false;
        }
      }

      return 'id' in value && typeof value.type === 'string';
    },

    // This method creates a bridge between an embedded reference and its
    // referred-to value. A bridge takes the form of a function that can be
    // called to look up the desired value.
    _bridgeReference: function(key, value) {
      var app = this.app;
      var namespace;
      
      // If the value is an ``Array``, then the embedded reference represents a
      // one-to-many relationship, and a bridge must be created for each of the
      // embedded references in the ``Array``.
      if (_.isArray(value)) {
        value = _.map(value, function(_value) {
          return this._bridgeReference(key, _value);
        }, this);

        return function() {
          return _.map(value, function(_value) {
            return _value();
          }, this);
        };
      }

      // The ``namespace`` to find the ultimate value is resolved by pluralizing
      // the ``type`` embedded in the given value.
      namespace = this._pluralizeString(value.type);

      // A bridge function works by looking for a ``Backbone.Collection`` on the
      // root ``Application`` that corresponds to the resolved ``namespace``. If
      // no ``Collection`` is found, the bridge simply returns the original
      // value of the embedded reference as provided in the server data.
      return function() {
        if (app && (namespace in app) &&
            app[namespace] instanceof Backbone.Collection) {
          return app[namespace].get(value);
        }

        return value;
      };
    },

    // The ``_pluralizeString`` method returns the plural version of a provided
    // string, or the string itself if it is deemed to already be a pluralized
    // string. Presently, the implementation of this method is not robust.
    _pluralizeString: function(string) {
      var suffix = 's';
      var offset = 0;

      if (Model.match.PLURAL_STRING.test(string)) {
        return string;
      }

      if (Model.match.ENDS_IN_Y.test(string)) {
        suffix = 'ies';
        offset = 1;
      }

      if (Model.match.ENDS_IN_S.test(string)) {
        suffix = 'es';
      }

      return string.substr(0, string.length - offset) + suffix;
    },

    // JSON serialization has been expanded to accomodate for the new value
    // types that the ``Model`` supports. When an attribute value is a
    // ``Function``, the value is resolved by calling that ``Function``. If the
    // result of a called ``Function`` value is an ``Array``, each item in the
    // ``Array`` is also observed and called if it is a ``Function``. If any
    // values resolved in the scope of the expanded method have their own
    // ``toJSON`` method, those values are set to the result of that method.
    toJSON: function() {
      var data = Backbone.Model.prototype.toJSON.apply(this, arguments);
      var iterator = function(_value) {
        return (_value && _value.toJSON) ? _value.toJSON() : _value;
      };
      var key;
      var value;

      for (key in data) {
        value = data[key];

        if (_.isFunction(value)) {
          value = value();
          
          if (_.isArray(value)) {
            value = _.map(value, iterator);
          }

          data[key] = value;
        }

        if (value && value.toJSON) {
          data[key] = value.toJSON();
        }
      }

      return data;
    }
  }, {
    match: {
      PLURAL_STRING: /.+[^s]s$/,
      ENDS_IN_Y: /y$/,
      ENDS_IN_S: /s$/
    }
  });

  return Model;
});

define('promenade/controller',['backbone', 'underscore', 'promenade/object'],
       function(Backbone, _, PromenadeObject) {
  'use strict';



  /**
   * Promenade.Controller is a contruct that is used to handle responses to
   * navigation events in the application.
   *
   * @extends {Promenade.Object}
   * @constructor
   */
  var Controller = PromenadeObject.extend({


    /**
     * @param {Promenade.Application} app The promenade application that
     * created this controller'
     */
    initialize: function(app) {
      this.app = app;
      this.routes = {};
      this.defineRoutes.call(this._getDefinitionContext());

      this._routeMatchers = _.map(this.routes, function(handler, route) {
        return this.app._routeToRegExp(route);
      }, this);

      this._state = Controller.state.INACTIVE;

      this.listenTo(this.app, 'route', this._onNavigationEvent);
    },

    activate: function() {},

    deactivate: function() {},

    _activate: function() {
      if (this._state === Controller.state.INACTIVE) {
        this._state = Controller.state.ACTIVE;
        this.activate();
        this.trigger('activate');
      }
    },

    _deactivate: function() {
      if (this._state === Controller.state.ACTIVE) {
        this._state = Controller.state.INACTIVE;
        this.deactivate();
        this.trigger('deactivate');
      }
    },

    _onNavigationEvent: function(route) {
      for (var index = 0; index < this._routeMatchers.length; ++index) {
        if (this._routeMatchers[index].test(route)) {
          this._activate();
          return;
        }
      }

      this._deactivate();
    },



    /**
     * This method defaults to a no-op. Override it to define the routes that
     * your inherited Controller can handle. Example:
     *
     * // ...
     * defineRoutes: function() {
     *   this.handle('foo', 'fooHandler');
     *   this.resource('bar', 'barHandler');
     *   this.handle('baz', function() {
     *     this.resource('vim', 'bazVimHandler');
     *   });
     * }
     * // ...
     *
     * Will define the following routes:
     *
     * {
     *   'foo': 'fooHandler',
     *   'bar': 'barHandler',
     *   'baz/vim/:param1': 'bazVimHandler'
     * }
     *
     * These routes will be consumed by the Application when the Controller is
     * instantiated.
     */
    defineRoutes: function() {},


    /**
     * @param {String} fragment A location fragment.
     * @param {String} handler A property name that refers to a handler on the
     * controller.
     * @param {Function} subdefine A function that contains definitions that
     * should be scoped to the provided fragment.
     * @param {Array} generators A list of generators that convert route params
     * to models where possible.
     * @private
     */
    _handle: function(fragment, handler, subdefine, generators) {
      if (!subdefine && _.isFunction(handler)) {
        subdefine = handler;
        handler = null;
      }

      if (handler) {
        this.routes[fragment] = _.bind(function() {
          var args = Array.prototype.slice.call(arguments);
          args = _.map(args, function(arg, index) {
            if (typeof arg !== 'undefined' && generators[index]) {
              return generators[index](arg);
            }
            return arg;
          });

          this[handler].apply(this, args);
        }, this);
      }

      if (subdefine) {
        subdefine.call(this._getDefinitionContext(fragment, generators));
      }
    },


    /**
     * @param {String} fragment A location fragment.
     * @return {String} A fragment formatted in a route-root-sensitive fashion.
     * @private
     */
    _canonicalizeRoot: function(fragment) {
      return fragment ? fragment + '/' : '';
    },


    /**
     * @param {String} root The fragment root to scope future definitions to.
     * @return {Object} A context for subdefinitions namespaced to the given
     * fragment to use.
     * @private
     */
    _createDefinitionContext: function(root, generators) {

      generators = generators || [];

      return {
        handle: _.bind(function(_fragment, handler, subdefine) {
          this._handle(root + _fragment, handler, subdefine,
                       generators.slice());
        }, this),
        resource: _.bind(function(_fragment, handler, subdefine) {
          var _generators = generators.slice();
          _generators.push(_.bind(function(id) {
            var model = this.app[_fragment];

            if (model instanceof Backbone.Model ||
                model instanceof Backbone.Collection) {
              return model.get(id);
            }

            return id;
          }, this));
          this._handle(root + _fragment + '/:' + _fragment,
                       handler, subdefine, _generators);
        }, this),
        any: _.bind(function(handler) {
          this._handle(root + '*' + _.uniqueId(), handler, null,
                       generators.slice());
        }, this)
      };
    },


    /**
     * @param {String} fragment The root to scope future definitions to.
     * @return {Object} A context for subdefinitions namespaces to the given
     * fragment to use.
     * @private
     */
    _getDefinitionContext: function(fragment, generators) {
      return this._createDefinitionContext(this._canonicalizeRoot(fragment),
                                           generators);
    }
  }, {
    state: {
      ACTIVE: 'active',
      INACTIVE: 'inactive'
    }
  });

  return Controller;
});

define('promenade/application',['backbone', 'underscore', 'jquery'],
       function(Backbone, _, $) {
  'use strict';
  /* # Promenade.Application # */

  /* An Application is the central entry point for a Promenade app.
   * It inherits from Backbone.Router.
   */
  var Application = Backbone.Router.extend({

    /* The ``root`` property on ``Application`` is a string selector that
     * refers to the root element that the ``Application`` should use for
     * any insertion of new DOM elements. When defined, a ``rootElement`` and
     * ``$rootElement`` property will be present on an ``Application`` instance
     * that refer to the corresponding DOM node and jQuery selection of the
     * ``root`` property, respectively.
     */
    root: 'body',

    /* The ``controllers`` property should be declared as an ``Array`` of
     * ``Promenade.Controller`` class references. These references are used
     * to instantiate ``Controller`` instances that will govern the routing
     * and behavior of the ``Application`` instance. After initialization is
     * complete, each class reference in this ``Array`` is replaced with a
     * corresponding class instance.
     */
    controllers: [],

    /* The ``models`` property should be declared as an ``Array`` of
     * ``Promenade.Model`` and / or ``Promenade.Collection`` class references.
     * These references are used to instantiate the core models and collections
     * that represent the data to be presented by the ``Application``.
     */
    models: [],

    initialize: function(options) {
      Backbone.Router.prototype.initialize.apply(this, arguments);

      this._initializeModels();

      // The ``$rootElement`` and ``rootElement`` properties are created on the
      // ``Application`` instance during initialization.
      this.$rootElement = $(this.root);
      this.rootElement = this.$rootElement.get(0);
    },

    _initializeModels: function() {
      _.each(this.models, function(ModelClass) {
        var model = new ModelClass(null, {
          app: this
        });

        this.listenTo(model, 'sync', this._onModelSync);
        this[model.namespace] = model;

      }, this);
    },

    _onModelSync: function(model, response, options) {
      _.each(response, function(data, key) {
        var otherModel = this[key];

        if (key !== model.namespace &&
            (otherModel instanceof Backbone.Model ||
             otherModel instanceof Backbone.Collection)) {
          otherModel.set(data);
        }
      }, this);
    },


    /** @inheritDoc */
    _bindRoutes: function() {
      Backbone.Router.prototype._bindRoutes.apply(this, arguments);

      this.controllers = _.map(this.controllers, function(Controller) {

        var controller = new Controller(this);

        _.each(controller.routes, function(handler, route) {
          this.route(route, route, handler);
        }, this);

        return controller;
      }, this);
    }
  });

  return Application;
});

define('promenade/collection',['backbone', 'underscore', 'promenade/model'],
       function(Backbone, _, Model) {
  'use strict';
  // Promenade.Collection
  // --------------------

  // A ``Promenade.Collection`` is the same as a ``Backbone.Collection``, with
  // some added functionality and pre-defined default behavior.
  var Collection = Backbone.Collection.extend({

    // An optional ``namespace`` can be declared. By default it is an empty
    // string and ignored as a falsey value. When defined, the ``namespace``
    // has two important purposes. First, when a collection parses server data,
    // the ``namespace`` of a ``Collection`` will be used to discover the data
    // in the server response that corresponds to the ``Collection`` parsing it.
    // Second, when defined for a ``Collection`` that is associated with an
    // ``Application``, the ``namespace`` is used as the property name that the
    // ``Collection`` instance is assigned to on the ``Application`` instance.
    namespace: '',

    // The default model class for a Promenade ``Collection`` is the Promenade
    // ``Model``.
    model: Model,

    initialize: function(models, options) {
      Backbone.Collection.prototype.initialize.apply(this, arguments);

      // On initialize, the ``Collection`` creates a class property that refers
      // to an app instance, if provided in the options. This behavior is used
      // to support reference passing of a top-level application down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      this.app = options && options.app;
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

      // Otherwise, if we are not looking up by String or Number ``id``, we
      // do nothing.
      if (!_.isString(id) && !_.isNumber(id)) {
        return;
      }

      // If there is no ``url`` or ``model`` defined for this collection, we
      // can not automatically create and fetch the model.
      if (!this.url || !this.model) {
        return;
      }

      // Here we create the model via the mechanism used by
      // ``Backbone.Collection``.
      model = this._prepareModel({ id: id });

      // The model is added to the collection and fetched from the server.
      this.add(model);
      model.fetch();

      return model;
    },

    // The default behavior of parse is extended to support the added
    // ``namespace`` property. If a namespace is defined, server data is
    // expected to nest the intended data for a client ``Collection`` in
    // a property that matches the defined ``namespace``.
    parse: function(data) {
      if (this.namespace) {
        if (!(this.namespace in data)) {
          // When expected data isn't available in the defined namespace, the
          // ``parse`` method will throw.
          throw new Error('Response data namespaced to "' +
                          this.namespace + '" does not exist.');
        }

        data = data[this.namespace];
      }

      return data;
    },

    // The internal ``_prepareModel`` method in the ``Collection`` is extended
    // to support propagation of any internal ``app`` references. This ensures
    // that ``Model`` instances created by the ``Collection`` will contain
    // matching references to a parent ``Application`` instance.
    _prepareModel: function(attrs, options) {
      // Provided options, if any, are defaulted to contain a reference to this
      // ``Collection`` instance's corresponding ``app``.
      options = _.defaults(options || {}, {
        app: this.app
      });

      // With the option defaults set, the normal ``_prepareModel`` method is
      // used to finish creating the ``Model`` instance.
      return Backbone.Collection.prototype._prepareModel.call(this,
                                                              attrs, options);
    }
  });

  return Collection;
});

(function() {
  'use strict';

  define('promenade',['promenade/view', 'promenade/view/collection', 'promenade/model',
          'promenade/controller', 'promenade/application', 'promenade/region',
          'promenade/object', 'promenade/collection'],
         function(View, CollectionView, Model,  Controller, Application,
                  Region, PromenadeObject, Collection) {
    return {
      Model: Model,
      Collection: Collection,
      View: View,
      CollectionView: CollectionView,
      Controller: Controller,
      Application: Application,
      Region: Region,
      'Object': PromenadeObject
    };
  });
})();

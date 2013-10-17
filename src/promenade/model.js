define(['backbone', 'require', 'promenade/collection/retainer', 'promenade/delegation', 'promenade/sync'],
       function(Backbone, require, RetainerApi, DelegationApi, SyncApi) {
  'use strict';
  // Promenade.Model
  // ---------------

  // A ``Promenade.Model`` is the same as a ``Backbone.Model``, with some added
  // properties that formalize how nested data structures are composed.
  var Model = Backbone.Model.extend({

    // If a ``structure`` property is declared, it should be a mapping of
    // ``type`` attribute names to class references, or to ``String`` values
    // that can be used to resolve a class reference via an AMD API.
    structure: {},

    // If a ``structureEvents`` map is available, events will be bound and
    // unbound automatically based on the supplied definition. For example:
    //
    //   // ...
    //   structure: {
    //     comments: Backbone.Collection
    //   },
    //   structureEvents: {
    //     'add comments': 'onCommentAdded'
    //   },
    //   // ...
    //
    // This will automatically bind a handler to the ``'add'`` event of the
    // ``comments`` sub-collection. When the sub-collection is removed or the
    // reference is changed, the handler will be automatically updated or
    // removed as appropriate.
    structureEvents: {},

    // When defined for a ``Model`` that is associated with an
    // ``Application``, the ``type`` is used as part of the property name that
    // the ``Model`` instance is assigned to on the ``Application``
    // instance. E.g., a ``Model`` with ``type`` that resolves to ``'foo'``
    // will be assigned to the ``'fooModel'`` property on the
    // ``Application``.
    type: function() {
      var defaults = _.result(this, 'defaults');
      var namespace = _.result(this, 'namespace');
      return (this.attributes && this.get('type')) ||
             (defaults && defaults.type) || namespace || '';
    },

    // An optional ``namespace`` can be declared. By default it is an empty
    // string and ignored as a falsey value. When a collection parses server
    // data, the ``namespace`` of a ``Model`` will be used to discover the
    // data in the server response that corresponds to the ``Model``
    // parsing it.
    namespace: '',

    defaultDelegationTargets: ['self', 'app'],

    propagates: {},

    initialize: function(attrs, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);

      options = options || {};

      // On initialize, the ``Model`` creates a class property that refers to an
      // app instance, if provided in the options. This behavior is used to
      // support reference passing of a top-level ``Application`` down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      this.app = options.app;

      this._needsSync = options.needsSync !== false;
      this._resourceMap = this._resourceMap || {};

      this.activateDelegation();

      this._resetSyncState();
      this._resetUpdateState();
    },

    dispose: function() {
      this.deactivateDelegation();
      this.releaseConnections();
    },

    isSparse: function() {
      var type = _.result(this, 'type');

      for (var attr in this.attributes) {
        if (attr !== 'id' && attr !== 'type') {
          return false;
        }
      }

      if (this.attributes.type && this.attributes.type !== type) {
        return false;
      }

      return typeof this.attributes.id !== undefined;
    },

    hasUpdated: function() {
      return this._updated;
    },

    updates: function() {
      return this._updates;
    },

    urlFragment: function() {
      return _.result(this, 'namespace') + '/' + _.result(this, 'id');
    },

    composeUrlFrom: function() {
      var url = _.result(this, 'urlRoot');
      var others = Array.prototype.slice.call(arguments);
      var other;
      var index;

      for (index = 0; index < others.length; ++index) {
        other = others[index];
        url += '/' + _.result(other, 'urlFragment');
      }

      url += '/' + _.result(this, 'namespace');

      return url;
    },

    belongsToResource: function(resource) {
      return !!this._resourceMap[resource];
    },

    // The default behavior of parse is extended to support the added
    // ``namespace`` property. If a namespace is defined, server data is
    // expected to nest the intended data for a client ``Model`` in
    // a property that matches the defined ``namespace``.
    parse: function(data) {
      var namespace = _.result(this, 'namespace');

      if (namespace) {
        if (!(namespace in data)) {
          throw new Error('Response data namespaced to "' +
                          namespace + '" does not exist.');
        }

        data = data[namespace];
      }

      return data;
    },

    fetch: function(options) {
      this.trigger('before:fetch', this, options);
      return Backbone.Model.prototype.fetch.apply(this, arguments);
    },

    save: function(options) {
      this.trigger('before:save', this, options);
      return Backbone.Model.prototype.save.apply(this, arguments);
    },

    destroy: function(options) {
      this.trigger('before:destroy', this, options);
      return Backbone.Model.prototype.destroy.apply(this, arguments);
    },

    // The default ``set`` behavior has been significantly expanded to support
    // new relationships between ``Model``, ``Collection`` and ``Application``
    // instances.
    set: function(key, value, options) {
      var structure = _.result(this, 'structure');
      var attrs;
      var attr;
      var Type;
      var current;
      var resourceAdded;

      // We borrow the options parsing mechanism specific to the original
      // Backbone implementation of this method.
      if (typeof key === 'object') {
        attrs = key;
        options = value;
      } else {
        (attrs = {})[key] = value;
      }

      // On ``set``, the ``Model`` creates a class property that refers to an
      // app instance, if provided in the options. This behavior is used to
      // support reference passing of a top-level ``Application`` down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      if (options) {
        if (options.app) {
          this.app = options.app;
        }

        if (options.url) {
          this._resourceMap = this._resourceMap || {};

          if (!this.belongsToResource(options.url)) {
            resourceAdded = true;
          }

          this._resourceMap[options.url] = true;
        }
      }

      // Then we iterate over all attributes being set.
      for (attr in attrs) {
        value = attrs[attr];

        // If the value is determined to be an embedded reference, we map the
        // attr / value combination to value derived from a resource linked from
        // the ``Application`` reference.
        if (this._isEmbeddedReference(attr, value)) {
          value = attrs[attr] = this._bridgeReference(attr, value);
        }

        // If an attribute is in our ``structure`` map, it means we should
        // ensure that the ultimate attribute value is an instance of the class
        // associated with the declared type.
        if (attr in structure) {
          Type = structure[attr];

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
        }
      }

      if (resourceAdded) {
        this.trigger('resource', this);
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

    toReference: function() {
      return {
        type: this.get('type'),
        id: this.id
      };
    },

    defaultSerializationDepth: 1,

    // JSON serialization has been expanded to accomodate for the new value
    // types that the ``Model`` supports. If any values resolved in the scope of
    // the expanded method have their own ``toJSON`` method, those values are
    // set to the result of that method. Additionally, a truthy value passed
    // to ``toJSON`` will result in a shallow serialization where embedded
    // references will not have their ``toJSON`` methods called (in order to
    // avoid circular reference serialization traps).
    toJSON: function(depth) {
      var data = Backbone.Model.prototype.toJSON.apply(this, arguments);
      var iterator = function(_value) {
        return (_value && _value.toJSON) ?
            _value.toJSON(depth) : _value;
      };
      var key;
      var value;

      if (!_.isNumber(depth)) {
        depth = this.defaultSerializationDepth;
      }

      if (depth === 0) {
        return this._trimReferences(data);
      }

      depth = Math.max(depth - 1, 0);

      for (key in data) {
        value = data[key];

        if (_.isArray(value)) {
          value = data[key] = _.map(value, iterator);
        }

        if (value && value.toJSON) {
          data[key] = value.toJSON(depth);
        }
      }

      return data;
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

      return typeof value.id !== undefined && typeof value.type === 'string';
    },

    // This method creates a bridge between an embedded reference and its
    // referred-to value. A bridge takes the form of a function that can be
    // called to look up the desired value.
    _bridgeReference: function(key, value) {
      var app = this.app;
      var collection;
      var model;

      // If the value is an ``Array``, then the embedded reference represents a
      // one-to-many relationship, and a bridge must be created for each of the
      // embedded references in the ``Array``.
      if (_.isArray(value)) {
        return _.map(value, function(_value) {
          return this._bridgeReference(key, _value);
        }, this);
      }

      // A bridge works by looking for a ``Backbone.Collection`` on the root
      // ``Application`` that corresponds to the resolved ``namespace``. If no
      // ``Collection`` is found, the bridge simply returns the original value
      // of the embedded reference as provided in the server data.
      if (app) {
        collection = app.getCollectionForType(value.type);

        if (collection && collection instanceof Backbone.Collection) {
          return collection.get(value, { fetch: false });
        }
      }

      return value;
    },

    _resetUpdateState: function() {
      var eventuallyUpdates = new $.Deferred();

      this._updated = this._updated === true;

      this.once('update', function() {
        eventuallyUpdates.resolve(this);
        this._resetUpdateState();
      }, this);

      this._updates = eventuallyUpdates.promise();
    },

    // The ``_pluralizeString`` method returns the plural version of a provided
    // string, or the string itself if it is deemed to already be a pluralized
    // string. Presently, the implementation of this method is not robust. It
    // will not properly pluralize ``'cactus'``, for instance.
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

    _castToReference: function(data) {
      if (_.isArray(data)) {
        return _.map(data, this._castToReference, this);
      } else if (data instanceof Model) {
        return data.toReference();
      } else if (data instanceof Backbone.Model ||
                 data instanceof Backbone.Collection) {
        return null;
      }

      return data;
    },

    _trimReferences: function(data) {
      var key;

      for (key in data) {
        data[key] = this._castToReference(data[key]);
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

  _.extend(Model.prototype, RetainerApi, DelegationApi, SyncApi);

  return Model;
});

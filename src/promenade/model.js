define(['backbone', 'require'],
       function(Backbone, require) {
  'use strict';

  var Model = Backbone.Model.extend({


    namespace: '',


    types: {},


    initialize: function(attrs, options) {
      Backbone.Model.prototype.initialize.apply(this, arguments);
      this.app = options && options.app;
    },


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

    set: function(key, value, options) {
      var attrs;
      var attr;
      var Type;
      var current;

      if (typeof key === 'object') {
        attrs = key;
        options = value;
      } else {
        (attrs = {})[key] = value;
      }

      for (attr in attrs) {
        value = attrs[attr];

        if (attr in this.types) {
          Type = this.types[attr];

          if (_.isString(Type)) {
            Type = require(Type);
          }

          if (Type && value && !(value instanceof Type)) {
            current = this.get(attr);

            if (current && current instanceof Type) {
              current.set(value);
              delete attrs[attr];
            } else {
              attrs[attr] = new Type(value);
            }
          }
        } else if (this.app && this._isEmbeddedReference(attr, value)) {

          attrs[attr] = this._bridgeReference(attr, value);
        }
      }

      return Backbone.Model.prototype.set.call(this, attrs, options);
    },

    /* The default ``get`` behavior has been expanded to automatically search
     * an associated parent ``Application`` reference (if available) for a
     * collection containing models of the type being looked up.
     */
    get: function(attr) {
      var value = Backbone.Model.prototype.get.apply(this, arguments);

      if (_.isFunction(value)) {
        value = value();
      }

      return value;
    },

    _isEmbeddedReference: function(key, value) {
      if (_.isArray(value)) {
        value = value[0];
      }

      if (!value) {
        return false;
      }

      for (var attr in value) {
        if (attr !== 'id' && attr !== 'type') {
          return false;
        }
      }

      return 'id' in value && typeof value.type === 'string';
    },

    _bridgeReference: function(key, value) {
      var app = this.app;
      var namespace;
      
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

      namespace = this._pluralizeString(value.type);

      return function() {
        if (app && (namespace in app) &&
            app[namespace] instanceof Backbone.Collection) {
          return app[namespace].get(value);
        }

        return value;
      };
    },

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

define(['backbone', 'require'],
       function(Backbone, require) {
  'use strict';

  var Model = Backbone.Model.extend({


    namespace: '',

    types: {},

    parse: function(data) {
      var TypeClass;
      var type;

      if (this.namespace) {
        if (!(this.namespace in data)) {
          throw new Error('Response data namespaced to "' + this.namespace + '" does not exist.');
        }

        data = data[this.namespace];
      }

      for (type in this.types) {
        TypeClass = this.types[type];

        if (_.isString(TypeClass)) {
          TypeClass = require(TypeClass);
        }

        if (data[type]) {
          data[type] = new TypeClass(data[type], { parse: true });
        }
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
        Type = this.types[attr];
        value = attrs[attr];

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

      return Backbone.Model.prototype.set.call(this, attrs, options);
    },


    toJSON: function() {
      var data = Backbone.Model.prototype.toJSON.apply(this, arguments);

      for (var type in this.types) {
        if (data[type] && data[type].toJSON) {
          data[type] = data[type].toJSON();
        }
      }

      return data;
    }
  });

  return Model;
});

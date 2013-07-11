define(['backbone', 'require'],
       function(Backbone, require) {
  'use strict';

  var Model = Backbone.Model.extend({
    types: {},
    parse: function(data) {
      var TypeClass;

      for (var type in this.types) {
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
          attrs[attr] = new Type(value);
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

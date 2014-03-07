define(['backbone', 'underscore', 'promenade/object'],
  function (Backbone, _, PromenadeObject) {
    'use strict';
    // Promenade.Data.Operator
    // -----------------------

    var Operator = PromenadeObject.extend({
      init: function (data, context) {
        this._data = data;
        this._context = context;
      },

      create: function (attributes) {
        this._context.set('method', 'create');
        this._context.set('attributes', attributes);

        return this._data.sync(this._context);
      },

      read: function (id) {
        this._context.set('method', 'read');

        if (id !== null && typeof id !== 'undefined') {
          this._context.set('id', id);
        }

        return this._data.sync(this._context);
      },

      update: function (id, attributes) {
        this._context.set('method', 'update');
        this._context.set('id', id);
        this._context.set('attributes', attributes);

        return this._data.sync(this._context);
      },

      destroy: function (id) {
        this._context.set('method', 'destroy');
        this._context.set('id', id);

        return this._data.sync(this._context);
      },

      set: function (attr, value) {
        this._context.set(attr, value);

        return this;
      }
    });

    return Operator;
  }
);

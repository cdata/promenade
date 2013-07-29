define(['backbone', 'underscore', 'promenade/model'],
       function(Backbone, _, Model) {
  'use strict';
  /* # Promenade.Collection # */

  /* A ``Promenade.Collection`` is the same as a ``Backbone.Collection``, with
   * some added functionality and pre-defined default behavior.
   */
  var Collection = Backbone.Collection.extend({

    /* An optional ``namespace`` can be declared. By default it is an empty
     * string and ignored as a falsey value. When defined, the ``namespace``
     * has two important purposes. First, when a collection parses server data,
     * the ``namespace`` of a ``Collection`` will be used to discover the data
     * in the server response that corresponds to the ``Collection`` parsing it.
     * Second, when defined for a ``Collection`` that is associated with an
     * ``Application``, the ``namespace`` is used as the property name that the
     * ``Collection`` instance is assigned to on the ``Application`` instance.
     */
    namespace: '',

    /* The default model class for a Promenade ``Collection`` is the Promenade
     * ``Model``.
     */
    model: Model,

    initialize: function(models, options) {
      Backbone.Collection.prototype.initialize.apply(this, arguments);

      // On initialize, the ``Collection`` creates a class property that refers
      // to an app instance, if provided in the options. This behavior is used
      // to support reference passing of a top-level application down a deeply
      // nested chain of ``Collection`` and ``Model`` instances.
      this.app = options && options.app;
    },

    /* Promenade's ``Collection`` extends the default behavior of the ``get``
     * method. When ``get`` is used to find a model by Number or String ``id``,
     * and the model does not already exist in the collection, the model is
     * created, added and fetched before being returned by the method.
     */
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

    /* The default behavior of parse is extended to support the added
     * ``namespace`` property. If a namespace is defined, server data is
     * expected to nest the intended data for a client ``Collection`` in
     * a property that matches the defined ``namespace``.
     */
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

    /* The internal ``_prepareModel`` method in the ``Collection`` is extended
     * to support propagation of any internal ``app`` references. This ensures
     * that ``Model`` instances created by the ``Collection`` will contain
     * matching references to a parent ``Application`` instance.
     */
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

define(['backbone', 'underscore', 'promenade/model'],
       function(Backbone, _, Model) {
  var Collection = Backbone.Collection.extend({
    namespace: '',
    model: Model,
    get: function(id) {
      var model = Backbone.Collection.prototype.get.apply(this, arguments);

      if (model) {
        return model;
      }

      if (!_.isString(id) && !_.isNumber(id)) {
        return;
      }

      if (!this.url || !this.model) {
        return;
      }

      if (this.model) {
        model = new this.model({ id: id });

        this.add(model);
        model.fetch();

        return model;
      }
    },
    parse: function(data) {
      if (this.namespace) {
        if (!(this.namespace in data)) {
          throw new Error('Response data namespaced to "' + this.namespace + '" does not exist.');
        }

        data = data[this.namespace];
      }

      return data;
    }
  });

  return Collection;
});

define(['backbone', 'underscore'],
       function(Backbone, _) {
  var Collection = Backbone.Collection.extend({
    get: function(id) {
      var model = Backbone.Collection.prototype.get.apply(this, arguments);

      if (model) {
        return model;
      }

      if (!(_.isString(id) || _.isNumber(id))) {
        return;
      }

      if (this.model) {
        model = new this.model({ id: id });

        this.add(model);
        model.fetch();

        return model;
      }
    }
  });

  return Collection;
});

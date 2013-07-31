define(['promenade/view'],
       function(View) {
  'use strict';
  // Promenade.CollectionView
  // ------------------------

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

      if (!this.collection) {
        return;
      }

      this.collection.each(function(model) {
        this._addItemByModel(model);
      }, this);
    }
  });

  return CollectionView;
});

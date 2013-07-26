define(['promenade/view'],
       function(View) {
  'use strict';

  var CollectionView = View.extend({
    itemView: null,
    tagName: 'ul',
    initialize: function() {
      this.layout = _.defaults(this.layout || {}, {
        outlet: ''
      });
      this.items = {};
      this.on('render', this.resetItems, this);

      View.prototype.initialize.apply(this, arguments);
    },
    modelEvents: {
      'add': 'addItemByModel',
      'remove': 'removeItemByModel',
      'reset': 'removeAllItems',
      'sort': 'resetItems'
    },
    addItemByModel: function(model) {
      var $container = this.getRegion('outlet').$container;
      var siblings = $container.children(this.itemView.tagName);
      var index = this.collection.indexOf(model);
      var view = new this.itemView({
        model: model
      });

      this.items[model.cid] = view;

      if (siblings.length && siblings.length >= index) {
        siblings.eq(index).before(view.render().$el);
      } else {
        $container.append(view.render().$el);
      }
    },
    removeItemByModel: function(model) {
      var view = this.items[model.cid];

      if (!view) {
        return;
      }

      view.remove();
    },
    removeAllItems: function() {
      _.each(this.items, function(view, modelCid) {
        view.remove();
      });
    },
    resetItems: function() {
      this.removeAllItems();
      this.collection.each(function(model) {
        this.addItemByModel(model);
      }, this);
    }
  });

  return CollectionView;
});

define(['promenade/view'],
       function(View) {
  'use strict';

  var CollectionView = View.extend({
    itemView: null,
    initialize: function() {
      this.layout = _.defaults(this.layout || {}, {
        collectionContainer: this.tagName
      });
      this.items = {};

      View.prototype.initialize.apply(this, arguments);
    },
    modelEvents: {
      'add': 'addItemByModel',
      'remove': 'removeItemByModel',
      'reset': 'resetItems'
    },
    addItemByModel: function(model) {

    },
    removeItemByModel: function(model) {

    },
    resetItems: function() {

    },
    render: function() {

    }
  });

  return CollectionView;
});

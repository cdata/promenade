(function() {
  'use strict';

  define(['promenade/view', 'promenade/view/collection', 'promenade/model',
          'promenade/controller', 'promenade/application', 'promenade/region',
          'promenade/object', 'promenade/collection', 'promenade/collection/subset'],
         function(View, CollectionView, Model,  Controller, Application,
                  Region, PromenadeObject, Collection, SubsetCollection) {
    return {
      Model: Model,
      Collection: Collection,
      SubsetCollection: SubsetCollection,
      View: View,
      CollectionView: CollectionView,
      Controller: Controller,
      Application: Application,
      Region: Region,
      'Object': PromenadeObject
    };
  });
})();

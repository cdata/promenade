(function() {
  'use strict';

  define(['promenade/view', 'promenade/view/collection', 'promenade/model',
          'promenade/controller', 'promenade/application', 'promenade/region',
          'promenade/object'],
         function(View, CollectionView, Model,  Controller, Application,
                  Region, PromenadeObject) {
    return {
      Model: Model,
      View: View,
      CollectionView: CollectionView,
      Controller: Controller,
      Application: Application,
      Region: Region,
      'Object': PromenadeObject
    };
  });
})();

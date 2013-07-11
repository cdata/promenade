(function() {
  'use strict';

  define(['promenade/view', 'promenade/view/collection', 'promenade/model',
          'promenade/controller', 'promenade/application'],
         function(View, CollectionView, Model,  Controller, Application) {
    return {
      Model: Model,
      View: View,
      CollectionView: CollectionView,
      Controller: Controller,
      Application: Application
    };
  });
})();

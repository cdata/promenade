(function() {
  'use strict';

  define(['promenade/view', 'promenade/view/collection', 'promenade/view/form', 'promenade/model',
          'promenade/controller', 'promenade/application', 'promenade/region',
          'promenade/object', 'promenade/collection', 'promenade/event'],
         function(View, CollectionView, FormView, Model,  Controller, Application,
                  Region, PromenadeObject, Collection, EventApi) {
    return {
      Model: Model,
      Collection: Collection,
      View: View,
      CollectionView: CollectionView,
      FormView: FormView,
      Controller: Controller,
      Application: Application,
      Region: Region,
      Event: EventApi,
      'Object': PromenadeObject
    };
  });
})();

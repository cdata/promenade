(function() {
  'use strict';

  define(['promenade/view', 'promenade/view/collection', 'promenade/view/form',
          'promenade/model', 'promenade/controller', 'promenade/application',
          'promenade/region', 'promenade/object', 'promenade/collection',
          'promenade/delegation', 'promenade/sync'],
         function(View, CollectionView, FormView, Model,  Controller,
                  Application, Region, PromenadeObject, Collection,
                  DelegationApi, SyncApi) {
    return {
      Model: Model,
      Collection: Collection,
      View: View,
      CollectionView: CollectionView,
      FormView: FormView,
      Controller: Controller,
      Application: Application,
      Region: Region,
      Delegation: DelegationApi,
      Sync: SyncApi,
      'Object': PromenadeObject
    };
  });
})();
